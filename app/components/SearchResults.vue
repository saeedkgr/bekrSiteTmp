<script setup lang="ts">
const props = defineProps<{ term: string }>()
const { data: site } = await useSite()
const { data: index } = await useAsyncData('search-index', () => $fetch<{ title: string, path: string, text: string }[]>('/_data/search.json'), { server: false })
const results = computed(() => {
  const q = props.term.trim().toLowerCase()
  if (!q) return []
  return (index.value ?? []).filter(r => r.title.toLowerCase().includes(q) || r.text.toLowerCase().includes(q))
})
useHead({ title: () => `نتایج جستجو برای “${props.term}” – ${site.value?.name ?? ''}` })
</script>

<template>
  <h2 v-if="index && !results.length" class="entry-title">
    No Posts Found.
  </h2>
  <section v-for="r in results" :key="r.path" class="clearfix post hentry">
    <article>
      <header class="entry-header">
        <h2 class="entry-title">
          <NuxtLink :to="r.path" :title="r.title">{{ r.title }}</NuxtLink>
        </h2>
      </header>
      <div class="entry-content clearfix">
        <p>{{ r.text }}&hellip;</p>
      </div>
      <footer class="entry-meta clearfix">
        <NuxtLink class="readmore" :to="r.path" :title="r.title">Read more</NuxtLink>
      </footer>
    </article>
  </section>
</template>
