<script setup>
import { c, darkTheme } from 'naive-ui';
import AbstractBackground from './components/AbstractBackground.vue';
import AccountCard from './components/AccountCard.vue';
import IonButton from './components/IonButton.vue';
import { useRoute } from 'vue-router';
import { ref, computed, onBeforeMount } from 'vue';
import { useCookies } from '@vueuse/integrations/useCookies';
import { useStorage } from '@vueuse/core';

const openGitHub = () => {
  window.open("https://github.com/RayZh-hs/neutronic", "_blank");
};
const route = useRoute();

const showUserButton = computed(() => {
  return ![
    '/',
    '/login',
  ].includes(route.path);
});

//: Account info

import defaultPlayerProgress from './data/defaultPlayerProgress.json';
const cookies = useCookies(['neutronic-account-auth']);
const accountProgress = useStorage('neutronic-account-progress', defaultPlayerProgress);

onBeforeMount(() => {
  // Setup the account info as visitor
  cookies.set('neutronic-account-auth', { 'type': 'local', 'username': null, 'hashedPassword': null })
  console.log(accountProgress.value)
})
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
              <n-popover trigger="hover" raw placement="bottom-end">
                <template #trigger>
                  <div class="header__user-button-wrapper">
                    <IonButton name="person-circle-outline" size="2rem" class="header__user-button"
                      v-if="showUserButton" />
                  </div>
                </template>
                <AccountCard />
              </n-popover>
              <IonButton name="logo-github" size="2rem" aria-label="github" @click="openGitHub" />
            </div>
            <router-view v-slot="{ Component }">
              <!-- <transition name="zoom" mode="out-in"> -->
              <component :is="Component" />
              <!-- </transition> -->
            </router-view>
            <div class="footer">
              <p>Made with ♥️ by Norb @ 2025</p>
            </div>
            <abstract-background />
          </main>
        </n-modal-provider>
      </n-message-provider>
    </n-dialog-provider>
  </n-config-provider>
</template>

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
</style>
