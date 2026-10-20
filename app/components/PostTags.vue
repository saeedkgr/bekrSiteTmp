<script setup lang="ts">
defineProps<{ tags: { name: string, path: string }[] }>()
</script>

<template>
  <span class="tag-links">
    <template v-for="t in tags" :key="t.path"><NuxtLink :to="t.path" rel="tag">{{ t.name }}</NuxtLink>{{ ' ' }}</template>
  </span>
</template>
