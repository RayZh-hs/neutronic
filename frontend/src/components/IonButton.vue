<script setup>

import { ref } from 'vue';

const props = defineProps({
    name: {
        type: String,
        required: true
    },
    size: {
        type: String,
        default: '30px'
    },
    color: {
        type: String,
        default: '#efefef'
    },
    disabled: {
        type: Boolean,
        default: false
    }
});

</script>

<template>
    <ion-icon class="ion-icon" :class="{ 'ion-icon--disabled': disabled}" :name="name" :style="{ fontSize: size, color: color }" />
</template>

<style lang="scss" scoped>
.ion-icon {
    transition: all 0.3s;
    cursor: pointer;

    &:not(&--disabled):hover {
        color: $n-ion-button-hover-color !important;
        scale: 1.04;
    }

    &--disabled {
        cursor: not-allowed;
        color: $n-ion-button-disabled-color !important;
    }
}
</style>