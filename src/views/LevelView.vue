<script setup>
//: Vue Imports
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { hexaToRgba } from "../functions/colorUtils";
import { useElementBounding } from '@vueuse/core';
const router = useRouter();

//: Custom Data and Components
import { levelMapGridScaleRem, levelMapGridScalePx } from "@/data/constants"
import { levelPortalCycleColor, levelMapPortalBackgroundAlpha, gameDefaultAnimationDuration, gameDropoutAnimationDuration } from "@/data/constants";
import { refAnimateToObject, easeNopeGenerator } from '@/functions/animateUtils';

//: Map Setup
const name = ref('');
const author = ref('');
const levelId = router.currentRoute.value.params.levelId;
const gameState = ref({ containers: [], particles: [] });
const mapSize = ref({ rows: 0, columns: 0 });

const selected = ref(null);
const stepsCounter = ref(0);

const refViewPort = ref(null);

const isLevelLoaded = ref(false);
const isPanning = ref(false);
const isCustomAnimating = ref(false);
const disableInteraction = ref(false);

const canInteract = computed(() => isLevelLoaded.value && !isPanning.value && !disableInteraction.value);
const doSmoothAnimate = computed(() => isLevelLoaded.value && !isPanning.value && !isCustomAnimating.value);

const loadLevelConfig = async () => {
    try {
        let levelConfig = await import(`../data/maps/${levelId}.json`);
        name.value = levelConfig.meta.name;
        author.value = levelConfig.meta.author;
        mapSize.value = {
            rows: levelConfig.meta.rows,
            columns: levelConfig.meta.columns
        }
        console.log("map size:", mapSize);
        console.log("level config:", levelConfig);
        gameState.value.containers = JSON.parse(JSON.stringify(levelConfig.content.containers));
        gameState.value.particles = JSON.parse(JSON.stringify(levelConfig.content.particles));
        isLevelLoaded.value = true;
    } catch (error) {
        console.error('Failed to load level config:', error);
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
        console.log(otherPortal);
        console.log("current id: ", currentId);
        console.log("getParticleAt: ", getParticleAt(otherPortal.row, otherPortal.column));
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
};

const animateInvalidMove = (particleId, direction) => {
    let onFinishCallback = () => { };
    const refOffset = ref({ x: 0, y: 0 });
    const shakeOffset = levelMapGridScalePx;
    const selectedParticleDOM = document.getElementById(particleId);
    console.log(selectedParticleDOM);
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
    console.log(shadowParticleNode);
    refViewPort.value.appendChild(shadowParticleNode);
}
const collapseContainerAt = (r, c) => {
    const container = getContainerAt(r, c);
    console.log(container);
    if (container) {
        const containerNode = document.getElementById(container.id);
        containerNode.classList.add('container--collapse');
        console.log(containerNode);
    }
}
const makeBoardFrom = (r, c) => {
    const container = getContainerAt(r, c);
    if (container) {
        const containerNode = document.getElementById(container.id);
        containerNode.classList.add('container--becoming-board');
    }
}

const moveParticle = (direction) => {
    // if (!selected.value||isAnimating.value) {
    if (!selected.value || !canInteract.value) {
        return;
    }
    const currentIndex = gameState.value.particles.findIndex(p => p === selected.value);    // Not to be confused with ID
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
                    console.log("currentBoard: ", currentRow, currentColumn);
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
        animateInvalidMove(gameState.value.particles[currentIndex].id, direction)
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
    console.log(width.value, height.value, levelMapGridScalePx * (mapSize.value.rows));
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

onMounted(async () => {
    await loadLevelConfig();
    stepsCounter.value = 0;
    gameState.value.particles.forEach((particle, index) => {
        particle.id = `particle-${index}`;
    });
    gameState.value.containers.forEach((container, index) => {
        container.id = `container-${index}`;
    });
    window.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeydown);
    selected.value = null;
});

const hasWon = computed(() => {
    return isLevelLoaded.value && gameState.value.particles.length === 0;
});
</script>

<template>
    <ion-icon name="arrow-back-circle-outline" class="back-to-home-btn a-fade-in" @click="router.go(-1)"></ion-icon>
    <!-- <div class="steps-container">
        <div class="number">{{ stepsCounter }}</div>
        <div class="string">Steps</div>
    </div> -->
    <div class="viewport" :class="{ disabled: hasWon }" @mousedown.middle.prevent="onPanStartWrapper"
        @mouseup.middle.prevent="onPanEndWrapper" @mouseleave="onPanEndWrapper" ref="refViewPort">
        <div v-for="(container, index) in containersWithAttr" :key="container.id" :style="container.style"
            class="container" :class="'container--' + container.className" :id="container.id">
        </div>
        <div v-for="particle in gameState.particles" :key="particle.id" :style="getPositionForParticles(particle)"
            @click="handleSelectParticle(particle)" class="particle"
            :class="{ ['particle--' + particle.color]: true, ['particle--' + 'active']: selected === particle, 'particle--collided': particle.colliding }"
            :id="particle.id">
        </div>
        {{ panningOffset }}
        {{ mapSize }}
        {{ { isCustomAnimating, disableInteraction } }}
    </div>
    <n-modal v-model:show="hasWon" class="slide-in-modal" @update:show="(value) => { if (!value) router.go(-1); }">
        <n-card title="Congratulations" class="win-message">
            <p>You Win!</p>
            <n-divider></n-divider>
        </n-card>
    </n-modal>
</template>

<style lang="scss" scoped>
@keyframes slide-in {
    from {
        transform: translateY(-100%);
        opacity: 0.2;
    }

    to {
        transform: translateY(0);
        opacity: 1;
    }
}

.slide-in-modal {
    width: 20rem;
    height: 10rem;
    animation: slide-in 0.4s ease-out;
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1;
}

.win-message {
    // text-shadow: 0px 0px 0.5rem rgba(39, 236, 21, 0.3);
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    z-index: 1;
}

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

.steps-container {
    position: fixed;
    top: 8rem;
    right: 12rem;
    width: 7rem;
    height: 5.5rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    // background: $game-grid-container-background-color;
    // border: 1px solid $game-grid-container-border-color;
    border-radius: 0.5rem;


    .number {
        font-family: 'Game of Squids';
        font-size: 3.5rem;
        height: 3.2rem;
        color: transparent;
        -webkit-text-stroke: 0.2rem rgba(227, 60, 100, 1);
        filter: blur(0.25px);
        display: flex;
        align-items: center;
        justify-content: center;
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
    }

    .string {
        // font-family: 'Borned';
        font-size: 1rem;
        color: rgba(237, 237, 237, 0.81);
        user-select: none;
        -webkit-user-select: none;
        -moz-user-select: none;
        -ms-user-select: none;
    }
}

.viewport {
    position: relative;
    top: 0;
    left: 0;
    width: 80vw;
    height: 80vh;
    outline: 1px white solid;

    &.disabled {
        pointer-events: none;
        opacity: 0.5;
    }

    .container {
        width: calc($level-map-grid-scale - $level-map-board-border-width * 2);
        height: calc($level-map-grid-scale - $level-map-board-border-width * 2);
        opacity: 1;

        &.container--collapse {
            animation: fadeOut $game-dropout-animation-duration forwards;
        }

        &.container--becoming-board {
            transition: all $game-dropout-animation-duration ease-out;
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
</style>