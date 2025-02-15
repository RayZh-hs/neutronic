<script setup>

//: Vue and Router

import { useRouter } from 'vue-router';
import { useSessionStorage } from '@vueuse/core';
const router = useRouter();

//: Custom components

import LevelCard from '@/components/LevelCard.vue';
import IonButton from '@/components/IonButton.vue';

//: Import json and setup corresponding references

import album from "@/data/album.json";
import { customSelectionWindowSize } from '@/data/constants';

const customLevels = album.find(a => a.name === 'Custom').levels;
const total = customLevels.length;

const sliceWindow = ref({
    begin: 0,
    end: customSelectionWindowSize
})

const nextWindow = () => {
    if (sliceWindow.value.end >= total) { return }
    sliceWindow.value.begin += customSelectionWindowSize;
    sliceWindow.value.end += customSelectionWindowSize;
}

const prevWindow = () => {
    if (sliceWindow.value.begin <= 0) { return }
    sliceWindow.value.begin -= customSelectionWindowSize;
    sliceWindow.value.end -= customSelectionWindowSize;
}

//: UUID generator and level-editor linker

import { v4 as uuidV4Generator } from 'uuid';


// This function generates a new UUID.
// Currently it uses the V4 version of the UUID generator, from the UUID package.
// @param {void}
// @returns {string} - The UUID generated.
const getUUID = () => {
    return uuidV4Generator();
}

const enterLevelEditor = () => {
    const uuid = getUUID();
    levelEditorConfig.value = {
        newLevel: true,
        localFetch: false,
    }
    router.push(`/custom/edit/${uuid}`);
}

//: Hooks for updating the levelEditorConfig
const levelEditorConfig = useSessionStorage('levelEditorConfig', {
    newLevel: true,
    localFetch: false,
})

</script>

<template>
    <div class="wrapper">
        <ion-icon name="arrow-back-circle-outline" class="back-to-home-btn a-fade-in"
            @click="router.push('/album')"></ion-icon>
        <n-flex align="baseline">
            <h1 class="a-fade-in">Custom Levels</h1>
            <div class="gap-5" />
            <IonButton name="add-circle-outline" class="a-fade-in" size="2.2rem"
                @click="enterLevelEditor"
            ></IonButton>
        </n-flex>
        <div class="level-container">
            <level-card v-for="(level, index) in customLevels.slice(sliceWindow.begin, sliceWindow.end)"
                :name="level.name" :uuid="level.uuid" :key="index + sliceWindow.begin"
                class="a-fade-in"
                :class="{ [`a-delay-${index + 1}`]: true }"
            ></level-card>
            <p v-if="total === 0" class="a-fade-in a-delay-5">You don't have any yet. Click on the <span class="u-green">add</span> button to start building.</p>
        </div>
    </div>
    <ion-icon name="chevron-back-outline" class="control-btn control-btn__backward a-fade-in" @click="prevWindow"
        :class="{ disabled: sliceWindow.begin <= 0 }"></ion-icon>
    <ion-icon name="chevron-forward-outline" class="control-btn control-btn__forward a-fade-in" @click="nextWindow"
        :class="{ disabled: sliceWindow.end >= total }"></ion-icon>
</template>

<style lang="scss" scoped>
.wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    position: relative;

    & * h1 {
        transition: transform 0.5s ease;
    }

    .level-container {
        display: flex;
        flex-direction: column;
        gap: 1rem;
        align-items: center;

        p {
            font-weight: 400;
            letter-spacing: .25pt;
        }
    }
}

.control-btn {
    position: absolute;
    font-size: 3.2rem;
    top: 50%;
    transform: translateY(-50%);
    visibility: visible;

    transform-origin: center;

    &.disabled {
        cursor: not-allowed;
        transform: translateY(-20%);
        opacity: 0.5 !important;
    }

    &.control-btn__backward {
        left: 16.2vw;
    }

    &.control-btn__forward {
        right: 16.2vw;
    }

    transition: all 0.3s;

    &:not(.disabled):hover {
        transform: translateY(-50%) scale(1.1);
        color: $n-primary;
    }
}
</style>