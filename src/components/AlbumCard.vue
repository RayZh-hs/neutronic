<script setup>
import StatusBar from './StatusBar.vue';
import { ref } from 'vue';

const props = defineProps({
    name: String,
    total: Number,
    passes: {type: Number, default: 0},
    perfects: {type: Number, default: 0},
    locked: Boolean
});

const cardHover = ref(false);

</script>

<template>
    <div class="album-card">
        <!-- <div class="img" /> -->
        <div class="right-container" :class="{hovered: cardHover}" @mouseenter="cardHover = true" @mouseleave="cardHover = false">
            <h1>
                {{ name }}
                <ion-icon name="lock-closed-outline" style="font-size: 1.6rem;" v-show="locked"></ion-icon>
            </h1>
            <status-bar title="perfects" color="#007bff" width="18rem" :total="total" :finished="perfects"/>
            <status-bar title="passes" color="#f03c24" width="18rem" :total="total" :finished="passes"/>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.album-card {
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 2rem;
}

// .img {
//     width: min(12rem, 50%);
//     height: min(12rem, 50%);
//     background-image: url(@/assets/chip/JS-chip-0.png);
//     background-size: cover;
//     border-radius: 2px;
//     mix-blend-mode: color-burn;
//     opacity: 0.6;
//     filter: brightness(1.5);
//     backdrop-filter: blur(5rem);
//     border: 1px solid rgba(255, 255, 255, 0.353);
// }

.right-container {
    display: flex;
    flex-direction: column;
    align-items: flex-start;

    transition: scale 0.3s;
    cursor: pointer;

    margin-bottom: 2rem;

    &.hovered {
        scale: 1.03;
    }
}
</style>