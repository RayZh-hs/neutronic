<script setup>
//: Vue-specific imports
import { onMounted, ref } from "vue";
import { useMouse, useMouseInElement } from "@vueuse/core";
import { useRouter } from "vue-router";

const router = useRouter();

//: Custom Components
import IonButton from "@/components/IonButton.vue"

//: Custom Data
import { levelEditorRefreshFrequency } from "../data/constants";

//: - tracking the level name
const levelName = ref("New Level");

const onLevelNameChange = (event) => {
    let newLevelName = event.target.innerText;
    if (newLevelName.trim() == "") {
        newLevelName = "New Level";
        event.target.innerText = newLevelName;
    }
    levelName.value = newLevelName;
}

//: - tracking the panning offset
const { x: mouseX, y: mouseY, sourceType } = useMouse();
const panningOffset = ref({ x: 0, y: 0 });
let panningOffsetStart = { x: 0, y: 0 };
let panningStart = { x: 0, y: 0 };
let panningTracker = null;

const onPanStart = () => {
    console.log("Middle mouse down");
    // This shouldn't happen, but just in case
    if (panningTracker) {
        return;
    }
    // Start tracking the mouse movement
    panningStart = {
        x: mouseX.value,
        y: mouseY.value
    }
    panningOffsetStart = panningOffset.value;
    panningTracker = setInterval(() => {
        panningOffset.value = {
            x: panningOffsetStart.x + mouseX.value - panningStart.x,
            y: panningOffsetStart.y + mouseY.value - panningStart.y
        }
    }, 1000 / levelEditorRefreshFrequency);
}

const onPanEnd = () => {
    console.log("Middle mouse up");
    // Stop tracking the mouse movement
    if (panningTracker) {
        clearInterval(panningTracker);
        panningTracker = null;
    }
}

// - tool selection

const refToolbar = ref(null);
const activeTool = ref("board");

// - tool sprite positioning

import { levelMapGridScalePx } from "../data/constants";

const refMapContainer = ref(null);
const getMapBasePosition = () => {
    if (refMapContainer.value == null)
        return { x: 0, y: 0 };
    return refMapContainer.value.getBoundingClientRect();
}

/**
 * The tool sprite position is the absolute position where the mouse is hovering over the map.
 * It is configured as the top-left corner of the corresponding grid-cell.
 * ---
 * 1. The top-left corner of the .map-container is attained, through getMapBasePosition.
 * 2. panningOffsetStart is added to calculate the origin point.
 * 3. Since the cell size is (levelMapGridScalePx, levelMapGridScalePx), the match can be obtained by:
 *  - x: Math.floor((mouseX - originX) / levelMapGridScalePx) * levelMapGridScalePx + originX
 *  - y: Math.floor((mouseY - originY) / levelMapGridScalePx) * levelMapGridScalePx + originY
 *  
 * A setInterval is used to update the tool sprite position every update cycle.
 */
const toolSpritePosition = ref({ x: 0, y: 0 });
const updateToolSpritePosition = () => {
    let originPosition = {
        x: getMapBasePosition().x + panningOffset.value.x,
        y: getMapBasePosition().y + panningOffset.value.y
    }
    // console.log(originPosition);
    toolSpritePosition.value = {
        x: Math.floor((mouseX.value - originPosition.x) / levelMapGridScalePx) * levelMapGridScalePx + originPosition.x,
        y: Math.floor((mouseY.value - originPosition.y) / levelMapGridScalePx) * levelMapGridScalePx + originPosition.y
    }
}

const {isOutside: mouseOutsideToolbar} = useMouseInElement(refToolbar);

onMounted(() => {
    console.log(getMapBasePosition());
    setInterval(updateToolSpritePosition, 1000 / levelEditorRefreshFrequency);
});

</script>

<template>
    <div class="top-container">
        <!-- The left side of the top section -->
        <div class="u-gap-16"></div>
        <IonButton name="home-outline" size="1.6rem" @click="router.back" />
        <IonButton name="save-outline" size="1.6rem" />
        <div class="u-gap-5"></div>
        <span class="username">Username</span>
        <p class="slash-separator">/</p>
        <span class="level-name" contenteditable="" @input="onLevelNameChange">{{ levelName }}</span>

        <!-- The right side of the top section -->
        <div class="u-mla"></div>
        <span>Current best</span>
        <span class="score score--na">NA</span>
        <div class="u-gap-4"></div>
        <IonButton name="play-outline" size="1.6rem" />
        <div class="u-gap-30"></div>
    </div>
    {{ panningOffset }}
    <div class="map-container" @mousedown.middle="onPanStart" @mouseleave="onPanEnd" @mouseup.middle="onPanEnd"
        ref="refMapContainer">
        <div class="background-grid" :style="{
            'background-position-x': `${panningOffset.x}px`,
            'background-position-y': `${panningOffset.y}px`
        }"></div>
    </div>
    <div class="right-container" ref="refToolbar">
        <n-tooltip trigger="hover" placement="left">
            <template #trigger>
                <div class="tool-container tool-container--board"
                    :class="{ 'tool-container--active': activeTool === 'board' }" @click="activeTool = 'board'">
                    <ion-icon name="square-outline"></ion-icon>
                    <span class="tool-container__tooltip">Board</span>
                </div>
            </template>
            Board
        </n-tooltip>
        <n-tooltip trigger="hover" placement="left">
            <template #trigger>
                <div class="tool-container tool-container--portal"
                    :class="{ 'tool-container--active': activeTool === 'portal' }" @click="activeTool = 'portal'">
                    <ion-icon name="albums-outline"></ion-icon>
                    <span class="tool-container__tooltip">Portal</span>
                </div>
            </template>
            Portal
        </n-tooltip>
        <n-tooltip trigger="hover" placement="left">
            <template #trigger>
                <div class="tool-container tool-container--positron"
                    :class="{ 'tool-container--active': activeTool === 'positron' }" @click="activeTool = 'positron'">
                    <ion-icon name="radio-button-off-outline"></ion-icon>
                    <span class="tool-container__tooltip">Positron</span>
                </div>
            </template>
            Positron
        </n-tooltip>
        <n-tooltip trigger="hover" placement="left">
            <template #trigger>
                <div class="tool-container tool-container--electron"
                    :class="{ 'tool-container--active': activeTool === 'electron' }" @click="activeTool = 'electron'">
                    <ion-icon name="radio-button-off-outline"></ion-icon>
                    <span class="tool-container__tooltip">Electron</span>
                </div>
            </template>
            Electron
        </n-tooltip>
        <n-divider class="divider"></n-divider>
        <n-tooltip trigger="hover" placement="left">
            <template #trigger>
                <div class="tool-container tool-container--clear-all">
                    <ion-icon name="trash-outline"></ion-icon>
                    <span class="tool-container__tooltip">Clear All</span>
                </div>
            </template>
            Clear All
        </n-tooltip>
        <n-tooltip trigger="hover" placement="left">
            <template #trigger>
                <div class="tool-container tool-container--focus">
                    <ion-icon name="locate-outline"></ion-icon>
                    <span class="tool-container__tooltip">Focus</span>
                </div>
            </template>
            Focus
        </n-tooltip>
    </div>
    <!-- <div class="bottom-tooltip">
    </div> -->

    <div class="map-container-wrapping">
        <div class="sprite-mouseover" :style="{
            'top': `${toolSpritePosition.y}px`,
            'left': `${toolSpritePosition.x}px`,
            'visibility': mouseOutsideToolbar ? 'visible' : 'hidden'
        }"></div>
    </div>
</template>

<style lang="scss" scoped>
.top-container {
    position: fixed;
    width: 80vw;
    height: $map-editor-header-height;
    top: $map-editor-header-margin;
    left: 10vw;
    display: flex;
    align-items: center;
    justify-content: flex-start;
    gap: 0.5rem;

    .ion-icon {
        margin: 5pt;
    }

    .username {
        color: $map-editor-username-color;
    }

    .level-name {
        padding: 4pt;
        size: 1.6rem;

        &:hover {
            color: $n-light-grey;
        }
    }

    .score {
        font-size: 1.2rem;

        &--na {
            color: $map-editor-na-color;
        }
    }
}

// In this way the size and positioning is applied to both the container and its wrapping (invisible duplicate)
.map-container,
.map-container-wrapping {
    position: absolute;
    width: 80vw;
    height: 80vh;
    top: $map-editor-header-margin + $map-editor-header-height;
    left: 10vw;
}

.map-container {
    background-color: $level-map-background-color;

    .background-grid {
        z-index: -20;
        width: 100%;
        height: 100%;
        background-image:
            repeating-linear-gradient($level-map-grid-color 0 1px, transparent 1px 100%),
            repeating-linear-gradient(90deg, $level-map-grid-color 0 1px, transparent 1px 100%);
        background-size: calc($level-map-grid-scale) calc($level-map-grid-scale);
        opacity: 20%;
        position: relative;
    }
}

.right-container {
    position: fixed;
    width: $map-editor-toolbar-width;
    // height: 60vh;
    top: 50vh;
    translate: 0 -50%;
    right: $map-editor-toolbar-right-margin;
    background-color: $map-editor-right-color;
    border-radius: calc($map-editor-toolbar-width / 2);

    transition: all 0.3s ease-in-out;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    overflow: hidden;

    font-size: $map-editor-toolbar-icon-size;
    // gap: $map-editor-toolbar-icon-gap;

    // These specifications create an extra gap at the top and bottom
    // :first-child {
    //     margin-top: 1rem;
    // }

    // :last-child {
    //     margin-bottom: 1rem;
    // }

    .tool-container {
        width: 100%;
        position: relative;
        display: flex;
        align-items: center;
        height: $map-editor-toolbar-button-height;

        .tool-container__tooltip {
            position: absolute;
            white-space: nowrap; // This is important for the "Clear All" line because it is too long to fit in BEFORE the transform.
            left: calc(($map-editor-toolbar-width-expanded + $map-editor-toolbar-width) / 2);
            transform: translateX(-50%) translateY(-44%);
            top: calc($map-editor-toolbar-button-height / 2);

            font-size: 1rem;
            font-weight: 100;
            letter-spacing: .6pt;
        }

        &:hover {
            background-color: $map-editor-toolbar-active-backdrop-color;
        }

        &.tool-container--board:hover ion-icon,
        &.tool-container--board.tool-container--active ion-icon {
            color: $map-editor-toolbar-board-color;
        }

        &.tool-container--portal:hover ion-icon,
        &.tool-container--portal.tool-container--active {
            color: $map-editor-toolbar-portal-color;
        }

        &.tool-container--positron:hover ion-icon,
        &.tool-container--positron.tool-container--active {
            color: $map-editor-toolbar-positron-color;
        }

        &.tool-container--electron:hover ion-icon,
        &.tool-container--electron.tool-container--active {
            color: $map-editor-toolbar-electron-color;
        }

        &.tool-container--clear-all:hover {
            background-color: $map-editor-toolbar-clear-all-backdrop-color;
        }

        &.tool-container--focus:hover {
            background-color: $map-editor-toolbar-focus-backdrop-color;
        }
    }

    ion-icon {
        margin-left: calc(($map-editor-toolbar-width - $map-editor-toolbar-icon-size) / 2);
    }

    .divider {
        margin-top: .6rem;
        margin-bottom: .6rem;
    }

    // &:hover {
    //     width: $map-editor-toolbar-width-expanded;
    // }
}

.bottom-tooltip {
    position: fixed;
    width: 12rem;
    height: 4rem;
    pointer-events: painted;

    left: calc(50vw - 6rem);
    bottom: 16vh;
    opacity: 60%;
}

.map-container-wrapping {
    pointer-events: none;
    clip-path: inset(0);    // Tis

    .sprite-mouseover {
        position: fixed;
        width: 4rem;
        height: 4rem;
        background-color: $n-primary;
        opacity: 0.2;
        pointer-events: none;
    }
}
</style>