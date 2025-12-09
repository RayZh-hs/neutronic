<script setup>

const props = defineProps({
    status: {
        type: String,
        default: 'open',
        validator: value => ['perfect', 'finished', 'open', 'locked'].includes(value)
    },
    level: Number,
    hotkey: String,
})

</script>

<template>
    <div class="level-card" :class="status">
        <ion-icon name="lock-closed-outline" size="large" v-if="status === 'locked'"></ion-icon>
        <span class="level-text" v-else>
            {{ level }}
        </span>
        <!-- <ion-icon name="star-outline" size="large" v-if="status === 'perfect'"></ion-icon> -->
    </div>
</template>

<style lang="scss" scoped>
@use "sass:color";

.hotkey-hint {
    position: absolute;
    bottom: 2px;
    right: 4px;
    font-size: 0.8rem;
    opacity: 0.5;
    font-family: monospace;
}

.level-card {
    width: $level-select-grid-scale;
    height: $level-select-grid-scale;
    display: flex;
    justify-content: center;
    align-items: center;
    background-color: rgba(46, 46, 46, 0.315);
    backdrop-filter: blur(2px);

    &:not(.locked):hover {
        outline: 1px solid rgba(255, 255, 255, 0.568);

        .level-text {
            font-size: 2.1rem;
        }
    }

    &.perfect {
        // background-color: rgba(darken($n-blue, 26), 0.2);
        background-color: rgba(color.adjust($n-blue, $lightness: -26%), 0.2)
    }
    &.finished {
        // background-color: rgba(darken($n-red, 26), 0.2);
        background-color: rgba(color.adjust($n-red, $lightness: -26%), 0.2)
    }
    &.open:hover {
        // background-color: rgba(darken($n-primary, 32), 0.2);
        background-color: rgba(color.adjust($n-primary, $lightness: -32%), 0.2)
    }

    &.locked {
        cursor: not-allowed;

        ion-icon {
            color: rgba(255, 255, 255, 0.568);
        }
    }
    &:not(.locked) {
        cursor: pointer;
    }

    .level-text {
        font-size: 2rem;
        font-weight: 200;
        color: white;
        transition: all 0.3s;
        cursor: pointer;
    }
}
</style>