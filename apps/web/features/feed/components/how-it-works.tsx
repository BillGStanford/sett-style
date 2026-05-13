/**
 * HowItWorks — three-column value proposition section.
 *
 * Maps to the three product layers: Canvas, Commerce, Community.
 * Minimal, editorial. Icons are inline SVG — no external icon library dependency.
 */

const steps = [
  {
    number: '01',
    title: 'Clip Items',
    description:
      'Paste any product URL from any fashion site. We fetch the image, remove the background, and add it to your library.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
      </svg>
    ),
  },
  {
    number: '02',
    title: 'Build Your Set',
    description:
      'Arrange items on an infinite canvas. Layer, resize, style. Every set is a collage you own.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    number: '03',
    title: 'Earn Money',
    description:
      'Publish your set. Every item has a buy link. When someone shops through your set, you earn a commission.',
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2v20M17 5H9.5a3.5 3.5 0 100 7h5a3.5 3.5 0 110 7H6" />
      </svg>
    ),
  },
]

export function HowItWorks() {
  return (
    <section className="py-20 bg-off-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-black text-near-black mb-4">
            How it works
          </h2>
          <p className="text-gray-primary max-w-md mx-auto">
            Three steps from zero to earning.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {steps.map((step) => (
            <div key={step.number} className="sett-card p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-10 h-10 rounded-full bg-near-black text-white flex items-center justify-center">
                  {step.icon}
                </div>
                <span className="text-xs font-bold text-gray-tertiary tracking-widest uppercase">
                  {step.number}
                </span>
              </div>
              <h3 className="text-xl font-black text-near-black mb-3">{step.title}</h3>
              <p className="text-sm text-gray-primary leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
