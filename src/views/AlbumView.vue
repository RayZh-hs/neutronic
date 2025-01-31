<script setup>

import { ref } from 'vue';

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

import album from "../data/album.json";
import player from "../data/player.json";

console.log(album);

</script>

<template>
    <ion-icon name="arrow-back-circle-outline" class="back-to-home-btn a-fade-in" @click="router.push('/')"></ion-icon>
    <div class="side-container">
        <ion-icon name="chevron-back-outline" class="backward-btn"></ion-icon>
        <swiper ref="swiperRef" :pagination="pagination" :modules="modules" class="swiper" :navigation="{
            prevEl: '.backward-btn',
            nextEl: '.forward-btn'
        }" :mousewheel="true" @swiper="updatePage" @slideChange="updatePage">
            <!-- <swiper-slide>
                <album-card name="Naive" :locked="false" :total="20" :passes="12" :perfects="10" class="a-fade-in" />
            </swiper-slide>
            <swiper-slide>
                <album-card name="Medium" :locked="false" :total="24" :passes="2" :perfects="0" class="a-fade-in" />
            </swiper-slide>
            <swiper-slide>
                <album-card name="Difficult" :locked="true" :total="32" :passes="0" :perfects="0" class="a-fade-in" />
            </swiper-slide> -->
            <swiper-slide v-for="(item, num) in album.slice(0, 3)" :key="num">
                <album-card :name="item.name" :locked="player.progress[num].locked" :total="item.levels.length" :passes="player.progress[num].passed.length" :perfects="player.progress[num].perfected.length" class="a-fade-in" />
            </swiper-slide>
            <swiper-slide>
                <subtitled-album-card name="Custom" subtitle="Build your own puzzles." icon="create-outline"></subtitled-album-card>
            </swiper-slide>
            <swiper-slide>
                <subtitled-album-card name="Online" subtitle="And join the world at thought." icon="logo-web-component"></subtitled-album-card>
            </swiper-slide>
        </swiper>
        <ion-icon name="chevron-forward-outline" class="forward-btn"></ion-icon>
    </div>
</template>

<style lang="scss" scoped>
.back-to-home-btn {
    position: fixed;
    left: 0;
    top: 0;
    font-size: 2rem;
    margin: 2.6rem;
    cursor: pointer;
    transition: all 0.3s;

    &:hover {
        color: $n-primary;
        scale: 1.04;
    }
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