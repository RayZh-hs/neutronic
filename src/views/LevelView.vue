<script setup>
import { computed, ref, onMounted, onBeforeUnmount } from 'vue';
import { useRouter } from 'vue-router';
const router = useRouter();
const name = ref('');
const author = ref('');
const description = ref('');
const difficulty = ref('');
const gameState = ref({ boards: [], particles: [] });
const gridSize = ref({ width: 3.875, height: 3.875 });
const selected = ref(null);
const cnt=ref(0);
const levelId = router.currentRoute.value.params.levelId;

const loadLevelConfig = async () => {
    try {
        let levelConfig = await import(`../data/maps/${levelId}.json`);
        name.value = levelConfig.meta.name;
        author.value = levelConfig.meta.author;
        description.value = levelConfig.meta.description;
        difficulty.value = levelConfig.meta.difficulty;
        gameState.value.boards = JSON.parse(JSON.stringify(levelConfig.content.boards));
        gameState.value.particles = JSON.parse(JSON.stringify(levelConfig.content.particles));
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

const quit = () => {
    router.go(-1);
};

const handleCollision = (r, c) => {
    gameState.value.boards = gameState.value.boards.filter(item => item.row !== r || item.column !== c);
    gameState.value.particles = gameState.value.particles.filter(particle => particle.row !== r || particle.column !== c);
    selected.value = null;
};

const moveParticle=(direction)=> {
    if (!selected.value) {
        return;
    }
    const index = gameState.value.particles.findIndex(p => p === selected.value);
    let co=gameState.value.particles[index].color;
    let r=gameState.value.particles[index].row;
    let c=gameState.value.particles[index].column;
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
    const valid=gameState.value.boards.some(item => item.row === r && item.column === c)&&!gameState.value.particles.some(item => item.color===co && item.row === r && item.column === c);
    if(valid)
    {
        cnt.value++;
        gameState.value.particles[index].row=r;
        gameState.value.particles[index].column=c;
        const tmp=gameState.value.boards.find(item => item.row === r && item.column === c);
        if(tmp.type==='board')
        {
            if(gameState.value.particles.some(item => item.color!==co && item.row === r && item.column === c))
            {
                const collidingParticles = gameState.value.particles.filter(particle => particle.row === r && particle.column === c);
                collidingParticles.forEach(particle => particle.colliding = true);
                setTimeout(() => handleCollision(r, c), 1000);
            }
        }
        else if(tmp.type==='portal')
        {
            const another=gameState.value.boards.find(item => item.type==='portal' && item.label===tmp.label && item.row !== r && item.column !== c);
            if(gameState.value.particles.some(item => item.color!==co && item.row === r && item.column === c))
            {
                const collidingParticles = gameState.value.particles.filter(particle => particle.row === r && particle.column === c);
                collidingParticles.forEach(particle => particle.colliding = true);
                setTimeout(() => {handleCollision(r, c); another.type = 'board';}, 1000);
                return;
            }
            else if(gameState.value.particles.some(item => item.color!==co && item.row === another.row && item.column === another.column))
            {
                gameState.value.particles[index].row=another.row;
                gameState.value.particles[index].column=another.column;
                const collidingParticles = gameState.value.particles.filter(particle => particle.row === another.row && particle.column === another.row);
                collidingParticles.forEach(particle => particle.colliding = true);
                setTimeout(() => {handleCollision(another.row, another.column); tmp.type = 'board';}, 1000);
                return;
            }
            else if(gameState.value.particles.some(item => item.color===co && item.row === another.row && item.column === another.column)) return;
            gameState.value.particles[index].row=another.row;
            gameState.value.particles[index].column=another.column;
        }
    }
    else return;
};
const findParticle=(board)=> {
    return gameState.value.particles.filter(particle => {
        return particle.row === board.row && particle.column === board.column;
    });
};
const selectParticle=(particle)=> {
    if(particle===selected.value) selected.value=null;
    else
    {
        selected.value=particle;
    }
};

const boardsWithPositions = computed(() => {
    return gameState.value.boards.map(item => {
        const position = getPosition(item);
        return {
            ...item,
            style: position.style,
            className: position.className
        };
    });
});

const getPosition = (item) => {
    item.classes = [];
    item.classes.push(item.type);
    if(gameState.value.boards.some(tmp => tmp.row === item.row-1 && tmp.column === item.column && tmp.type==='board')) item.classes.push('top');
    if(gameState.value.boards.some(tmp => tmp.row === item.row+1 && tmp.column === item.column && tmp.type==='board')) item.classes.push('bottom');
    if(gameState.value.boards.some(tmp => tmp.row === item.row && tmp.column === item.column-1 && tmp.type==='board')) item.classes.push('left');
    if(gameState.value.boards.some(tmp => tmp.row === item.row && tmp.column === item.column+1 && tmp.type==='board')) item.classes.push('right');
    const left = 18+(item.column - 1) * gridSize.value.width;
    const top = 10+(item.row - 1) * gridSize.value.height;
    return {
        style:
        {
            position: 'absolute',
            left: `${left}rem`,
            top: `${top}rem`
        },
        className: item.classes.join(' ')
    };
};

onMounted(async() => {
    await loadLevelConfig();
    cnt.value=0;
    window.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleKeydown);
    selected.value = null;
});

const hasWon = computed(() => {
    return gameState.value.particles.length === 0;
});
</script>

<template>
    <div class="svg-container" @click="quit">
        <img src="../../quit.svg"/>
    </div>
    <div class="steps-container">
        <div class="number">{{ cnt }}</div>
        <div class="string">Steps</div>
    </div>
    <div class="viewport" :class="{ disabled: hasWon }"> 
        <div v-for="(item, index) in boardsWithPositions" :key="index" :style="item.style" :class="item.className">
            <div v-for="(particle, pindex) in findParticle(item)" :key="pindex" @click="selectParticle(particle)"
            :class="{[particle.color]:true, active: selected === particle ,collision: particle.colliding}">
            </div>
        </div>
    </div>
    <div v-if="hasWon" class="win-message">
        You Win!
    </div>
</template>
  
<style lang="scss" scoped>
@font-face {
    font-family: 'Game of Squids';
    src: url(../assets/GameOfSquids.ttf) format('truetype');
    font-weight: normal;
    font-style: normal;
}
@font-face {
    font-family: 'Borned';
    src: url(../assets/borned.ttf) format('truetype');
    font-weight: normal;
    font-style: normal;
}
@keyframes flicker {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.2; }
}

.collision {
    animation: flicker 0.4s 3;
}
.steps-container{
    position: fixed; 
    top: 2rem;
    right: 4rem;
    width: 7rem;
    height: 5.5rem;
    z-index: 1;
    display: flex;
    flex-direction: column;
    justify-content: center;
    background: rgba(230, 230, 230, 0.07);
    border: 1px solid rgba(230, 230, 230, 0.24);
    border-radius: 0.5rem;
}
.win-message{
    position: fixed; 
    top: 5rem;
    left: 30rem;
    font-family: 'Game of Squids', sans-serif;
    font-size: 3.5rem;
    color: rgba(0, 102, 204, 0.9);
    text-shadow: 0px 0px 0.5rem rgba(39, 236, 21, 0.3);
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
}
.number{
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

.string{
    font-family: 'Borned';
    font-size: 1rem;
    color:rgba(237, 237, 237, 0.81);
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
}
.svg-container {
    position: fixed; 
    top: 0.625rem;
    left: 0.625rem;
    width: 3.75rem;
    height: 3.75rem;
    z-index: 1;
}
.svg-container img {
    position: absolute;
    top: 0px;
    left: 0px;
    z-index: inherit;
}
.svg-container img:hover{
    filter:drop-shadow(0 0 0.4rem rgb(155, 202, 26));
}
.viewport{
    position: relative; 
    top: 0;
    left: 0;
    width: 80vw;
    height: 80vh;
}
.disabled{
    pointer-events: none;
    opacity: 0.5;
}
.viewport .board{
    width: 3.625rem;
    height: 3.625rem;
    opacity: 1;        
    --border-top-left-radius: 0.31rem;
    --border-top-right-radius: 0.31rem;
    --border-bottom-left-radius: 0.31rem;
    --border-bottom-right-radius: 0.31rem;
    border-radius: var(--border-top-left-radius) var(--border-top-right-radius) var(--border-bottom-right-radius) var(--border-bottom-left-radius);
    background: rgba(230, 230, 230, 0.07);
    border: 1px solid rgba(237, 237, 237, 0.15);
    &.top{
        --border-top-left-radius: 0;
        --border-top-right-radius: 0;
    }
    &.bottom{
        --border-bottom-left-radius: 0;
        --border-bottom-right-radius: 0;
    }
    &.left{
        --border-top-left-radius: 0;
        --border-bottom-left-radius: 0;
    }
    &.right{
        --border-top-right-radius: 0;
        --border-bottom-right-radius: 0;
    }
}
.viewport .portal{
    width: 3.625rem;
    height: 3.625rem;
    opacity: 1;
    border-radius: 0.625rem;
    background: rgba(255, 141, 26, 0.2);
    border: 1px solid rgba(255, 141, 26, 0.61);
    box-shadow: 0px 2px 9px 1px rgba(0, 0, 0, 0.25);
}
.viewport .board .blue,.viewport .portal .blue{
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 1.875rem;
    height: 1.875rem;
    opacity: 1;
    border-radius: 50%;
    background: rgb(0, 102, 204);
    border: 2px solid rgba(0, 122, 240, 0.78);
    filter: blur(1px);
}
.viewport .board .red,.viewport .portal .red{
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 1.875rem;
    height: 1.875rem;
    opacity: 1;
    border-radius: 50%;
    background: rgba(229, 104, 54, 0.7);
    border: 2px solid rgba(191, 167, 121, 0.54);
    filter: blur(1px);
}
.viewport .board .red.active::before,.viewport .portal .red.active::before{
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 2.4375rem; 
    height: 2.4375rem;
    border-radius: 50%;
    border: 4px solid rgba(194,34,64);
    background: transparent;
    z-index: -1;
}
.viewport .board .red.active,.viewport .portal .red.active{
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 1.875rem;
    height: 1.875rem;
    opacity: 1;
    border-radius: 50%;
    background: rgba(229, 104, 54, 0.7);
    border: 1px solid rgba(191, 167, 121, 0.54);
    filter: blur(1px);
    z-index: 1;
}
.viewport .board .blue.active::before,.viewport .portal .blue.active::before{
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 2.4375rem; 
    height: 2.4375rem;
    border-radius: 50%;
    border: 4px solid rgb(94, 169, 243);
    background: transparent;
    z-index: -1;
}
.viewport .board .blue.active, .viewport .portal .blue.active{
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 1.875rem;
    height: 1.875rem;
    opacity: 1;
    border-radius: 50%;
    background: rgb(0, 102, 204);
    border: 1px solid rgba(0, 122, 240, 0.78);
    filter: blur(1px);
    z-index: 1;
}
</style>