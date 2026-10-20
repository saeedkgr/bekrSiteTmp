// Selectable color themes. The id lands on <html data-theme>, where main.css swaps the seed colors.
export const siteThemes = [
  { id: 'bekr', label: 'بکرپردازان', swatch: '#33bb9d' },
  { id: 'ocean', label: 'اقیانوس', swatch: '#1e88e5' },
  { id: 'sunset', label: 'غروب', swatch: '#e8590c' },
  { id: 'royal', label: 'یاسی', swatch: '#7c4dff' },
] as const

export type SiteThemeId = typeof siteThemes[number]['id']

export const SITE_THEME_KEY = 'bp-theme'

export function useSiteTheme() {
  const theme = useState<SiteThemeId>('site-theme', () => 'bekr')

  onMounted(() => {
    const saved = document.documentElement.dataset.theme as SiteThemeId | undefined
    if (saved && siteThemes.some(t => t.id === saved)) theme.value = saved
  })

  function setTheme(id: SiteThemeId) {
    theme.value = id
    if (id === 'bekr') delete document.documentElement.dataset.theme
    else document.documentElement.dataset.theme = id
    try { localStorage.setItem(SITE_THEME_KEY, id) } catch {}
  }

  return { theme, setTheme, themes: siteThemes }
}
