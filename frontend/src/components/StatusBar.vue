<script setup>

defineOptions({
    inheritAttrs: false,
});

const props = defineProps({
    color: String,
    width: {
        type: String,
        default: '100%'
    },
    height: {
        type: String,
        default: '5px'
    },
    total: Number,
    finished: Number,
    title: String,
    marginBottom: {
        type: String,
        default: '1.2rem'
    }
});

</script>

<template>
    <div
        class="status-bar-root"
        v-bind="$attrs"
        :style="{ width: width, 'margin-bottom': marginBottom }"
    >
        <div class="title-container">
            <p class="title">
                {{ title }}
            </p>
            <span>{{ finished }} / {{ total }}</span>
        </div>
        <div class="status-bar-container" :style="{ height: height }">
            <div class="status-bar" :style="{
                width: (finished / total * 100) + '%',
                backgroundColor: color
            }" />
        </div>
    </div>
</template>

<style lang="scss" scoped>
.status-bar-root {
    max-width: 100%;
    box-sizing: border-box;
}

.title-container {

    width: 100%;
    display: flex;
    justify-content: space-between;

    p.title {
        font-weight: 200;
        letter-spacing: 0.16em;
        margin: 0;
    }
}

.status-bar-container {
    position: relative;
    height: 100%;
    background-color: $n-dark-grey;
    opacity: 50%;

    // margin-bottom: 1.2rem;

    .status-bar {
        position: absolute;
        height: 100%;
        transition: width 0.3s;
    }
}
</style>
