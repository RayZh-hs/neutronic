<script setup>

const props = defineProps({
    name: String,
    subtitle: String,
    icon: String
});

const emits = defineEmits(['click']);

</script>

<template>
    <div class="album-divider">
        <div class="album-card" @click="$emit('click')">
            <h1>
                {{ name }}
                <ion-icon :name="icon" style="font-size: 2.0rem;"></ion-icon>
            </h1>
            <div class="data-container">
                <span>{{ subtitle }}</span>
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
        min-height: 14rem;
        margin: 0 auto;

        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        gap: 0.5rem;

        cursor: pointer;

        transition: all 0.3s;

        &:hover {
            scale: 1.03;
            animation: borderAnimation 0.35s forwards;
        }

        h1 {
            display: inline-block;

            ion-icon {
                margin-left: 1.2rem;
            }
        }
    }
}

.data-container {
    display: flex;
    flex-direction: column;
    align-items: flex-start;

    transition: scale 0.3s;

    margin-bottom: 2rem;

    span {
        font-weight: 200;
        letter-spacing: 2pt;
        margin: 0;
    }
}
</style>