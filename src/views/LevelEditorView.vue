<script setup>
//: Vue-specific imports
import { onMounted, ref } from "vue";
import { useMouse, useMouseInElement } from "@vueuse/core";
import { useRouter } from "vue-router";

const router = useRouter();
const message = useMessage();

//: Custom Components
import IonButton from "@/components/IonButton.vue"

//: Custom Data
import { levelEditorRefreshFrequency } from "../data/constants";

// - account info: TODO
const account = ref({
    username: "Neutronic"
})

// - tracking the level name
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
const originPosition = ref({ x: 0, y: 0 });
const updateToolSpritePosition = () => {
    originPosition.value = {
        x: getMapBasePosition().x + panningOffset.value.x,
        y: getMapBasePosition().y + panningOffset.value.y
    }
    // console.log(originPosition);
    toolSpritePosition.value = {
        x: Math.floor((mouseX.value - originPosition.value.x) / levelMapGridScalePx) * levelMapGridScalePx + originPosition.value.x,
        y: Math.floor((mouseY.value - originPosition.value.y) / levelMapGridScalePx) * levelMapGridScalePx + originPosition.value.y
    }
}

const { isOutside: mouseOutsideToolbar } = useMouseInElement(refToolbar);

onMounted(() => {
    console.log(getMapBasePosition());
    setInterval(updateToolSpritePosition, 1000 / levelEditorRefreshFrequency);
});

// - active portal coloring

import { levelPortalCycleColor, levelPortalCycleColorCount } from "../data/constants";
import { useMessage } from "naive-ui";

const usedPortalCount = ref(0);
const nextPortalColor = ref(
    levelPortalCycleColor[usedPortalCount.value]
);

// - all containers
const containerBoards = ref([]);
const containerPortals = ref([]);

const existBoardAt = (x, y) => {
    return containerBoards.value.some(item => item.x === x && item.y === y);
};
const existContainerAt = (x, y) => {
    return existBoardAt(x, y)
        || containerPortals.value.some(item => item.x === x && item.y === y);
};

//: Custom Event Handlers

const onMouseLeftClickOnMap = () => {
    console.log("Left click");
    const atCoord = {
        x: toolSpritePosition.value.x - originPosition.value.x,
        y: toolSpritePosition.value.y - originPosition.value.y
    }
    console.log(['board', 'portal'].includes(activeTool.value));
    if (    // Validate the position:
        ['positron', 'electron'].includes(activeTool.value)
        ^ existContainerAt(atCoord.x, atCoord.y)) {
        // aka.
        // If be container and is attempting to place another;
        // If not be container and is trying to place a particle:
        return;
    }
    if (activeTool.value === 'board') {
        // Append a new board to the containerBoards
        // The x, y here is relative to the origin.
        containerBoards.value.push(atCoord);
        console.log(containerBoards);
    }
}

//: Custom modals and popups

const showConfirmDeletionModal = ref(false);
const deleteAll = () => {
    containerBoards.value = [];
    containerPortals.value = [];

    message.success("Deleted all items")
}
</script>

<template>
    <div class="top-container">
        <!-- The left side of the top section -->
        <div class="u-gap-16"></div>
        <ion-button name="home-outline" size="1.6rem" @click="router.back" />
        <ion-button name="save-outline" size="1.6rem" />
        <div class="u-gap-5"></div>
        <span class="username">{{ account.username }}</span>
        <p class="slash-separator">/</p>
        <span class="level-name" contenteditable="" @input="onLevelNameChange">{{ levelName }}</span>

        <!-- The right side of the top section -->
        <div class="u-mla"></div>
        <!-- Developer tools -->
        <n-flex class="dev-toolbox" align="center" justify="center" v-if="account.username === 'Neutronic'">
            <span>Developer Tools:</span>
            <ion-button name="download-outline" size="1.6rem"></ion-button>
            <ion-button name="copy-outline" size="1.6rem"></ion-button>
        </n-flex>
        <div class="u-gap-1"></div>
        <span>Current best</span>
        <span class="score score--na">NA</span>
        <div class="u-gap-4"></div>
        <ion-button name="play-outline" size="1.6rem" />
        <div class="u-gap-30"></div>
    </div>
    <code>
    {{ panningOffset }}
    {{ nextPortalColor }}
    </code>
    <div class="map-container" @mousedown.middle="onPanStart" @mouseup.middle="onPanEnd" @click="onMouseLeftClickOnMap"
        @mouseleave="onPanEnd" ref="refMapContainer">
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
                <div class="tool-container tool-container--clear-all" @click="showConfirmDeletionModal = true">
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
        <div class="sprite-container sprite-mouseover-container" :style="{
            'top': `${toolSpritePosition.y}px`,
            'left': `${toolSpritePosition.x}px`,
            'visibility': mouseOutsideToolbar ? 'visible' : 'hidden'
        }">
            <div class="sprite-mouseover__board" v-show="activeTool === 'board'"></div>
            <div class="sprite-mouseover__portal" v-show="activeTool === 'portal'"
                :style="{ 'background-color': nextPortalColor }"></div>
            <div class="sprite-mouseover__positron" v-show="activeTool === 'positron'"></div>
            <div class="sprite-mouseover__electron" v-show="activeTool === 'electron'"></div>
        </div>
        <div class="sprite-container sprite-containers-container">
            <!-- All Container objects ie. Boards and Portals are listed here -->
            <div class="sprite-board" v-for="board in containerBoards" :style="{
                'top': `${board.y + originPosition.y}px`,
                'left': `${board.x + originPosition.x}px`
            }"></div>
            <div class="sprite-portal"></div>
        </div>
        <div class="sprite-container sprite-particles-container">
            <!-- All positrons and electrons are listed here -->

        </div>
    </div>

    <!-- Modals and popups -->
    <n-modal v-model:show="showConfirmDeletionModal">
        <n-card class="confirm-deletion__card">
            <h2 class="confirm-deletion__title">Confirm Deletion?</h2>
            <p class="confirm-deletion__text">
                Are you sure you want to delete all containers and particles on the map?
                You cannot undo this action!
            </p>
            <n-divider></n-divider>
            <n-flex justify="center">
                <n-button class="confirm-deletion__button" @click="showConfirmDeletionModal = false">Cancel</n-button>
                <n-button class="confirm-deletion__button" type="error"
                    @click="showConfirmDeletionModal = false; deleteAll();">
                    <template #icon>
                        <ion-icon name="trash-outline"></ion-icon>
                    </template>
                    Delete
                </n-button>
            </n-flex>
        </n-card>
    </n-modal>
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

    .dev-toolbox {
        padding: 0 1rem;
        background-color: $level-map-background-color;
        border-radius: 2px;
        outline: 1px solid $level-map-board-border-color;
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
    clip-path: inset(0); // This removes outside-boundary mouseover

    .sprite-container {
        position: fixed;

        .sprite-board {
            position: fixed;
            width: calc($level-map-grid-scale - 2 * $level-map-board-border-width);
            height: calc($level-map-grid-scale - 2 * $level-map-board-border-width);
            background-color: $level-map-board-background-color;
            border: $level-map-board-border-width solid $level-map-board-border-color;
            border-radius: $level-map-board-border-radius;

            &::before {
                content: "";
                position: absolute;
                width: 100%;
                height: 100%;
                top: 0;
                left: 0;
                background-color: $level-map-board-background-color;
            }
        }
    }

    .sprite-mouseover-container {
        opacity: 0.1;
        pointer-events: none;

        .sprite-mouseover__board {
            position: absolute;
            width: $level-map-grid-scale;
            height: $level-map-grid-scale;
            background-color: $map-editor-sprite-mouseover-board-color;
        }

        .sprite-mouseover__portal {
            position: absolute;
            width: $level-map-grid-scale;
            height: $level-map-grid-scale;
            // The background color will be dynamically injected with inline styling.
        }
    }


}

.confirm-deletion__card {
    max-width: $map-editor-confirm-deletion-card-width;
    display: flex;
    flex-direction: column;
    justify-content: center;

    .confirm-deletion__title {
        font-size: 2rem;
        font-weight: 200;
        justify-self: center;
        margin-top: 0;
    }

    .confirm-deletion__text {
        font-weight: 200;
        letter-spacing: .3pt;
    }

    .confirm-deletion__button {
        width: 40%;
    }
}
</style>