container
<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
import { levelPortalCycleColor, levelMapPortalBackgroundAlpha } from "../data/constants";
import {hexaToRgba} from "../functions/colorUtils";
const router = useRouter();
const name = ref('');
const author = ref('');
const gameState = ref({ containers: [], particles: [] });
const gridSize = ref({ width: 3.875, height: 3.875 });
const selected = ref(null);
const cnt = ref(0);
const levelId = router.currentRoute.value.params.levelId;
const levelLoaded = ref(false);
const isAnimating = ref(false);
const hasWon=ref(false);

const loadLevelConfig = async () => {
    try {
        let levelConfig = await import(`../data/maps/${levelId}.json`);
        name.value = levelConfig.meta.name;
        author.value = levelConfig.meta.author;
        gameState.value.containers = JSON.parse(JSON.stringify(levelConfig.content.containers));
        gameState.value.particles = JSON.parse(JSON.stringify(levelConfig.content.particles));
        levelLoaded.value = true;
    } catch (error) {
        console.error('Failed to load level config:', error);
    }
};

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
    isAnimating.value = false;
};

const moveParticle = (direction) => {
    if (!selected.value||isAnimating.value) {
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
        cnt.value++;
        gameState.value.particles[index].row = r;
        gameState.value.particles[index].column = c;
        const tmp = gameState.value.containers.find(item => item.row === r && item.column === c);
        if (tmp.type === 'board') {
            if (gameState.value.particles.some(item => item.color !== co && item.row === r && item.column === c)) {
                const collidingParticles = gameState.value.particles.filter(particle => particle.row === r && particle.column === c);
                collidingParticles.forEach(particle => particle.colliding = true);
                isAnimating.value = true;
                setTimeout(() =>
                {
                    handleCollision(r, c);
                    if(levelLoaded.value && gameState.value.particles.length === 0)
                    {
                        hasWon.value = true;
                    }
                }, 800);
                return;
            }
        }
        else if (tmp.type === 'portal') {
            const another = gameState.value.containers.find(item => item.index === tmp.index && item !== tmp);
            if (gameState.value.particles.some(item => item.color !== co && item.row === r && item.column === c)) {
                const collidingParticles = gameState.value.particles.filter(particle => particle.row === r && particle.column === c);
                collidingParticles.forEach(particle => particle.colliding = true);
                isAnimating.value = true;
                setTimeout(() => {
                    handleCollision(r, c); 
                    another.type = 'board'; 
                    if(levelLoaded.value && gameState.value.particles.length === 0)
                    {
                        hasWon.value = true;
                    }
                }, 800);
                return;
            }
            else if (gameState.value.particles.some(item => item.color !== co && item.row === another.row && item.column === another.column)) {
                gameState.value.particles[index].row = another.row;
                gameState.value.particles[index].column = another.column;
                const collidingParticles = gameState.value.particles.filter(particle => particle.row === another.row && particle.column === another.row);
                collidingParticles.forEach(particle => particle.colliding = true);
                isAnimating.value = true;
                setTimeout(() => {
                    handleCollision(another.row, another.column);
                    tmp.type = 'board';
                    if(levelLoaded.value && gameState.value.particles.length === 0)
                    {
                        hasWon.value = true;
                    }
                }, 800);
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
        const position = getPosition1(item);
        return {
            ...item,
            style: position.style,
            className: position.className
        };
    });
});


const getPosition1 = (item) => {
    item.classes = [];
    item.classes.push(item.type);
    const left = 18 + (item.column - 1) * gridSize.value.width;
    const top = 10 + (item.row - 1) * gridSize.value.height;
    if(item.type === 'board')
    {
        if (gameState.value.containers.some(tmp => tmp.row === item.row - 1 && tmp.column === item.column && tmp.type === 'board')) item.classes.push('top');
        if (gameState.value.containers.some(tmp => tmp.row === item.row + 1 && tmp.column === item.column && tmp.type === 'board')) item.classes.push('bottom');
        if (gameState.value.containers.some(tmp => tmp.row === item.row && tmp.column === item.column - 1 && tmp.type === 'board')) item.classes.push('left');
        if (gameState.value.containers.some(tmp => tmp.row === item.row && tmp.column === item.column + 1 && tmp.type === 'board')) item.classes.push('right');
        return {
            style:
            {
                position: 'absolute',
                left: `${left}rem`,
                top: `${top}rem`
            },
            className: item.classes.join(' ')
        };
    }
    else if(item.type === 'portal')
    {
        return {
            style:
            {
                position: 'absolute',
                left: `${left}rem`,
                top: `${top}rem`,
                background: hexaToRgba(levelPortalCycleColor[item.index], levelMapPortalBackgroundAlpha),
                border: `1px solid ${hexaToRgba(levelPortalCycleColor[item.index], levelMapPortalBackgroundAlpha*3)}`,
                borderRadius: `0.625rem`
            },
            className: item.classes.join(' ')
        };
    }
};

const getPosition2 = (particle) => {
    const left = 18 + (particle.column - 1) * gridSize.value.width + 0.5*1.75;
    const top = 10 + (particle.row - 1) * gridSize.value.height + 0.5*1.75;
    return {
        position: 'absolute',
        left: `${left}rem`,
        top: `${top}rem`
    };
};
onMounted(async () => {
    await loadLevelConfig();
    cnt.value = 0;
    gameState.value.particles.forEach((particle, index) => {
        particle.id = `particle-${index}`;
    });
    window.addEventListener('keydown', handleKeydown);
    
});

onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeydown);
    selected.value = null;
});

</script>

<template>
    <ion-icon name="arrow-back-circle-outline" class="back-to-home-btn a-fade-in" @click="router.go(-1)"></ion-icon>
    <div class="steps-container">
        <div class="number">{{ cnt }}</div>
        <div class="string">Steps</div>
    </div>
    <div class="viewport" :class="{ disabled: hasWon }">
        <div v-for="(item, index) in boardsWithPositions" :key="index" :style="item.style" class="container"
            :class="'container--' + item.className">
        </div>
        <div v-for="particle in gameState.particles" :key="particle.id" :style="getPosition2(particle)" @click="selectParticle(particle)" class="particle"
            :class="{ ['particle--' + particle.color]: true, ['particle--' + 'active']: selected === particle, collision: particle.colliding }"
            >
        </div>
    </div>
    <n-modal v-model:show="hasWon" class="slide-in-modal" @update:show="(value) => { if (!value) router.go(-1); }">
        <n-card title="Congratulations" class="win-message">
            <p>You Win!</p>
            <n-divider></n-divider>
        </n-card>
    </n-modal>
</template>

<style lang="scss" scoped>
@font-face {
    font-family: 'Game of Squids';
    src: url(../assets/GameOfSquids.ttf) format('truetype');
    font-weight: normal;
    font-style: normal;
}

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
    animation: flicker 0.2s 3;
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

.win-message
    {
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
    top: 2rem;
    right: 4rem;
    width: 7rem;
    height: 5.5rem;
    display: flex;
    flex-direction: column;
    justify-content: center;
    background: $game-grid-container-background-color;
    border: 1px solid $game-grid-container-border-color;
    border-radius: 0.5rem;
}


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

.disabled {
    pointer-events: none;
    opacity: 0.5;
}

.viewport {
    position: relative;
    top: 0;
    left: 0;
    width: 80vw;
    height: 80vh;

    .container {
        width: $game-grid-scale;
        height: $game-grid-scale;
        opacity: 1;

        &.container--board {
            --border-top-left-radius: 0.31rem;
            --border-top-right-radius: 0.31rem;
            --border-bottom-left-radius: 0.31rem;
            --border-bottom-right-radius: 0.31rem;
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

    }

        .particle {
            width: 1.875rem;
            height: 1.875rem;
            border-radius: 50%;
            opacity: 0.85;

            transition: all 0.2s ease-out;
            transform-origin: center center;

            &.particle--red {
                background: $n-red;
                // border: 0.2rem solid $n-red;
            }

            &.particle--blue {
                background: $n-blue;
                // border: 0.2rem solid $n-blue;
            }

            &.particle--active {
                scale: 0.8;
                opacity: 1;
                
                // background-color: wheat;

                &::after {
                    scale: calc(1/0.8);
                    content: '';
                    position: absolute;
                    top: -0.1rem;
                    left: -0.1rem;
                    width: 1.875rem;
                    height: 1.875rem;
                    border-radius: 50%;
                }

                &.particle--blue::after {
                    border: 0.1rem solid $n-blue;
                }

                &.particle--red::after {
                    border: 0.1rem solid $n-red;
                }
            }

            &:hover:not(.particle--active) {
                scale: 1.1;
                opacity: 0.9;
            }
        }
}

</style>