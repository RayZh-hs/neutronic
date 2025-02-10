<script setup>
import { c, darkTheme } from 'naive-ui';
import AbstractBackground from './components/AbstractBackground.vue';
import IonButton from './components/IonButton.vue';
import { useRoute } from 'vue-router';
import { ref, computed } from 'vue';

const openGitHub = () => {
  window.open("https://github.com/RayZh-hs/neutronic", "_blank");
};
const route = useRoute();

const showUserButton = computed(() => {
  return route.path !== '/' && route.path !== '/login';
});
const showUserInfo = ref(false);
const toggleUserInfo = (state) => {
  showUserInfo.value = state;
};

const userCredentials = ref({ username: '', password: '' });

const handleUpdateCredentials = (credentials) => {
  userCredentials.value = credentials;
};
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
              <IonButton v-if="showUserButton" name="person-circle-outline" size="2rem"
                class="user-info"
                @mouseover="toggleUserInfo(true)"
                @mouseleave="toggleUserInfo(false)"/>
              <div v-if="showUserInfo" class="user-info__box">
                <p>Username:</p>
                <p>{{ userCredentials.username }}</p>
              </div>
              <IonButton name="logo-github" size="2rem" aria-label="github" @click="openGitHub" />
            </div>
            <router-view v-slot="{ Component }">
              <!-- <transition name="zoom" mode="out-in"> -->
                <component :is="Component" @updateCredentials="handleUpdateCredentials"/>
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

.zoom-enter-active, .zoom-leave-active {
  transition: opacity 0.3s, transform 0.3s;
}

.zoom-enter-to, .zoom-leave-from {
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

  .user-info {
    margin-right: 0.5rem;
  }
  .user-info__box {
      position: absolute;
      top: 2rem;
      width: 7rem;
      height: 4rem;
      background: $n-black;
      border: 1px solid $n-dark-grey;
      border-radius: 5%;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
      p{
        text-align: center;
        margin: 0.5rem;
      }
  }
}
</style>
