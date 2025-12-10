import { ref, computed } from 'vue';
import { assert } from '@vueuse/core';
import { useGameStateQueries } from '@/functions/useGameStateQueries';
import { 
    levelMapGridScalePx, 
    levelPortalCycleColor, 
    levelMapPortalBackgroundAlpha, 
    gameDefaultAnimationDuration, 
    gameDropoutAnimationDuration, 
    gameTransportAnimationDuration 
} from "@/data/constants";
import { refAnimateToObject, easeNopeGenerator } from '@/functions/animateUtils';
import { randomFloatFromInterval } from '@/functions/mathUtils';
import { hexaToRgba } from "../functions/colorUtils";

export function useLevelGame(refViewPort, panningOffset, additionalCenteringOffset) {
    // State
    const gameState = ref({ containers: [], particles: [] });
    const mapSize = ref({ rows: 0, columns: 0 });
    const stepsCounter = ref(0);
    const stepsGoal = ref(0);
    const isLevelLoaded = ref(false);
    const isPanning = ref(false);
    const isCustomAnimating = ref(false);
    const disableInteraction = ref(false);
    const hasWon = ref(false);
    const selected = ref(null);
    const baseLevelDefinition = ref(null);
    const name = ref('');
    const author = ref('');

    // Queries
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

    const canInteract = computed(() => isLevelLoaded.value && !isPanning.value);
    const doSmoothAnimate = computed(() => isLevelLoaded.value && !isPanning.value && !isCustomAnimating.value);

    // Level Loading
    const loadLevelFromString = (levelString) => {
        name.value = levelString.meta.name;
        author.value = levelString.meta.author;
        mapSize.value = {
            rows: levelString.meta.rows,
            columns: levelString.meta.columns
        };
        const containers = JSON.parse(JSON.stringify(levelString.content.containers));
        const particles = JSON.parse(JSON.stringify(levelString.content.particles));
        particles.forEach((p, i) => {
            if (!p.id) p.id = `particle-${i}`;
        });
        baseLevelDefinition.value = {
            containers,
            particles
        };
        gameState.value.containers = JSON.parse(JSON.stringify(baseLevelDefinition.value.containers));
        gameState.value.particles = JSON.parse(JSON.stringify(baseLevelDefinition.value.particles));
        stepsGoal.value = levelString.content.goal;
        isLevelLoaded.value = true;
    };

    const initializeRuntimeState = (shouldObscure = true) => {
        gameState.value.particles.forEach((particle, index) => {
            if (!particle.id) particle.id = `particle-${index}`;
            particle.obscure = shouldObscure;
            particle.colliding = false;
            particle.transporting = false;
            particle.skipTransition = false;
        });
        gameState.value.containers.forEach((container, index) => {
            container.id = `container-${index}`;
            container.obscure = shouldObscure;
            container.classes = [];
        });
    };

    const restoreBaseLevelState = ({ obscure = false, resetRecording = true } = {}) => {
        if (!baseLevelDefinition.value) {
            return false;
        }
        gameState.value.containers = JSON.parse(JSON.stringify(baseLevelDefinition.value.containers));
        gameState.value.particles = JSON.parse(JSON.stringify(baseLevelDefinition.value.particles));
        initializeRuntimeState(obscure);
        selected.value = null;
        disableInteraction.value = false;
        isCustomAnimating.value = false;
        hasWon.value = false;
        stepsCounter.value = 0;
        return true;
    };

    // Game Logic Helpers
    const isMoveValid = (currentColor, currentId, newPos) => {
        if (!hasContainerAt(newPos.row, newPos.column)) return false;
        if (hasParticleWithColorAt(newPos.row, newPos.column, currentColor)) return false;
        if (hasPortalAt(newPos.row, newPos.column)) {
            const otherPortal = getOtherPortal(newPos.row, newPos.column);
            if (hasParticleWithColorAt(otherPortal.row, otherPortal.column, currentColor) && getParticleAt(otherPortal.row, otherPortal.column).id != currentId) return false;
        }
        return true;
    };

    const updateMapAfterCollision = (r, c) => {
        if (hasPortalAt(r, c)) {
            const otherPortal = getOtherPortal(r, c);
            otherPortal.type = 'board';
        }
        gameState.value.containers = gameState.value.containers.filter(item => item.row !== r || item.column !== c);
        gameState.value.particles = gameState.value.particles.filter(particle => particle.row !== r || particle.column !== c);
        if (selected.value && selected.value.row === r && selected.value.column === c) {
            selected.value = null;
        }
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
            if (selectedParticleDOM) selectedParticleDOM.style.translate = `${refOffset.value.x}px ${refOffset.value.y}px`;
        }).onFinish(() => {
            onFinishCallback();
        });

        return {
            onFinish(callback) {
                onFinishCallback = callback;
            }
        };
    };

    const createShadowParticleFrom = (source) => {
        if (!source || !refViewPort.value) return;
        var shadowParticleNode = source.cloneNode(true);
        shadowParticleNode.id = `shadow-${source.id}`;
        shadowParticleNode.classList.add('shadow-particle');
        refViewPort.value.appendChild(shadowParticleNode);
    };

    const collapseContainerAt = (r, c) => {
        const container = getContainerAt(r, c);
        if (container) {
            const containerNode = document.getElementById(container.id);
            if (containerNode) containerNode.classList.add('container--collapse');
        }
    };

    const makeBoardFrom = (r, c) => {
        const container = getContainerAt(r, c);
        if (container) {
            const containerNode = document.getElementById(container.id);
            if (containerNode) containerNode.classList.add('container--becoming-board');
        }
    };

    const moveParticle = (direction, options = {}) => {
        const { allowWhilePlayback = false, instant = false, onMoveRecorded = null } = options;
        if (!selected.value) {
            return;
        }
        if (!allowWhilePlayback && !canInteract.value) {
            return;
        }
        const currentIndex = gameState.value.particles.findIndex(p => p === selected.value);
        if (currentIndex === -1) return;

        const currentParticle = gameState.value.particles[currentIndex];
        let currentColor = currentParticle.color;
        let currentRow = currentParticle.row;
        let currentColumn = currentParticle.column;
        let currentId = currentParticle.id;
        let currentNode = document.getElementById(currentId);

        switch (direction) {
            case 'up': currentRow -= 1; break;
            case 'down': currentRow += 1; break;
            case 'left': currentColumn -= 1; break;
            case 'right': currentColumn += 1; break;
        }

        const isValid = isMoveValid(currentColor, currentId, { row: currentRow, column: currentColumn });
        if (isValid) {
            stepsCounter.value++;
            if (onMoveRecorded) onMoveRecorded(currentId, direction);

            currentParticle.row = currentRow;
            currentParticle.column = currentColumn;

            const duration = instant ? 0 : gameDropoutAnimationDuration;
            const transportDuration = instant ? 0 : gameTransportAnimationDuration;
            const defaultDuration = instant ? 0 : gameDefaultAnimationDuration;

            if (getParticlesAt(currentRow, currentColumn).length >= 2) {
                if (!instant) disableInteraction.value = true;
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
                if (!instant) disableInteraction.value = true;
                
                const handlePortalLogic = () => {
                    if (!instant) isCustomAnimating.value = true;
                    const otherPortalCoord = getOtherPortal(currentRow, currentColumn);
                    if (!instant) createShadowParticleFrom(currentNode);
                    
                    currentParticle.skipTransition = true;
                    currentParticle.row = otherPortalCoord.row;
                    currentParticle.column = otherPortalCoord.column;
                    if (!instant) setTimeout(() => { currentParticle.skipTransition = false; }, 50);

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
                        if (!instant) {
                            currentNode.classList.add('particle--transported');
                            currentParticle.transporting = true;
                        }
                        if (instant) {
                             // No op
                        } else {
                            setTimeout(() => {
                                isCustomAnimating.value = false;
                                currentNode.classList.remove('particle--transported');
                                currentParticle.transporting = false;
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

    // Rendering Helpers
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
            transition: (doSmoothAnimate.value && !item.skipTransition) ? `all ${gameDefaultAnimationDuration}ms ease-out` : 'none'
        };
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

    // Obscurity
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
    };

    const changeObscurityForAll = (value, delayRange) => {
        const length = gameState.value.particles.length + gameState.value.containers.length;
        const randomDelaySequence = getRandomSequenceWithinRange(delayRange, length);
        [gameState.value.particles, gameState.value.containers].flat()
            .forEach((obj, index) => {
                setTimeout(() => {
                    obj.obscure = value;
                }, randomDelaySequence[index]);
            });
    };

    // Focus Logic
    const getParticleHotkey = (particle) => {
        if (!particle || !particle.id) return '';
        const parts = particle.id.split('-');
        if (parts.length < 2) return '';
        const index = parseInt(parts[1], 10);
        if (isNaN(index)) return '';
        const num = index + 1;
        return num >= 10 ? String(num).split('').join(';') : String(num);
    };

    const focusParticleByOffset = (offset) => {
        const particles = gameState.value.particles;
        if (!particles || particles.length === 0) {
            return;
        }
        const currentIndex = particles.findIndex((particle) => particle === selected.value);
        if (currentIndex === -1) {
            selected.value = offset > 0 ? particles[0] : particles[particles.length - 1];
            return;
        }
        const nextIndex = (currentIndex + offset + particles.length) % particles.length;
        selected.value = particles[nextIndex];
    };

    const focusPreviousParticle = () => focusParticleByOffset(-1);
    const focusNextParticle = () => focusParticleByOffset(1);
    const toggleParticleFocus = () => {
        if (selected.value) {
            selected.value = null;
            return;
        }
        if (gameState.value.particles.length > 0) {
            selected.value = gameState.value.particles[0];
        }
    };

    const focusParticleAtIndex = (index) => {
        const particle = gameState.value.particles[index];
        if (!particle) {
            return false;
        }
        if (!canInteract.value || disableInteraction.value) {
            return false;
        }
        if (particle.colliding || particle.transporting) {
            return false;
        }
        selected.value = particle;
        return true;
    };

    return {
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
        focusPreviousParticle,
        focusNextParticle,
        toggleParticleFocus,
        focusParticleAtIndex,
        getParticleHotkey,
        updateMapAfterCollision,
        getParticlesAt,
        getOtherPortal,
        hasPortalAt,
        makeBoardFrom,
        collapseContainerAt,
        createShadowParticleFrom,
        animateInvalidMove,
        negateColor,
        hasParticleWithColorAt
    };
}
