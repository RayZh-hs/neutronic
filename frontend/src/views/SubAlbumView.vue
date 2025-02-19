<script setup>

import { useRouter } from 'vue-router';
import { ref } from 'vue';
import { useSessionStorage } from '@vueuse/core';

const router = useRouter();

//: Custom components setup

import StatusBar from '../components/StatusBar.vue';
import SimpleLevelCard from '../components/SimpleLevelCard.vue';

//: Custom json setup

// import album from "../data/album.json";
// import player from "../data/player.json";
import { album, isAlbumLoaded } from '@/functions/useAlbum';
import { getAccountProgress } from '@/functions/useAccount';

const player = getAccountProgress();

const albumIndex = Number(router.currentRoute.value.params.id);
const albumObj = album.value[albumIndex];
const total = albumObj.content.length;
const playerProgress = player.lookup[albumObj.meta.name];
const perfects = playerProgress.perfected;
const passes = playerProgress.passed;

const sliceWindow = ref({
    begin: 0,
    end: 12
})

const nextWindow = () => {
    if (sliceWindow.value.end >= total){return}
    sliceWindow.value.begin += 12;
    sliceWindow.value.end += 12;
}

const prevWindow = () => {
    if (sliceWindow.value.begin <= 0){return}
    sliceWindow.value.begin -= 12;
    sliceWindow.value.end -= 12;
}

const getStatus = (level) => {
    if (player.perfected.includes(albumObj.content[level - 1].levelId)){
        return 'perfect';
    } else if (player.passed.includes(albumObj.content[level - 1].levelId)){
        return 'finished';
    } else if (level <= playerProgress.passed + playerProgress.perfected + 1){
        return 'open';
    } else {
        return 'locked';
    }
}

const levelViewConfig = useSessionStorage('level-view-config', {}, { mergeDefaults: true })

const enterLevel = (level) => {
    console
    levelViewConfig.value = {
        context: 'album',
        albumName: albumObj.meta.name,
        next: (() => {
            if (level < albumObj.content.length){
                return `/album/${albumIndex}/${albumObj.content[level].levelId}`;
            } else {
                // Is the last level in the album
                return `/album/${albumIndex}`;
            }
        })(),
    };
    setTimeout(() => {
        router.push(`/album/${albumIndex}/${albumObj.content[level - 1].levelId}`);
    }, 100);
}

</script>

<template>
    <ion-icon name="arrow-back-circle-outline" class="back-to-home-btn a-fade-in"
        @click="router.push('/album')"></ion-icon>
    <div class="wrapper" v-if="isAlbumLoaded">
        <div class="header-container">
            <h1 class="album-title a-fade-in">{{ album[albumIndex].meta.name }}</h1>
            <div class="header-container__right a-fade-in a-delay-1">
                <status-bar title="perfects" color="#007bff" width="18rem" :total="total" :finished="perfects"
                    marginBottom="3pt" />
                <status-bar title="passes" color="#f03c24" width="18rem" :total="total" :finished="passes"
                    marginBottom="0" />
            </div>
        </div>
        <div class="main-container">
            <simple-level-card class="level-card a-fade-in" :class="{ [`a-delay-${num + 1}`]: true }"
                v-for="(item, num) in album[albumIndex].content.slice(sliceWindow.begin, sliceWindow.end)"
                :key="num + 1 + sliceWindow.begin"
                :level="num + 1 + sliceWindow.begin"
                :status="getStatus(num + 1 + sliceWindow.begin)"
                @click="enterLevel(num + 1 + sliceWindow.begin)"
                ></simple-level-card>
        </div>
        <ion-icon name="chevron-back-outline" class="control-btn control-btn__backward a-fade-in"
            @click="prevWindow"
            :class="{disabled: sliceWindow.begin <= 0}"
        ></ion-icon>
        <ion-icon name="chevron-forward-outline" class="control-btn control-btn__forward a-fade-in"
            @click="nextWindow"
            :class="{disabled: sliceWindow.end >= total}"
        ></ion-icon>
    </div>
    <div class="not-found" v-else>
        <h1>Album not loaded</h1>
        <p>Please go to the front page.</p>
    </div>
</template>

<style lang="scss" scoped>
.wrapper {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2rem;

    .header-container {
        min-width: 50vw;
        min-height: 8rem;
        /* background-color: black; */
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 2rem;

        .header-container__right {
            display: flex;
            flex-direction: column;
        }
    }

    .scrollbar {
        margin: 0 auto;
    }

    .main-container {
        display: grid;
        // width: 70%;
        min-height: $level-select-grid-gap*2+$level-select-grid-scale*3;
        grid-template-columns: repeat(4, $level-select-grid-scale);
        grid-template-rows: repeat(3, $level-select-grid-scale);
        gap: $level-select-grid-gap;
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
}

</style>