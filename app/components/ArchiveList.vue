<script setup lang="ts">
const props = defineProps<{ archive: any }>()
const pageUrl = (n: number) => n === 1 ? props.archive.pagination.base : `${props.archive.pagination.base}page/${n}/`
</script>

<template>
  <h2 v-if="!archive.posts.length" class="entry-title">
    No Posts Found.
  </h2>
  <template v-else>
    <section
      v-for="post in archive.posts"
      :id="`post-${post.id}`"
      :key="post.id"
      :class="`clearfix post-${post.id} post type-post status-publish format-standard hentry`"
    >
      <article>
        <figure v-if="post.thumb" class="post-featured-image">
          <NuxtLink :to="post.path" :title="post.title">
            <img :src="post.thumb.src" :width="post.thumb.width" :height="post.thumb.height" class="attachment-featured size-featured wp-post-image" :alt="post.title" :title="post.title" loading="lazy">
          </NuxtLink>
          <span class="arrow" />
        </figure>
        <PostMeta :post="post" link />
        <WpContent class="entry-content clearfix" :html="post.excerpt" />
        <footer class="entry-meta clearfix">
          <PostTags :tags="post.tags" />
          <NuxtLink class="readmore" :to="post.path" :title="post.title">Read more</NuxtLink>
        </footer>
      </article>
    </section>
    <ul class="default-wp-page clearfix">
      <li class="previous">
        <NuxtLink v-if="archive.pagination.current < archive.pagination.total" :to="pageUrl(archive.pagination.current + 1)">&laquo; Previous</NuxtLink>
      </li>
      <li class="next">
        <NuxtLink v-if="archive.pagination.current > 1" :to="pageUrl(archive.pagination.current - 1)">Next &raquo;</NuxtLink>
      </li>
    </ul>
  </template>
</template>
