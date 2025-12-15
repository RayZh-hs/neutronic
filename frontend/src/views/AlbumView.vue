<script setup>

import { useLocalStorage, useTimeoutFn } from '@vueuse/core';
import { useDevice } from '@/functions/useDevice';

//: Swiper-specific setup

// Import Swiper Vue.js components
import { Swiper, SwiperSlide } from 'swiper/vue';

// Import Swiper styles and modules
import 'swiper/css';
import 'swiper/css/pagination';
import { Navigation, Pagination, Mousewheel } from 'swiper/modules';

const pagination = ref({
    clickable: true,
    renderBullet: function (index, className) {
        return '<span class="' + className + '">' + '</span>';
    },
});
const modules = ref([Pagination, Navigation, Mousewheel]);

const swiperRef = ref(null);
// const swiperPage = ref(0);
// Change the swiperPage to a local-storage object
const swiperPage = useLocalStorage('neutronic-environment', { 'swiper-page-memory': 0 });

const updatePage = (swiper) => {
    swiperPage.value['swiper-page-memory'] = swiper.realIndex;
    console.log(swiperPage.value);
};

const initPage = (swiper) => {
    swiper.slideTo(swiperPage.value['swiper-page-memory'], 0);
    console.log("Swiper initialized at ", swiper.realIndex);
}

//: Custom component setup

import AlbumCard from '@/components/AlbumCard.vue';
import SubtitledAlbumCard from '@/components/SubtitledAlbumCard.vue';
import { router } from '@/router';

//: Custom json setup

// import album from "../data/album.json";
// import player from "../data/player.json";

import { getAccountProgress } from '@/functions/useAccount';
import { album, isAlbumLoaded } from '@/functions/useAlbum';
import { useHotkeyBindings } from '@/functions/useHotkeys';
import { useBackHandler } from '@/functions/useBackNavigation';
import { watch } from 'vue';
// let album = ref(null);
// const { data: album, isFinished: isAlbumLoaded } = useAxiosWithStore('neutronic-album', SERVER_URL + "/albums", 'GET');
const player = getAccountProgress();

console.log(album);
const albumLength = computed(() => (Array.isArray(album.value) ? album.value.length : 0))
const activePage = computed(() => swiperPage.value['swiper-page-memory']);

//: Jump to referring page
const jumpToReferent = () => {
    if (!Array.isArray(album.value)) return;
    const id = activePage.value;
    console.log("Jumping to ", id);
    if (id === albumLength.value) {
        router.push('/custom');
    } else if (id === albumLength.value + 1) {
        router.push('/online');
    } else {
        const currentAlbum = album.value[id];
        if (currentAlbum && player.lookup[currentAlbum.meta.name] == undefined) {
            return;
        }
        router.push(`/album/${id}`);
    }
}

useHotkeyBindings('album', {
    'album.previous': ({ event }) => {
        event.preventDefault();
        if (swiperRef.value && swiperRef.value.$el && swiperRef.value.$el.swiper) {
            swiperRef.value.$el.swiper.slidePrev();
        }
    },
    'album.next': ({ event }) => {
        event.preventDefault();
        if (swiperRef.value && swiperRef.value.$el && swiperRef.value.$el.swiper) {
            swiperRef.value.$el.swiper.slideNext();
        }
    },
    'album.enter': ({ event }) => {
        event.preventDefault();
        jumpToReferent();
    },
});

useBackHandler(() => {
    router.push('/');
    return true;
});

onMounted(() => {
    console.log("AlbumView mounted");
});

const {timeoutStart, timeoutStop} = useTimeoutFn(
    () => {
        if (!isAlbumLoaded.value) cannotConnectToBackend.value = true;
    },
    3000,
    { immediate: false }
)
const cannotConnectToBackend = ref(!isAlbumLoaded.value);
watch(isAlbumLoaded, (newVal) => {
    if (newVal) {
        timeoutStop();
        cannotConnectToBackend.value = false;
    } else {
        timeoutStart();
    }
});

const device = useDevice();
const isTouchPortrait = computed(() => device.isTouchDevice.value && device.orientation.value === 'portrait');

</script>

<template>
    <div
        class="enter-capture"
        data-hotkey-target="album.enter"
        data-hotkey-label="Enter"
        data-hotkey-element-position="below"
        data-hotkey-label-position="right"
        @click="jumpToReferent"
    />
    <!-- <p v-if="isAlbumLoaded">{{ album }}</p> -->
    <div class="side-container" :class="{ 'side-container--touch': device.isTouchDevice.value }" v-if="isAlbumLoaded">
        <ion-icon v-if="!isTouchPortrait" name="chevron-back-outline" class="backward-btn"
            data-hotkey-target="album.previous"
            data-hotkey-label="Previous"
            data-hotkey-element-position="below"
            data-hotkey-label-position="right"
        ></ion-icon>
        <swiper ref="swiperRef"
            :pagination="pagination && !isTouchPortrait"
            :modules="modules"
            class="swiper"
            :direction="isTouchPortrait ? 'vertical' : 'horizontal'"
            :navigation="isTouchPortrait ? false : {
            prevEl: '.backward-btn',
            nextEl: '.forward-btn'
        }"
            :mousewheel="!device.isTouchDevice.value"
            @swiper="initPage"
            @slideChange="updatePage"
        >
            <swiper-slide v-for="(item, num) in album" :key="num">
                <album-card :name="item.meta.name" :locked="player.lookup[item.meta.name] == undefined" :total="item.content.length" :passes="player.lookup[item.meta.name]?.passed" :perfects="player.lookup[item.meta.name]?.perfected" class="a-fade-in" 
                    @click="jumpToReferent"
                    data-hotkey-target="album.enter"
                    data-hotkey-label="Enter"
                    data-hotkey-show="false"
                />
            </swiper-slide>
            <swiper-slide>
                <subtitled-album-card name="Custom" subtitle="Your own puzzles and recordings." icon="create-outline"
                    @click="jumpToReferent" class="a-fade-in"
                    data-hotkey-target="album.enter"
                    data-hotkey-label="Enter"
                    data-hotkey-show="false"
                ></subtitled-album-card>
            </swiper-slide>
            <swiper-slide>
                <subtitled-album-card name="Online" subtitle="And join the world at thought." icon="logo-web-component"
                    @click="jumpToReferent" class="a-fade-in"
                    data-hotkey-target="album.enter"
                    data-hotkey-label="Enter"
                    data-hotkey-show="false"
                ></subtitled-album-card>
            </swiper-slide>
        </swiper>
        <ion-icon v-if="!isTouchPortrait" name="chevron-forward-outline" class="forward-btn"
            data-hotkey-target="album.next"
            data-hotkey-label="Next"
            data-hotkey-element-position="below"
            data-hotkey-label-position="right"
        ></ion-icon>
    </div>
    <transition>
        <div class="arrow-down" v-show="activePage == 0 && isTouchPortrait">
            <ion-icon name="chevron-down-outline" class="arrow-down-icon"></ion-icon>
            <span class="arrow-down-text">Swipe to navigate</span>
        </div>
    </transition>
    <!-- Backend server is not responding -->
    <div v-if="cannotConnectToBackend" class="timeout-message-box">
        <div class="timeout-message-box-top a-fade-in">
            <ion-icon name="cloud-offline-outline"></ion-icon>
            <p class="timeout-message timeout-message--primary">The Neutronic server is taking a nap.</p>
        </div>
        <p class="timeout-message timeout-message--secondary a-fade-in a-delay-4">Come back later, will you?</p>
    </div>
</template>

<style lang="scss" scoped>
@use '@/styles/constants' as *;

.arrow-down {
    position: absolute;
    left: 50%;
    translate: -50%;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 1rem;
    color: $n-light-grey;
    font-size: 2rem;

    .arrow-down-icon {
        @keyframes infinite-scroll {
            0%   { transform: translateY(-1rem); opacity: 0; }
            20%  { transform: translateY(-0.5rem); opacity: 1; }
            40%  { transform: translateY(-0.1rem);  opacity: 1; }
            60%  { transform: translateY(0.1rem);  opacity: 1; }
            80%  { transform: translateY(0.5rem); opacity: 1; }
            100% { transform: translateY(1rem);  opacity: 0; }
        }

        animation: infinite-scroll 2s linear infinite;
        will-change: transform, opacity;

        &::after {
            content: '';
            display: block;
            position: absolute;
            width: 100%;
            height: 100%;
            top: 0;
            left: 0;
            animation: inherit;
            animation-delay: 1s;
        }
    }

    .arrow-down-text {
        font-size: 1.2rem;
        letter-spacing: 0.4pt;
    }
}

.enter-capture {
    position: fixed;
    top: 20vh;
    left: 50vw;
    width: 10px;
    height: 10px;
    background-color: transparent;
}

.side-container {

    display: flex;
    align-items: center;
    user-select: none;

    ion-icon {
        font-size: 3.2rem;
        color: #f8f9fa;
        visibility: visible;

        cursor: pointer;
        transition: all 0.3s;

        &.swiper-button-disabled {
            opacity: 0.5 !important;
            translate: 0 0.5rem;
            cursor: not-allowed;
        }

        &:not(.swiper-button-disabled):hover {
            scale: 1.02;
            color: $n-primary;
        }
    }

    .swiper {
        width: 60vw;
        height: 60vh;
        // outline: 1px solid rgb(255, 255, 255);   
    }
}

.side-container--touch {
    .swiper {
        width: 86vw;
        height: 70vh;
    }
}

.timeout-message-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    .timeout-message-box-top {
        display: flex;
        align-items: center;
        gap: 1rem;

        ion-icon {
            font-size: 2.6rem;
        }

        .timeout-message--primary {
            font-size: 1.5rem;
            font-weight: 400;
        }
    }

    .timeout-message--secondary {
        color: #ccc;
        margin-top: 0.2rem;
        letter-spacing: 0.5pt;
        font-size: 1.2rem;
        font-weight: 200;
    }
}

.fade-enter-active,
.fade-leave-active {
    transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
    opacity: 0;
}
</style>

<style lang="scss">
.back-to-home-btn {
    position: fixed;
    left: 0;
    top: 0;
    font-size: 2rem;
    // margin: 2.6rem;
    margin: 2rem;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
        color: $n-primary;
        scale: 1.04;
    }
}

.swiper-pagination-bullet {
    width: $pagination-dot-size;
    height: $pagination-dot-size;
    opacity: 1;
    background: $pagination-bg-color;
    border-radius: calc($pagination-dot-size / 2);

    transition: all 0.3s;
}

.swiper-pagination-bullet-active {
    background: $pagination-bg-color--active;
    width: $pagination-dot-size * 5
}

html.device--touch.device--orientation-portrait .swiper-pagination-bullet {
    width: $pagination-dot-size * 1.2;
    height: $pagination-dot-size * 1.5;
    border-radius: calc($pagination-dot-size / 2 * 1.2);
}

html.device--touch.device--orientation-landscape .swiper-pagination-bullet {
    width: $pagination-dot-size * 1.5;
    height: $pagination-dot-size * 1.2;
    border-radius: calc($pagination-dot-size / 2 * 1.2);
}

html.device--touch.device--orientation-portrait .swiper-pagination-bullet-active {
    height: $pagination-dot-size * 5;
}

html.device--touch.device--orientation-landscape .swiper-pagination-bullet-active {
    width: $pagination-dot-size * 5;
}
</style>
