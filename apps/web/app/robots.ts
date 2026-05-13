import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/feed', '/sets/', '/profile/'],
        disallow: ['/canvas', '/onboarding', '/dashboard', '/api/', '/auth/'],
      },
    ],
    sitemap: 'https://sett.style/sitemap.xml',
  }
}
