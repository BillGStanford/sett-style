import Link from 'next/link'

const wardrobe = [
  { label: 'THE EVERYDAY EDIT', title: 'Off-duty uniform', note: '01 / minimal', image: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=900&q=85', className: 'hero-look hero-look-one' },
  { label: 'THE AFTER HOURS', title: 'Night, considered', note: '02 / evening', image: 'https://images.unsplash.com/photo-1539109136881-3be0616acf4b?auto=format&fit=crop&w=900&q=85', className: 'hero-look hero-look-two' },
  { label: 'THE SOFT STRUCTURE', title: 'Quiet statement', note: '03 / tailored', image: 'https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?auto=format&fit=crop&w=900&q=85', className: 'hero-look hero-look-three' },
]

export function HeroSection() {
  return (
    <section className="sett-hero relative overflow-hidden bg-white">
      <div className="sett-hero-inner max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="sett-hero-copy">
          <div className="sett-eyebrow"><span className="sett-eyebrow-dot" />YOUR STYLE, IN YOUR OWN WORDS</div>
          <h1 className="sett-hero-title">Your taste.<br /><span>Unfiltered.</span></h1>
          <p className="sett-hero-description">
            Build fashion moodboards from pieces you love. Make the look yours,
            share the vision, and let people shop every detail.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/auth/signup" className="btn-primary sett-hero-cta">Create your first look <span aria-hidden="true">↗</span></Link>
            <Link href="/feed" className="btn-secondary sett-hero-cta">Explore the community</Link>
          </div>
          <div className="sett-hero-proof">
            <span className="sett-proof-mark" aria-hidden="true">S.</span>
            <p><strong>Collect. Compose. Share.</strong><br />A canvas for the way you see style.</p>
          </div>
        </div>
        <div className="sett-hero-art" aria-label="Editorial fashion moodboard examples">
          <div className="sett-board-topline"><span>SETT STUDIO / VOL. 01</span><span>PERSONAL STYLE ARCHIVE</span></div>
          <div className="sett-board">
            {wardrobe.map((look, index) => (
              <article className={look.className} key={look.title}>
                <div className="sett-look-image">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={look.image} alt={look.title} loading={index === 0 ? 'eager' : 'lazy'} />
                  <span className="sett-look-index">0{index + 1}</span>
                </div>
                <div className="sett-look-meta"><span>{look.label}</span><strong>{look.title}</strong><small>{look.note}</small></div>
              </article>
            ))}
            <div className="sett-board-sticker" aria-hidden="true"><span>STYLE</span><strong>IS<br />PERSONAL.</strong><i>✳</i></div>
          </div>
          <div className="sett-board-footer"><span>MADE BY YOU, NOT AN ALGORITHM.</span><span>SCROLL YOUR OWN WAY ↓</span></div>
        </div>
      </div>
    </section>
  )
}
