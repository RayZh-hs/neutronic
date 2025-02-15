<script setup>
//: Vue Imports
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { hexaToRgba } from "../functions/colorUtils";
import { useElementBounding, useSessionStorage } from '@vueuse/core';
import axios from 'axios';
const router = useRouter();

//: Custom Data and Components
import IonButton from '@/components/IonButton.vue';
import { levelMapGridScaleRem, levelMapGridScalePx, SERVER_URL } from "@/data/constants"
import { levelPortalCycleColor, levelMapPortalBackgroundAlpha, gameDefaultAnimationDuration, gameDropoutAnimationDuration } from "@/data/constants";
import { gameEntranceTitleAnimationDuration, gameEntranceFocusAnimationRange } from "@/data/constants";
import { refAnimateToObject, easeNopeGenerator } from '@/functions/animateUtils';
import { randomIntFromInterval } from '@/functions/mathUtils';

const levelViewConfig = useSessionStorage('level-view-config', {});

//: Map Setup
const responseCode = ref(0);
const name = ref('');
const author = ref('');
const stepsGoal = ref(0);
const currentBest = ref(null);
const levelId = router.currentRoute.value.params.levelId;
const gameState = ref({ containers: [], particles: [] });
const mapSize = ref({ rows: 0, columns: 0 });

const selected = ref(null);
const stepsCounter = ref(0);

const refViewPort = ref(null);

const isLevelLoaded = ref(false);
const isPanning = ref(false);
const isCustomAnimating = ref(false);
const isStartingAnimation = ref(false);
// const isEndingAnimation     = ref(false);
const disableInteraction = ref(false);
const hasWon = ref(false);

const canInteract = computed(() => isLevelLoaded.value && !isPanning.value && !disableInteraction.value);
const doSmoothAnimate = computed(() => isLevelLoaded.value && !isPanning.value && !isCustomAnimating.value);

const loadLevelFromString = (levelString) => {
    name.value = levelString.meta.name;
    author.value = levelString.meta.author;
    mapSize.value = {
        rows: levelString.meta.rows,
        columns: levelString.meta.columns
    }
    console.log("map size:", mapSize);
    console.log("level config:", levelString);
    gameState.value.containers = JSON.parse(JSON.stringify(levelString.content.containers));
    gameState.value.particles = JSON.parse(JSON.stringify(levelString.content.particles));
    stepsGoal.value = levelString.content.goal;
    isLevelLoaded.value = true;
}

const loadLevelConfig = async () => {
    console.log({ levelViewConfig })
    if ((levelViewConfig.value.context) !== 'editor') {
        // let levelConfig = await import(`../data/maps/${levelId}.json`);
        console.log(SERVER_URL + '/level?levelId=' + String(levelId));
        await axios
            .get(SERVER_URL + '/level?levelId=' + String(levelId))
            .then((res) => {
                console.log(res);
                responseCode.value = res.status;
                if (res.status == 200) {
                    // Response for ok, proceed on to loading the level
                    const levelConfig = res.data;
                    loadLevelFromString(levelConfig);
                }
                return res;
            })
            .catch((err) => {
                responseCode.value = err.status;
                console.log(err);
                return err;
            });
    }
    else {
        // Read from the config itself
        loadLevelFromString(levelViewConfig.value.levelData);
        responseCode.value = 200;
    }
};

//: Panning and Centering

// - tracking the panning offset
import { usePanning } from "@/functions/usePanning";
import { gameTransportAnimationDuration } from '../data/constants';
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
// - auxiliary functions
const existBoardAt = (r, c) => {
    return gameState.value.containers.some(item => item.row === r && item.column === c && item.type === 'board');
};
const existPortalAt = (r, c) => {
    return gameState.value.containers.some(item => item.row === r && item.column === c && item.type === 'portal');
};
const existContainerAt = (r, c) => {
    return gameState.value.containers.some(item => item.row === r && item.column === c);
};
const existParticleAt = (r, c) => {
    return gameState.value.particles.some(item => item.row === r && item.column === c);
};
const existParticleWithColorAt = (r, c, color) => {
    return gameState.value.particles.some(item => item.row === r && item.column === c && item.color === color);
};
const getPortalIndexAt = (r, c) => {
    return gameState.value.containers.find(item => item.row === r && item.column === c)?.index;
};
const getOtherPortal = (r, c) => {
    const index = getPortalIndexAt(r, c);
    if (index === undefined) return null;
    else return gameState.value.containers.find(item => item.index === index && (item.row !== r || item.column !== c));
}
const getParticlesAt = (r, c) => {
    return gameState.value.particles.filter(item => item.row === r && item.column === c);
}
const getParticleAt = (r, c) => {
    return gameState.value.particles.find(item => item.row === r && item.column === c);
}
const getContainerAt = (r, c) => {
    return gameState.value.containers.find(item => item.row === r && item.column === c);
}
const negateColor = (color) => {
    return color === 'red' ? 'blue' : 'red';
};

const isMoveValid = (currentColor, currentId, newPos) => {
    if (!existContainerAt(newPos.row, newPos.column)) return false;
    if (existParticleWithColorAt(newPos.row, newPos.column, currentColor)) return false;
    if (existPortalAt(newPos.row, newPos.column)) {
        const otherPortal = getOtherPortal(newPos.row, newPos.column);
        // console.log(otherPortal);
        // console.log("current id: ", currentId);
        // console.log("getParticleAt: ", getParticleAt(otherPortal.row, otherPortal.column));
        if (existParticleWithColorAt(otherPortal.row, otherPortal.column, currentColor) && getParticleAt(otherPortal.row, otherPortal.column).id != currentId) return false;
    }
    return true;
}

const handleKeydown = (event) => {
    const keyMapping = {
        'ArrowUp': 'up',
        'ArrowDown': 'down',
        'ArrowLeft': 'left',
        'ArrowRight': 'right'
    }
    if (keyMapping[event.key]) moveParticle(keyMapping[event.key]);
};
const updateMapAfterCollision = (r, c) => {

    if (existPortalAt(r, c)) {
        // Turn the other portal into a board
        const otherPortal = getOtherPortal(r, c);
        otherPortal.type = 'board';
    }

    gameState.value.containers = gameState.value.containers.filter(item => item.row !== r || item.column !== c);
    gameState.value.particles = gameState.value.particles.filter(particle => particle.row !== r || particle.column !== c);

    selected.value = null;
    updateHasWon();
};

const animateInvalidMove = (particleId, direction) => {
    let onFinishCallback = () => { };
    const refOffset = ref({ x: 0, y: 0 });
    const shakeOffset = levelMapGridScalePx;
    const selectedParticleDOM = document.getElementById(particleId);
    console.log({ particleId })
    console.log({ selectedParticleDOM });
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
        { x: 0, y: 0 }  // final snap to starting point
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
    // console.log(shadowParticleNode);
    refViewPort.value.appendChild(shadowParticleNode);
}
const collapseContainerAt = (r, c) => {
    const container = getContainerAt(r, c);
    // console.log(container);
    if (container) {
        const containerNode = document.getElementById(container.id);
        containerNode.classList.add('container--collapse');
        // console.log(containerNode);
    }
}
const makeBoardFrom = (r, c) => {
    const container = getContainerAt(r, c);
    if (container) {
        const containerNode = document.getElementById(container.id);
        containerNode.classList.add('container--becoming-board');
    }
}
const updateHasWon = () => {
    console.log("particles: ", gameState.value.particles.length);
    if (gameState.value.particles.length === 0) {
        hasWon.value = true;
        if (levelViewConfig.value.context === 'album') {
            accountInsertHasWon();
        }
        currentBest.value = currentBest ? stepsCounter.value : Math.min(currentBest, stepsCounter.value);
        triggerEndingAnimation();
    }
}
const triggerEndingAnimation = () => {
    changeObscurityForAll(true, gameEntranceFocusAnimationRange);
}

import { getAccountProgress, setAndPushAccountProgress } from '@/functions/useAccount';
const accountInsertHasWon = () => {
    const account = getAccountProgress();
    const rank = getGameRank();
    if (rank === 'Perfect' && !account.perfected.includes(levelId)) {
        account.perfected.push(levelId);
        account.lookup[levelViewConfig.value.albumName].perfected += 1;
        if (account.passed.includes(levelId)) {
            account.passed = account.passed.filter(item => item !== levelId);
            account.lookup[levelViewConfig.value.albumName].passed -= 1;
        }
    }
    else if (rank === 'Pass' && !account.passed.includes(levelId) && !account.perfected.includes(levelId)) {
        account.passed.push(levelId);
        account.lookup[levelViewConfig.value.albumName].passed += 1;
    }
    else { return }
    setAndPushAccountProgress(account);
}

const moveParticle = (direction) => {
    // if (!selected.value||isAnimating.value) {
    if (!selected.value || !canInteract.value) {
        return;
    }
    const currentIndex = gameState.value.particles.findIndex(p => p === selected.value);    // Not to be confused with ID
    console.log(currentIndex)
    let currentColor = gameState.value.particles[currentIndex].color;
    let currentRow = gameState.value.particles[currentIndex].row;
    let currentColumn = gameState.value.particles[currentIndex].column;
    let currentId = gameState.value.particles[currentIndex].id;
    let currentNode = document.getElementById(currentId);
    if (currentIndex !== -1) {  // -1 means that an error occurred
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
    // After this line, (currentRow, currentColumn) is the new position of the particle
    // const valid = gameState.value.containers.some(item => item.row === currentRow && item.column === currentColumn) && !gameState.value.particles.some(item => item.color === currentColor && item.row === currentRow && item.column === currentColumn);
    const isValid = isMoveValid(currentColor, currentId, { row: currentRow, column: currentColumn });
    if (isValid) {
        // Increment the steps counter
        stepsCounter.value++;
        // This drives the animation of the move
        gameState.value.particles[currentIndex].row = currentRow;
        gameState.value.particles[currentIndex].column = currentColumn;
        // Check for collision and/or portal
        if (getParticlesAt(currentRow, currentColumn).length >= 2) {
            // Since the move is valid, this must be a particle of a different color here
            disableInteraction.value = true;
            selected.value = null;

            const collidingParticles = getParticlesAt(currentRow, currentColumn);
            collidingParticles.forEach(particle => particle.colliding = true);
            collapseContainerAt(currentRow, currentColumn);
            if (existPortalAt(currentRow, currentColumn)) {
                const otherPortalCoord = getOtherPortal(currentRow, currentColumn);
                makeBoardFrom(otherPortalCoord.row, otherPortalCoord.column);
            }

            setTimeout(() => {

                updateMapAfterCollision(currentRow, currentColumn);
                disableInteraction.value = false;

            }, gameDropoutAnimationDuration);
        }
        else if (existPortalAt(currentRow, currentColumn)) {
            disableInteraction.value = true;
            setTimeout(() => {
                isCustomAnimating.value = true;
                // Two cases: either the other portal is empty, or the other one has a particle of a different color
                const otherPortalCoord = getOtherPortal(currentRow, currentColumn);
                // Create a shadow element here, and move the particle to the other portal
                createShadowParticleFrom(currentNode);
                // Move the current particle to the other portal
                gameState.value.particles[currentIndex].row = otherPortalCoord.row;
                gameState.value.particles[currentIndex].column = otherPortalCoord.column;

                if (existParticleWithColorAt(otherPortalCoord.row, otherPortalCoord.column, negateColor(currentColor))) {
                    // First clear the selection for correct visuals
                    selected.value = null;
                    // If the other portal has a particle of a different color, give the two particles a colliding effect
                    // All the animations are handled here
                    const collidingParticles = getParticlesAt(otherPortalCoord.row, otherPortalCoord.column);
                    collidingParticles.forEach(particle => particle.colliding = true);
                    collapseContainerAt(otherPortalCoord.row, otherPortalCoord.column);
                    // console.log("currentBoard: ", currentRow, currentColumn);
                    makeBoardFrom(currentRow, currentColumn);

                    setTimeout(() => {
                        // After the move, the smooth animation can be turned on
                        isCustomAnimating.value = false;
                        // Update the map after the collision
                        updateMapAfterCollision(otherPortalCoord.row, otherPortalCoord.column);
                        // Enable interaction after the animation is done
                        disableInteraction.value = false;
                    }, gameDropoutAnimationDuration);
                }
                else {
                    // If the other portal is empty, give the current particle a popping animation
                    currentNode.classList.add('particle--transported');

                    setTimeout(() => {
                        // After the move, the smooth animation can be turned on
                        isCustomAnimating.value = false;
                        currentNode.classList.remove('particle--transported');
                        // Enable interaction after the animation is done
                        disableInteraction.value = false;
                    }, gameTransportAnimationDuration);
                }
            }, gameDefaultAnimationDuration);   // This is the time for the particle to reach the portal
        }
    }
    else {
        // Create an animation for invalid move
        disableInteraction.value = true;
        isCustomAnimating.value = true;
        animateInvalidMove(currentId, direction)
            .onFinish(() => {
                isCustomAnimating.value = false;
                disableInteraction.value = false;
            });
    }
};
const handleSelectParticle = (particle) => {
    if (particle === selected.value) selected.value = null;
    else if (canInteract.value) { selected.value = particle; }
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
    // console.log(width.value, height.value, levelMapGridScalePx * (mapSize.value.rows));
    return {
        x: (width.value - levelMapGridScalePx * (mapSize.value.columns)) / 2,
        y: (height.value - levelMapGridScalePx * (mapSize.value.rows)) / 2
    };
})

const getPositionForContainers = (item) => {
    item.classes = [];
    item.classes.push(item.type);
    if (existBoardAt(item.row - 1, item.column)) item.classes.push('board--occupied-top');
    if (existBoardAt(item.row + 1, item.column)) item.classes.push('board--occupied-bottom');
    if (existBoardAt(item.row, item.column - 1)) item.classes.push('board--occupied-left');
    if (existBoardAt(item.row, item.column + 1)) item.classes.push('board--occupied-right');
    const left = (item.column) * levelMapGridScalePx;
    const top = (item.row) * levelMapGridScalePx;
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
    const left = (item.column) * levelMapGridScalePx;
    const top = (item.row) * levelMapGridScalePx;
    return {
        position: 'absolute',
        left: `${left + panningOffset.value.x + additionalCenteringOffset.value.x}px`,
        top: `${top + panningOffset.value.y + additionalCenteringOffset.value.y}px`,
        transition: doSmoothAnimate.value ? `all ${gameDefaultAnimationDuration}ms ease-out` : 'none'
    };
};

const changeObscurityForAll = (value, delayRange) => {
    // Give a random time offset before removing the blur
    [gameState.value.particles, gameState.value.containers].flat()
        .forEach(obj => {
            setTimeout(() => {
                // const particleNode = document.getElementById(`p-${index}`);
                // particleNode.classList.remove('obscure');
                obj.obscure = value;
            }, randomIntFromInterval(delayRange.min, delayRange.max));
        });
}
const getGameRank = () => {
    return stepsCounter.value <= stepsGoal.value ? 'Perfect' : 'Pass';
}

const restartGame = () => {
    router.go(0)
}
const gotoLevelSelect = () => {
    router.push(`/album/${router.currentRoute.value.params.id}`);
}
const gotoNextLevel = () => {
    router.replace(levelViewConfig.value.next)
    // refresh for the replacement to take effect
    setTimeout(() => {
        router.go(0);
    }, 100);
}

onMounted(async () => {
    hasWon.value = false;
    isStartingAnimation.value = true;
    disableInteraction.value = true;    // Wait for entrance animation to finish
    setTimeout(() => {
        while (!isLevelLoaded.value || responseCode.value !== 200) {
            if (responseCode.value === 404) {
                console.log("404");
                return;
            }
        }
        console.log("Level loaded");
        // Disable the blur effect
        changeObscurityForAll(false, gameEntranceFocusAnimationRange);
        setTimeout(() => {
            document.querySelector('.viewport__level-name').classList.add('obscure-fade-out');
            // Finally, enable interaction
            disableInteraction.value = false;
        }, gameEntranceFocusAnimationRange.min);
        setTimeout(() => {
            // This value, used in determining the v-show for the level name, is set to false last
            isStartingAnimation.value = false;
        }, gameEntranceFocusAnimationRange.max);
    }, gameEntranceTitleAnimationDuration);
    await loadLevelConfig();
    if (responseCode.value === 200) {
        console.log('after loading')
        stepsCounter.value = 0;

        console.log(gameState.value);
        gameState.value.particles.forEach((particle, index) => {
            particle.id = `p-${index}`;
            particle.obscure = true;
        });
        gameState.value.containers.forEach((container, index) => {
            container.id = `container-${index}`;
            container.obscure = true;
        });
        console.log(gameState.value);
        window.addEventListener('keydown', handleKeydown);
    }
});

onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeydown);
    selected.value = null;
});

const updateViewConfig = () => {
    if (levelViewConfig.value.context === 'editor') {
        levelViewConfig.value.context = 'finished';
        levelViewConfig.value.bestMovesCount = stepsCounter.value;
    }
}

const levelEditorConfig = useSessionStorage('levelEditorConfig', {
    newLevel: true,
    localFetch: false,
})
const handleGoBack = () => {
    if (levelViewConfig.value.context === 'editor') {
        updateViewConfig();
        levelEditorConfig.value = {
            newLevel: false,
            localFetch: true
        }
        router.push(router.currentRoute.value.fullPath.replace('/play/', '/edit/'));
    }
    else if (levelViewConfig.value.context === 'album') {
        gotoLevelSelect();
    }
    else {
        router.go(-1);
    }
}

</script>

<template>
    <ion-icon name="arrow-back-circle-outline" class="back-to-home-btn a-fade-in" @click="handleGoBack"></ion-icon>
    <div class="viewport" @mousedown.middle.prevent="onPanStartWrapper" @mouseup.middle.prevent="onPanEndWrapper"
        @mouseleave="onPanEndWrapper" ref="refViewPort">
        <div class="steps-complex a-fade-in" v-show="!isStartingAnimation && !hasWon">
            <div class="steps-wrapper u-rel">
                <span class="steps-complex__steps-count">{{ stepsCounter }}</span>
                <span class="steps-complex__steps-label" v-if="stepsGoal">/</span>
                <span class="steps-complex__steps-aim" v-if="stepsGoal">{{ stepsGoal }}</span>
                <div class="u-rel u-gap-14"></div>
                <ion-button name="refresh-outline" size="1.6rem" class="reset-btn"
                    @click="router.go(router.currentRoute.value)"></ion-button>
            </div>
        </div>
        <h1 class="viewport__level-name a-fade-in" v-show="isStartingAnimation">{{ name }}</h1>

        <div v-for="(container, index) in containersWithAttr" :key="container.id" :style="container.style"
            class="container" :class="{
                ['container--' + container.className]: true,
                'obscure': container.obscure,
                'a-fade-in-raw': isStartingAnimation,
                'a-delay-12': isStartingAnimation
            }" :id="container.id">
        </div>
        <div v-for="particle in gameState.particles" :key="particle.id" :style="getPositionForParticles(particle)"
            @click="handleSelectParticle(particle)" class="particle" :class="{
                ['particle--' + particle.color]: true,
                ['particle--' + 'active']: selected === particle,
                'particle--collided': particle.colliding,
                'obscure': particle.obscure,
                'a-fade-in-raw': isStartingAnimation,
                'a-delay-12': isStartingAnimation
            }" :id="particle.id">
        </div>
        <!-- <p style="position: absolute; top: 1rem">
            {{ panningOffset }}
            {{ mapSize }}
            {{ { isCustomAnimating, disableInteraction } }}
        </p> -->
        <!-- Messages shown when the game ends -->
        <div class="end-info-container" v-show="hasWon">
            <h1 class="end-info-container__rank a-fade-in a-delay-12" :class="{
                'end-info-container__rank--perfect': stepsCounter <= stepsGoal,
                'end-info-container__rank--pass': stepsCounter > stepsGoal
            }"
            v-if="stepsGoal">{{ getGameRank() }}</h1>
            <h2 class="end-info-container__score a-fade-in a-delay-4" v-if="stepsGoal"
                :style="{'margin-bottom': levelViewConfig.context === 'editor' ? '0.5rem' : 0}"
            >Your score: <span>
                    {{ stepsCounter }}/{{ stepsGoal }}
                </span></h2>
            <h2 v-if="levelViewConfig.context === 'editor'" class="a-fade-in a-delay-5">Current best: {{ currentBest }}</h2>
            <div class="end-info__button-group">
                <n-tooltip placement="bottom" raw style="color: var(--n-primary)">
                    <template #trigger>
                        <ion-button name="refresh-outline" class="a-fade-in a-delay-12"
                            @click="router.go(0)"></ion-button>
                    </template>
                    <span>Restart</span>
                </n-tooltip>
                <n-tooltip placement="bottom" raw style="color: var(--n-primary)" :disabled="levelViewConfig.context !== 'album'">
                    <template #trigger>
                        <ion-button name="apps-outline" class="a-fade-in a-delay-14"
                            @click="router.push('/album/$id'.replace('$id', router.currentRoute.value.params.id))"
                            :disabled="levelViewConfig.context !== 'album'"></ion-button>
                    </template>
                    <span>Level Select</span>
                </n-tooltip>
                <n-tooltip placement="bottom" raw style="color: var(--n-primary)" v-if="levelViewConfig.context === 'album'">
                    <template #trigger>
                        <ion-button name="chevron-forward-outline" class="a-fade-in a-delay-16"
                            @click="gotoNextLevel"></ion-button>
                    </template>
                    <span>Next Level</span>
                </n-tooltip>
                <n-tooltip placement="bottom" raw style="color: var(--n-primary)" v-else>
                    <template #trigger>
                        <ion-button name="chevron-back-outline" class="a-fade-in a-delay-16"
                            @click="handleGoBack"></ion-button>
                    </template>
                    <span>Back</span>
                </n-tooltip>
                <!-- <ion-button name="refresh-outline"></ion-button>
                <ion-button name="apps-outline"></ion-button>
                <ion-button name="chevron-forward-outline"></ion-button> -->
            </div>
        </div>

        <div class="bad-responses-container" v-if="responseCode !== 200">
            <h1 class="a-fade-in" v-if="responseCode === 404">Map is not found</h1>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.back-to-home-btn {
    position: fixed;
    left: 0;
    top: 0;
    font-size: 2rem;
    // margin: 2.6rem;
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
        // opacity: 1;

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
            // border-radius: var(--border-top-left-radius) var(--border-top-right-radius) var(--border-bottom-right-radius) var(--border-bottom-left-radius);
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
        // opacity: 0.85;

        // transition: all 0.2s ease-out;

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

        &.shadow-particle {
            animation: shrink $game-transport-animation-duration forwards ease-in;
        }

        &:hover:not(.particle--active) {
            scale: 1.1;
            // opacity: 0.9;
        }
    }
}

.end-info-container {
    display: flex;
    flex-direction: column;

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