<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

const goToLevel = (level) => {
    router.push(`/game/${level}`);
};

const quit = () => {
    router.go(-1);
};
</script>

<template>
    <div class="select-view-container">
        <h1 class="main-title">LevelSelection</h1>
        <div class="buttons-container">
            <n-button @click="goToLevel(1)" class="button">
                L1
            </n-button>
            <n-button @click="goToLevel(2)" class="button">
                L2
            </n-button>
            <n-button @click="goToLevel(3)" class="button">
                L3
            </n-button>
            <n-button @click="goToLevel(4)" class="button">
                L4
            </n-button>
            <n-button @click="goToLevel(5)" class="button">
                L5
            </n-button>
        </div>
        <div class="svg-container" @click="quit()">
            <img src="../../quit.svg"/>
        </div>
    </div>
</template>


<style lang="scss" scoped>
.select-view-container {
    .main-title {
        text-transform: uppercase;
        font-size: 3.5rem;
        letter-spacing: 5pt;
    }
    .buttons-container {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 1rem;
    }
    .svg-container {
        position: fixed; 
        top: 10px;
        left: 10px;
    }
    .svg-container img {
        position: absolute;
        top: 0px;
        left: 0px;
    }
    .svg-container img:hover{
        filter:drop-shadow(0 0 0.6rem rgb(155, 202, 26));
    }
}
</style>