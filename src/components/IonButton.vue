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
        default: '#efefef;'
    }
});

</script>

<template>
    <ion-icon class="ion-icon" :name="name" :style="{ fontSize: size, color: color }" />
</template>

<style lang="scss" scoped>
.ion-icon {
    transition: all 0.3s;
    cursor: pointer;

    &:hover {
        color: $n-ion-button-hover-color !important;
        scale: 1.06;
    }
}
</style>