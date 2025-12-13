<script setup>
//: Vue Imports
import { useRouter } from 'vue-router';
import { assert, useElementBounding } from '@vueuse/core';
import axios from 'axios';
const router = useRouter();

//: Custom Data and Components
import IonButton from '@/components/IonButton.vue';
import { levelMapGridScalePx, SERVER_URL } from "@/data/constants"
import { gameDefaultAnimationDuration } from "@/data/constants";
import { gameEntranceFocusAnimationRange } from "@/data/constants";
import { useRecordingsStore } from '@/functions/useRecordings';
import { getCustomLevelById } from '@/functions/useAccount';
import { useHotkeyBindings } from '@/functions/useHotkeys';
import { triggerBack, useBackHandler } from '@/functions/useBackNavigation';
import { overrideHotkeyOverlayConfig } from '@/data/hotkeyOverlayConfig';
import { useLevelGame } from '@/functions/useLevelGame';

const recordingsStore = useRecordingsStore();
const isPlaybackActive = ref(false);
const playbackQueue = ref([]);
const playbackTimeoutHandle = ref(null);
const currentStepIndex = ref(0);

//: Map Setup
const responseCode = ref(0);
const currentRoute = router.currentRoute.value;
const levelId = currentRoute.params.levelId || currentRoute.params.uuid; // Handle both

const refViewPort = ref(null);
const isStartingAnimation = ref(false);

//: Panning and Centering
import { usePanning } from "@/functions/usePanning";
const { panningOffset, onPanStart, onPanEnd } = usePanning(refViewPort);

const { width, height } = useElementBounding(refViewPort);
const additionalCenteringOffset = computed(() => {
    return {
        x: (width.value - levelMapGridScalePx.value * (mapSize.value.columns)) / 2,
        y: (height.value - levelMapGridScalePx.value * (mapSize.value.rows)) / 2
    };
});

const {
    gameState,
    mapSize,
    stepsCounter,
    stepsGoal,
    isLevelLoaded,
    isPanning,
    isCustomAnimating,
    disableInteraction,
    hasWon,
    selected,
    baseLevelDefinition,
    name,
    author,
    canInteract,
    doSmoothAnimate,
    loadLevelFromString,
    initializeRuntimeState,
    restoreBaseLevelState,
    moveParticle,
    containersWithAttr,
    getPositionForParticles,
    changeObscurityForAll,
} = useLevelGame(refViewPort, panningOffset, additionalCenteringOffset);

const levelRecordings = computed(() => {
    const entries = recordingsStore.value[levelId];
    return Array.isArray(entries) ? entries : [];
});

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

const onPanStartWrapper = (event) => {
    isPanning.value = true;
    onPanStart(event);
};

const onPanEndWrapper = () => {
    onPanEnd();
    isPanning.value = false;
};

const stopPlayback = () => {
    isPlaybackActive.value = false;
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

useBackHandler(() => {
    handleGoBack();
    return true;
});

//: Hotkey Bindings

overrideHotkeyOverlayConfig({
    groups: {
        'playback-controls': {
            rowOffset: 50,
        },
    },
})

useHotkeyBindings('playback', {
    'playback.play-pause': ({ event }) => {
        event.preventDefault();
        togglePlayback();
    },
    'playback.goto-beginning': ({ event }) => {
        event.preventDefault();
        goToStart();
    },
    'playback.goto-end': ({ event }) => {
        event.preventDefault();
        goToEnd();
    },
    'playback.step-backward': ({ event }) => {
        event.preventDefault();
        stepBackward();
    },
    'playback.step-forward': ({ event }) => {
        event.preventDefault();
        stepForward();
    },
    'playback.reset': ({ event }) => {
        event.preventDefault();
        goToStart();
    },
});

</script>

<template>
    <div class="viewport" @mousedown.middle.prevent="onPanStartWrapper" @mouseup.middle.prevent="onPanEndWrapper"
        @mouseleave="onPanEndWrapper" ref="refViewPort">
        <div class="steps-complex a-fade-in" v-show="!isStartingAnimation">
            <div class="steps-wrapper u-rel">
                <span class="steps-complex__steps-count">{{ stepsCounter }}</span>
                <span class="steps-complex__steps-label" v-if="stepsGoal">/</span>
                <span class="steps-complex__steps-aim" v-if="stepsGoal">{{ stepsGoal }}</span>
                <div class="u-rel u-gap-14"></div>
                <ion-button name="refresh-outline" size="1.6rem" class="reset-btn"
                    @click="goToStart()"
                    data-hotkey-target="playback.reset"
                    data-hotkey-label="Reset"
                ></ion-button>
            </div>
        </div>
        <h1 class="viewport__level-name a-fade-in" v-show="isStartingAnimation">{{ name }}</h1>

        <div class="playback-controls a-fade-in" v-show="!isStartingAnimation">
            <ion-button
                name="play-skip-back-outline"
                size="1.6rem"
                data-hotkey-target="playback.goto-beginning"
                data-hotkey-label="Go to start"
                data-hotkey-group="playback-controls"
                data-hotkey-group-side="top right"
                data-hotkey-label-position="inline"
                @click="goToStart"
            ></ion-button>
            <ion-button
                name="chevron-back-outline"
                size="1.6rem"
                data-hotkey-target="playback.step-backward"
                data-hotkey-label="Step backward"
                data-hotkey-group="playback-controls"
                data-hotkey-group-side="top right"
                data-hotkey-label-position="inline"
                @click="stepBackward"
                :disabled="currentStepIndex <= 0"
            ></ion-button>
            <ion-button
                :name="isPlaybackActive ? 'pause-outline' : 'play-outline'"
                size="2rem"
                data-hotkey-target="playback.play-pause"
                data-hotkey-label="Play or pause"
                data-hotkey-group="playback-controls"
                data-hotkey-group-side="top right"
                data-hotkey-label-position="inline"
                @click="togglePlayback"
            ></ion-button>
            <ion-button
                name="chevron-forward-outline"
                size="1.6rem"
                data-hotkey-target="playback.step-forward"
                data-hotkey-label="Step forward"
                data-hotkey-group="playback-controls"
                data-hotkey-group-side="top right"
                data-hotkey-label-position="inline"
                @click="stepForward"
                :disabled="currentStepIndex >= playbackQueue.length"
            ></ion-button>
            <ion-button
                name="play-skip-forward-outline"
                size="1.6rem"
                data-hotkey-target="playback.goto-end"
                data-hotkey-label="Go to end"
                data-hotkey-group="playback-controls"
                data-hotkey-group-side="top right"
                data-hotkey-label-position="inline"
                @click="goToEnd"
            ></ion-button>
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
                    @click="goToStart()"></ion-button>
                <ion-button name="chevron-back-outline" class="a-fade-in a-delay-16"
                    @click="triggerBack"></ion-button>
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
