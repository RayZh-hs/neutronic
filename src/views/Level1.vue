<script>

export default {
    data() {
        return {
            levelId:'',
            name:'',
            author:'',
            description:'',
            difficulty:'',
            boards:[],
            particles:[],
            gridSize: { width: 62, height: 62},
            selected: null,
        };
    },
    created() {
        this.loadLevelConfig();
        console.log("created");
    },
    mounted() {
        window.addEventListener('keydown', this.handleKeydown);
    },
    beforeUnmount() {
        window.removeEventListener('keydown', this.handleKeydown);
        this.selected = null;
        this.particles = [];
    },
    methods: {
        async loadLevelConfig() {
            try {
                let levelConfig = await import('./Level1.json');
                this.levelId = levelConfig.default.properties.meta.properties.levelId.default;
                this.name = levelConfig.default.properties.meta.properties.name.default;
                this.author = levelConfig.default.properties.meta.properties.author.default;
                this.description = levelConfig.default.properties.meta.properties.description.default;
                this.difficulty = levelConfig.default.properties.meta.properties.difficulty.default;
                this.boards = levelConfig.default.properties.content.properties.boards.default;
                console.log(555);
                this.particles = levelConfig.default.properties.content.properties.particles.default;
                console.log(levelConfig.default.properties.content.properties.particles.default);
            }catch (error) {
                console.error("Failed to load level config:", error);
            }
        },
        quit()
        {
            this.$router.go(-1);
        },
        handleKeydown(event) {
            switch (event.key) {
            case 'ArrowUp':
                this.moveParticle('up');
                break;
            case 'ArrowDown':
                this.moveParticle('down');
                break;
            case 'ArrowLeft':
                this.moveParticle('left');
                break;
            case 'ArrowRight':
                this.moveParticle('right');
                break;
            }
        },
        moveParticle(direction) {
            if (!this.selected) {
                return;
            }
            const index = this.particles.findIndex(p => p === this.selected);
            let co=this.particles[index].color;
            let r=this.particles[index].row;
            let c=this.particles[index].column;
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
            const valid=this.boards.some(item => item.row === r && item.column === c)&&!this.particles.some(item => item.color===co && item.row === r && item.column === c);
            if(valid)
            {
                this.particles[index].row=r;
                this.particles[index].column=c;
                if(this.particles.some(item => item.color!==co && item.row === r && item.column === c))
                {
                    this.boards = this.boards.filter(item => item.row !== r || item.column !== c);
                    this.particles = this.particles.filter(particle => particle.row !== r || particle.column !== c);
                    this.selected=null;
                }
            }
            else return;
            this.particles.forEach(particle => {
                console.log(particle.color,particle.row,particle.column);});
        },
        findParticle(board) {
            return this.particles.filter(particle => {
                return particle.row === board.row && particle.column === board.column;
            });
        },
        getPosition(item) {
            const left = 300+(item.column - 1) * this.gridSize.width;
            const top = 200+(item.row - 1) * this.gridSize.height;
            return {
                position: 'absolute',
                left: `${left}px`,
                top: `${top}px`
            };
        },
        selectParticle(particle)
        {
            if(particle===this.selected) this.selected=null;
            else
            {
                this.selected=particle;
            }
        }
    },
};

</script>

<template>
    <div class="svg-container" @click="quit">
        <img src="../../quit.svg"/>
    </div>
    <div class="viewport"> 
        <div v-for="(item, index) in boards" :key="index" :style="getPosition(item)" :class="item.type">
            <div v-for="(particle, pindex) in findParticle(item)" :key="pindex" @click="selectParticle(particle)"
            :class="{[particle.color]:true, active: selected === particle}"
            >
            </div>
        </div>
    </div>
</template>
  
<style lang="scss" scoped>

.svg-container {
    position: fixed; 
    top: 10px;
    left: 10px;
    width: 60px;
    height: 60px;
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
.viewport .board{
    width: 58px;
    height: 58px;
    opacity: 1;        
    border-radius: 0px 0px 5px 0px;
    background: rgba(230, 230, 230, 0.07);
    border: 1px solid rgba(237, 237, 237, 0.15);
}

.viewport .portal{
    width: 58px;
    height: 58px;
    opacity: 1;
    border-radius: 10px;
    background: rgba(255, 141, 26, 0.2);
    border: 1px solid rgba(255, 141, 26, 0.61);
    box-shadow: 0px 2px 9px 1px rgba(0, 0, 0, 0.25);
}
.viewport .board .blue{
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 30px;
    height: 30px;
    opacity: 1;
    border-radius: 43px;
    background: rgb(0, 102, 204);
    border: 2px solid rgba(0, 122, 240, 0.78);
    filter: blur(1px);
}
.viewport .board .red{
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 30px;
    height: 30px;
    opacity: 1;
    border-radius: 50%;
    background: rgba(229, 104, 54, 0.7);
    border: 2px solid rgba(191, 167, 121, 0.54);
    filter: blur(1px);
}
.viewport .board .red.active::before{
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 39px; 
    height: 39px;
    border-radius: 50%;
    border: 4px solid rgba(194,34,64);
    background: transparent;
    z-index: -1;
}
.viewport .board .red.active{
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 30px;
    height: 30px;
    opacity: 1;
    border-radius: 43px;
    background: rgba(229, 104, 54, 0.7);
    border: 1px solid rgba(191, 167, 121, 0.54);
    filter: blur(1px);
    z-index: 1;
}
.viewport .board .blue.active::before{
    content: '';
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 39px; 
    height: 39px;
    border-radius: 50%;
    border: 4px solid rgb(94, 169, 243);
    background: transparent;
    z-index: -1;
}
.viewport .board .blue.active{
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: 30px;
    height: 30px;
    opacity: 1;
    border-radius: 43px;
    background: rgb(0, 102, 204);
    border: 1px solid rgba(0, 122, 240, 0.78);
    filter: blur(1px);
    z-index: 1;
}
</style>