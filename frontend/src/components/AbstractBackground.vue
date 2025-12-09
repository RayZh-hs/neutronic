<script setup>
import { useSettings } from '@/functions/useSettings';
import { computed } from 'vue';

const settings = useSettings();
const animationState = computed(() => settings.value.disableAnimations ? 'paused' : 'running');
</script>

<template>
    <div class="bg bg-lay-1" />
    <div class="bg bg-lay-2" />
    <div class="bg bg-lay-3" />
</template>

<style lang="scss">

$background-size-1: 50rem;
$background-size-2: 40rem;
$background-size-3: 40rem;

.bg {
    position: absolute;
    left: 0;
    top: 0;
    width: 100vw;
    height: 100vh;
    z-index: -1;
    mix-blend-mode: screen;

    &.bg-lay- {
        &1 {
            background-image: url(@/assets/dotgrid/JS-dotGrid-0.webp);
            background-size: $background-size-1;
            opacity: 30%;
            animation: scroll-bg-1 40s linear infinite; /* Added animation */
            animation-play-state: v-bind(animationState);
        }
        &2 {
            background-image: url(@/assets/dotgrid/JS-dotGrid-1.webp);
            background-size: $background-size-2;
            opacity: 20%;
            animation: scroll-bg-2 60s linear infinite; /* Added animation */
            animation-play-state: v-bind(animationState);
        }
        &3 {
            background-image: url(@/assets/dotgrid/JS-dotGrid-2.webp);
            background-size: $background-size-3;
            opacity: 20%;
            animation: scroll-bg-3 80s linear infinite; /* Added animation */
            animation-play-state: v-bind(animationState);
        }
    }
}

@keyframes scroll-bg-1 {
    from {
        background-position-x: -$background-size-1;
    }
    to {
        background-position-x: $background-size-1;
    }
}

@keyframes scroll-bg-2 {
    from {
        background-position-x: -$background-size-2;
    }
    to {
        background-position-x: $background-size-2;
    }
}

@keyframes scroll-bg-3 {
    from {
        background-position-x: -$background-size-3;
    }
    to {
        background-position-x: $background-size-3;
    }
}
</style>