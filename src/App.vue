<script setup>
</script>

<template>
  <main>
    <router-view />
    <div class="footer">
      <p>Made with ♥️ by Norb @ 2025</p>
    </div>
  </main>
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
