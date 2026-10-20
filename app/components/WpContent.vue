<script setup lang="ts">
// Renders HTML captured from WordPress. Internal links navigate client-side.
defineProps<{ html: string }>()
const router = useRouter()

function onClick(e: MouseEvent) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  const a = (e.target as HTMLElement).closest('a')
  if (!a || a.target === '_blank' || a.hasAttribute('download')) return
  const href = a.getAttribute('href')
  if (!href || !href.startsWith('/') || href.startsWith('//') || href.startsWith('/wp-content/') || href.startsWith('/wp-includes/')) return
  e.preventDefault()
  router.push(href)
}
</script>

<template>
  <div @click="onClick" v-html="html" />
</template>
