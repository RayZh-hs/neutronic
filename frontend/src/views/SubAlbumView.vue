<script setup>

import { useRouter } from 'vue-router';
import { useSessionStorage } from '@vueuse/core';
import { useDevice } from '@/functions/useDevice';

const router = useRouter();

//: Custom components setup

import StatusBar from '../components/StatusBar.vue';
import SimpleLevelCard from '../components/SimpleLevelCard.vue';

//: Custom json setup

import { album, isAlbumLoaded } from '@/functions/useAlbum';
import { getAccountProgress, isAccessibleToPrebuiltLevel } from '@/functions/useAccount';
import { useHotkeyBindings, useDigitInput } from '@/functions/useHotkeys';
import { useBackHandler } from '@/functions/useBackNavigation';

const player = getAccountProgress();

const albumIndex = computed(() => Number(router.currentRoute.value.params.id));
const currentAlbum = computed(() => album.value?.[albumIndex.value]);
const isValidAlbum = computed(() => isAlbumLoaded.value && !!currentAlbum.value);

const totalLevels = computed(() => currentAlbum.value?.content?.length || 0);
const playerProgress = computed(() => {
    if (!currentAlbum.value) return { perfected: 0, passed: 0 };
    return player.lookup[currentAlbum.value.meta.name] || { perfected: 0, passed: 0 };
});
const perfects = computed(() => playerProgress.value.perfected || 0);
const passes = computed(() => playerProgress.value.passed || 0);

const LEVELS_PER_PAGE = 12;
const windowStart = ref(0);
const windowRange = computed(() => ({
    begin: windowStart.value,
    end: Math.min(windowStart.value + LEVELS_PER_PAGE, totalLevels.value),
}));
const pagedLevels = computed(() =>
    currentAlbum.value?.content.slice(windowRange.value.begin, windowRange.value.end) || []
);

const canShiftForward = computed(() => windowRange.value.end < totalLevels.value);
const canShiftBackward = computed(() => windowRange.value.begin > 0);

const shiftWindow = (direction) => {
    const nextStart = windowStart.value + direction * LEVELS_PER_PAGE;
    if (nextStart < 0 || nextStart >= totalLevels.value) {
        return;
    }
    windowStart.value = nextStart;
};

const nextWindow = () => shiftWindow(1);
const prevWindow = () => shiftWindow(-1);

const getLevelIdByNumber = (levelNumber) => currentAlbum.value.content[levelNumber - 1].levelId;

const getStatus = (levelNumber) => {
    const levelId = getLevelIdByNumber(levelNumber);
    if (player.perfected.includes(levelId)) {
        return 'perfect';
    }
    if (player.passed.includes(levelId)) {
        return 'finished';
    }
    const allowedProgress = playerProgress.value.passed + playerProgress.value.perfected + 1;
    return levelNumber <= allowedProgress ? 'open' : 'locked';
};

const getNextRoute = (levelNumber) => {
    if (levelNumber < currentAlbum.value.content.length) {
        return `/album/${albumIndex.value}/${currentAlbum.value.content[levelNumber].levelId}`;
    }
    return `/album/${albumIndex.value}`;
};

const levelViewConfig = useSessionStorage('level-view-config', {}, { mergeDefaults: true })

const enterLevel = (levelNumber) => {
    if (!isValidAlbum.value) { return; }
    const levelId = getLevelIdByNumber(levelNumber);
    if (!isAccessibleToPrebuiltLevel(levelId)) {
        return;
    }
    levelViewConfig.value = {
        context: 'album',
        albumName: currentAlbum.value.meta.name,
        next: getNextRoute(levelNumber),
    };
    setTimeout(() => {
        router.push(`/album/${albumIndex.value}/${levelId}`);
    }, 100);
}

const getLevelHotkey = (levelNumber) => {
    return levelNumber >= 10 ? String(levelNumber).split('').join(';') : String(levelNumber);
};

const levelHotkeyKeys = computed(() => {
    if (!currentAlbum.value) return [];
    return currentAlbum.value.content.map((_, index) => getLevelHotkey(index + 1));
});

useDigitInput({
    validKeys: levelHotkeyKeys,
    onMatch: (index) => enterLevel(index + 1)
});

useHotkeyBindings('sub-album', {
    'sub-album.previous': ({ event }) => {
        event.preventDefault();
        prevWindow();
    },
    'sub-album.next': ({ event }) => {
        event.preventDefault();
        nextWindow();
    },
});

useBackHandler(() => {
    router.push('/album');
    return true;
});

const device = useDevice();
const isTouchPortrait = computed(() => device.isTouchDevice.value && device.orientation.value === 'portrait');
const isTouchLandscape = computed(() => device.isTouchDevice.value && device.orientation.value === 'landscape');

const displayedLevels = computed(() => {
    if (!currentAlbum.value) return [];
    if (isTouchPortrait.value) {
        return currentAlbum.value.content.map((item, index) => ({
            item,
            levelNumber: index + 1,
        }));
    }
    return pagedLevels.value.map((item, index) => ({
        item,
        levelNumber: windowRange.value.begin + index + 1,
    }));
});

</script>

<template>
    <div
        class="wrapper"
        :class="{
            'wrapper--touch-portrait': isTouchPortrait,
            'wrapper--touch-landscape': isTouchLandscape,
        }"
        v-if="isValidAlbum"
    >
        <div class="header-container">
            <h1 class="album-title a-fade-in">{{ currentAlbum.meta.name }}</h1>
            <div class="header-container__right a-fade-in a-delay-1">
                <status-bar title="perfects" color="#007bff" width="18em" :total="totalLevels" :finished="perfects"
                    marginBottom="3pt" />
                <status-bar title="passes" color="#f03c24" width="18em" :total="totalLevels" :finished="passes"
                    marginBottom="0" />
            </div>
        </div>
        <div class="main-container">
            <simple-level-card class="level-card a-fade-in" :class="{ [`a-delay-${num + 1}`]: true }"
                v-for="({ item, levelNumber }, num) in displayedLevels"
                :key="levelNumber"
                :level="levelNumber"
                :status="getStatus(levelNumber)"
                :hotkey="levelNumber.toString().split('').join(';')"
                data-hotkey-target="sub-album.select-level"
                data-hotkey-dynamic
                :data-hotkey-hint="getLevelHotkey(levelNumber)"
                data-hotkey-element-position="center"
                @click="enterLevel(levelNumber)"
                ></simple-level-card>
        </div>
        <ion-icon v-if="!isTouchPortrait" name="chevron-back-outline" class="control-btn control-btn__backward a-fade-in"
            @click="prevWindow"
            :class="{disabled: !canShiftBackward}"
            data-hotkey-target="sub-album.previous"
            data-hotkey-label="Previous"
            data-hotkey-element-position="below"
            data-hotkey-label-position="right"
        ></ion-icon>
        <ion-icon v-if="!isTouchPortrait" name="chevron-forward-outline" class="control-btn control-btn__forward a-fade-in"
            @click="nextWindow"
            :class="{disabled: !canShiftForward}"
            data-hotkey-target="sub-album.next"
            data-hotkey-label="Next"
            data-hotkey-element-position="below"
            data-hotkey-label-position="right"
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
        display: flexbox;
        font-size: min(2.2vw, 1rem);
        min-width: 50vw;
        min-height: 8rem;
        /* background-color: black; */
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 2rem;

        .album-title {
            font-size: max(3.2em, 2.4rem);
        }

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

.wrapper--touch-portrait {
    .main-container {
        width: max(60vw, calc(6rem * 3 + 1rem * 2));
        max-height: 50vh;
        min-height: auto;
        overflow-y: auto;
        padding-bottom: 1rem;
        padding-right: 1rem;
        grid-template-columns: repeat(3, $level-select-grid-scale);
        grid-template-rows: auto;
        justify-content: center;
        -webkit-overflow-scrolling: touch;
        scroll-snap-type: y proximity;
    }
}

.wrapper--touch-landscape {
    .main-container {
        grid-template-columns: repeat(4, 4.8rem);
        grid-template-rows: repeat(3, 4.8rem);
        min-height: calc(0.7rem * 2 + 4.8rem * 3);
        gap: 0.7rem;
    }

    :deep(.level-card) {
        width: 4.8rem;
        height: 4.8rem;
    }

    :deep(.level-card .level-text) {
        font-size: 1.6rem;
    }
}

</style>
