<script setup>
import { router } from '../router';
import { ref } from 'vue';

const curAtButton = ref('none');

</script>

<template>
    <div class="home-view-container">
        <h1 class="home-main-title a-fade-in">Neutronic</h1>
        <div class="r-container">
            <div class="r-divider-bg clickable a-fade-in a-delay-2" @mouseover="curAtButton = 'info'"
                @mouseleave="curAtButton = 'none'">
                <ion-icon name="information-outline" class="form-button" size="large"></ion-icon>
            </div>
            <div class="r-divider-bg clickable a-fade-in a-delay-3" @click="router.push('/album')"
                @mouseover="curAtButton = 'play'" @mouseleave="curAtButton = 'none'">
                <ion-icon name="play-outline" class="form-button" size="large"></ion-icon>
            </div>
            <div class="r-divider-bg clickable a-fade-in a-delay-4" @mouseover="curAtButton = 'settings'"
                @mouseleave="curAtButton = 'none'">
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

.v-enter-active,
.v-leave-active {
    transition: all 0.5s ease;
}

.v-enter-from {
    opacity: 0;
    transform: translateY(-0.3rem);
}

.v-leave-to {
    opacity: 0;
    transform: translateY(0.3rem);
}
</style>