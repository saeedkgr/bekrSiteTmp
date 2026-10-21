// Reads Elementor widgets out of rendered WordPress HTML, so the app can draw them without Elementor's script.

export interface LightboxImage { url: string, title: string }
export interface CarouselSlide { image: string, srcset?: string, alt: string, caption?: string, href?: string, group?: string }
export interface CarouselOptions {
  perView: number
  arrows: boolean
  dots: boolean
  loop: boolean
  autoplay: number | false
  pauseOnHover: boolean
  pauseOnInteraction: boolean
}

export function elementorSettings(el: Element): Record<string, any> {
  try { return JSON.parse(el.getAttribute('data-settings') || '{}') } catch { return {} }
}

// Elementor keeps the full-size image of a lightbox link in base64 JSON inside data-e-action-hash.
export function lightboxImage(a: Element): LightboxImage | null {
  const hash = decodeURIComponent(a.getAttribute('data-e-action-hash') || '')
  const encoded = /settings=([^&]+)/.exec(hash)?.[1]
  if (!encoded) return null
  try {
    const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0))
    const { url } = JSON.parse(new TextDecoder().decode(bytes))
    return { url: new URL(url, location.origin).pathname, title: a.getAttribute('data-elementor-lightbox-title') || '' }
  } catch { return null }
}

export function parseCarousel(widget: HTMLElement): { slides: CarouselSlide[], options: CarouselOptions } | null {
  const slides = [...widget.querySelectorAll('.swiper-slide')].flatMap((slide) => {
    const img = slide.querySelector('img')
    if (!img) return []
    const a = slide.querySelector('a')
    return [{
      image: img.getAttribute('src') || '',
      srcset: img.getAttribute('srcset') || undefined,
      alt: img.getAttribute('alt') || '',
      caption: slide.querySelector('figcaption')?.textContent?.trim() || undefined,
      href: a?.getAttribute('href') || undefined,
      group: (a as HTMLElement | null)?.dataset.lightboxGroup,
    }]
  })
  if (!slides.length) return null
  const s = elementorSettings(widget)
  const navigation = s.navigation ?? 'both'
  return {
    slides,
    options: {
      perView: Math.min(Math.max(Number(s.slides_to_show) || 3, 1), 6),
      arrows: slides.length > 1 && (navigation === 'both' || navigation === 'arrows'),
      dots: slides.length > 1 && (navigation === 'both' || navigation === 'dots'),
      loop: s.infinite === 'yes',
      autoplay: s.autoplay === 'yes' ? Number(s.autoplay_speed) || 5000 : false,
      pauseOnHover: s.pause_on_hover === 'yes',
      pauseOnInteraction: s.pause_on_interaction === 'yes',
    },
  }
}
