<script setup>
//: Vue-specific imports
import { onMounted, ref, computed, watch } from "vue";
import { useMouse, useMouseInElement, onKeyStroke, whenever, useMagicKeys, onClickOutside } from "@vueuse/core";
import { useRouter } from "vue-router";

const router = useRouter();
const message = useMessage();
const keys = useMagicKeys();

//: Custom Components
import IonButton from "@/components/IonButton.vue"

//: Custom Functions
import { hexaToRgba } from "@/functions/colorUtils"
import { sleep } from "@/functions/timeUtils"

//: Custom Data
import { levelEditorRefreshFrequency, leftClickCooldownTime } from "../data/constants";

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

// - tracking the panning offset
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
    // Change the cursor
    document.body.style.cursor = "move";
}

const onPanEnd = () => {
    console.log("Middle mouse up");
    // Stop tracking the mouse movement
    if (panningTracker) {
        // Reset the cursor
        document.body.style.cursor = "default";
        clearInterval(panningTracker);
        panningTracker = null;
    }
}

// - global context management

const globalModeContext = ref('place'); // ['place', 'edit'] refers to the mode of the editor

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

import { levelPortalCycleColor, levelPortalCycleColorCount, levelMapPortalBackgroundAlpha } from "../data/constants";
import { useMessage } from "naive-ui";

const usedPortalPairsCount = ref(0);
// const nextPortalColor = ref(
//     levelPortalCycleColor[usedPortalPairsCount.value]
// );
const nextPortalColor = computed(() => {
    return levelPortalCycleColor[usedPortalPairsCount.value % levelPortalCycleColorCount];
})
const activePortalMode = ref('first');  // ['first', 'second'] refers to the order of the portal being placed in the pair
const canPlaceMorePortals = computed(() => {
    return usedPortalPairsCount.value < levelPortalCycleColorCount;
})

// - all containers and particles
const containerBoards = ref([]);
const containerPortals = ref([]);
const particlePositrons = ref([]);
const particleElectrons = ref([]);

const existBoardAt = (coord) => {
    return containerBoards.value.some(item => item.x === coord.x && item.y === coord.y);
}
const existPortalAt = (coord) => {
    return containerPortals.value.some(
        pair => pair.some(item => item.x === coord.x && item.y === coord.y)
    );
}
const existContainerAt = (coord) => {
    return existBoardAt(coord)
        || existPortalAt(coord);
}
const makeBoardAt = (coord) => {
    containerBoards.value.push(coord);
}
const removeBoardAt = (coord) => {
    containerBoards.value = containerBoards.value.filter(item => item.x !== coord.x || item.y !== coord.y);
}
const existPositronAt = (coord) => {
    return particlePositrons.value.some(item => item.x === coord.x && item.y === coord.y);
}
const existElectronAt = (coord) => {
    return particleElectrons.value.some(item => item.x === coord.x && item.y === coord.y);
}
const removeParticleAt = (coord) => {
    particleElectrons.value = particleElectrons.value.filter(item => item.x !== coord.x || item.y !== coord.y);
    particlePositrons.value = particlePositrons.value.filter(item => item.x !== coord.x || item.y !== coord.y);
}
const cleanupPortals = () => {
    // This should be called to remove any incomplete portal pairs
    containerPortals.value = containerPortals.value.filter(pair => pair.length === 2);
    usedPortalPairsCount.value = containerPortals.value.length;
    activePortalMode.value = 'first';
}
const makePortalAt = (coord) => {
    if (activePortalMode.value === 'first') {
        containerPortals.value.push([coord]);
        activePortalMode.value = 'second';
    }
    else if (activePortalMode.value === 'second') {
        containerPortals.value[usedPortalPairsCount.value].push(coord);
        usedPortalPairsCount.value++;
        activePortalMode.value = 'first';
    }
}
const removeFrontAt = (coord) => {
    if (existPositronAt(coord) || existElectronAt(coord)) {
        removeParticleAt(coord);
    } else if (existBoardAt(coord)) {
        removeBoardAt(coord);
    } else if (existPortalAt(coord)) {
        containerPortals.value = containerPortals.value.map(pair => pair.filter(item => item.x !== coord.x || item.y !== coord.y));
        cleanupPortals();
    }
}

// - right-click selecting and editing
const rightSelectionStart = ref({ x: 0, y: 0 });
const rightSelectionScale = ref({ width: 0, height: 0 });
let rightSelectionTracker = null;   // This container is used to keep the repeated selection process
const showSelectionEdit = ref(false);
const selectionToolbar = ref(null);

const onSelectStart = () => {
    console.log("Right click down");
    if (rightSelectionTracker !== null) { return; }
    globalModeContext.value = 'select';
    rightSelectionStart.value = {
        x: toolSpritePosition.value.x - originPosition.value.x,
        y: toolSpritePosition.value.y - originPosition.value.y,
    }

    rightSelectionTracker = setInterval(() => {
        rightSelectionScale.value = {
            width: toolSpritePosition.value.x - originPosition.value.x - rightSelectionStart.value.x + levelMapGridScalePx,
            height: toolSpritePosition.value.y - originPosition.value.y - rightSelectionStart.value.y + levelMapGridScalePx
        }
    }, 1000 / levelEditorRefreshFrequency);
}

const onSelectEnd = () => {
    console.log("Right click up");
    if (rightSelectionTracker !== null) {
        clearInterval(rightSelectionTracker);
        rightSelectionTracker = null;
        // Show the selection edit toolbar
        showSelectionEdit.value = true;
    }
}

const onSelectCancel = () => {
    showSelectionEdit.value = false;
    globalModeContext.value = 'place';
}

const removeParticlesInSelection = () => {
    const selectionAlias = {
        x: rightSelectionStart.value.x,
        y: rightSelectionStart.value.y,
        width: rightSelectionScale.value.width,
        height: rightSelectionScale.value.height
    }
    particleElectrons.value = particleElectrons.value.filter(item => {
        return item.x < selectionAlias.x || item.x >= selectionAlias.x + selectionAlias.width
            || item.y < selectionAlias.y || item.y >= selectionAlias.y + selectionAlias.height;
    })
    particlePositrons.value = particlePositrons.value.filter(item => {
        return item.x < selectionAlias.x || item.x >= selectionAlias.x + selectionAlias.width
            || item.y < selectionAlias.y || item.y >= selectionAlias.y + selectionAlias.height;
    })
}

const removeContainersInSelection = () => {
    const selectionAlias = {
        x: rightSelectionStart.value.x,
        y: rightSelectionStart.value.y,
        width: rightSelectionScale.value.width,
        height: rightSelectionScale.value.height
    }
    containerBoards.value = containerBoards.value.filter(item => {
        return item.x < selectionAlias.x || item.x >= selectionAlias.x + selectionAlias.width
            || item.y < selectionAlias.y || item.y >= selectionAlias.y + selectionAlias.height;
    })
    containerPortals.value = containerPortals.value.map(pair => pair.filter(item => {
        return item.x < selectionAlias.x || item.x >= selectionAlias.x + selectionAlias.width
            || item.y < selectionAlias.y || item.y >= selectionAlias.y + selectionAlias.height;
    }))
    cleanupPortals();
}

const removeAllInSelection = () => {
    removeParticlesInSelection();
    removeContainersInSelection();
}

const applyToolToSelection = () => {
    const selectionAlias = {
        x: rightSelectionStart.value.x,
        y: rightSelectionStart.value.y,
        width: rightSelectionScale.value.width,
        height: rightSelectionScale.value.height
    }
    const toolsToAction = {
        'board': (x, y) => {
            if (!existContainerAt({ x, y })) {
                makeBoardAt({ x, y });
            }
        },
        'positron': (x, y) => {
            if (!existContainerAt({ x, y })) {
                makeBoardAt({ x, y });
            }
            removeParticleAt({ x, y });
            particlePositrons.value.push({ x, y });
        },
        'electron': (x, y) => {
            if (!existContainerAt({ x, y })) {
                makeBoardAt({ x, y });
            }
            removeParticleAt({ x, y });
            particleElectrons.value.push({ x, y });
        },
    }
    const toolAction = toolsToAction[activeTool.value];
    if (!toolAction) {
        // The tool selected cannot be used in fill mode!
        message.error(`Tool ${activeTool.value} cannot be used in fill mode!`);
        return;
    }
    // Perform the action on each of the planes
    for (let x = selectionAlias.x; x < selectionAlias.x + selectionAlias.width; x += levelMapGridScalePx) {
        for (let y = selectionAlias.y; y < selectionAlias.y + selectionAlias.height; y += levelMapGridScalePx) {
            toolAction(x, y);
        }
    }
}

//: Import and Export


//: Custom Event Handlers

import { levelEditorPlaceFrequency } from "../data/constants";

let placementTracker = null;
let leftClickCooldown = false;

const onMouseLeftClickOnMap = () => {
    if (leftClickCooldown) { return; }
    console.log("Left click");
    // assert that the left click is only handled when the mode is 'place'!
    if (globalModeContext.value !== 'place') { return; }
    const atCoord = {
        x: toolSpritePosition.value.x - originPosition.value.x,
        y: toolSpritePosition.value.y - originPosition.value.y
    }
    if (activeTool.value === 'board') {
        // Check if there is already a container at the location
        if (existContainerAt(atCoord)) { return; }
        // Append a new board to the containerBoards
        // The x, y here is relative to the origin.
        // containerBoards.value.push(atCoord);
        makeBoardAt(atCoord);
    }
    else if (activeTool.value === 'portal') {
        if (!canPlaceMorePortals.value) {
            message.error("Too many portals in the map!");
            leftClickCooldown = true;
            setTimeout(() => {
                leftClickCooldown = false;
            }, leftClickCooldownTime);
            return;
        }
        if (existBoardAt(atCoord)) {
            // A portal can take the place of a board at placement
            removeBoardAt(atCoord);
            removeParticleAt(atCoord);
        }
        else if (existContainerAt(atCoord)) {
            // Then there exists a portal at the position
            // message.warning("You cannot place a portal on another portal!");
        }
        else {
            // All is clear
            makePortalAt(atCoord);
        }
    }
    else if (activeTool.value === 'positron') {
        if (existPositronAt(atCoord)) {
            // Then there exists a positron at the position
            // message.warning("You cannot place a positron on another positron!");
            return;
        }
        if (!existContainerAt(atCoord)) {
            // Create a new board on which the positron can stand
            makeBoardAt(atCoord);
        }
        removeParticleAt(atCoord);
        // Append a new positron to the particlePositrons
        particlePositrons.value.push(atCoord);
    }
    else if (activeTool.value === 'electron') {
        if (existElectronAt(atCoord)) {
            // Then there exists an electron at the position
            // message.warning("You cannot place an electron on another electron!");
            return;
        }
        if (!existContainerAt(atCoord)) {
            // Create a new board on which the electron can stand
            makeBoardAt(atCoord);
        }
        removeParticleAt(atCoord);
        // Append a new electron to the particleElectrons
        particleElectrons.value.push(atCoord);
    }
    else if (activeTool.value === 'remover') {
        removeFrontAt(atCoord);
        // A cooldown is implemented to prevent multi-clicks
        leftClickCooldown = true;
        setTimeout(() => {
            leftClickCooldown = false;
        }, leftClickCooldownTime);
    }
}

const onPlaceStart = () => {
    if (placementTracker) {
        return;
    }
    placementTracker = setInterval(onMouseLeftClickOnMap, 1000 / levelEditorPlaceFrequency);
}

const onPlaceEnd = () => {
    if (placementTracker) {
        clearInterval(placementTracker);
        placementTracker = null;
    }
}

const onSave = () => {
    message.success("Saved to account");
}

// - keyboard hotkeys

onKeyStroke(['b', 'B'], (e) => {
    activeTool.value = 'board';
})
onKeyStroke(['p', 'P'], (e) => {
    activeTool.value = 'portal';
})
onKeyStroke(['+'], (e) => {
    activeTool.value = 'positron';
})
onKeyStroke(['-'], (e) => {
    activeTool.value = 'electron';
})
onKeyStroke(['r', 'R'], (e) => {
    activeTool.value = 'remover';
})
whenever(keys.Ctrl_S, () => {
    // ctrl+shift+s to save
    onSave();
})
whenever(computed(() => { return keys.Delete.value && !keys.Shift.value }), () => {
    if (globalModeContext.value === 'select') {
        removeParticlesInSelection()
    }
})
whenever(computed(() => { return keys.Delete.value && keys.Shift.value }), () => {
    if (globalModeContext.value === 'select') {
        removeContainersInSelection()
    }
})
onKeyStroke(['f', 'F'], (e) => {
    applyToolToSelection();
})
onKeyStroke('Escape', (e) => {
    onSelectCancel();
})
onClickOutside(selectionToolbar, onSelectCancel);

//: Custom modals and popups

const showConfirmDeletionModal = ref(false);
const deleteAll = () => {
    containerBoards.value = [];
    containerPortals.value = [];
    particlePositrons.value = [];
    particleElectrons.value = [];
    usedPortalPairsCount.value = 0;
    activePortalMode.value = 'first';

    message.success("Deleted all items");
}
</script>

<template>
    <div class="top-container">
        <!-- The left side of the top section -->
        <div class="u-gap-16"></div>
        <ion-button name="arrow-back-circle-outline" size="1.6rem" @click="router.back" class="a-fade-in" />
        <ion-button name="save-outline" size="1.6rem" class="a-fade-in a-delay-1" />
        <div class="u-gap-5"></div>
        <span class="username a-fade-in a-delay-2">{{ account.username }}</span>
        <p class="slash-separator a-fade-in a-delay-2">/</p>
        <span class="level-name a-fade-in a-delay-3" contenteditable="" @input="onLevelNameChange">{{ levelName
            }}</span>

        <!-- The right side of the top section -->
        <div class="u-mla"></div>
        <!-- Developer tools -->
        <n-flex class="dev-toolbox a-fade-in a-delay-4" align="center" justify="center"
            v-if="account.username === 'Neutronic'">
            <span>Developer Tools:</span>
            <ion-button name="download-outline" size="1.6rem"></ion-button>
            <ion-button name="copy-outline" size="1.6rem"></ion-button>
        </n-flex>
        <div class="u-gap-1"></div>
        <span class="a-fade-in a-delay-5">Current best</span>
        <span class="score score--na a-fade-in a-delay-6">NA</span>
        <div class="u-gap-4"></div>
        <ion-button name="play-outline" class="a-fade-in a-delay-7" size="1.6rem" />
        <div class="u-gap-30"></div>
    </div>
    <code>
    <!-- {{ panningOffset }}
    {{ nextPortalColor }}
    {{ globalModeContext }} -->
    </code>
    <div class="map-container a-fade-in-raw a-delay-6" @click.right.prevent @mousedown.middle="onPanStart"
        @mouseup.middle="onPanEnd" @mousedown.left="onPlaceStart" @mouseup.left="onPlaceEnd"
        @mousedown.right.prevent="onSelectStart" @mouseup.right.prevent="onSelectEnd"
        @mouseleave="onPanEnd(); onPlaceEnd();" ref="refMapContainer">
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
            <code>(B)</code>
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
            <code>(P)</code>
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
            <code>(+)</code>
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
            <code>(-)</code>
        </n-tooltip>
        <n-tooltip trigger="hover" placement="left">
            <template #trigger>
                <div class="tool-container tool-container--remover"
                    :class="{ 'tool-container--active': activeTool === 'remover' }" @click="activeTool = 'remover'">
                    <ion-icon name="remove-circle-outline"></ion-icon>
                    <span class="tool-container__tooltip">Remover</span>
                </div>
            </template>
            Remover
            <code>(R)</code>
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
            'visibility': (mouseOutsideToolbar && globalModeContext === 'place') ? 'visible' : 'hidden'
        }">
            <div class="sprite-mouseover__board" v-show="activeTool === 'board'"></div>
            <div class="sprite-mouseover__portal" v-show="activeTool === 'portal' && canPlaceMorePortals"
                :style="{ 'background-color': nextPortalColor }"></div>
            <div class="sprite-mouseover__particle sprite-mouseover__particle--positron"
                v-show="activeTool === 'positron'">
            </div>
            <div class="sprite-mouseover__particle sprite-mouseover__particle--electron"
                v-show="activeTool === 'electron'">
            </div>
            <div class="sprite-mouseover__remover" v-show="activeTool === 'remover'"></div>
        </div>
        <div class="right-selection" :style="{
            'top': `${rightSelectionStart.y + originPosition.y}px`,
            'left': `${rightSelectionStart.x + originPosition.x}px`,
            'width': `${rightSelectionScale.width}px`,
            'height': `${rightSelectionScale.height}px`,
            'visibility': globalModeContext === 'select' ? 'visible' : 'hidden'
        }"></div>
        <div class="sprite-container sprite-containers-container">
            <!-- All Container objects ie. Boards and Portals are listed here -->
            <div class="sprite-container-object sprite-board" v-for="board in containerBoards" :style="{
                'top': `${board.y + originPosition.y}px`,
                'left': `${board.x + originPosition.x}px`
            }"></div>
            <div v-for="(portalPair, index) in containerPortals">
                <div class="sprite-container-object sprite-portal" v-for="portal in portalPair" :style="{
                    'top': `${portal.y + originPosition.y}px`,
                    'left': `${portal.x + originPosition.x}px`,
                    'background-color': hexaToRgba(levelPortalCycleColor[index], levelMapPortalBackgroundAlpha),
                    'border-color': levelPortalCycleColor[index]
                }"></div>
            </div>
        </div>
        <div class="sprite-container sprite-particles-container">
            <!-- All positrons and electrons are listed here -->
            <div class="sprite-particle sprite-positron" v-for="positron in particlePositrons" :style="{
                'top': `${positron.y + originPosition.y}px`,
                'left': `${positron.x + originPosition.x}px`
            }"></div>
            <div class=" sprite-particle sprite-electron" v-for="electron in particleElectrons" :style="{
                'top': `${electron.y + originPosition.y}px`,
                'left': `${electron.x + originPosition.x}px`
            }"></div>
        </div>
    </div>

    <!-- Selection Toolbar for Edit Mode -->
    <div class="selection-toolbar" v-show="showSelectionEdit" :style="{
        'top': `${rightSelectionStart.y + originPosition.y}px`,
        'left': `${rightSelectionStart.x + rightSelectionScale.width + originPosition.x}px`
    }" ref="selectionToolbar">
        <n-tooltip placement="left">
            <template #trigger>
                <n-button class="selection-toolbar__button" @click="applyToolToSelection">
                    <ion-icon name="color-fill-outline"></ion-icon>
                </n-button>
            </template>
            Fill
            <code>(F)</code>
        </n-tooltip>
        <n-tooltip placement="left">
            <template #trigger>
                <n-button class="selection-toolbar__button" @click="removeParticlesInSelection">
                    <ion-icon name="close-circle-outline"></ion-icon>
                </n-button>
            </template>
            Remove Particles
            <code>(Del)</code>
        </n-tooltip>
        <n-tooltip placement="left">
            <template #trigger>
                <n-button class="selection-toolbar__button" @click="removeAllInSelection">
                    <ion-icon name="trash-outline"></ion-icon>
                </n-button>
            </template>
            Remove All
            <code>(Shift + Del)</code>
        </n-tooltip>
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

        &.tool-container--remover:hover ion-icon,
        &.tool-container--remover.tool-container--active {
            color: $map-editor-toolbar-remover-color;
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

    .right-selection {
        position: fixed;
        background-color: $map-editor-right-selection-background;
        border: $map-editor-right-selection-border;
        backdrop-filter: $map-editor-right-selection-backdrop-filter;
        pointer-events: none;
    }

    .sprite-container {
        position: fixed;

        .sprite-container-object {

            position: fixed;

            &.sprite-board {
                width: calc($level-map-grid-scale - 2 * $level-map-board-border-width);
                height: calc($level-map-grid-scale - 2 * $level-map-board-border-width);
                background-color: $level-map-board-background-color;
                border: $level-map-board-border-width solid $level-map-board-border-color;
                border-radius: $level-map-board-border-radius;
            }

            &.sprite-portal {
                width: calc($level-map-grid-scale - 2 * $level-map-portal-border-width);
                height: calc($level-map-grid-scale - 2 * $level-map-portal-border-width);
                border-width: $level-map-portal-border-width;
                border-style: solid;
                border-radius: $level-map-portal-border-radius;
            }
        }

        .sprite-particle {
            position: fixed;
            width: $level-map-particle-diameter;
            height: $level-map-particle-diameter;
            translate: calc(($level-map-grid-scale - $level-map-particle-diameter) / 2 - $level-map-particle-border-width) calc(($level-map-grid-scale - $level-map-particle-diameter) / 2 - $level-map-particle-border-width);
            border-width: $level-map-particle-border-width;
            border-style: solid;
            border-radius: 50%;

            &.sprite-positron {
                background-color: $level-map-positron-background-color;
                border-color: $level-map-positron-border-color;
            }

            &.sprite-electron {
                background-color: $level-map-electron-background-color;
                border-color: $level-map-electron-border-color;
            }
        }
    }

    .sprite-mouseover-container {
        opacity: 0.2;
        pointer-events: none;

        .sprite-mouseover__board {
            opacity: 0.4;
            position: absolute;
            width: $level-map-grid-scale;
            height: $level-map-grid-scale;
            background-color: $map-editor-sprite-mouseover-board-color;
        }

        .sprite-mouseover__portal {
            opacity: 0.5;
            position: absolute;
            width: $level-map-grid-scale;
            height: $level-map-grid-scale;
            // The background color will be dynamically injected with inline styling.
        }

        .sprite-mouseover__remover {
            position: absolute;
            width: calc($level-map-grid-scale - 2 * $map-editor-sprite-mouseover-remover-border-weight);
            height: calc($level-map-grid-scale - 2 * $map-editor-sprite-mouseover-remover-border-weight);
            border: $map-editor-sprite-mouseover-remover-border;
        }

        .sprite-mouseover__particle {
            position: absolute;
            width: $level-map-particle-diameter;
            height: $level-map-particle-diameter;
            border: $level-map-particle-border-width solid;
            border-radius: 50%;
            translate: calc(($level-map-grid-scale - $level-map-particle-diameter) / 2 - $level-map-particle-border-width) calc(($level-map-grid-scale - $level-map-particle-diameter) / 2 - $level-map-particle-border-width);

            &--positron {
                background-color: $level-map-positron-background-color;
                border-color: $level-map-positron-border-color;
            }

            &--electron {
                background-color: $level-map-electron-background-color;
                border-color: $level-map-electron-border-color;
            }
        }
    }
}

.selection-toolbar {
    position: fixed;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;

    .selection-toolbar__button {
        padding: 0;
        width: $map-editor-right-selection-tools-button-size;
        height: $map-editor-right-selection-tools-button-size;
        backdrop-filter: brightness(60%);

        ion-icon {
            font-size: $map-editor-right-selection-tools-font-size;
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