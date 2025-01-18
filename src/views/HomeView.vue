<script setup></script>

<template>
    <div class="home-view-container">
        <h1 class="home-main-title">Neutronic</h1>
        <div class="buttons-container">
            <n-button>
                <template #icon>
                    <n-icon>
                        <ion-icon name="globe-outline"></ion-icon>
                    </n-icon>
                </template>
                Hello World
            </n-button>
        </div>
    </div>
</template>

<style lang="scss" scoped>
.home-view-container {
    .home-main-title {
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
}
</style>