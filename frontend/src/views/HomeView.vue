<script setup>
import { router } from '../router';
import { ref } from 'vue';
import { useHotkeyBindings } from '@/functions/useHotkeys';
import { overrideHotkeyOverlayConfig } from '@/data/hotkeyOverlayConfig';

const curAtButton = ref('none');

const showInfo = ref(false);

overrideHotkeyOverlayConfig({
    groups: {
        landing: {
            columnOffset: 110,
            rowOffset: 20,
            verticalSpacing: 40,
            horizontalSpacing: 80,
        },
    },
});

useHotkeyBindings('landing', {
    'landing.info': ({ event }) => {
        event.preventDefault();
        showInfo.value = true;
    },
    'landing.play': ({ event }) => {
        event.preventDefault();
        router.push('/album');
    },
    'landing.settings': ({ event }) => {
        event.preventDefault();
        router.push('/settings');
    },
});

</script>

<template>
    <div class="home-view-container">
        <h1 class="home-main-title a-fade-in">Neutronic</h1>
        <div class="r-container">
            <div class="r-divider-bg clickable a-fade-in a-delay-2"
                @click="showInfo = true"
                @mouseover="curAtButton = 'info'" @mouseleave="curAtButton = 'none'"
                data-hotkey-target="landing.info"
                data-hotkey-label="Info"
                data-hotkey-group="landing"
                data-hotkey-group-side="bottom right"
            >
                <ion-icon name="information-outline" class="form-button" size="large"></ion-icon>
            </div>
            <div class="r-divider-bg clickable a-fade-in a-delay-3"
                @click="router.push('/album')"
                @mouseover="curAtButton = 'play'" @mouseleave="curAtButton = 'none'"
                data-hotkey-target="landing.play"
                data-hotkey-label="Play"
                data-hotkey-group="landing"
            >
                <ion-icon name="play-outline" class="form-button" size="large"></ion-icon>
            </div>
            <div class="r-divider-bg clickable a-fade-in a-delay-4" @mouseover="curAtButton = 'settings'"
                @mouseleave="curAtButton = 'none'"
                data-hotkey-target="landing.settings"
                data-hotkey-label="Settings"
                data-hotkey-group="landing"
            >
                <ion-icon name="settings-outline" class="form-button" size="large"></ion-icon>
            </div>
        </div>
        <div class="r-container">
            <div class="r-divider-bg">
                <transition>
                    <span class="tooltip" v-show="curAtButton === 'info'">info</span>
                </transition>
            </div>
            <div class="r-divider-bg">
                <transition>
                    <span class="tooltip" v-show="curAtButton === 'play'">play</span>
                </transition>
            </div>
            <div class="r-divider-bg">
                <transition>
                    <span class="tooltip" v-show="curAtButton === 'settings'">settings</span>
                </transition>
            </div>
        </div>
    </div>
    <n-modal v-model:show="showInfo" data-hotkey-popup="true">
        <n-card title="Neutronic" class="info-card">
            <template #header-extra>
                <img src="/logo-dark.svg" class="logo">
            </template>
            <p>Neutronic is a mind-taxing single-player puzzle game where the player cancels out blue and red particles to pass levels.</p>
            <n-divider></n-divider>
            <p>Game Designer: Norb</p>
            <p>Implementor: Norb, JasonYuan</p>
            <p>The game is open-source at <a href="https://github.com/RayZh-hs/neutronic">Github</a></p>
        </n-card>
    </n-modal>
</template>

<style lang="scss" scoped>
.home-view-container {
    .home-main-title {
        text-transform: uppercase;
        font-size: 3.5rem;
        letter-spacing: 5pt;
        margin-bottom: 1rem;
    }

    .r-container {
        width: 100%;
        height: 2.8rem;
        display: flex;
        justify-content: center;
        align-items: center;

        .r-divider-bg {
            width: 33.33%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;

            &.clickable {
                cursor: pointer;
            }

            // background-color: darken($n-white, 0);
            background-color: #00000000;

            transition: color 0.3s,
            background-color 0.3s;

            .form-button {
                // color: $n-black;
                color: $n-white;
                transition: all 0.3s;
            }

            .tooltip {
                color: $n-ion-button-hover-color;
                letter-spacing: 1pt;

                translate: 0 -0.5rem;
            }

            &:hover {
                background-color: #00000000;

                .form-button {
                    color: $n-ion-button-hover-color;
                    scale: 1.05;
                }
            }
        }
    }
}

.info-card {
    max-width: 24rem;

    .logo {
        width: 3rem;
        height: 3rem;
        // margin-right: 1rem;
        animation: spin 24s linear infinite;
    }
}

@keyframes spin {
    0% {
        transform: rotate(0deg);
    }
    100% {
        transform: rotate(360deg);
    }
}

a {
    color: $n-ion-button-hover-color;
    text-decoration: none;
    outline: none;

    &:hover {
        text-decoration: underline;
    }
}
</style>
