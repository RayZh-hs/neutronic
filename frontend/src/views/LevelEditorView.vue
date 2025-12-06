<script setup>
//: Vue-specific imports
import { onMounted, ref, computed, watch } from "vue";
import { useMouse, useMouseInElement, onKeyStroke, whenever, useMagicKeys, onClickOutside, useClipboard, useFileDialog, get, assert } from "@vueuse/core";
import { useRouter } from "vue-router";
import { useDialog } from "naive-ui";

const router = useRouter();
const message = useMessage();
const keys = useMagicKeys();
const dialog = useDialog();

//: Custom Components
import IonButton from "@/components/IonButton.vue"

//: Custom Functions
import { hexaToRgba } from "@/functions/colorUtils"
import { easeOutCubic, easeOutSine, refAnimateToObject } from "../functions/animateUtils";
import { useEditorEntities } from "@/functions/useEditorEntities";
import { useAccountStore, getCustomLevelById, upsertCustomLevel } from "@/functions/useAccount";

/**
 * This function is called to center the map on the screen.
 * It can be directly called via the FOCUS button, and is programmatically invoked when the map is loaded.
 */
const callCenterMap = () => {
    let dest = { x: 0, y: 0 };
    const boundingBox = getBoundingBox();
    const centerPos = {
        x: (boundingBox.minX + boundingBox.maxX) / 2 + levelMapGridScalePx / 2,
        y: (boundingBox.minY + boundingBox.maxY) / 2 + levelMapGridScalePx / 2
    }
    console.log(centerPos);
    console.log(getMapBoundingBox());
    if (!isNaN(centerPos.x)) {   // When there is no container in the map, the centerPos becomes NaN
        const mapBoundingBox = getMapBoundingBox();
        dest = {
            x: mapBoundingBox.width / 2 - centerPos.x,
            y: mapBoundingBox.height / 2 - centerPos.y
        }
    }
    console.log("dest=", dest);
    refAnimateToObject(panningOffset, dest, levelEditorCenterDuration, easeOutSine);
}

//: Custom Data
import { levelEditorRefreshFrequency, leftClickCooldownTime, levelEditorCenterDuration } from "../data/constants";

const accountStore = useAccountStore();
const account = computed(() => accountStore.value.profile);

const currentLevelId = computed(() => router.currentRoute.value.params.uuid);

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

// - tracking the level goal and custom best
const stepsGoal = ref(null);
const currentBest = ref(null);
const activeRecording = useSessionStorage('active-recording-cache', []);

const onStepsGoalChange = (event) => {
    let newStepsGoal = parseInt(event.target.innerText);
    if (isNaN(newStepsGoal)) {
        newStepsGoal = null;
        event.target.innerText = "NA";
    }
    stepsGoal.value = newStepsGoal;
}

// - tracking the panning offset
const { x: mouseX, y: mouseY } = useMouse();

import { usePanning } from "@/functions/usePanning";
const { panningOffset, onPanStart, onPanEnd } = usePanning();

// - global context management

const globalModeContext = ref('place'); // ['place', 'edit'] refers to the mode of the editor

// - tool selection

const refToolbar = ref(null);
const activeTool = ref("board");

// - tool sprite positioning

import { levelMapGridScalePx } from "../data/constants";

const refMapContainer = ref(null);
const getMapBoundingBox = () => {
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
        x: getMapBoundingBox().x + panningOffset.value.x,
        y: getMapBoundingBox().y + panningOffset.value.y
    }
    // console.log(originPosition);
    toolSpritePosition.value = {
        x: Math.floor((mouseX.value - originPosition.value.x) / levelMapGridScalePx) * levelMapGridScalePx + originPosition.value.x,
        y: Math.floor((mouseY.value - originPosition.value.y) / levelMapGridScalePx) * levelMapGridScalePx + originPosition.value.y
    }
}

const { isOutside: mouseOutsideToolbar } = useMouseInElement(refToolbar);

// - active portal coloring

import { levelPortalCycleColor, levelPortalCycleColorCount, levelMapPortalBackgroundAlpha } from "../data/constants";
import { useMessage } from "naive-ui";

const {
    boardTiles,
    portalPairs,
    positronParticles,
    electronParticles,
    usedPortalPairsCount,
    activePortalMode,
    canPlaceMorePortals,
    hasBoardAt,
    hasContainerAt,
    hasPositronAt,
    hasElectronAt,
    addBoardAt,
    addPortalAt,
    removeBoardAt,
    removeParticlesAt,
    cleanupPortals,
    removePlacementAt,
    resetEntities,
} = useEditorEntities();

const nextPortalColor = computed(() => {
    return levelPortalCycleColor[usedPortalPairsCount.value % levelPortalCycleColorCount];
});

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
    electronParticles.value = electronParticles.value.filter(item => {
        return item.x < selectionAlias.x || item.x >= selectionAlias.x + selectionAlias.width
            || item.y < selectionAlias.y || item.y >= selectionAlias.y + selectionAlias.height;
    })
    positronParticles.value = positronParticles.value.filter(item => {
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
    boardTiles.value = boardTiles.value.filter(item => {
        return item.x < selectionAlias.x || item.x >= selectionAlias.x + selectionAlias.width
            || item.y < selectionAlias.y || item.y >= selectionAlias.y + selectionAlias.height;
    })
    portalPairs.value = portalPairs.value.map(pair => pair.filter(item => {
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
            if (!hasContainerAt({ x, y })) {
                addBoardAt({ x, y });
            }
        },
        'positron': (x, y) => {
            if (!hasContainerAt({ x, y })) {
                addBoardAt({ x, y });
            }
            removeParticlesAt({ x, y });
            positronParticles.value.push({ x, y });
        },
        'electron': (x, y) => {
            if (!hasContainerAt({ x, y })) {
                addBoardAt({ x, y });
            }
            removeParticlesAt({ x, y });
            electronParticles.value.push({ x, y });
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

const getBoundingBox = () => {
    const minX = Math.min(...[...boardTiles.value, ...portalPairs.value.flat()].map(item => item.x));
    const minY = Math.min(...[...boardTiles.value, ...portalPairs.value.flat()].map(item => item.y));
    const maxX = Math.max(...[...boardTiles.value, ...portalPairs.value.flat()].map(item => item.x));
    const maxY = Math.max(...[...boardTiles.value, ...portalPairs.value.flat()].map(item => item.y));
    return { minX, minY, maxX, maxY };
}

const getMapSize = () => {
    const boundingBox = getBoundingBox();
    return {
        rows:    1 + Math.round((boundingBox.maxY - boundingBox.minY) / levelMapGridScalePx),
        columns: 1 + Math.round((boundingBox.maxX - boundingBox.minX) / levelMapGridScalePx)
    }
}

const coordToRc = (boundingBox, coordList) => {
    return coordList.map(coord => {
        return {
            row: Math.floor((coord.y - boundingBox.minY) / levelMapGridScalePx),
            column: Math.floor((coord.x - boundingBox.minX) / levelMapGridScalePx)
        }
    })
}

const validateMap = () => {
    // Check if the map is valid
    if (portalPairs.value.some(pair => pair.length !== 2)) {
        message.error("Incomplete portal pairs found!");
        return false;
    }
    if (positronParticles.value.length != electronParticles.value.length) {
        message.error("Unequal number of positrons and electrons!");
        return false;
    }
    if (positronParticles.value.length === 0) {
        message.error("No particles found in the map!");
        return false;
    }
    return true;
}

const buildLevelJson = () => {
    // // First validate the map
    // // This should only happen in the PLAY phase. the BUILD phase only checks for incomplete portals
    // if (!validateMap()) {
    //     return {
    //         "status": "failure",
    //         "level": null
    //     }
    // }
    // First check for incomplete portal pairs, which will lead to load issues
    if (portalPairs.value.some(pair => pair.length !== 2)) {
        message.error("Incomplete portal pairs found!");
        return {
            "status": "failure",
            "level": null
        }
    }
    // Then build the map
    return {
        "status": "success",
        // The level object is built here, in $return.level
        "level": {
            "meta": {
                "levelId": currentLevelId.value,
                "name": levelName.value,
                "author": account.value.username,
                // This is later added for centering purpose in the game viewport
                ...getMapSize()
            },
            "content": (() => {
                const boundingBox = getBoundingBox();
                return {
                    "containers": [
                        // First the boards
                        ...coordToRc(boundingBox, boardTiles.value).map(coord => {
                            return {
                                "type": "board",
                                "row": coord.row,
                                "column": coord.column
                            }
                        }),
                        // Then the portals
                        ...portalPairs.value.map((pair, index) => {
                            return pair.map(coord => {
                                return {
                                    "type": "portal",
                                    "row": Math.floor((coord.y - boundingBox.minY) / levelMapGridScalePx),
                                    "column": Math.floor((coord.x - boundingBox.minX) / levelMapGridScalePx),
                                    "index": index
                                }
                            })
                        }).flat()
                    ],
                    "particles": [
                        // First the electrons (blue)
                        ...coordToRc(boundingBox, electronParticles.value).map(coord => {
                            return {
                                "color": "blue",
                                "row": coord.row,
                                "column": coord.column
                            }
                        }),
                        // Then the positrons (red)
                        ...coordToRc(boundingBox, positronParticles.value).map(coord => {
                            return {
                                "color": "red",
                                "row": coord.row,
                                "column": coord.column
                            }
                        })
                    ],
                    "goal": stepsGoal.value,
                }
            })(),
            "appendix": {
                ...(activeRecording.value.length > 0 ? { "recording": activeRecording.value } : {})
            }
        }
    }
}

const loadLevelJson = (levelJson, parse = true) => {
    let level = levelJson;
    if (parse) {
        level = JSON.parse(level);
    }
    console.log(level);
    // Load meta
    levelName.value = level.meta.name;
    // Load content
    boardTiles.value = level.content.containers
        .filter(item => item.type === 'board')
        .map(item => {
            return {
                x: item.column * levelMapGridScalePx,
                y: item.row * levelMapGridScalePx
            }
        });
    portalPairs.value = level.content.containers
        .filter(item => item.type === 'portal')
        .reduce((acc, item) => {
            if (!acc[item.index]) {
                acc[item.index] = [];
            }
            acc[item.index].push({
                x: item.column * levelMapGridScalePx,
                y: item.row * levelMapGridScalePx
            });
            return acc;
        }, []);
    electronParticles.value = level.content.particles
        .filter(item => item.color === 'blue')
        .map(item => {
            return {
                x: item.column * levelMapGridScalePx,
                y: item.row * levelMapGridScalePx
            }
        });
    positronParticles.value = level.content.particles
        .filter(item => item.color === 'red')
        .map(item => {
            return {
                x: item.column * levelMapGridScalePx,
                y: item.row * levelMapGridScalePx
            }
        });
    stepsGoal.value = level.content.goal;
    cleanupPortals();
    callCenterMap();
}

const refLevelJson = ref('');
const { copy: funcCopyLevelToClipboard, isSupported: clipboardApiIsSupported } = useClipboard();

const copyLevelToClipboard = () => {
    const levelWrapper = buildLevelJson();
    console.log(levelWrapper);
    // Check for failure
    if (levelWrapper.status === "failure") { return; }
    refLevelJson.value = JSON.stringify(levelWrapper.level);

    if (clipboardApiIsSupported) {
        funcCopyLevelToClipboard(refLevelJson.value)
            .then(() => {
                message.success("Level copied to clipboard!");
            })
            .catch((reason) => {
                message.error("Failed to copy level to clipboard!");
                console.log(reason);
            });
        // message.success("Level copied to clipboard!");
    } else {
        message.error("Clipboard API is not supported in your browser!");
    }
}

import { downloadString } from "../functions/downloadUtils";

const downloadLevel = () => {
    const levelWrapper = buildLevelJson();
    console.log(levelWrapper);
    // Check for failure
    if (levelWrapper.status === "failure") { return; }
    refLevelJson.value = JSON.stringify(levelWrapper.level);
    // console.log(refLevelJson.value);

    downloadString(refLevelJson.value, 'application/json', `${router.currentRoute.value.params.uuid}.json`);
}

const { onChange: onImportLevelJson, open: openUploadLevelDialog } = useFileDialog({
    accept: '.json',
    multiple: false,
});

onImportLevelJson((files) => {
    const file = files[0];
    console.log(file);
    const reader = new FileReader();
    reader.onload = (e) => {
        const levelJson = e.target.result;
        // console.log(levelJson);
        loadLevelJson(levelJson);
    }
    if (file) {
        reader.readAsText(file);
    }
})

//: Playing the game

import { useSessionStorage } from "@vueuse/core";
const levelViewConfig = useSessionStorage('level-view-config', {});

const playLevel = () => {
    // A check for the validity of the map is performed before playing
    if (!validateMap()) {
        message.error("The map is not valid!");
        return;
    }
    // The level is built and sent to the game
    const levelWrapper = buildLevelJson();
    if (levelWrapper.status === "failure") { return; }
    levelViewConfig.value = {
        context: 'editor',
        levelData: levelWrapper.level,
        levelName: levelName.value
    }
    persistLevel(levelWrapper);
    router.push(router.currentRoute.value.fullPath.replace('/edit/', '/play/'));
}

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
        if (hasContainerAt(atCoord)) { return; }
        // Append a new board to the boardTiles
        // The x, y here is relative to the origin.
        // boardTiles.value.push(atCoord);
        addBoardAt(atCoord);
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
        if (hasBoardAt(atCoord)) {
            // A portal can take the place of a board at placement
            removeBoardAt(atCoord);
            removeParticlesAt(atCoord);
        }
        else if (hasContainerAt(atCoord)) {
            // Then there exists a portal at the position
            // message.warning("You cannot place a portal on another portal!");
        }
        else {
            // All is clear
            addPortalAt(atCoord);
        }
    }
    else if (activeTool.value === 'positron') {
        if (hasPositronAt(atCoord)) {
            // Then there exists a positron at the position
            // message.warning("You cannot place a positron on another positron!");
            return;
        }
        if (!hasContainerAt(atCoord)) {
            // Create a new board on which the positron can stand
            addBoardAt(atCoord);
        }
        removeParticlesAt(atCoord);
        // Append a new positron to the positronParticles
        positronParticles.value.push(atCoord);
    }
    else if (activeTool.value === 'electron') {
        if (hasElectronAt(atCoord)) {
            // Then there exists an electron at the position
            // message.warning("You cannot place an electron on another electron!");
            return;
        }
        if (!hasContainerAt(atCoord)) {
            // Create a new board on which the electron can stand
            addBoardAt(atCoord);
        }
        removeParticlesAt(atCoord);
        // Append a new electron to the electronParticles
        electronParticles.value.push(atCoord);
    }
    else if (activeTool.value === 'remover') {
        removePlacementAt(atCoord);
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

const persistLevel = (levelWrapper) => {
    upsertCustomLevel({
        id: currentLevelId.value,
        level: levelWrapper.level,
        bestMoves: currentBest.value,
    });
    message.success("Saved locally");
};

const onSave = () => {
    const levelWrapper = buildLevelJson();
    if (levelWrapper.status === "failure") { return; }
    persistLevel(levelWrapper);
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
whenever(keys.Ctrl_C, () => {
    copyLevelToClipboard();
})
onClickOutside(selectionToolbar, onSelectCancel);

//: Custom modals and popups

const showConfirmDeletionModal = ref(false);
const deleteAll = () => {
    resetEntities();
    message.success("Deleted all items");
}

const levelEditorConfig = useSessionStorage('level-editor-config', {
    loadFromLevelView: false,
})

const resetEditorState = () => {
    resetEntities();
    levelName.value = "New Level";
    stepsGoal.value = null;
    currentBest.value = null;
    activeRecording.value = [];
    callCenterMap();
};

const loadFromLevelViewSession = () => {
    if (!levelEditorConfig.value.loadFromLevelView) {
        return false;
    }
    if (levelViewConfig.value.context !== 'finished') {
        levelEditorConfig.value.loadFromLevelView = false;
        return false;
    }
    loadLevelJson(levelViewConfig.value.levelData, false);
    const bestMovesCountFeedback = levelViewConfig.value.bestMovesCount;
    if (bestMovesCountFeedback && (!currentBest.value || currentBest.value > bestMovesCountFeedback)) {
        currentBest.value = bestMovesCountFeedback;
        if (!stepsGoal.value) {
            stepsGoal.value = bestMovesCountFeedback;
        }
    }
    if (levelViewConfig.value.recording?.length > 0) {
        dialog.warning({
            title: 'Recording',
            content: 'Do you want to replace the recording with the new version?',
            positiveText: 'Yes',
            negativeText: 'No',
            draggable: false,
            onPositiveClick: () => {
                activeRecording.value = levelViewConfig.value.recording;
            }
        });
    }
    levelEditorConfig.value.loadFromLevelView = false;
    return true;
};

const hydrateFromCustomLevel = () => {
    const savedLevel = getCustomLevelById(currentLevelId.value);
    if (!savedLevel) {
        resetEditorState();
        return;
    }
    loadLevelJson(savedLevel.level, false);
    levelName.value = savedLevel.level.meta.name;
    stepsGoal.value = savedLevel.level.content.goal;
    currentBest.value = savedLevel.bestMoves;
    activeRecording.value = savedLevel.level.appendix?.recording || [];
    callCenterMap();
};

const initializeEditor = () => {
    if (loadFromLevelViewSession()) {
        return;
    }
    hydrateFromCustomLevel();
};

watch(currentLevelId, () => {
    initializeEditor();
});

//: Lifecycle hooks
onMounted(() => {
    initializeEditor();
    setInterval(updateToolSpritePosition, 1000 / levelEditorRefreshFrequency);
});

</script>

<template>
    <div class="top-container">
        <!-- The left side of the top section -->
        <div class="u-gap-16"></div>
        <ion-button name="arrow-back-circle-outline" size="1.6rem" @click="router.push('/custom')" class="a-fade-in" />
        <ion-button name="save-outline" size="1.6rem" class="a-fade-in a-delay-1" @click="onSave" />
        <div class="u-gap-5"></div>
        <span class="username a-fade-in a-delay-2">{{ account.username }}</span>
        <p class="slash-separator a-fade-in a-delay-2">/</p>
        <span class="level-name a-fade-in a-delay-3" contenteditable="" @input="onLevelNameChange">{{ levelName
            }}</span>

        <!-- The right side of the top section -->
        <div class="u-mla"></div>
        <!-- Developer tools -->
        <n-flex class="dev-toolbox a-fade-in a-delay-4" align="center" justify="center">
            <span>Developer Tools:</span>
            <ion-button name="cloud-upload-outline" size="1.6rem" @click="openUploadLevelDialog"></ion-button>
            <ion-button name="download-outline" size="1.6rem" @click="downloadLevel"></ion-button>
            <ion-button name="copy-outline" size="1.6rem" @click="copyLevelToClipboard"></ion-button>
        </n-flex>
        <div class="u-gap-1"></div>
        <span class="steps-goal-label a-fade-in a-delay-5">Steps Goal</span>
        <span class="steps-goal a-fade-in a-delay-5 score" contenteditable="" @input="onStepsGoalChange">{{ stepsGoal || 'NA' }}</span>
        <div class="u-gap-1"></div>
        <span class="a-fade-in a-delay-5">Current best</span>
        <span class="score a-fade-in a-delay-6"
        :class="{'score--na': !currentBest}">{{ currentBest || 'NA' }}</span>
        <div class="u-gap-4"></div>
        <ion-button name="play-outline" class="a-fade-in a-delay-7" size="1.6rem" @click="playLevel"/>
        <div class="u-gap-30"></div>
    </div>
    <code>
    <!-- {{ activeRecording }} -->
    <!-- {{ getBoundingBox() }} -->
    <!-- {{ getMapBoundingBox() }} -->
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
                <div class="tool-container tool-container--focus" @click="callCenterMap">
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
            <div class="sprite-container-object sprite-board" v-for="board in boardTiles" :style="{
                'top': `${board.y + originPosition.y}px`,
                'left': `${board.x + originPosition.x}px`
            }"></div>
            <div v-for="(portalPair, index) in portalPairs">
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
            <div class="sprite-particle sprite-positron" v-for="positron in positronParticles" :style="{
                'top': `${positron.y + originPosition.y}px`,
                'left': `${positron.x + originPosition.x}px`
            }"></div>
            <div class=" sprite-particle sprite-electron" v-for="electron in electronParticles" :style="{
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
