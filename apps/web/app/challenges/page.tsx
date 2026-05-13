import { Metadata } from 'next'
import { SiteHeader } from '@/components/layout/site-header'
import { SiteFooter } from '@/components/layout/site-footer'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Challenges — SETT',
  description: 'Weekly style challenges. Build a set, get votes, win featured placement.',
}

async function getChallenges() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/challenges`,
      { next: { revalidate: 3600 } }
    )
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export default async function ChallengesPage() {
  const challenges = await getChallenges()

  return (
    <>
      <SiteHeader />
      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-12">
          <h1 className="text-4xl font-black text-near-black mb-3">Challenges</h1>
          <p className="text-gray-primary max-w-lg">
            Weekly themed challenges. Publish a set with the challenge tag, get community votes, and win
            featured placement for 30 days.
          </p>
        </div>

        {challenges.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-gray-border rounded-[12px]">
            <p className="text-sm font-semibold text-near-black mb-2">No active challenges yet.</p>
            <p className="text-xs text-gray-tertiary mb-6">The first challenge drops soon. Stay tuned.</p>
            <Link href="/feed" className="btn-secondary text-sm px-6 py-3 inline-block">Browse Sets</Link>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-6">
            {challenges.map((c: any) => (
              <div key={c.id} className="sett-card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <span className="text-xs font-semibold text-near-black uppercase tracking-wide bg-near-black text-white rounded-full px-3 py-1">
                      Active
                    </span>
                  </div>
                  <span className="text-xs text-gray-tertiary">
                    Ends {new Date(c.end_date).toLocaleDateString()}
                  </span>
                </div>
                <h2 className="text-xl font-black text-near-black mb-2">{c.title}</h2>
                <p className="text-sm text-gray-primary mb-5">{c.description}</p>
                <Link href={`/canvas?challenge=${c.hashtag}`} className="btn-primary text-sm px-5 py-3 inline-block">
                  Enter Challenge
                </Link>
              </div>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </>
  )
}
