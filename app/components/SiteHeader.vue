<script setup lang="ts">
import type { MenuItem } from '~/composables/useSite'

const { data: site } = await useSite()
const route = useRoute()
const open = ref(false)
const NuxtLink = resolveComponent('NuxtLink')

const current = computed(() => normalize(route.path))

function normalize(p: string) {
  try { p = decodeURIComponent(p) } catch {}
  return p.endsWith('/') ? p : p + '/'
}

// Mirrors WordPress' current-menu-item / current-menu-ancestor highlighting.
function isActive(item: MenuItem): boolean {
  if (item.to && item.to === current.value) return true
  return item.children.some(isActive)
}

watch(() => route.fullPath, () => { open.value = false })
</script>

<template>
  <header class="relative z-40 border-b border-default bg-surface">
    <div class="flex h-[50px] items-start ps-[22px] pe-4 max-md:h-auto max-md:flex-wrap max-md:items-center max-md:py-2">
      <NuxtLink to="/" :title="site?.name" rel="home" class="mt-[2px] block shrink-0 max-md:mt-0">
        <img :src="site?.logo" :alt="site?.name" width="125" height="50" class="h-[50px] w-[125px] dark:invert dark:hue-rotate-180">
      </NuxtLink>

      <!-- Desktop navigation -->
      <nav class="ms-[18px] hidden md:block" aria-label="منوی اصلی">
        <ul class="flex gap-x-5">
          <li v-for="item in [...(site?.menu ?? [])].reverse()" :key="item.label" class="group relative">
            <component
              :is="item.to ? NuxtLink : 'a'"
              :to="item.to ?? undefined"
              class="block h-[50px] cursor-pointer pt-[19px] font-mitra text-[18px] font-bold leading-5 transition-colors hover:text-mint group-hover:text-mint"
              :class="isActive(item) ? 'text-mint' : 'text-navy'"
            >
              {{ item.label }}
            </component>
            <ul
              v-if="item.children.length"
              class="invisible absolute top-[60px] right-0 z-50 w-[190px] border-t-4 border-mint bg-surface opacity-0 shadow-[0_4px_8px_rgba(0,0,0,0.2)] group-hover:visible group-hover:opacity-100"
            >
              <li v-for="child in item.children" :key="child.label">
                <NuxtLink
                  :to="child.to ?? '/'"
                  class="block px-2.5 py-1.5 font-mitra text-[18px] leading-5 font-normal text-navy hover:bg-subtle hover:text-mint"
                >
                  {{ child.label }}
                </NuxtLink>
              </li>
            </ul>
          </li>
        </ul>
      </nav>

      <ThemeSwitcher class="ms-auto mt-[9px] max-md:mt-0" />

      <!-- Mobile navigation -->
      <UButton
        class="md:hidden"
        color="neutral"
        variant="ghost"
        icon="i-lucide-menu"
        aria-label="Responsive Menu"
        @click="open = !open"
      />
      <ul v-if="open" class="w-full basis-full border-t-4 border-mint bg-surface md:hidden">
        <template v-for="item in [...(site?.menu ?? [])].reverse()" :key="item.label">
          <li>
            <component
              :is="item.to ? NuxtLink : 'span'"
              :to="item.to ?? undefined"
              class="block border-b border-default px-3 py-2 font-mitra text-[18px] font-bold"
              :class="isActive(item) ? 'text-mint' : 'text-navy'"
            >
              {{ item.label }}
            </component>
          </li>
          <li v-for="child in item.children" :key="child.label">
            <NuxtLink :to="child.to ?? '/'" class="block border-b border-default px-6 py-2 font-mitra text-[18px] text-navy hover:text-mint">
              {{ child.label }}
            </NuxtLink>
          </li>
        </template>
      </ul>
    </div>
  </header>
</template>
