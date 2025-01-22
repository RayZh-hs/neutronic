<script setup>
import { darkTheme } from 'naive-ui';

</script>

<template>
  <!-- all the NaiveUI providers -->
  <n-config-provider :theme="darkTheme">
    <n-dialog-provider>
      <n-message-provider>
        <n-modal-provider>
          <!-- main starts here -->
          <main>
            <router-view />
            <div class="footer">
              <p>Made with ♥️ by Norb @ 2025</p>
            </div>
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
</style>
