<script setup lang="ts">
defineProps<{ post: any }>()
</script>

<template>
  <section :id="`post-${post.id}`" :class="`post-${post.id} post type-post status-publish format-standard hentry`">
    <article>
      <figure v-if="post.thumb" class="post-featured-image">
        <NuxtLink :to="post.path" :title="post.title">
          <img :src="post.thumb.src" :width="post.thumb.width" :height="post.thumb.height" class="attachment-featured size-featured wp-post-image" :alt="post.title" :title="post.title">
        </NuxtLink>
        <span class="arrow" />
      </figure>
      <PostMeta :post="post" />
      <WpContent class="entry-content clearfix" :html="post.html" />
      <footer class="entry-meta clearfix">
        <PostTags :tags="post.tags" />
      </footer>
      <ul class="default-wp-page clearfix">
        <li class="previous">
          <NuxtLink v-if="post.prev" :to="post.prev.path" rel="prev"><span v-html="post.prev.html" /></NuxtLink>
        </li>
        <li class="next">
          <NuxtLink v-if="post.next" :to="post.next.path" rel="next"><span v-html="post.next.html" /></NuxtLink>
        </li>
      </ul>
      <div id="comments" class="comments-area" />
    </article>
  </section>
</template>
