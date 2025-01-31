<script setup>
import StatusBar from './StatusBar.vue';
import { ref } from 'vue';

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
        <div class="album-card" :class="{ locked: locked }" @click="$emit('click')">
            <h1>
                {{ name }}
                <ion-icon name="lock-closed-outline" style="font-size: 1.6rem;" v-show="locked"></ion-icon>
            </h1>
            <div class="data-container">
                <status-bar title="perfects" color="#007bff" width="18rem" :total="total" :finished="perfects" />
                <status-bar title="passes" color="#f03c24" width="18rem" :total="total" :finished="passes" />
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.album-divider {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;

    .album-card {
        // width: 100%;
        // height: 100%;

        width: 26rem;
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

.data-container {
    display: flex;
    flex-direction: column;
    align-items: flex-start;

    transition: scale 0.3s;

    margin-bottom: 2rem;

}
</style>