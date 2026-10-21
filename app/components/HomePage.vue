<script setup lang="ts">
const props = defineProps<{ page: any }>()
const s = computed(() => props.page.sections)
// Smart Slider overlay widths on its 1200px canvas, measured on the original site.
const overlayWidths = [1160, 1180, 1190, 1180, 1160]
</script>

<template>
  <section :id="`post-${page.id}`" class="home-page mt-[38px]">
    <!-- Hero slider (was Smart Slider 3) -->
    <UCarousel
      v-slot="{ item, index }"
      :items="s.slides"
      loop
      align="start"
      prev-icon="i-lucide-chevron-right"
      next-icon="i-lucide-chevron-left"
      arrows
      :autoplay="{ delay: 3000, stopOnInteraction: true }"
      :duration="40"
      :prev="{ color: 'neutral', variant: 'link', size: 'xl', class: 'text-white/80 hover:text-white max-[700px]:hidden' }"
      :next="{ color: 'neutral', variant: 'link', size: 'xl', class: 'text-white/80 hover:text-white max-[700px]:hidden' }"
      :ui="{ item: 'basis-full ps-0', container: 'ms-0', prev: 'sm:start-[15px] start-[15px]', next: 'sm:end-[15px] end-[15px]' }"
      class="relative w-full"
    >
      <!-- Smart Slider scaled a 1200x693 canvas down on narrow screens and kept it at 693px high on wider ones. -->
      <div class="relative aspect-[1200/693] max-h-[693px] w-full overflow-hidden bg-surface">
        <img
          :src="item.image"
          :alt="item.alt"
          class="absolute inset-0 size-full object-cover"
          :style="{ opacity: item.opacity, objectPosition: `${item.x}% ${item.y}%` }"
          :loading="index ? 'lazy' : 'eager'"
        >
        <img
          :src="item.overlay"
          :alt="item.overlayAlt"
          width="3200"
          height="1800"
          class="absolute top-1/2 left-1/2 h-auto -translate-x-1/2 -translate-y-1/2"
          :style="{ width: `min(${overlayWidths[index]}px, ${overlayWidths[index]! / 12}%)` }"
          :loading="index ? 'lazy' : 'eager'"
        >
      </div>
    </UCarousel>

    <div class="h-10" />

    <!-- Products -->
    <HomeHeading>{{ s.headings[0] }}</HomeHeading>
    <div class="mx-auto grid max-w-[1024px] grid-cols-4 gap-x-[37px] px-4 max-lg:grid-cols-2 max-sm:grid-cols-1 lg:px-0">
      <figure
        v-for="p in s.products"
        :key="p.title"
        class="mt-0.5 mb-[30px] bg-surface text-center shadow-[0_0_4px_1px_var(--color-teal)]"
      >
        <NuxtLink :to="p.to ?? '/'">
          <img :src="p.image" :srcset="p.srcset || undefined" sizes="182px" :alt="p.alt" width="182" height="200" loading="lazy" class="mx-auto h-[200px] w-[182px] object-contain p-2.5">
        </NuxtLink>
        <figcaption class="pt-2.5 text-[18px] leading-[30px] text-ink">
          {{ p.title }}
          <NuxtLink
            v-if="p.to"
            :to="p.to"
            class="mt-[31px] block bg-deep-900 py-3 text-[20px] leading-[30px] text-white transition-colors hover:bg-teal"
          >
            {{ p.button }}
          </NuxtLink>
        </figcaption>
      </figure>
    </div>

    <div class="h-10" />

    <!-- Latest posts (was Post Slider and Carousel) -->
    <HomeHeading>{{ s.headings[1] }}</HomeHeading>
    <UCarousel
      v-slot="{ item }"
      :items="s.latest"
      loop
      align="start"
      prev-icon="i-lucide-chevron-right"
      next-icon="i-lucide-chevron-left"
      arrows
      dots
      :autoplay="{ delay: s.carouselConf.autoplay_interval ?? 4000 }"
      :ui="{ item: 'basis-full sm:basis-1/2 lg:basis-1/3 ps-5', container: '-ms-5', dots: '-bottom-[30px] gap-1', dot: 'size-2.5 rounded-full bg-[#555] data-[state=active]:bg-[#03a9f5]', prev: 'sm:start-0 start-0 rounded-none', next: 'sm:end-0 end-0 rounded-none' }"
      :prev="{ color: 'neutral', variant: 'outline', class: 'h-[49px] w-[42px] justify-center rounded-none border-2 border-black bg-surface/40 text-black ring-0' }"
      :next="{ color: 'neutral', variant: 'outline', class: 'h-[49px] w-[42px] justify-center rounded-none border-2 border-black bg-surface/40 text-black ring-0' }"
      class="mb-[30px]"
    >
      <NuxtLink
        :to="item.to"
        class="group relative block h-[400px] bg-subtle bg-cover bg-center"
        :style="{ backgroundImage: `url('${item.image}')` }"
      >
        <span class="absolute inset-0 bg-linear-to-b from-transparent from-40% to-black" />
        <span class="absolute inset-x-0 bottom-0 p-5 text-center">
          <span class="block text-[20px] leading-[30px] text-white group-hover:underline">{{ item.title }}</span>
          <span class="mx-[5px] mb-[5px] inline-block text-[12px] text-white">{{ item.date }}</span>
        </span>
      </NuxtLink>
    </UCarousel>

    <div class="h-10" />

    <!-- Clients (was Carousel Slider) -->
    <HomeHeading>{{ s.headings[2] }}</HomeHeading>
    <UCarousel
      v-slot="{ item }"
      :items="s.clients"
      loop
      align="start"
      prev-icon="i-lucide-chevron-right"
      next-icon="i-lucide-chevron-left"
      :autoplay="{ delay: 5000, stopOnMouseEnter: true }"
      :ui="{ item: 'basis-full min-[576px]:basis-1/2 min-[1024px]:basis-1/3 min-[1280px]:basis-1/4 min-[1536px]:basis-1/5 ps-[5px]', container: '-ms-[5px]' }"
    >
      <img :src="item.image" :alt="item.alt" width="248" height="51" class="h-auto w-full" loading="lazy">
    </UCarousel>

    <div class="h-10" />
  </section>
</template>
