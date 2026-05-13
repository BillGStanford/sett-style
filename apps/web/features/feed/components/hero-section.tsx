import Link from 'next/link'

/**
 * HeroSection — above-the-fold landing page hero.
 *
 * Design spec:
 * - SETT wordmark (large), tagline, two CTAs
 * - Right side: preview grid of fashion sets
 * - White background, generous whitespace, editorial tone
 * - 8-second rule: visitor understands product and wants to start within 8s
 *
 * Performance: Server Component. No JS.
 * SEO: H1 contains primary keyword.
 */
export function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          {/* Left: Copy */}
          <div>
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-near-black leading-none tracking-tight mb-6">
              Style it.
              <br />
              Share it.
              <br />
              <span className="text-gray-secondary">Shop it.</span>
            </h1>
            <p className="text-lg text-gray-primary mb-10 max-w-md leading-relaxed">
              Create outfits from anything on the internet.
              <br />
              Earn when people shop your style.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/auth/signup" className="btn-primary text-base px-8 py-4">
                Start Styling
              </Link>
              <Link href="/feed" className="btn-secondary text-base px-8 py-4">
                Explore Looks
              </Link>
            </div>

            {/* Social proof micro-copy */}
            <p className="mt-8 text-sm text-gray-tertiary">
              Join creators earning from their style.{' '}
              <Link href="/about" className="underline underline-offset-2 hover:text-near-black transition-colors">
                See how it works →
              </Link>
            </p>
          </div>

          {/* Right: Set preview collage */}
          <div className="relative">
            <HeroSetPreview />
          </div>
        </div>
      </div>
    </section>
  )
}

/**
 * HeroSetPreview — static preview of a fashion set.
 * At launch: uses placeholder images.
 * Post-launch: pull featured set from API (ISR-cached).
 */
function HeroSetPreview() {
  return (
    <div className="sett-card p-6 shadow-elevated max-w-sm mx-auto">
      {/* Set thumbnail placeholder — replace with real Image component */}
      <div className="aspect-square rounded-[8px] bg-gray-bg flex items-center justify-center mb-4 overflow-hidden">
        <div className="w-full h-full relative">
          {/* TODO: Replace with actual set thumbnail from Cloudflare R2 */}
          <div className="absolute inset-0 bg-gradient-to-br from-gray-bg to-gray-border flex items-center justify-center">
            <p className="text-xs text-gray-tertiary font-medium tracking-wider uppercase">
              Your Canvas
            </p>
          </div>
        </div>
      </div>

      {/* Set meta */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-sm font-semibold text-near-black">Chic Everyday Comfort</p>
          <p className="text-xs text-gray-tertiary">@stylebyamelia</p>
        </div>
        <button className="text-xs text-gray-primary border border-gray-border rounded-full px-3 py-1 hover:border-near-black transition-colors">
          Follow
        </button>
      </div>

      {/* Steal This Look CTA */}
      <button className="w-full bg-near-black text-white text-sm font-semibold rounded-[12px] py-3 hover:bg-black transition-colors">
        Steal This Look
      </button>
    </div>
  )
}