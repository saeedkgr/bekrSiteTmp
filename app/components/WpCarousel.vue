<script setup lang="ts">
// Replaces an Elementor image carousel (Swiper) inside WordPress content.
import type { CarouselOptions, CarouselSlide } from '~/utils/elementor'

const props = defineProps<{ slides: CarouselSlide[], options: CarouselOptions }>()

// Slides per view on phone, tablet and desktop. Written out so Tailwind sees every class.
const itemClass: Record<number, string> = {
  1: 'basis-full',
  2: 'basis-full sm:basis-1/2',
  3: 'basis-full sm:basis-1/2 lg:basis-1/3',
  4: 'basis-1/2 sm:basis-1/3 lg:basis-1/4',
  5: 'basis-1/2 sm:basis-1/3 lg:basis-1/5',
  6: 'basis-1/2 sm:basis-1/3 lg:basis-1/6',
}

const autoplay = computed(() => props.options.autoplay
  ? { delay: props.options.autoplay, stopOnInteraction: props.options.pauseOnInteraction, stopOnMouseEnter: props.options.pauseOnHover }
  : false)
</script>

<template>
  <UCarousel
    v-slot="{ item }"
    :items="slides"
    :loop="options.loop"
    align="start"
    :arrows="options.arrows"
    :dots="options.dots"
    :autoplay="autoplay"
    :prev="{ color: 'primary', variant: 'soft', size: 'sm' }"
    :next="{ color: 'primary', variant: 'soft', size: 'sm' }"
    :ui="{
      container: '-ms-5',
      item: `ps-5 ${itemClass[options.perView]}`,
      prev: 'start-1 sm:start-1',
      next: 'end-1 sm:end-1',
      dots: '-bottom-7',
      dot: 'size-2.5 bg-brand-200 dark:bg-deep-600 data-[state=active]:bg-brand-500',
    }"
    :class="{ 'mb-10': options.dots }"
  >
    <figure class="m-0 text-center">
      <a v-if="item.href" :href="item.href" :data-lightbox-group="item.group" class="block">
        <img :src="item.image" :srcset="item.srcset" :alt="item.alt" loading="lazy" class="mx-auto h-auto max-w-full rounded-md">
      </a>
      <img v-else :src="item.image" :srcset="item.srcset" :alt="item.alt" loading="lazy" class="mx-auto h-auto max-w-full rounded-md">
      <figcaption v-if="item.caption" class="mt-2 text-caption text-muted">
        {{ item.caption }}
      </figcaption>
    </figure>
  </UCarousel>
</template>
