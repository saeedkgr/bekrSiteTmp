<script setup lang="ts">
defineProps<{ page: any }>()
</script>

<template>
  <section :id="`post-${page.id}`" :class="`post-${page.id} page type-page status-publish hentry`">
    <article>
      <WpContent class="entry-content clearfix" :html="page.html" />
      <div id="comments" class="comments-area" />
    </article>
  </section>
</template>
