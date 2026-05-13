import { Metadata } from 'next'
import Link from 'next/link'
import { HeroSection } from '@/features/feed/components/hero-section'
import { FeaturedSetsGrid } from '@/features/feed/components/featured-sets-grid'
import { HowItWorks } from '@/features/feed/components/how-it-works'
import { TrendTeaser } from '@/features/trends/components/trend-teaser'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'

export const metadata: Metadata = {
  title: 'SETT — Style it. Share it. Shop it.',
  description:
    'Create fashion collages from any product on the internet. Share your style. Earn when people shop your looks. The Polyvore for the creator economy.',
}

const structuredData = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'SETT',
  description: 'Create fashion collages. Share your style. Earn when people shop your looks.',
  url: 'https://sett.style',
  applicationCategory: 'Fashion',
  offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
}

export default async function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <SiteHeader />
      <main>
        <HeroSection />
        <HowItWorks />
        <TrendTeaser />
        <FeaturedSetsGrid />
        <section className="py-24 bg-near-black text-white text-center px-4">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-4xl md:text-5xl font-black mb-6 leading-tight">
              Join the future of fashion commerce.
            </h2>
            <p className="text-white/60 text-lg mb-10">Start creating and earning today.</p>
            <div className="flex gap-4 justify-center flex-wrap">
              <Link href="/auth"
                className="bg-white text-black font-semibold rounded-[12px] px-8 py-4 text-sm hover:bg-off-white transition-colors">
                Start Styling
              </Link>
              <Link href="/feed"
                className="border border-white/30 text-white font-semibold rounded-[12px] px-8 py-4 text-sm hover:border-white/60 transition-colors">
                Explore Looks
              </Link>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  )
}