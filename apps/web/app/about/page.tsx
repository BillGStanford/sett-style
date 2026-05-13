import { Metadata } from 'next'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'About — SETT',
  description: 'SETT is a social commerce fashion platform. Build sets, share looks, earn commissions.',
}

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-5xl font-black text-near-black mb-6 leading-none">
          Style it.<br />Share it.<br />Shop it.
        </h1>

        <div className="space-y-8 text-gray-primary leading-relaxed">
          <p className="text-lg">
            SETT is a browser-based fashion collage platform. Build outfit sets from any product
            on the internet, publish them to a community feed, and earn affiliate commissions when
            people shop your style.
          </p>

          <div className="grid sm:grid-cols-3 gap-6 py-4">
            {[
              { num: '01', title: 'Canvas', desc: 'Infinite drag-and-drop canvas. Paste any product URL to add it. No browser extension required.' },
              { num: '02', title: 'Commerce', desc: 'Every item in every set carries an affiliate link. Every conversion earns you a commission.' },
              { num: '03', title: 'Community', desc: 'A feed, challenges, follows, remixes. The social layer that makes SETT worth coming back to.' },
            ].map(item => (
              <div key={item.num} className="border-t-2 border-near-black pt-4">
                <span className="text-xs text-gray-tertiary font-semibold">{item.num}</span>
                <h3 className="text-lg font-black text-near-black mt-1 mb-2">{item.title}</h3>
                <p className="text-sm">{item.desc}</p>
              </div>
            ))}
          </div>

          <div className="bg-off-white rounded-[12px] p-6">
            <h2 className="text-xl font-black text-near-black mb-3">Revenue share</h2>
            <p className="text-sm mb-2">Creators keep <strong className="text-near-black">70%</strong> of every affiliate commission their sets generate.</p>
            <p className="text-sm mb-2">SETT keeps <strong className="text-near-black">30%</strong> to run the platform.</p>
            <p className="text-sm text-gray-tertiary">Minimum payout: $25. Processed within 5 business days.</p>
          </div>

          <div>
            <h2 className="text-xl font-black text-near-black mb-3">Built differently</h2>
            <p className="text-sm">
              Polyvore had 20 million users and died because it had no protection against acquisition.
              SETT is built so that killing it would cost more than running it. Every creator's unpaid
              commission balance is a contractual obligation that survives platform shutdown.
            </p>
          </div>
        </div>

        <div className="mt-12 flex gap-4">
          <Link href="/auth" className="btn-primary px-8 py-4">Start Creating</Link>
          <Link href="/feed" className="btn-secondary px-8 py-4">Explore Sets</Link>
        </div>
      </main>
      <SiteFooter />
    </>
  )
}
