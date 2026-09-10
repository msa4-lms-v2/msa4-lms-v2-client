<template>
  <section class="my-card">
    <slot />
  </section>
</template>

<style scoped>
.my-card {
  background: var(--personal-color-white);
  border: 1px solid var(--personal-color-border-mist);
  border-radius: 8px;
}
</style>
