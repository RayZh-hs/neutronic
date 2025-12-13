<script setup>
import { darkTheme } from 'naive-ui';
import AbstractBackground from './components/AbstractBackground.vue';
import AccountCard from './components/AccountCard.vue';
import HotkeysOverlay from './components/HotkeysOverlay.vue';
import IonButton from './components/IonButton.vue';
import { useRoute, useRouter } from 'vue-router';
import { useHotkeyBindings, useHotkeysEnabled } from '@/functions/useHotkeys';
import { triggerBack } from '@/functions/useBackNavigation';
import { useDevice } from './functions/useDevice';
import { useDeviceDecorators } from './functions/useDeviceDecorators';

const openGitHub = () => {
  window.open("https://github.com/RayZh-hs/neutronic", "_blank");
};

const router = useRouter();
const toggleAccountCard = ref(false);
const hoverAccountButton = ref(false);
const device = useDevice();
useDeviceDecorators();
const hotkeysEnabled = useHotkeysEnabled();
const headerIconSize = computed(() => (device.isTouchDevice.value ? '2.6rem' : '2rem'));

const route = useRoute();

const defaultGoBack = () => {
  if (route.path === '/') {
    return;
  }
  if (typeof window !== 'undefined' && window.history && window.history.length > 1) {
    router.back();
    return;
  }
  router.push('/');
};

const handleBack = (event) => {
  const handled = triggerBack({ event, route, router });
  if (handled === false) {
    defaultGoBack();
  }
};

useHotkeyBindings('general', {
    'general.github': ({ event }) => {
        event.preventDefault();
        openGitHub();
    },
    'general.account-toggle': ({ event }) => {
        event.preventDefault();
        toggleAccountCard.value = !toggleAccountCard.value;
    },
    'general.back': ({ event }) => {
        event.preventDefault();
        handleBack(event);
    },
});

const showUserButton = computed(() => {
  return ![
    '/',
    '/login',
    '/settings'
  ].includes(route.path);
});

const showBackButton = computed(() => {
  if (['/', '/login'].includes(route.path)) {
    return false;
  }
  return !route.path.includes('/custom/edit');
});

const showGeneralHotkeys = computed(() => {
  return !route.path.includes('/custom/edit');
});

</script>

<template>
  <!-- all the NaiveUI providers -->
  <n-config-provider :theme="darkTheme">
    <n-dialog-provider>
      <n-message-provider>
        <n-modal-provider>
          <!-- main starts here -->
          <main>
            <div class="header">
              <IonButton
                v-if="showBackButton"
                name="arrow-back-circle-outline"
                :size="headerIconSize"
                class="header__back-button"
                aria-label="Back"
                @click="handleBack"
                data-hotkey-target="general.back"
                data-hotkey-label="Back"
                :data-hotkey-show="showGeneralHotkeys ? 'true' : 'false'"
                data-hotkey-element-position="right"
                data-hotkey-label-position="inline"
              />
              <n-popover trigger="manual" raw placement="bottom-end" :show="toggleAccountCard || hoverAccountButton" v-if="device.isDesktopDevice.value">
                <template #trigger>
                  <div class="header__user-button-wrapper">
                    <IonButton name="person-circle-outline" :size="headerIconSize" class="header__user-button"
                      @mouseenter="hoverAccountButton=true" @mouseleave="hoverAccountButton=false"
                      data-hotkey-target="general.account-toggle"
                      data-hotkey-label="Account"
                      :data-hotkey-show="showGeneralHotkeys ? 'true' : 'false'"
                      data-hotkey-group="general"
                      data-hotkey-group-side="bottom left"
                      data-hotkey-label-position="inline"
                      v-if="showUserButton && device.isDesktopDevice.value" />
                  </div>
                </template>
                <AccountCard />
              </n-popover>
              <IonButton name="logo-github" :size="headerIconSize" aria-label="github" @click="openGitHub"
                class="header__github-button"
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
            <hotkeys-overlay v-if="hotkeysEnabled" />
          </main>
        </n-modal-provider>
      </n-message-provider>
    </n-dialog-provider>
  </n-config-provider>
</template>

<style lang="scss">
html, body {
  overflow: hidden; /* Hides any overflowing content and prevents scrolling */
  height: 100%;    /* Ensures the body takes the full height of the viewport */
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
  width: 100vw;
  padding: 0 2rem;
  box-sizing: border-box;
  display: flex;
  justify-content: space-between;
  pointer-events: none;

  .header__back-button {
    pointer-events: auto;
  }

  .header__user-button-wrapper {
    margin-left: auto;
    margin-right: 1rem;
    pointer-events: auto;
  }

  .header__github-button {
    align-self: flex-start;
  }

  :deep(.ion-icon) {
    pointer-events: auto;
  }
}

:global(html.device--touch) .header {
  top: 1rem;
  padding: 0 1rem;
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

:global(html.device--orientation-portrait) .warning-overlay:not(.warning-overlay--dismissed) {
  display: flex;
}
</style>
