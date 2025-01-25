<script setup>
import { darkTheme } from 'naive-ui';
import AbstractBackground from './components/AbstractBackground.vue';
</script>

<template>
  <!-- all the NaiveUI providers -->
  <n-config-provider :theme="darkTheme">
    <n-dialog-provider>
      <n-message-provider>
        <n-modal-provider>
          <!-- main starts here -->
          <main>
            <router-view v-slot="{ Component }">
              <transition name="zoom" mode="out-in">
                <component :is="Component" />
              </transition>
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
</style>
