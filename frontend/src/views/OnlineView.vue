<script setup>
import { router } from '@/router';
import { useBackHandler } from '@/functions/useBackNavigation';

useBackHandler(() => {
    router.push('/album');
    return true;
});
</script>

<template>
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
