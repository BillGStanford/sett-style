import { MetadataRoute } from 'next'

/**
 * Sitemap — auto-generated for Google Search Console.
 *
 * Static routes are hardcoded.
 * Dynamic routes (set pages) are fetched from the API.
 *
 * At scale: split into sitemap index with per-aesthetic sitemaps.
 * Each aesthetic sitemap: ~10K URLs. Total: ~500K set pages.
 *
 * Submission: Google Search Console → Sitemaps → https://sett.style/sitemap.xml
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://sett.style'

  // Static pages
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1.0 },
    { url: `${baseUrl}/feed`, lastModified: new Date(), changeFrequency: 'hourly', priority: 0.9 },
    { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/blog`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.7 },
    { url: `${baseUrl}/challenges`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
  ]

  // Dynamic: published set pages
  // TODO: fetch from API with pagination
  // const sets = await fetch(`${process.env.API_URL}/api/sets/sitemap`).then(r => r.json())
  // const setRoutes = sets.map(set => ({
  //   url: `${baseUrl}/sets/${set.id}`,
  //   lastModified: new Date(set.updated_at),
  //   changeFrequency: 'weekly' as const,
  //   priority: 0.8,
  // }))

  return [...staticRoutes]
}
