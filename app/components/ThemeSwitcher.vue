<script setup lang="ts">
const { theme, setTheme, themes } = useSiteTheme()
const colorMode = useColorMode()

const modes = [
  { value: 'light', label: 'روشن', icon: 'i-lucide-sun' },
  { value: 'dark', label: 'تیره', icon: 'i-lucide-moon' },
  { value: 'system', label: 'سیستم', icon: 'i-lucide-monitor' },
] as const
</script>

<template>
  <UPopover :content="{ align: 'end', side: 'bottom', sideOffset: 8 }">
    <UButton color="neutral" variant="ghost" icon="i-lucide-palette" aria-label="پوسته و حالت نمایش" />

    <template #content>
      <div class="w-60 space-y-4 p-4">
        <div>
          <p class="mb-2 text-caption font-semibold text-ink">پوسته</p>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="t in themes"
              :key="t.id"
              type="button"
              class="flex items-center gap-2 rounded-md border px-2 py-1.5 text-caption text-ink transition-colors"
              :class="theme === t.id ? 'border-primary bg-primary/10' : 'border-default hover:bg-elevated'"
              :aria-pressed="theme === t.id"
              @click="setTheme(t.id)"
            >
              <span class="size-4 shrink-0 rounded-full" :style="{ background: t.swatch }" />
              {{ t.label }}
            </button>
          </div>
        </div>

        <div>
          <p class="mb-2 text-caption font-semibold text-ink">حالت نمایش</p>
          <div class="grid grid-cols-3 gap-1">
            <UButton
              v-for="m in modes"
              :key="m.value"
              :icon="m.icon"
              size="sm"
              block
              :color="colorMode.preference === m.value ? 'primary' : 'neutral'"
              :variant="colorMode.preference === m.value ? 'soft' : 'ghost'"
              :aria-pressed="colorMode.preference === m.value"
              @click="colorMode.preference = m.value"
            >
              {{ m.label }}
            </UButton>
          </div>
        </div>
      </div>
    </template>
  </UPopover>
</template>
