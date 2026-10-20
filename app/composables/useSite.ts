export interface MenuItem { label: string, to: string | null, children: MenuItem[] }
export interface Site {
  name: string
  description: string
  logo: string
  menu: MenuItem[]
  footer: {
    techPosts: { to: string, image: string | null, title: string }[]
    socials: { href: string, icon: string }[]
    profiles: { network: string, href: string, title: string }[]
    copyright: string
    address: string
    email: string
    phone: string
  }
}

export const useSite = () => useAsyncData<Site>('site', () => $fetch('/_data/site.json'), { dedupe: 'defer' })
