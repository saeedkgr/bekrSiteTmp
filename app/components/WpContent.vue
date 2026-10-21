<script setup lang="ts">
// Renders HTML captured from WordPress. Internal links navigate client-side.
// Elementor's script is not loaded, so its entrance animations, image carousels and lightbox are redone here.
import type { CarouselOptions, CarouselSlide, LightboxImage } from '~/utils/elementor'

defineOptions({ inheritAttrs: false })
const props = defineProps<{ html: string }>()
const router = useRouter()
const root = useTemplateRef<HTMLElement>('root')

// Elementor animation name -> Tailwind animation (keyframes in main.css). Reduced motion skips the animation.
const animations: Record<string, string> = {
  fadeIn: 'motion-safe:animate-wp-fade-in',
  fadeInUp: 'motion-safe:animate-wp-fade-in-up',
  zoomIn: 'motion-safe:animate-wp-zoom-in',
}

const carousels = shallowRef<{ el: HTMLElement, slides: CarouselSlide[], options: CarouselOptions }[]>([])
const groups = new Map<string, LightboxImage[]>()
const lightbox = reactive({ open: false, images: [] as LightboxImage[], index: 0 })
let observer: IntersectionObserver | undefined

function reveal(el: HTMLElement) {
  const s = elementorSettings(el)
  el.classList.remove('elementor-invisible')
  const cls = animations[s._animation]
  if (!cls) return
  el.classList.add(cls)
  if (el.classList.contains('animated-fast')) el.style.animationDuration = '0.75s'
  if (el.classList.contains('animated-slow')) el.style.animationDuration = '2s'
  if (s._animation_delay) el.style.animationDelay = `${Number(s._animation_delay)}ms`
}

function enhance() {
  const el = root.value
  if (!el) return

  groups.clear()
  let single = 0
  for (const a of el.querySelectorAll<HTMLElement>('a[data-elementor-open-lightbox="yes"]')) {
    const image = lightboxImage(a)
    if (!image) continue
    const group = a.dataset.elementorLightboxSlideshow || `single-${single++}`
    if (!groups.has(group)) groups.set(group, [])
    groups.get(group)!.push(image)
    a.setAttribute('href', image.url)
    a.dataset.lightboxGroup = group
  }

  carousels.value = [...el.querySelectorAll<HTMLElement>('.elementor-widget-image-carousel')].flatMap((widget) => {
    const carousel = parseCarousel(widget)
    const swiper = widget.querySelector('.elementor-image-carousel-wrapper')
    if (!carousel || !swiper) return []
    const mount = document.createElement('div')
    swiper.replaceWith(mount)
    return [{ el: mount, ...carousel }]
  })

  observer = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue
      observer?.unobserve(e.target)
      reveal(e.target as HTMLElement)
    }
  }, { rootMargin: '0px 0px -10% 0px' })
  for (const e of el.querySelectorAll<HTMLElement>('.elementor-invisible')) observer.observe(e)
}

function reset() {
  observer?.disconnect()
  carousels.value = []
  lightbox.open = false
}

onMounted(enhance)
onBeforeUnmount(reset)
watch(() => props.html, reset, { flush: 'pre' })
watch(() => props.html, enhance, { flush: 'post' })

function onClick(e: MouseEvent) {
  if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
  const a = (e.target as HTMLElement).closest('a')
  if (!a) return
  const images = a.dataset.lightboxGroup ? groups.get(a.dataset.lightboxGroup) : undefined
  if (images) {
    e.preventDefault()
    lightbox.images = images
    lightbox.index = Math.max(0, images.findIndex(i => i.url === a.getAttribute('href')))
    lightbox.open = true
    return
  }
  if (a.target === '_blank' || a.hasAttribute('download')) return
  const href = a.getAttribute('href')
  if (!href || !href.startsWith('/') || href.startsWith('//') || href.startsWith('/wp-content/')) return
  e.preventDefault()
  router.push(href)
}
</script>

<template>
  <div ref="root" v-bind="$attrs" @click="onClick" v-html="html" />
  <Teleport v-for="(c, i) in carousels" :key="i" :to="c.el">
    <WpCarousel :slides="c.slides" :options="c.options" />
  </Teleport>
  <WpLightbox v-model:open="lightbox.open" :images="lightbox.images" :index="lightbox.index" />
</template>
