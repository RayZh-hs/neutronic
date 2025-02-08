container
<script setup>
//: Vue Imports
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { useElementBounding } from '@vueuse/core';
const router = useRouter();

//: Custom Data and Components
import { levelMapGridScaleRem, levelMapGridScalePx } from "@/data/constants"

//: Map Setup
const name = ref('');
const author = ref('');
const gameState = ref({ containers: [], particles: [] });
const mapSize = ref({ rows: 0, columns: 0 });
const selected = ref(null);
const stepsCounter = ref(0);
const levelId = router.currentRoute.value.params.levelId;
const levelLoaded = ref(false);
const refViewPort = ref(null);

const loadLevelConfig = async () => {
    try {
        let levelConfig = await import(`../data/maps/${levelId}.json`);
        name.value = levelConfig.meta.name;
        author.value = levelConfig.meta.author;
        mapSize.value = {
            rows: levelConfig.meta.rows,
            columns: levelConfig.meta.columns
        }
        gameState.value.containers = JSON.parse(JSON.stringify(levelConfig.content.containers));
        gameState.value.particles = JSON.parse(JSON.stringify(levelConfig.content.particles));
        levelLoaded.value = true;
    } catch (error) {
        console.error('Failed to load level config:', error);
    }
};

//: Panning and Centering

// - tracking the panning offset
import { usePanning } from "@/functions/usePanning";
const { panningOffset, onPanStart, onPanEnd } = usePanning(refViewPort);

//: Game Logic
const handleKeydown = (event) => {
    switch (event.key) {
        case 'ArrowUp':
            moveParticle('up');
            break;
        case 'ArrowDown':
            moveParticle('down');
            break;
        case 'ArrowLeft':
            moveParticle('left');
            break;
        case 'ArrowRight':
            moveParticle('right');
            break;
    }
};
const handleCollision = (r, c) => {
    gameState.value.containers = gameState.value.containers.filter(item => item.row !== r || item.column !== c);
    gameState.value.particles = gameState.value.particles.filter(particle => particle.row !== r || particle.column !== c);
    selected.value = null;
};
const moveParticle = (direction) => {
    if (!selected.value) {
        return;
    }
    const index = gameState.value.particles.findIndex(p => p === selected.value);
    let co = gameState.value.particles[index].color;
    let r = gameState.value.particles[index].row;
    let c = gameState.value.particles[index].column;
    if (index !== -1) {
        switch (direction) {
            case 'up':
                r -= 1;
                break;
            case 'down':
                r += 1;
                break;
            case 'left':
                c -= 1;
                break;
            case 'right':
                c += 1;
                break;
        }
    }
    const valid = gameState.value.containers.some(item => item.row === r && item.column === c) && !gameState.value.particles.some(item => item.color === co && item.row === r && item.column === c);
    if (valid) {
        stepsCounter.value++;
        gameState.value.particles[index].row = r;
        gameState.value.particles[index].column = c;
        const tmp = gameState.value.containers.find(item => item.row === r && item.column === c);
        if (tmp.type === 'board') {
            if (gameState.value.particles.some(item => item.color !== co && item.row === r && item.column === c)) {
                const collidingParticles = gameState.value.particles.filter(particle => particle.row === r && particle.column === c);
                collidingParticles.forEach(particle => particle.colliding = true);
                setTimeout(() => handleCollision(r, c), 1000);
            }
        }
        else if (tmp.type === 'portal') {
            const another = gameState.value.containers.find(item => item.type === 'portal' && item.label === tmp.label && item.row !== r && item.column !== c);
            if (gameState.value.particles.some(item => item.color !== co && item.row === r && item.column === c)) {
                const collidingParticles = gameState.value.particles.filter(particle => particle.row === r && particle.column === c);
                collidingParticles.forEach(particle => particle.colliding = true);
                setTimeout(() => { handleCollision(r, c); another.type = 'board'; }, 1000);
                return;
            }
            else if (gameState.value.particles.some(item => item.color !== co && item.row === another.row && item.column === another.column)) {
                gameState.value.particles[index].row = another.row;
                gameState.value.particles[index].column = another.column;
                const collidingParticles = gameState.value.particles.filter(particle => particle.row === another.row && particle.column === another.row);
                collidingParticles.forEach(particle => particle.colliding = true);
                setTimeout(() => { handleCollision(another.row, another.column); tmp.type = 'board'; }, 1000);
                return;
            }
            else if (gameState.value.particles.some(item => item.color === co && item.row === another.row && item.column === another.column)) return;
            gameState.value.particles[index].row = another.row;
            gameState.value.particles[index].column = another.column;
        }
    }
    else return;
};
const selectParticle = (particle) => {
    if (particle === selected.value) selected.value = null;
    else {
        selected.value = particle;
    }
};
const boardsWithPositions = computed(() => {
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
    return {
        x: (width.value - levelMapGridScalePx * (mapSize.value.rows)) / 2,
        y: (height.value - levelMapGridScalePx * (mapSize.value.columns)) / 2
    };
})

const getPositionForContainers = (item) => {
    item.classes = [];
    item.classes.push(item.type);
    if (gameState.value.containers.some(tmp => tmp.row === item.row - 1 && tmp.column === item.column && tmp.type === 'board')) item.classes.push('top');
    if (gameState.value.containers.some(tmp => tmp.row === item.row + 1 && tmp.column === item.column && tmp.type === 'board')) item.classes.push('bottom');
    if (gameState.value.containers.some(tmp => tmp.row === item.row && tmp.column === item.column - 1 && tmp.type === 'board')) item.classes.push('left');
    if (gameState.value.containers.some(tmp => tmp.row === item.row && tmp.column === item.column + 1 && tmp.type === 'board')) item.classes.push('right');
    const left = (item.column) * levelMapGridScalePx;
    const top = (item.row) * levelMapGridScalePx;
    return {
        style:
        {
            position: 'absolute',
            left: `${left + panningOffset.value.x + additionalCenteringOffset.value.x}px`,
            top: `${top + panningOffset.value.y + additionalCenteringOffset.value.y}px`
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
        top: `${top + panningOffset.value.y + additionalCenteringOffset.value.y}px`
    };
};

onMounted(async () => {
    await loadLevelConfig();
    stepsCounter.value = 0;
    gameState.value.particles.forEach((particle, index) => {
        particle.id = `particle-${index}`;
    });
    window.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeydown);
    selected.value = null;
});

const hasWon = computed(() => {
    return levelLoaded.value && gameState.value.particles.length === 0;
});
</script>

<template>
    <ion-icon name="arrow-back-circle-outline" class="back-to-home-btn a-fade-in" @click="router.go(-1)"></ion-icon>
    <!-- <div class="steps-container">
        <div class="number">{{ cnt }}</div>
        <div class="string">Steps</div>
    </div> -->
    <div class="viewport" :class="{ disabled: hasWon }" @mousedown.middle.prevent="onPanStart"
        @mouseup.middle.prevent="onPanEnd" @mouseleave="onPanEnd" ref="refViewPort">
        <div v-for="(item, index) in boardsWithPositions" :key="index" :style="item.style" class="container"
            :class="'container--' + item.className">
        </div>
        <div v-for="particle in gameState.particles" :key="particle.id" :style="getPositionForParticles(particle)"
            @click="selectParticle(particle)" class="particle"
            :class="{ ['particle--' + particle.color]: true, ['particle--' + 'active']: selected === particle, collision: particle.colliding }">
        </div>
        {{ panningOffset }}
        {{ additionalCenteringOffset }}
        {{ mapSize }}
    </div>
    <n-modal v-model:show="hasWon" class="slide-in-modal">
        <n-card title="Congratulations" class="win-message">
            <p>You Win!</p>
            <n-divider></n-divider>
        </n-card>
    </n-modal>
</template>

<style lang="scss" scoped>
// @font-face {
//     font-family: 'Game of Squids';
//     src: url(../assets/GameOfSquids.ttf) format('truetype');
//     font-weight: normal;
//     font-style: normal;
// }

// @font-face {
//     font-family: 'Borned';
//     src: url(../assets/borned.ttf) format('truetype');
//     font-weight: normal;
//     font-style: normal;
// }

@keyframes flicker {

    0%,
    100% {
        opacity: 1;
    }

    50% {
        opacity: 0.2;
    }
}

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

.collision {
    animation: flicker 0.4s 3;
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

// .steps-container {
//     position: fixed;
//     top: 2rem;
//     right: 4rem;
//     width: 7rem;
//     height: 5.5rem;
//     display: flex;
//     flex-direction: column;
//     justify-content: center;
//     background: $game-grid-container-background-color;
//     border: 1px solid $game-grid-container-border-color;
//     border-radius: 0.5rem;
// }

// .number {
//     font-family: 'Game of Squids';
//     font-size: 3.5rem;
//     height: 3.2rem;
//     color: transparent;
//     -webkit-text-stroke: 0.2rem rgba(227, 60, 100, 1);
//     filter: blur(0.25px);
//     display: flex;
//     align-items: center;
//     justify-content: center;
//     user-select: none;
//     -webkit-user-select: none;
//     -moz-user-select: none;
//     -ms-user-select: none;
// }

// .string {
//     // font-family: 'Borned';
//     font-size: 1rem;
//     color: rgba(237, 237, 237, 0.81);
//     user-select: none;
//     -webkit-user-select: none;
//     -moz-user-select: none;
//     -ms-user-select: none;
// }

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

        &.container--board {
            --border-top-left-radius: $level-map-board-border-radius;
            --border-top-right-radius: $level-map-board-border-radius;
            --border-bottom-left-radius: $level-map-board-border-radius;
            --border-bottom-right-radius: $level-map-board-border-radius;
            border-radius: var(--border-top-left-radius) var(--border-top-right-radius) var(--border-bottom-right-radius) var(--border-bottom-left-radius);
            background: $game-grid-container-background-color;
            border: 1px solid $game-grid-container-border-color;

            &.top {
                --border-top-left-radius: 0;
                --border-top-right-radius: 0;
            }

            &.bottom {
                --border-bottom-left-radius: 0;
                --border-bottom-right-radius: 0;
            }

            &.left {
                --border-top-left-radius: 0;
                --border-bottom-left-radius: 0;
            }

            &.right {
                --border-top-right-radius: 0;
                --border-bottom-right-radius: 0;
            }
        }

        &.container--portal {
            border-radius: $level-map-board-border-radius;
            // TODO: Inherit color
            background: rgba(255, 141, 26, 0.2);
            border: 1px solid rgba(255, 141, 26, 0.61);
            box-shadow: 0px 2px 9px 1px rgba(0, 0, 0, 0.25);
        }
    }

    .particle {
        width: $level-map-particle-diameter;
        height: $level-map-particle-diameter;
        border-radius: 50%;
        transform: translate(calc(-50% + $level-map-grid-scale / 2), calc(-50% + $level-map-grid-scale / 2));
        transform-origin: calc($level-map-grid-scale / 2) calc($level-map-grid-scale / 2);
        // opacity: 0.85;

        transition: all 0.2s ease-out;

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

        &:hover:not(.particle--active) {
            scale: 1.1;
            // opacity: 0.9;
        }
    }
}
</style>