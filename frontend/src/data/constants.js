/**
 * This file contains all the constants used in the application that have logical implementations.
 * That is, everything exported here is used in other .vue(script) or .js files, as opposed to the constants.scss files which defines scss variables.
 * 
 * One would think it weird to have constants stored in a javascript file instead of json.
 * It is, but this choice was made for two main reasons:
 * 1. Some constants (eg. levelMapGridScalePx) are calculated, and doing so in javascript is clearer and more straightforward.
 * 2. Javascript allows for comments. Some of the components have linked counterparts in the scss file that require simultaneous editing. The comments help keep the relationship clear.
 * 
 * It is also hoped that this added flexibility will allow for better maintainability in the future.
 */

//: API
export const SERVER_URL = import.meta.env.API_SERVER_URL || "http://localhost:9721/api";

//: Custom Selection
export const customSelectionWindowSize = 5;

//: Level Setup
export const levelMapGridScale = "4rem";    // Is linked to $map-editor-header-height
export const levelMapGridScaleRem = Number(levelMapGridScale.split('rem')[0]);
const readRootFontSizePx = () => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return 16;
    }
    const fontSize = parseFloat(getComputedStyle(document.documentElement).fontSize);
    return Number.isNaN(fontSize) ? 16 : fontSize;
};
const calculateLevelMapGridScalePx = () => levelMapGridScaleRem * readRootFontSizePx();
const levelMapGridScalePxRef = ref(calculateLevelMapGridScalePx());
const refreshLevelMapGridScalePx = () => {
    levelMapGridScalePxRef.value = calculateLevelMapGridScalePx();
};
if (typeof window !== 'undefined') {
    window.removeEventListener('resize', refreshLevelMapGridScalePx);
    window.addEventListener('resize', refreshLevelMapGridScalePx);
}
export const levelMapGridScalePx = readonly(levelMapGridScalePxRef);  // Is linked to $map-editor-header-height
export const levelPortalCycleColor = [
    "#f3722c",
    "#90be6d",
    "#4cc9f0",
    "#f9c74f",
    "#43aa8b",
    "#f94144",
    "#9b5de5",
];
export const levelPortalCycleColorCount = levelPortalCycleColor.length;
export const levelMapPortalBackgroundAlpha = 0.15;  // Is linked to $map-portal-background-alpha
export const gameRefreshFrequency = 60;
export const gameDefaultAnimationDuration = 200;    // Is linked to $game-default-animation-duration
export const gameDropoutAnimationDuration = 1000;   // Is linked to $game-dropout-animation-duration
export const gameTransportAnimationDuration = 200;  // Is linked to $game-transport-animation-duration
export const gameEntranceTitleAnimationDuration = 1000; // Is linked to $game-entrance-title-animation-duration
export const gameEntranceTitleFadeOutDuration = 4000;   // Is linked to $game-entrance-title-fade-out-duration
export const gameEntranceFocusAnimationRange = {
    min: 0,
    max: 600,
}

//: Level Editor
export const levelEditorRefreshFrequency = 60;
export const levelEditorPlaceFrequency = 45;
export const originOffsetCellsX = 5;
export const originOffsetCellsY = 5;
export const leftClickCooldownTime = 100;
export const levelEditorRightSelectBorderWidthPx = 2;   // Is linked to $map-editor-right-select-border
export const levelEditorCenterDuration = 1000;
