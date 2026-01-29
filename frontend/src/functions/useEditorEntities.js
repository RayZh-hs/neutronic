import { levelPortalCycleColorCount } from '@/data/constants';

const cloneCoord = (coord) => ({ x: coord.x, y: coord.y });
const matchesCoord = (target) => (candidate) => candidate.x === target.x && candidate.y === target.y;

export const useEditorEntities = () => {
    const boardTiles = ref([]);
    const portalPairs = ref([]);
    const positronParticles = ref([]);
    const electronParticles = ref([]);
    const usedPortalPairsCount = ref(0);
    const activePortalMode = ref('first');  // ['first', 'second']

    const canPlaceMorePortals = computed(() =>
        usedPortalPairsCount.value < levelPortalCycleColorCount
    );

    const hasBoardAt = (coord) => boardTiles.value.some(matchesCoord(coord));
    const hasPortalAt = (coord) =>
        portalPairs.value.some(pair => pair.some(matchesCoord(coord)));
    const hasContainerAt = (coord) => hasBoardAt(coord) || hasPortalAt(coord);
    const hasPositronAt = (coord) => positronParticles.value.some(matchesCoord(coord));
    const hasElectronAt = (coord) => electronParticles.value.some(matchesCoord(coord));

    const addBoardAt = (coord) => {
        boardTiles.value.push(cloneCoord(coord));
    };

    const removeBoardAt = (coord) => {
        boardTiles.value = boardTiles.value.filter(item => !matchesCoord(coord)(item));
    };

    const cleanupPortals = () => {
        portalPairs.value = portalPairs.value.filter(pair => pair.length === 2);
        usedPortalPairsCount.value = portalPairs.value.length;
        activePortalMode.value = 'first';
        // Remove lone particles from the level editor
        positronParticles.value = positronParticles.value.filter(particle =>
            hasPortalAt(particle) || hasBoardAt(particle)
        );
        electronParticles.value = electronParticles.value.filter(particle =>
            hasPortalAt(particle) || hasBoardAt(particle)
        );        
    };

    const addPortalAt = (coord) => {
        if (activePortalMode.value === 'first') {
            portalPairs.value.push([cloneCoord(coord)]);
            activePortalMode.value = 'second';
        } else {
            portalPairs.value[usedPortalPairsCount.value].push(cloneCoord(coord));
            usedPortalPairsCount.value++;
            activePortalMode.value = 'first';
        }
    };

    const removePortalAt = (coord) => {
        portalPairs.value = portalPairs.value.map(pair =>
            pair.filter(item => !matchesCoord(coord)(item))
        );
        cleanupPortals();
    };

    const removeParticlesAt = (coord) => {
        electronParticles.value = electronParticles.value.filter(item => !matchesCoord(coord)(item));
        positronParticles.value = positronParticles.value.filter(item => !matchesCoord(coord)(item));
    };

    const removePlacementAt = (coord) => {
        if (hasPositronAt(coord) || hasElectronAt(coord)) {
            removeParticlesAt(coord);
        } else if (hasBoardAt(coord)) {
            removeBoardAt(coord);
        } else if (hasPortalAt(coord)) {
            removePortalAt(coord);
        }
    };

    const resetEntities = () => {
        boardTiles.value = [];
        portalPairs.value = [];
        positronParticles.value = [];
        electronParticles.value = [];
        usedPortalPairsCount.value = 0;
        activePortalMode.value = 'first';
    };

    return {
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
    };
};
