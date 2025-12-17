<script setup>
import StatusBar from './StatusBar.vue';

const props = defineProps({
    name: String,
    total: Number,
    passes: { type: Number, default: 0 },
    perfects: { type: Number, default: 0 },
    locked: Boolean
});

const emits = defineEmits(['click']);

</script>

<template>
    <div class="album-divider">
        <div class="album-card" :class="{ locked: locked }" @click="locked ? null : $emit('click')">
            <h1>
                {{ name }}
                <ion-icon name="lock-closed-outline" style="font-size: 1.6rem;" v-show="locked"></ion-icon>
            </h1>
            <div class="data-container">
                <status-bar title="perfects" color="#007bff" width="18rem" :total="total" :finished="perfects" class="status-bar" />
                <status-bar title="passes" color="#f03c24" width="18rem" :total="total" :finished="passes" class="status-bar" />
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.album-divider {
    width: 100%;
    height: 100%;
    max-width: 80vw;
    display: flex;
    justify-content: center;
    align-items: center;

    .album-card {
        // width: 100%;
        // height: 100%;

        width: 26rem;
        max-width: 80vw;
        margin: 0 auto;

        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 0.5rem;

        cursor: not-allowed;

        transition: scale 0.3s;

        &:not(.locked):hover {
            scale: 1.03;
            cursor: pointer;
            animation: borderAnimation 0.35s forwards;
        }

        h1 {
            display: inline-block;
        }
    }
}

// disable hover for touch devices
html.device--touch .album-card:not(.locked):hover {
    scale: 1;
    animation: none;
}

.data-container {
    display: flex;
    flex-direction: column;
    align-items: flex-start;

    transition: scale 0.3s;

    margin-bottom: 2rem;
    
    .status-bar {
        width: 18rem;
        max-width: 80vw;
    }
}
</style>