<script setup lang="ts">
// Category links, title, author and date: the theme's entry header, shared by single posts and archives.
defineProps<{ post: any, link?: boolean }>()
</script>

<template>
  <header class="entry-header">
    <div class="entry-meta">
      <span class="cat-links">
        <template v-for="(c, i) in post.categories" :key="c.path">
          <template v-if="i">, </template><NuxtLink :to="c.path" rel="category tag">{{ c.name }}</NuxtLink>
        </template>
      </span>
    </div>
    <h2 class="entry-title">
      <NuxtLink v-if="link" :to="post.path" :title="post.title">{{ post.title }}</NuxtLink>
      <template v-else>{{ post.title }}</template>
    </h2>
    <div class="entry-meta clearfix">
      <div v-if="post.author" class="by-author vcard author">
        <span class="fn"><NuxtLink :to="post.author.path" :title="post.author.name">{{ post.author.name }}</NuxtLink></span>
      </div>
      <div class="date updated">
        <NuxtLink :to="post.path" :title="post.timeText">{{ post.dateText }}</NuxtLink>
      </div>
    </div>
  </header>
</template>
