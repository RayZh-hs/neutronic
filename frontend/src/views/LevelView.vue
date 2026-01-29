<script setup>
//: Vue Imports
import { useRouter } from 'vue-router';
import { assert, useElementBounding, usePointerSwipe, useSessionStorage } from '@vueuse/core';
const router = useRouter();

//: Custom Data and Components
import IonButton from '@/components/IonButton.vue';
import { levelMapGridScalePx, SERVER_URL } from "@/data/constants"
import { gameDefaultAnimationDuration } from "@/data/constants";
import { gameEntranceTitleAnimationDuration, gameEntranceFocusAnimationRange } from "@/data/constants";
import { useHotkeyBindings, useDigitInput } from '@/functions/useHotkeys';
import { triggerBack, useBackHandler } from '@/functions/useBackNavigation';
import { useDevice } from '@/functions/useDevice';
import { useLevelGame } from '@/functions/useLevelGame';
import { useTutorial } from '@/functions/useTutorial';
import { useLevelLoader } from '@/functions/useLevelLoader';
import { useLevelRecording } from '@/functions/useLevelRecording';
import { useLevelProgress } from '@/functions/useLevelProgress';

const levelViewConfig = useSessionStorage('level-view-config', {});
const fullLevelData = ref(null);

//: Map Setup
const currentRoute = router.currentRoute.value;
const routePath = currentRoute.path || currentRoute.fullPath || '';
const isCustomLevelRoute = routePath.startsWith('/custom/play');
const levelId = isCustomLevelRoute ? currentRoute.params.uuid : currentRoute.params.levelId;
const albumIndex = isCustomLevelRoute ? null : Number(currentRoute.params.id);

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
    isCollisionAnimating,
    hasWon,
    selected,
    baseLevelDefinition,
    name,
    author,
    canUndo,
    canInteract,
    doSmoothAnimate,
    loadLevelFromString,
    initializeRuntimeState,
    restoreBaseLevelState,
    moveParticle,
    undoLastMove,
    containersWithAttr,
    getPositionForParticles,
    changeObscurityForAll,
    focusPreviousParticle,
    focusNextParticle,
    toggleParticleFocus,
    focusParticleAtIndex,
    getParticleHotkey
} = useLevelGame(refViewPort, panningOffset, additionalCenteringOffset);

const {
    responseCode,
    currentBest,
    ensureContext,
    loadLevelConfig
} = useLevelLoader({
    levelViewConfig,
    levelId,
    isCustomLevelRoute,
    loadLevelFromString,
    fullLevelData
});

const {
    recordingSession,
    isPlaybackActive,
    playbackQueue,
    recording,
    levelRecordings,
    hasLocalPlayback,
    isRecordingActive,
    recordingButtonDisabled,
    playbackDropdownOptions,
    recordMove,
    undoLastRecordedMove,
    clearRecordingSession,
    handleRecordingCompletion,
    startRecordingSession,
    handleRecordButtonClick,
    stopPlayback,
    startPlayback,
    playLatestRecordingEntry
} = useLevelRecording({
    levelId,
    name,
    author,
    fullLevelData,
    gameState,
    selected,
    moveParticle,
    restoreBaseLevelState,
    disableInteraction,
    isCustomAnimating,
    isLevelLoaded
});

const triggerEndingAnimation = () => {
    changeObscurityForAll(true, gameEntranceFocusAnimationRange);
}

const {
    getGameRank,
    updateHasWon
} = useLevelProgress({
    gameState,
    hasWon,
    stepsCounter,
    stepsGoal,
    levelId,
    albumIndex,
    levelViewConfig,
    currentBest,
    triggerEndingAnimation,
    handleRecordingCompletion,
    ensureContext
});

const usingTutorial = useTutorial();
const context = usingTutorial.tutorialContext;

watch(selected, (newVal) => {
    context.userSelection.value = newVal;
}, { immediate: true });

watch(stepsCounter, (newVal) => {
    context.steps.value = newVal;
}, { immediate: true });

watch(() => gameState.value.particles.length, (newVal) => {
    context.particleCount.value = newVal;
}, { immediate: true });

watch(hasWon, (newVal) => {
    context.hasWon.value = newVal;
}, { immediate: true });



const onPanStartWrapper = (event) => {
    isPanning.value = true;
    onPanStart(event);
};

const onPanEndWrapper = () => {
    onPanEnd();
    isPanning.value = false;
};

watch(() => gameState.value.particles.length, (newLength) => {
    if (newLength === 0 && !hasWon.value) {
        updateHasWon();
    }
});

const handlePlaybackSelect = (key) => {
    router.push({
        path: `/playback/${levelId}`,
        query: { recordingId: key }
    });
};

const handleSelectParticle = (particle) => {
    if (isTouchDevice.value) return;
    if (particle === selected.value) selected.value = null;
    else if (canInteract.value && (!disableInteraction.value || isCollisionAnimating.value) && !particle.colliding && !particle.transporting) { selected.value = particle; }
};

const particleHotkeyKeys = computed(() => gameState.value.particles.map((p) => getParticleHotkey(p)));

useDigitInput({
    validKeys: particleHotkeyKeys,
    onMatch: (index) => focusParticleAtIndex(index)
});

const { isTouchDevice } = useDevice();

watchEffect(() => {
    const tutorialState = usingTutorial.tutorialState(levelId);
    context.currentLevelTutorialState.value = tutorialState;
});

watch(
    () => ({ x: panningOffset.value.x, y: panningOffset.value.y }),
    (next) => {
        if (context.panCount.value > 0) return;
        if (Math.hypot(next.x, next.y) > 24) context.panCount.value = 1;
    }
);

const swipeStartParticleId = ref(null);
usePointerSwipe(refViewPort, {
    threshold: 24,
    pointerTypes: ['touch'],
    disableTextSelect: true,
    onSwipeStart: (event) => {
        if (!isTouchDevice.value) return;
        const target = event.target;
        const particleNode = target?.closest?.('.particle');
        swipeStartParticleId.value = particleNode?.id ?? null;
    },
    onSwipeEnd: (_event, direction) => {
        if (!isTouchDevice.value) return;
        const particleId = swipeStartParticleId.value;
        swipeStartParticleId.value = null;

        if (!particleId || direction === 'none') return;
        if (!canInteract.value || (disableInteraction.value && !isCollisionAnimating.value) || hasWon.value) return;

        const particle = gameState.value.particles.find((p) => p.id === particleId);
        if (!particle || particle.colliding || particle.transporting) return;

        selected.value = particle;
        moveParticle(direction, { onMoveRecorded: recordMove });
        if (selected.value?.id === particleId) selected.value = null;
    },
});

const handleDirectionalHotkey = (direction, { event }) => {
    if (disableInteraction.value)   return;
    event.preventDefault();
    moveParticle(direction, { onMoveRecorded: recordMove });
};

const undoMove = (payload = {}) => {
    const event =
        payload instanceof Event
            ? payload
            : payload?.event instanceof Event
                ? payload.event
                : null;
    if (event) event.preventDefault?.();
    if (hasWon.value) return;
    if (!canInteract.value || (disableInteraction.value && !isCollisionAnimating.value)) return;
    if (isCustomAnimating.value) return;
    if (!undoLastMove()) return;
    undoLastRecordedMove();
    context.undoCount.value += 1;
};

const restartGame = () => {
    router.go(0);
}

let lastTapAt = 0;
let lastTapPos = null;
const DOUBLE_TAP_MAX_DELAY_MS = 320;
const DOUBLE_TAP_MAX_DISTANCE_PX = 24;

const isUndoTapTarget = (target) => {
    const el = target?.closest ? target : null;
    if (!el) return true;
    if (el.closest('.particle')) return false;
    if (el.closest('.steps-complex')) return false;
    if (el.closest('.end-info-container')) return false;
    if (el.closest('.bad-responses-container')) return false;
    return true;
};

const handleViewportTouchEnd = (event) => {
    if (!isTouchDevice.value) return;
    if (!event?.changedTouches || event.changedTouches.length !== 1) return;
    if (event.touches && event.touches.length > 0) return;
    if (!isUndoTapTarget(event.target)) {
        lastTapAt = 0;
        lastTapPos = null;
        return;
    }

    const touch = event.changedTouches[0];
    const now = Date.now();
    const pos = { x: touch.clientX, y: touch.clientY };
    const withinTime = now - lastTapAt <= DOUBLE_TAP_MAX_DELAY_MS;
    const withinDistance =
        lastTapPos &&
        Math.hypot(pos.x - lastTapPos.x, pos.y - lastTapPos.y) <= DOUBLE_TAP_MAX_DISTANCE_PX;

    if (withinTime && withinDistance) {
        event.preventDefault?.();
        lastTapAt = 0;
        lastTapPos = null;
        undoMove({ event });
        return;
    }

    lastTapAt = now;
    lastTapPos = pos;
};

onMounted(() => {
    const el = refViewPort.value;
    if (!el) return;
    el.addEventListener('touchend', handleViewportTouchEnd, { passive: false });
});

onBeforeUnmount(() => {
    const el = refViewPort.value;
    if (!el) return;
    el.removeEventListener('touchend', handleViewportTouchEnd);
});

const gotoLevelSelect = () => {
    if (albumIndex === null || Number.isNaN(albumIndex)) {
        router.push('/custom');
        return;
    }
    router.push(`/album/${albumIndex}`);
}
import { album } from '@/functions/useAlbum';
import TutorialHandler from '@/components/TutorialHandler.vue';
const gotoNextLevel = () => {
    assert(levelViewConfig.value.context === 'album');
    router.replace(levelViewConfig.value.next)
    // refresh the level view config
    levelViewConfig.value.next = (() => {
        const levelIndex = album
            .value[albumIndex]
            .content.findIndex(item => item.levelId === levelId);
        const totalIndexes = album.value[albumIndex].content.length;
        if (levelIndex >= totalIndexes - 2) {
            return `/album/${albumIndex}`;
        }
        else {
            return `/album/${albumIndex}/${album.value[albumIndex].content[levelIndex + 2].levelId}`;
        }
    })()
}

onMounted(async () => {
    hasWon.value = false;
    context.hasWon.value = false;
    context.tutorialStageId.value = 'none:none';
    context.userSelection.value = null;
    context.steps.value = 0;
    context.panCount.value = 0;
    context.undoCount.value = 0;
    context.isStartingAnimation.value = true;
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
            context.isStartingAnimation.value = false;
        }, gameEntranceFocusAnimationRange.max);
    }, gameEntranceTitleAnimationDuration);
    await loadLevelConfig();
    if (responseCode.value === 200) {
        console.log('after loading')
        stepsCounter.value = 0;

        console.log(gameState.value);
        initializeRuntimeState(true);
        console.log(gameState.value);
    }
});

onBeforeUnmount(() => {
    selected.value = null;
    stopPlayback();
});

const updateViewConfig = () => {
    if (levelViewConfig.value.context === 'editor') {
        levelViewConfig.value.context = 'finished';
        levelViewConfig.value.bestMovesCount = currentBest.value;
        levelViewConfig.value.recording = recording.value;
    }
}

const levelEditorConfig = useSessionStorage('level-editor-config', {
    loadFromLevelView: false,
})
const handleGoBack = () => {
    if (levelViewConfig.value.context === 'editor') {
        updateViewConfig();
        levelEditorConfig.value = {
            loadFromLevelView: true
        }
        router.push(router.currentRoute.value.fullPath.replace('/play/', '/edit/'));
    }
    else if (levelViewConfig.value.context === 'album') {
        gotoLevelSelect();
    }
    else if (levelViewConfig.value.context === 'custom') {
        router.push('/custom');
    }
    else {
        router.go(-1);
    }
}

useBackHandler(() => {
    handleGoBack();
    return true;
});

const disableUndoButton = computed(() => {
    return !canUndo.value || hasWon.value || !canInteract.value || (disableInteraction.value && !isCollisionAnimating.value) || isCustomAnimating.value || isPlaybackActive.value;
})

const activeHotkeyContext = computed(() => (hasWon.value ? 'level.on-finish' : 'level'));

useHotkeyBindings(activeHotkeyContext, {
    'level.up': (payload) => handleDirectionalHotkey('up', payload),
    'level.down': (payload) => handleDirectionalHotkey('down', payload),
    'level.left': (payload) => handleDirectionalHotkey('left', payload),
    'level.right': (payload) => handleDirectionalHotkey('right', payload),
    'level.previous-particle': ({ event }) => {
        event.preventDefault();
        focusPreviousParticle();
    },
    'level.next-particle': ({ event }) => {
        event.preventDefault();
        focusNextParticle();
    },
    'level.toggle-focus': ({ event }) => {
        event.preventDefault();
        toggleParticleFocus();
    },
    'level.undo': ({ event }) => {
        undoMove({ event });
    },
    'level.reset': ({ event }) => {
        event.preventDefault();
        restartGame();
    },
    'level.toggle-record': ({ event }) => {
        event.preventDefault();
        handleRecordButtonClick();
    },
    'level.play-recording': ({ event }) => {
        event.preventDefault();
        playLatestRecordingEntry();
    },
    'level.on-finish.restart': ({ event }) => {
        event.preventDefault();
        restartGame();
    },
    'level.on-finish.level-select': ({ event }) => {
        if (levelViewConfig.value.context !== 'album') return;
        event.preventDefault();
        router.push(`/album/${albumIndex}`);
    },
    'level.on-finish.next': ({ event }) => {
        if (levelViewConfig.value.context !== 'album') return;
        event.preventDefault();
        gotoNextLevel();
    },
}, {
    ignore: ['general.view-hotkeys']
});
</script>

<template>
    {{ disableInteraction }}
    <div class="viewport" id="level-viewport" @mousedown.middle.prevent="onPanStartWrapper" @mouseup.middle.prevent="onPanEndWrapper"
        @mouseleave="onPanEndWrapper" ref="refViewPort">
        <tutorial-handler v-if="context.currentLevelTutorialState.value !== 'none'"/>
        <div class="steps-complex a-fade-in" v-show="!isStartingAnimation && !hasWon">
            <div class="steps-wrapper u-rel">
                <span class="steps-complex__steps-count">{{ stepsCounter }}</span>
                <span class="steps-complex__steps-label" v-if="stepsGoal">/</span>
                <span class="steps-complex__steps-aim" v-if="stepsGoal">{{ stepsGoal }}</span>
                <div class="u-rel u-gap-14"></div>
                <div class="game-control-container">
                    <n-tooltip placement="bottom" raw style="color: var(--n-primary)" :show-arrow="false" :disabled="disableUndoButton">
                        <template #trigger>
                            <ion-button
                                id="level-undo-btn"
                                name="arrow-undo-outline"
                                size="1.6rem"
                                class="undo-btn"
                                data-hotkey-target="level.undo"
                                data-hotkey-label="Undo"
                                data-hotkey-group="level-controls"
                                data-hotkey-group-side="bottom right"
                                data-hotkey-label-position="inline"
                                :disabled="disableUndoButton"
                                @click="undoMove"
                            ></ion-button>
                        </template>
                        <span>Undo</span>
                    </n-tooltip>
                    <n-tooltip placement="bottom" raw style="color: var(--n-primary)" :show-arrow="false">
                        <template #trigger>
                            <ion-button
                                id="level-reset-btn"
                                name="refresh-outline"
                                size="1.6rem"
                                class="reset-btn"
                                data-hotkey-target="level.reset"
                                data-hotkey-label="Reset level"
                                data-hotkey-group="level-controls"
                                data-hotkey-group-side="bottom right"
                                data-hotkey-label-position="inline"
                                @click="restartGame"
                            ></ion-button>
                        </template>
                        <span>Restart</span>
                    </n-tooltip>
                    <n-tooltip placement="bottom" raw style="color: var(--n-primary)" :show-arrow="false">
                        <template #trigger>
                            <ion-button
                                name="radio-button-on-outline"
                                size="1.6rem"
                                class="record-btn"
                                data-hotkey-target="level.toggle-record"
                                data-hotkey-label="Record"
                                data-hotkey-group="level-controls"
                                data-hotkey-group-side="bottom right"
                                data-hotkey-label-position="inline"
                                :disabled="recordingButtonDisabled"
                                :color="isRecordingActive ? '#ff6b3a' : undefined"
                                @click="handleRecordButtonClick"
                            ></ion-button>
                        </template>
                        <span>{{ isRecordingActive ? 'Stop Recording' : 'Record' }}</span>
                    </n-tooltip>
                    <n-dropdown v-if="hasLocalPlayback" trigger="click" :options="playbackDropdownOptions"
                        @select="handlePlaybackSelect">
                        <n-tooltip placement="bottom" raw style="color: var(--n-primary)" :show-arrow="false">
                            <template #trigger>
                                <ion-button
                                    name="play-circle-outline"
                                    size="1.6rem"
                                    class="play-btn"
                                    data-hotkey-target="level.play-recording"
                                    data-hotkey-label="Play recording"
                                    data-hotkey-group="level-controls"
                                    data-hotkey-group-side="bottom right"
                                    data-hotkey-label-position="inline"
                                    :color="isPlaybackActive ? '#4cc9f0' : undefined"
                                ></ion-button>
                            </template>
                            <span>Play Recording</span>
                        </n-tooltip>
                    </n-dropdown>
                </div>
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
            }" :id="particle.id" data-hotkey-target="level.focus-particle" data-hotkey-dynamic
            :data-hotkey-hint="getParticleHotkey(particle)"
            data-hotkey-element-position="center"
        >
        </div>
        <!-- <p style="position: absolute; top: 2rem">
            {{ recording }}
        </p> -->
        <!-- Messages shown when the game ends -->
        <div class="end-info-container" v-show="hasWon">
            <h1 class="end-info-container__rank a-fade-in a-delay-12" :class="{
                'end-info-container__rank--perfect': stepsCounter <= stepsGoal,
                'end-info-container__rank--pass': stepsCounter > stepsGoal
            }"
            v-if="stepsGoal">{{ getGameRank() }}</h1>
            <h2 class="end-info-container__score a-fade-in a-delay-4" v-if="stepsGoal"
                :style="{'margin-bottom': levelViewConfig.context === 'editor' ? '0.5rem' : '2rem'}"
            >Your score: <span>
                    {{ stepsCounter }}/{{ stepsGoal }}
                </span></h2>
            <h2 v-if="levelViewConfig.context === 'editor'" class="a-fade-in a-delay-5">Current best: {{ currentBest }}</h2>
            <div class="end-info__button-group">
                <n-tooltip placement="bottom" raw style="color: var(--n-primary)">
                    <template #trigger>
                        <ion-button name="refresh-outline" class="a-fade-in a-delay-12"
                            @click="restartGame"
                            data-hotkey-target="level.on-finish.restart"
                            data-hotkey-label="Restart"
                            data-hotkey-group="level-finish"
                            data-hotkey-group-side="bottom right"
                            data-hotkey-label-position="inline"
                        ></ion-button>
                    </template>
                    <span>Restart</span>
                </n-tooltip>
                <template v-if="levelViewConfig.context === 'album'">
                    <n-tooltip placement="bottom" raw style="color: var(--n-primary)">
                        <template #trigger>
                            <ion-button name="apps-outline" class="a-fade-in a-delay-14"
                                @click="router.push(`/album/${albumIndex}`)"
                                data-hotkey-target="level.on-finish.level-select"
                                data-hotkey-label="Level Select"
                                data-hotkey-group="level-finish"
                                data-hotkey-label-position="inline"
                            ></ion-button>
                        </template>
                        <span>Level Select</span>
                    </n-tooltip>
                    <n-tooltip placement="bottom" raw style="color: var(--n-primary)">
                        <template #trigger>
                            <ion-button name="chevron-forward-outline" class="a-fade-in a-delay-16"
                                @click="gotoNextLevel"
                                data-hotkey-target="level.on-finish.next"
                                data-hotkey-label="Next Level"
                                data-hotkey-group="level-finish"
                                data-hotkey-label-position="inline"
                            ></ion-button>
                        </template>
                        <span>Next Level</span>
                    </n-tooltip>
                </template>
                <n-tooltip placement="bottom" raw style="color: var(--n-primary)" v-else>
                    <template #trigger>
                        <ion-button name="chevron-back-outline" class="a-fade-in a-delay-20"
                            @click="triggerBack"
                            data-hotkey-target="general.back"
                            data-hotkey-label="Back"
                            data-hotkey-group="level-finish"
                            data-hotkey-label-position="inline"
                        ></ion-button>
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

        .game-control-container {
            display: flex;
            margin: auto 0;
            justify-content: center;
            align-items: center;
            gap: 0.5rem;

            .undo-btn,
            .reset-btn,
            .record-btn,
            .play-btn {
                visibility: visible;
                margin: 0;
            }
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
