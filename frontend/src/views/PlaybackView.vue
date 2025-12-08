<script setup>
//: Vue Imports
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { hexaToRgba } from "../functions/colorUtils";
import { assert, useElementBounding, useSessionStorage } from '@vueuse/core';
import axios from 'axios';
import { useGameStateQueries } from '@/functions/useGameStateQueries';
const router = useRouter();

//: Custom Data and Components
import IonButton from '@/components/IonButton.vue';
import { levelMapGridScalePx, SERVER_URL } from "@/data/constants"
import { levelPortalCycleColor, levelMapPortalBackgroundAlpha, gameDefaultAnimationDuration, gameDropoutAnimationDuration, gameTransportAnimationDuration } from "@/data/constants";
import { gameEntranceTitleAnimationDuration, gameEntranceFocusAnimationRange } from "@/data/constants";
import { refAnimateToObject, easeNopeGenerator } from '@/functions/animateUtils';
import { randomFloatFromInterval } from '@/functions/mathUtils';
import { useRecordingsStore } from '@/functions/useRecordings';
import { getCustomLevelById } from '@/functions/useAccount';

const recordingsStore = useRecordingsStore();
const baseLevelDefinition = ref(null);
const isPlaybackActive = ref(false);
const playbackQueue = ref([]);
const playbackTimeoutHandle = ref(null);
const currentStepIndex = ref(0);
const hasWon = ref(false);

//: Map Setup
const responseCode = ref(0);
const name = ref('');
const author = ref('');
const stepsGoal = ref(0);
const currentRoute = router.currentRoute.value;
const routePath = currentRoute.path || currentRoute.fullPath || '';
const isCustomLevelRoute = routePath.startsWith('/custom/play'); // Might need adjustment for playback route
const levelId = currentRoute.params.levelId || currentRoute.params.uuid; // Handle both
const gameState = ref({ containers: [], particles: [] });
const mapSize = ref({ rows: 0, columns: 0 });

const selected = ref(null);
const stepsCounter = ref(0);

const refViewPort = ref(null);

const isLevelLoaded = ref(false);
const isPanning = ref(false);
const isCustomAnimating = ref(false);
const isStartingAnimation = ref(false);
const disableInteraction = ref(false);

const levelRecordings = computed(() => {
    const entries = recordingsStore.value[levelId];
    return Array.isArray(entries) ? entries : [];
});

const doSmoothAnimate = computed(() => isLevelLoaded.value && !isPanning.value && !isCustomAnimating.value);

const loadLevelFromString = (levelString) => {
    name.value = levelString.meta.name;
    author.value = levelString.meta.author;
    mapSize.value = {
        rows: levelString.meta.rows,
        columns: levelString.meta.columns
    }
    const containers = JSON.parse(JSON.stringify(levelString.content.containers));
    const particles = JSON.parse(JSON.stringify(levelString.content.particles));
    baseLevelDefinition.value = {
        containers,
        particles
    };
    gameState.value.containers = JSON.parse(JSON.stringify(baseLevelDefinition.value.containers));
    gameState.value.particles = JSON.parse(JSON.stringify(baseLevelDefinition.value.particles));
    stepsGoal.value = levelString.content.goal;
    isLevelLoaded.value = true;
}

const loadLevelConfig = async (recordingEntry) => {
    if (recordingEntry && recordingEntry.map) {
        loadLevelFromString(recordingEntry.map);
        responseCode.value = 200;
        return;
    }

    // Fallback to loading from ID if map is not in recording
    // Check if it's a custom level first
    const customLevel = getCustomLevelById(levelId);
    if (customLevel) {
        loadLevelFromString(customLevel.level);
        responseCode.value = 200;
        return;
    }

    // Try fetching from server
    await axios
        .get(SERVER_URL + '/level?levelId=' + String(levelId))
        .then((res) => {
            responseCode.value = res.status;
            if (res.status == 200) {
                const levelConfig = res.data;
                loadLevelFromString(levelConfig);
            }
            return res;
        })
        .catch((err) => {
            responseCode.value = err.status || 404;
            return err;
        });
};

const initializeRuntimeState = (shouldObscure = true) => {
    gameState.value.particles.forEach((particle, index) => {
        particle.id = `particle-${index}`;
        particle.obscure = shouldObscure;
        particle.colliding = false;
    });
    gameState.value.containers.forEach((container, index) => {
        container.id = `container-${index}`;
        container.obscure = shouldObscure;
        container.classes = [];
    });
};

const restoreBaseLevelState = ({ obscure = false } = {}) => {
    if (!baseLevelDefinition.value) {
        return false;
    }
    gameState.value.containers = JSON.parse(JSON.stringify(baseLevelDefinition.value.containers));
    gameState.value.particles = JSON.parse(JSON.stringify(baseLevelDefinition.value.particles));
    initializeRuntimeState(obscure);
    selected.value = null;
    disableInteraction.value = false;
    isCustomAnimating.value = false;
    stepsCounter.value = 0;
    hasWon.value = false;
    return true;
};

const flattenRecordingEntries = (recordingData = []) => {
    const steps = [];
    recordingData.forEach((segment) => {
        if (!segment || typeof segment.id === 'undefined' || !Array.isArray(segment.direction)) {
            return;
        }
        segment.direction.forEach((dir) => {
            steps.push({
                id: segment.id,
                direction: dir
            });
        });
    });
    return steps;
};

//: Panning and Centering
import { usePanning } from "@/functions/usePanning";
const { panningOffset, onPanStart, onPanEnd } = usePanning(refViewPort);

const onPanStartWrapper = (event) => {
    isPanning.value = true;
    onPanStart(event);
};

const onPanEndWrapper = () => {
    onPanEnd();
    isPanning.value = false;
};

//: Game Logic
const {
    hasBoardAt,
    hasPortalAt,
    hasContainerAt,
    hasParticleWithColorAt,
    getOtherPortal,
    getParticlesAt,
    getParticleAt,
    getContainerAt,
    negateColor,
} = useGameStateQueries(gameState);

const isMoveValid = (currentColor, currentId, newPos) => {
    if (!hasContainerAt(newPos.row, newPos.column)) return false;
    if (hasParticleWithColorAt(newPos.row, newPos.column, currentColor)) return false;
    if (hasPortalAt(newPos.row, newPos.column)) {
        const otherPortal = getOtherPortal(newPos.row, newPos.column);
        if (hasParticleWithColorAt(otherPortal.row, otherPortal.column, currentColor) && getParticleAt(otherPortal.row, otherPortal.column).id != currentId) return false;
    }
    return true;
}

const updateMapAfterCollision = (r, c) => {
    if (hasPortalAt(r, c)) {
        const otherPortal = getOtherPortal(r, c);
        otherPortal.type = 'board';
    }
    gameState.value.containers = gameState.value.containers.filter(item => item.row !== r || item.column !== c);
    gameState.value.particles = gameState.value.particles.filter(particle => particle.row !== r || particle.column !== c);
    selected.value = null;
};

const animateInvalidMove = (particleId, direction) => {
    let onFinishCallback = () => { };
    const refOffset = ref({ x: 0, y: 0 });
    const shakeOffset = levelMapGridScalePx.value;
    const selectedParticleDOM = document.getElementById(particleId);
    refAnimateToObject(
        refOffset,
        {
            'up': { x: 0, y: -shakeOffset },
            'down': { x: 0, y: shakeOffset },
            'left': { x: -shakeOffset, y: 0 },
            'right': { x: shakeOffset, y: 0 },
            default: { x: 0, y: 0 }
        }[direction],
        gameDefaultAnimationDuration,
        easeNopeGenerator(0.1),
        { x: 0, y: 0 }
    ).onUpdate(() => {
        selectedParticleDOM.style.translate = `${refOffset.value.x}px ${refOffset.value.y}px`;
    }).onFinish(() => {
        onFinishCallback();
    });

    return {
        onFinish(callback) {
            onFinishCallback = callback;
        }
    }
}
const createShadowParticleFrom = (source) => {
    var shadowParticleNode = source.cloneNode(true);
    shadowParticleNode.id = `shadow-${source.id}`;
    shadowParticleNode.classList.add('shadow-particle');
    refViewPort.value.appendChild(shadowParticleNode);
}
const collapseContainerAt = (r, c) => {
    const container = getContainerAt(r, c);
    if (container) {
        const containerNode = document.getElementById(container.id);
        containerNode.classList.add('container--collapse');
    }
}
const makeBoardFrom = (r, c) => {
    const container = getContainerAt(r, c);
    if (container) {
        const containerNode = document.getElementById(container.id);
        containerNode.classList.add('container--becoming-board');
    }
}

const stopPlayback = () => {
    isPlaybackActive.value = false;
    selected.value = null;
    if (playbackTimeoutHandle.value) {
        clearTimeout(playbackTimeoutHandle.value);
        playbackTimeoutHandle.value = null;
    }
};

const togglePlayback = () => {
    if (isPlaybackActive.value) {
        stopPlayback();
    } else {
        if (currentStepIndex.value >= playbackQueue.value.length) {
            // Restart if at end
            currentStepIndex.value = 0;
            restoreBaseLevelState({ obscure: false });
        }
        isPlaybackActive.value = true;
        stepPlaybackQueue();
    }
};

const stepForward = () => {
    stopPlayback();
    if (currentStepIndex.value < playbackQueue.value.length) {
        executeStep(playbackQueue.value[currentStepIndex.value]);
        currentStepIndex.value++;
    }
};

const stepBackward = () => {
    stopPlayback();
    if (currentStepIndex.value > 0) {
        currentStepIndex.value--;
        // Replay from start to currentStepIndex
        restoreBaseLevelState({ obscure: false });
        for (let i = 0; i < currentStepIndex.value; i++) {
            // Execute without animation for speed, or just fast
            // For now, let's just execute them. Since moveParticle has animation logic, 
            // we might need a "instant" mode.
            // But moveParticle is async-ish with animations.
            // To properly support instant replay, we need to bypass animations.
            // Let's try to just call moveParticle with a flag.
            executeStep(playbackQueue.value[i], { instant: true });
        }
    }
};

const goToStart = () => {
    stopPlayback();
    currentStepIndex.value = 0;
    restoreBaseLevelState({ obscure: false });
};

const goToEnd = () => {
    stopPlayback();
    restoreBaseLevelState({ obscure: false });
    // Replay all steps instantly
    for (let i = 0; i < playbackQueue.value.length; i++) {
        executeStep(playbackQueue.value[i], { instant: true });
    }
    currentStepIndex.value = playbackQueue.value.length;
};

const executeStep = (step, options = {}) => {
    const particle = gameState.value.particles.find((p) => Number(p.id.split('-')[1]) === step.id);
    if (!particle) return;
    selected.value = particle;
    moveParticle(step.direction, { allowWhilePlayback: true, ...options });
};

const queueNextPlaybackStep = () => {
    if (!isPlaybackActive.value) {
        return;
    }
    if (disableInteraction.value || isCustomAnimating.value) {
        playbackTimeoutHandle.value = setTimeout(queueNextPlaybackStep, 100);
        return;
    }
    playbackTimeoutHandle.value = setTimeout(stepPlaybackQueue, gameDefaultAnimationDuration + 50);
};

const stepPlaybackQueue = () => {
    if (!isPlaybackActive.value) {
        return;
    }
    if (currentStepIndex.value >= playbackQueue.value.length) {
        stopPlayback();
        checkWinCondition();
        return;
    }
    const nextStep = playbackQueue.value[currentStepIndex.value];
    currentStepIndex.value++;
    
    executeStep(nextStep);
    queueNextPlaybackStep();
};

const startPlayback = (entry, autoPlay = true) => {
    if (!entry) {
        return;
    }
    stopPlayback();
    if (!restoreBaseLevelState({ obscure: false })) {
        return;
    }
    const flattened = flattenRecordingEntries(entry.recording);
    if (flattened.length === 0) {
        return;
    }
    playbackQueue.value = flattened;
    currentStepIndex.value = 0;
    
    if (autoPlay) {
        isPlaybackActive.value = true;
        // Add a small delay before starting playback to ensure the view is ready
        setTimeout(stepPlaybackQueue, 500);
    } else {
        isPlaybackActive.value = false;
    }
};

const checkWinCondition = () => {
    if (gameState.value.particles.length === 0) {
        hasWon.value = true;
        // Trigger exit animation
        changeObscurityForAll(true, gameEntranceFocusAnimationRange);
    }
};

const moveParticle = (direction, options = {}) => {
    const { allowWhilePlayback = false, instant = false } = options;
    if (!selected.value) {
        return;
    }
    if (!allowWhilePlayback && !canInteract.value) {
        return;
    }
    const currentIndex = gameState.value.particles.findIndex(p => p === selected.value);
    let currentColor = gameState.value.particles[currentIndex].color;
    let currentRow = gameState.value.particles[currentIndex].row;
    let currentColumn = gameState.value.particles[currentIndex].column;
    let currentId = gameState.value.particles[currentIndex].id;
    let currentNode = document.getElementById(currentId);
    if (currentIndex !== -1) {
        switch (direction) {
            case 'up':
                currentRow -= 1;
                break;
            case 'down':
                currentRow += 1;
                break;
            case 'left':
                currentColumn -= 1;
                break;
            case 'right':
                currentColumn += 1;
                break;
        }
    }
    const isValid = isMoveValid(currentColor, currentId, { row: currentRow, column: currentColumn });
    if (isValid) {
        stepsCounter.value++;
        gameState.value.particles[currentIndex].row = currentRow;
        gameState.value.particles[currentIndex].column = currentColumn;
        
        // If instant, we skip animations and timeouts
        const duration = instant ? 0 : gameDropoutAnimationDuration;
        const transportDuration = instant ? 0 : gameTransportAnimationDuration;
        const defaultDuration = instant ? 0 : gameDefaultAnimationDuration;

        if (getParticlesAt(currentRow, currentColumn).length >= 2) {
            disableInteraction.value = !instant;
            selected.value = null;

            const collidingParticles = getParticlesAt(currentRow, currentColumn);
            if (!instant) collidingParticles.forEach(particle => particle.colliding = true);
            if (!instant) collapseContainerAt(currentRow, currentColumn);
            if (hasPortalAt(currentRow, currentColumn)) {
                const otherPortalCoord = getOtherPortal(currentRow, currentColumn);
                if (!instant) makeBoardFrom(otherPortalCoord.row, otherPortalCoord.column);
            }

            if (instant) {
                 updateMapAfterCollision(currentRow, currentColumn);
            } else {
                setTimeout(() => {
                    try {
                        updateMapAfterCollision(currentRow, currentColumn);
                    } finally {
                        disableInteraction.value = false;
                    }
                }, duration);
            }
        }
        else if (hasPortalAt(currentRow, currentColumn)) {
            disableInteraction.value = !instant;
            
            const handlePortalLogic = () => {
                if (!instant) isCustomAnimating.value = true;
                const otherPortalCoord = getOtherPortal(currentRow, currentColumn);
                if (!instant) createShadowParticleFrom(currentNode);
                gameState.value.particles[currentIndex].row = otherPortalCoord.row;
                gameState.value.particles[currentIndex].column = otherPortalCoord.column;

                if (hasParticleWithColorAt(otherPortalCoord.row, otherPortalCoord.column, negateColor(currentColor))) {
                    selected.value = null;
                    const collidingParticles = getParticlesAt(otherPortalCoord.row, otherPortalCoord.column);
                    if (!instant) collidingParticles.forEach(particle => particle.colliding = true);
                    if (!instant) collapseContainerAt(otherPortalCoord.row, otherPortalCoord.column);
                    if (!instant) makeBoardFrom(currentRow, currentColumn);

                    if (instant) {
                        updateMapAfterCollision(otherPortalCoord.row, otherPortalCoord.column);
                    } else {
                        setTimeout(() => {
                            try {
                                isCustomAnimating.value = false;
                                updateMapAfterCollision(otherPortalCoord.row, otherPortalCoord.column);
                            } finally {
                                disableInteraction.value = false;
                            }
                        }, duration);
                    }
                }
                else {
                    if (!instant) currentNode.classList.add('particle--transported');
                    if (instant) {
                         // No op
                    } else {
                        setTimeout(() => {
                            isCustomAnimating.value = false;
                            currentNode.classList.remove('particle--transported');
                            disableInteraction.value = false;
                        }, transportDuration);
                    }
                }
            };

            if (instant) {
                handlePortalLogic();
            } else {
                setTimeout(handlePortalLogic, defaultDuration);
            }
        }
    }
    else {
        if (!instant) {
            disableInteraction.value = true;
            isCustomAnimating.value = true;
            animateInvalidMove(currentId, direction)
                .onFinish(() => {
                    isCustomAnimating.value = false;
                    disableInteraction.value = false;
                });
        }
    }
};

const containersWithAttr = computed(() => {
    return gameState.value.containers.map(item => {
        const position = getPositionForContainers(item);
        return {
            ...item,
            style: position.style,
            className: position.className
        };
    });
});

const { width, height } = useElementBounding(refViewPort);
const additionalCenteringOffset = computed(() => {
    return {
        x: (width.value - levelMapGridScalePx.value * (mapSize.value.columns)) / 2,
        y: (height.value - levelMapGridScalePx.value * (mapSize.value.rows)) / 2
    };
})

const getPositionForContainers = (item) => {
    item.classes = [];
    item.classes.push(item.type);
    if (hasBoardAt(item.row - 1, item.column)) item.classes.push('board--occupied-top');
    if (hasBoardAt(item.row + 1, item.column)) item.classes.push('board--occupied-bottom');
    if (hasBoardAt(item.row, item.column - 1)) item.classes.push('board--occupied-left');
    if (hasBoardAt(item.row, item.column + 1)) item.classes.push('board--occupied-right');
    const left = (item.column) * levelMapGridScalePx.value;
    const top = (item.row) * levelMapGridScalePx.value;
    return {
        style:
        {
            position: 'absolute',
            left: `${left + panningOffset.value.x + additionalCenteringOffset.value.x}px`,
            top: `${top + panningOffset.value.y + additionalCenteringOffset.value.y}px`,
            ...(item.type === 'portal' ? {
                background: hexaToRgba(levelPortalCycleColor[item.index], levelMapPortalBackgroundAlpha),
                border: `1px solid ${hexaToRgba(levelPortalCycleColor[item.index], levelMapPortalBackgroundAlpha * 3)}`,
                borderRadius: `0.625rem`
            } : {}),
            transition: doSmoothAnimate.value ? `all ${gameDefaultAnimationDuration}ms ease-out` : 'none'
        },
        className: item.classes.join(' ')
    };
};
const getPositionForParticles = (item) => {
    const left = (item.column) * levelMapGridScalePx.value;
    const top = (item.row) * levelMapGridScalePx.value;
    return {
        position: 'absolute',
        left: `${left + panningOffset.value.x + additionalCenteringOffset.value.x}px`,
        top: `${top + panningOffset.value.y + additionalCenteringOffset.value.y}px`,
        transition: doSmoothAnimate.value ? `all ${gameDefaultAnimationDuration}ms ease-out` : 'none'
    };
};

const getRandomSequenceWithinRange = ({min, max}, length) => {
    assert(length > 0);
    const sequence = [];
    for (let i = 0; i < length; i++) {
        sequence.push(randomFloatFromInterval(min, max));
    }
    const curMin = Math.min(...sequence);
    const curMax = Math.max(...sequence);
    sequence.forEach((item, index) => {
        sequence[index] = min + (item - curMin) / (curMax - curMin) * (max - min);
    });
    return sequence;
} 

const changeObscurityForAll = (value, delayRange) => {
    const length = gameState.value.particles.length + gameState.value.containers.length;
    const randomDelaySequence = getRandomSequenceWithinRange(delayRange, length);
    [gameState.value.particles, gameState.value.containers].flat()
        .forEach((obj, index) => {
            setTimeout(() => {
                obj.obscure = value;
            }, randomDelaySequence[index]);
        });
}

onMounted(async () => {
    isStartingAnimation.value = false;
    disableInteraction.value = false;
    
    const recordingId = router.currentRoute.value.query.recordingId;
    let entry = null;
    if (recordingId) {
        entry = levelRecordings.value.find((rec) => rec.id === recordingId);
    }

    await loadLevelConfig(entry);

    if (responseCode.value === 200) {
        stepsCounter.value = 0;
        initializeRuntimeState(false);
        if (entry) {
            startPlayback(entry, false);
        }
    }
});

onBeforeUnmount(() => {
    selected.value = null;
    stopPlayback();
});

const handleGoBack = () => {
    router.go(-1);
}

</script>

<template>
    <ion-icon name="arrow-back-circle-outline" class="back-to-home-btn a-fade-in" @click="handleGoBack"></ion-icon>
    <div class="viewport" @mousedown.middle.prevent="onPanStartWrapper" @mouseup.middle.prevent="onPanEndWrapper"
        @mouseleave="onPanEndWrapper" ref="refViewPort">
        <div class="steps-complex a-fade-in" v-show="!isStartingAnimation">
            <div class="steps-wrapper u-rel">
                <span class="steps-complex__steps-count">{{ stepsCounter }}</span>
                <span class="steps-complex__steps-label" v-if="stepsGoal">/</span>
                <span class="steps-complex__steps-aim" v-if="stepsGoal">{{ stepsGoal }}</span>
                <div class="u-rel u-gap-14"></div>
                <ion-button name="refresh-outline" size="1.6rem" class="reset-btn"
                    @click="router.go(0)"></ion-button>
            </div>
        </div>
        <h1 class="viewport__level-name a-fade-in" v-show="isStartingAnimation">{{ name }}</h1>

        <div class="playback-controls a-fade-in" v-show="!isStartingAnimation">
            <ion-button name="play-skip-back-outline" size="1.6rem" @click="goToStart"></ion-button>
            <ion-button name="chevron-back-outline" size="1.6rem" @click="stepBackward" :disabled="currentStepIndex <= 0"></ion-button>
            <ion-button :name="isPlaybackActive ? 'pause-outline' : 'play-outline'" size="2rem" @click="togglePlayback"></ion-button>
            <ion-button name="chevron-forward-outline" size="1.6rem" @click="stepForward" :disabled="currentStepIndex >= playbackQueue.length"></ion-button>
            <ion-button name="play-skip-forward-outline" size="1.6rem" @click="goToEnd"></ion-button>
        </div>

        <div v-for="(container, index) in containersWithAttr" :key="container.id" :style="container.style"
            class="container" :class="{
                ['container--' + container.className]: true,
                'obscure': container.obscure,
                'a-fade-in-raw': isStartingAnimation,
                'a-delay-12': isStartingAnimation
            }" :id="container.id">
        </div>
        <div v-for="particle in gameState.particles" :key="particle.id" :style="getPositionForParticles(particle)"
            class="particle" :class="{
                ['particle--' + particle.color]: true,
                ['particle--' + 'active']: selected === particle,
                'particle--collided': particle.colliding,
                'obscure': particle.obscure,
                'a-fade-in-raw': isStartingAnimation,
                'a-delay-12': isStartingAnimation
            }" :id="particle.id">
        </div>

        <div class="end-info-container" v-show="hasWon">
            <h1 class="end-info-container__rank a-fade-in a-delay-12" :class="{
                'end-info-container__rank--perfect': stepsCounter <= stepsGoal,
                'end-info-container__rank--pass': stepsCounter > stepsGoal
            }"
            v-if="stepsGoal">{{ stepsCounter <= stepsGoal ? 'Perfect' : 'Pass' }}</h1>
            <h2 class="end-info-container__score a-fade-in a-delay-4" v-if="stepsGoal"
            >Your score: <span>
                    {{ stepsCounter }}/{{ stepsGoal }}
                </span></h2>
            <div class="end-info__button-group">
                <ion-button name="refresh-outline" class="a-fade-in a-delay-12"
                    @click="router.go(0)"></ion-button>
                <ion-button name="chevron-back-outline" class="a-fade-in a-delay-16"
                    @click="handleGoBack"></ion-button>
            </div>
        </div>

        <div class="bad-responses-container" v-if="responseCode !== 200">
            <h1 class="a-fade-in" v-if="responseCode === 404">Map is not found</h1>
        </div>
    </div>
</template>

<style lang="scss" scoped>

.ion-icon {
    visibility: visible;
}

.back-to-home-btn {
    position: fixed;
    left: 0;
    top: 0;
    font-size: 2rem;
    margin: 2rem;
    cursor: pointer;
    transition: all 0.3s;
    z-index: 2;
    pointer-events: auto;

    &:hover {
        color: $n-primary;
        scale: 1.04;
    }
}

.steps-complex {
    position: absolute;
    left: 50%;
    top: 1rem;
    font-family: "Electrolize", serif;
    transition: all 0.3s;
    z-index: 10;

    .steps-wrapper {
        transform: translateX(-50%);
        display: flex;
        align-items: baseline;

        .steps-complex__steps-count {
            font-size: 1.5rem;
            color: $n-primary;
        }

        .steps-complex__steps-label {
            margin: 0.25rem;
        }

        .reset-btn {
            margin: auto 0;
        }
    }
}

.playback-controls {
    position: absolute;
    bottom: 2rem;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    gap: 1rem;
    align-items: center;
    z-index: 10;
    background: rgba(0, 0, 0, 0.5);
    padding: 0.5rem 1.5rem;
    border-radius: 2rem;
    backdrop-filter: blur(5px);
}

.viewport {
    position: relative;
    display: flex;
    flex-direction: column;
    top: 0;
    left: 0;
    width: 80vw;
    height: 80vh;
    outline: 1px white solid;
    align-items: center;
    justify-content: center;

    h1.viewport__level-name {
        font-family: "Electrolize", serif;
        font-size: $level-name-font-size;
        text-transform: uppercase;
        font-variant-caps: small-caps;
        letter-spacing: $level-name-letter-spacing;

        animation-duration: $game-entrance-title-animation-duration;
    }

    .container {
        width: calc($level-map-grid-scale - $level-map-board-border-width * 2);
        height: calc($level-map-grid-scale - $level-map-board-border-width * 2);

        &.container--collapse {
            animation: fadeOut $game-dropout-animation-duration forwards;
        }

        &.container--becoming-board {
            transition: all $game-dropout-animation-duration ease-out !important;
            background: $level-map-board-background-color !important;
            border: $level-map-board-border-width solid $level-map-board-border-color !important;
            border-radius: 0 !important;
        }

        &.container--board {
            border-top-left-radius: $level-map-board-border-radius;
            border-top-right-radius: $level-map-board-border-radius;
            border-bottom-left-radius: $level-map-board-border-radius;
            border-bottom-right-radius: $level-map-board-border-radius;
            background: $level-map-board-background-color;
            border: $level-map-board-border-width solid $level-map-board-border-color;

            &.board--occupied-top {
                border-top-left-radius: 0;
                border-top-right-radius: 0;
            }

            &.board--occupied-bottom {
                border-bottom-left-radius: 0;
                border-bottom-right-radius: 0;
            }

            &.board--occupied-left {
                border-top-left-radius: 0;
                border-bottom-left-radius: 0;
            }

            &.board--occupied-right {
                border-top-right-radius: 0;
                border-bottom-right-radius: 0;
            }
        }

    }

    .particle {
        width: $level-map-particle-diameter;
        height: $level-map-particle-diameter;
        border-radius: 50%;
        transform: translate(calc(-50% + $level-map-grid-scale / 2), calc(-50% + $level-map-grid-scale / 2));
        transform-origin: calc($level-map-grid-scale / 2) calc($level-map-grid-scale / 2);

        &.particle--red {
            background: $level-map-positron-background-color;
            border: $level-map-particle-border-width solid $level-map-positron-border-color;
        }

        &.particle--blue {
            background: $level-map-electron-background-color;
            border: $level-map-particle-border-width solid $level-map-electron-border-color;
        }

        &.particle--active {
            opacity: 1;
            border: none;
            filter: brightness(125%);

            &::after {
                position: absolute;
                content: '';
                top: calc(($level-map-particle-diameter - $level-map-active-particle-ring-diameter) / 2 - $level-map-active-particle-ring-weight);
                left: calc(($level-map-particle-diameter - $level-map-active-particle-ring-diameter) / 2 - $level-map-active-particle-ring-weight);
                width: $level-map-active-particle-ring-diameter;
                height: $level-map-active-particle-ring-diameter;
                border-radius: 50%;
            }

            &.particle--blue::after {
                border: $level-map-active-particle-ring-weight solid $level-map-active-electron-border-color;
            }

            &.particle--red::after {
                border: $level-map-active-particle-ring-weight solid $level-map-active-positron-border-color;
            }
        }

        &.particle--collided {
            background-color: rgba($color: $n-primary, $alpha: 0.25);
            animation: fadeOutAndGrow $game-dropout-animation-duration forwards;
        }

        &.particle--transported {
            animation: growAndBounceBack $game-transport-animation-duration forwards ease-out;
        }

    .shadow-particle {
            animation: shrink $game-transport-animation-duration forwards ease-in;
        }
    }
}

.end-info-container {
    display: flex;
    flex-direction: column;
    z-index: 20;

    h1,
    h2 {
        margin: 0;
    }

    h1.end-info-container__rank {
        font-family: "Electrolize", serif;
        font-size: $level-end-info-rank-font-size;
        text-transform: uppercase;
        letter-spacing: $level-end-info-rank-letter-spacing;
        color: $n-primary;

        margin-bottom: 1.2rem;

        &.end-info-container__rank--perfect {
            color: $level-map-rank-perfect-color;
        }

        &.end-info-container__rank--pass {
            color: $level-map-rank-pass-color;
        }
    }

    h2 {
        font-family: "Electrolize", serif;
        font-size: $level-end-info-score-font-size;
        letter-spacing: $level-end-info-score-letter-spacing;

        margin-bottom: 2rem;
    }

    .end-info__button-group {
        display: flex;
        width: 100%;
        justify-content: space-between;
        align-items: center;
    }
}

// Utility classes come last
.obscure {
    filter: blur(0.5rem);
    opacity: 0 !important;
}

.obscure-fade-out {
    animation: blurAndFadeOut forwards;
}
</style>
