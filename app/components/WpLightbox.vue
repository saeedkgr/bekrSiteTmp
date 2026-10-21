<script setup lang="ts">
// Full-size image popup for Elementor lightbox links; images that share a slideshow id can be browsed.
import type { LightboxImage } from '~/utils/elementor'

const open = defineModel<boolean>('open', { default: false })
const props = defineProps<{ images: LightboxImage[], index: number }>()

const current = ref(props.index)
watch(() => [props.index, open.value], () => { current.value = props.index })
const title = computed(() => props.images[current.value]?.title || 'تصویر')
</script>

<template>
  <UModal
    v-model:open="open"
    :title="title"
    :close="{ color: 'primary', variant: 'ghost' }"
    :ui="{
      content: 'sm:max-w-5xl bg-surface ring-brand-500/30 dark:ring-deep-600 divide-brand-500/20 dark:divide-deep-700',
      title: 'text-ink',
      body: 'p-3 sm:p-4',
    }"
  >
    <template #title>
      <span dir="auto">{{ title }}</span>
    </template>
    <template #body>
      <UCarousel
        v-if="images.length > 1"
        v-slot="{ item }"
        :items="images"
        :start-index="index"
        loop
        arrows
        dots
        :prev="{ color: 'primary', variant: 'soft' }"
        :next="{ color: 'primary', variant: 'soft' }"
        :ui="{
          prev: 'start-1 sm:start-1',
          next: 'end-1 sm:end-1',
          dots: 'static mt-3',
          dot: 'size-2.5 bg-brand-200 dark:bg-deep-600 data-[state=active]:bg-brand-500',
        }"
        @select="current = $event"
      >
        <img :src="item.url" :alt="item.title" class="mx-auto max-h-[75vh] w-auto max-w-full object-contain">
      </UCarousel>
      <img v-else-if="images[0]" :src="images[0].url" :alt="images[0].title" class="mx-auto max-h-[75vh] w-auto max-w-full object-contain">
    </template>
  </UModal>
</template>
