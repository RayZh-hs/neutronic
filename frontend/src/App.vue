<script setup>
import { darkTheme } from 'naive-ui';
import AbstractBackground from './components/AbstractBackground.vue';
import AccountCard from './components/AccountCard.vue';
import HotkeysOverlay from './components/HotkeysOverlay.vue';
import IonButton from './components/IonButton.vue';
import { useRoute } from 'vue-router';
import { useHotkeyBindings } from '@/functions/useHotkeys';
import { useDevice } from './functions/useDevice';

const openGitHub = () => {
  window.open("https://github.com/RayZh-hs/neutronic", "_blank");
};

const toggleAccountCard = ref(false);
const hoverAccountButton = ref(false);
const device = useDevice();

useHotkeyBindings('general', {
    'general.github': ({ event }) => {
        event.preventDefault();
        openGitHub();
    },
    'general.account-toggle': ({ event }) => {
        event.preventDefault();
        toggleAccountCard.value = !toggleAccountCard.value;
    },
});

const route = useRoute();

const showUserButton = computed(() => {
  return ![
    '/',
    '/login',
  ].includes(route.path);
});

const showGeneralHotkeys = computed(() => {
  return !route.path.includes('/custom/edit');
});

const dismissWarning = ref(false);

</script>

<template>
  <!-- all the NaiveUI providers -->
  <n-config-provider :theme="darkTheme">
    <n-dialog-provider>
      <n-message-provider>
        <n-modal-provider>
          <!-- main starts here -->
          <main>
            <div class="warning-overlay" :class="{ 'warning-overlay--dismissed': dismissWarning }">
              <div class="warning-box">
                <div class="warning-title">
                  <ion-icon name="phone-landscape-outline"></ion-icon>
                  <span>Warning</span>
                </div>
                <p>This game is only designed for landscape orientation!</p>
                <n-button type="error" @click="dismissWarning = true" class="dismissal-button">
                  <template #icon>
                    <ion-icon name="close-outline" class="dismissal-icon"></ion-icon>
                  </template>
                  Dismiss
                </n-button>
              </div>
            </div>
            <div class="header">
              <n-popover trigger="manual" raw placement="bottom-end" :show="toggleAccountCard || hoverAccountButton">
                <template #trigger>
                  <div class="header__user-button-wrapper">
                    <IonButton name="person-circle-outline" size="2rem" class="header__user-button"
                      @mouseenter="hoverAccountButton=true" @mouseleave="hoverAccountButton=false"
                      data-hotkey-target="general.account-toggle"
                      data-hotkey-label="Account"
                      :data-hotkey-show="showGeneralHotkeys ? 'true' : 'false'"
                      data-hotkey-group="general"
                      data-hotkey-group-side="bottom left"
                      data-hotkey-label-position="inline"
                      v-if="showUserButton" />
                  </div>
                </template>
                <AccountCard />
              </n-popover>
              <IonButton name="logo-github" size="2rem" aria-label="github" @click="openGitHub"
                data-hotkey-target="general.github"
                data-hotkey-label="GitHub"
                :data-hotkey-show="showGeneralHotkeys ? 'true' : 'false'"
                data-hotkey-group="general"
                data-hotkey-group-side="bottom left"
                data-hotkey-label-position="inline"
              />
            </div>
            <router-view v-slot="{ Component }">
              <!-- <transition name="zoom" mode="out-in"> -->
              <component :is="Component" :key="route.fullPath" />
              <!-- </transition> -->
            </router-view>
            <div class="footer" v-if="device.isDesktopDevice == true">
              <p>Made with ♥️ by Norb @ 2025</p>
            </div>
            <abstract-background />
            <hotkeys-overlay />
          </main>
        </n-modal-provider>
      </n-message-provider>
    </n-dialog-provider>
  </n-config-provider>
</template>

<style lang="scss">
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

<style scoped lang="scss">
.footer {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.8rem;
  color: $footnote-color;
}

.zoom-leave-to {
  opacity: 0;
  transform: scale(1.04);
}

.zoom-enter-active,
.zoom-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.zoom-enter-to,
.zoom-leave-from {
  opacity: 1;
  transform: scale(1);
}

.header {
  position: fixed;
  top: 2rem;
  left: 0;
  width: calc(100vw - 2rem);
  display: flex;
  justify-content: flex-end;

  .header__user-button-wrapper {
    margin-right: 1rem;
  }
}

.warning-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  background: repeating-linear-gradient(
    45deg,
    rgba($n-black, 0.9),
    rgba($n-black, 0.9) 10px,
    rgba($n-dark-grey, 0.9) 10px,
    rgba($n-dark-grey, 0.9) 20px
  );
  backdrop-filter: blur(5px);
  z-index: 10000;
  display: none;
  justify-content: center;
  align-items: center;

  @media (orientation: portrait) {
    display: flex;
  }

  &--dismissed {
    display: none;
  }

  .warning-box {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: $n-black;
    border: 2px solid $n-red;
    padding: 2rem;
    border-radius: 1rem;
    text-align: center;
    color: $n-white;
    width: 80vw;
    min-height: 20vh;

    .warning-title {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      font-size: 5vh;
      margin-bottom: 1rem;
      font-family: 'Electrolize', sans-serif;
      color: $n-red;

      ion-icon {
        font-size: 5vh;
        margin-right: 3.6vw;
      }
    }

    p {
      font-size: 2.5vh;
      font-family: 'Poppins', sans-serif;
    }

    .dismissal-button {
      font-size: 2vh;
      min-height: 3.6vh;
      margin-top: 1rem;
      --n-icon-size: 3vh !important;
    }
  }
}
</style>
