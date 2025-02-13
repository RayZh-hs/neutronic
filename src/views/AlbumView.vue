<script setup>

import { onBeforeMount, ref } from 'vue';

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
const swiperPage = ref(0);

const updatePage = (swiper) => {
    swiperPage.value = swiper.realIndex;
    console.log(swiperPage.value);
};

//: Custom component setup

import AlbumCard from '../components/AlbumCard.vue';
import SubtitledAlbumCard from '../components/SubtitledAlbumCard.vue';
import { router } from '../router';

//: Custom json setup

import { SERVER_URL } from '@/data/constants';
// import album from "../data/album.json";
import player from "../data/player.json";
import { useAxiosWithStore } from '@/functions/useAxiosWithStore';
// let album = ref(null);
const { data: album, isFinished: isAlbumLoaded } = useAxiosWithStore('neutronic-album', SERVER_URL + "/albums", 'GET');

console.log(album);

//: Jump to referring page
const jumpToReferent = () => {
    const id = swiperPage.value;
    console.log("Jumping to ", id);
    if (id === 3) {
        router.push('/custom');
    } else if (id === 4) {
        router.push('/online');
    } else {
        router.push(`/album/${id}`);
    }
}

</script>

<template>
    <ion-icon name="arrow-back-circle-outline" class="back-to-home-btn a-fade-in" @click="router.push('/')"></ion-icon>
    <!-- <p v-if="isAlbumLoaded">{{ album }}</p> -->
    <div class="side-container" v-if="isAlbumLoaded">
        <ion-icon name="chevron-back-outline" class="backward-btn"></ion-icon>
        <swiper ref="swiperRef" :pagination="pagination" :modules="modules" class="swiper" :navigation="{
            prevEl: '.backward-btn',
            nextEl: '.forward-btn'
        }" :mousewheel="true" @swiper="updatePage" @slideChange="updatePage">
            <swiper-slide v-for="(item, num) in album.slice(0, 3)" :key="num">
                <album-card :name="item.name" :locked="player.progress[num].locked" :total="item.levels.length" :passes="player.progress[num].passed.length" :perfects="player.progress[num].perfected.length" class="a-fade-in" 
                    @click="jumpToReferent"
                />
            </swiper-slide>
            <swiper-slide>
                <subtitled-album-card name="Custom" subtitle="Build your own puzzles." icon="create-outline"
                    @click="jumpToReferent"
                ></subtitled-album-card>
            </swiper-slide>
            <swiper-slide>
                <subtitled-album-card name="Online" subtitle="And join the world at thought." icon="logo-web-component"
                    @click="jumpToReferent"
                ></subtitled-album-card>
            </swiper-slide>
        </swiper>
        <ion-icon name="chevron-forward-outline" class="forward-btn"></ion-icon>
    </div>
</template>

<style lang="scss" scoped>
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
</style>