<script setup>
import { useHotkeyBindings } from '@/functions/useHotkeys';
import { router } from '@/router';

useHotkeyBindings('online', {
    'online.back': ({ event }) => {
        event.preventDefault();
        router.push('/album');
    },
})
</script>

<template>
    <ion-icon name="arrow-back-circle-outline" class="back-to-home-btn a-fade-in" @click="router.push('/album')"
        data-hotkey-target="online.back"
        data-hotkey-label="Back"
        data-hotkey-element-position="right"
        data-hotkey-label-position="right"
    ></ion-icon>
    <div class="online-view-container">
        <h1 class="coming-soon-title a-fade-in">Coming Soon</h1>
        <p class="coming-soon-description a-fade-in a-delay-4">Your portal to a world of puzzles and solutions, on the way.</p>
    </div>
</template>

<style scoped lang="scss">
.online-view-container {
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    height: 100%;

    .coming-soon-description {
        letter-spacing: 1pt;
    }
}
</style>