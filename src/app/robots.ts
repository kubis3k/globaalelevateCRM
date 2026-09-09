import type { MetadataRoute } from 'next'

// Veřejný nábor smí do indexu; interní app je stejně za loginem. Sitemap míří
// na náborový web (Google Search Console / Google Jobs).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: 'https://jobs.globaalelevate.com/sitemap.xml',
  }
}
