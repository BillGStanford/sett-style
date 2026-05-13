import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="text-center">
        <p className="text-xs font-semibold text-gray-tertiary tracking-widest uppercase mb-4">404</p>
        <h1 className="text-4xl font-black text-near-black mb-4">Nothing here.</h1>
        <p className="text-gray-primary mb-8">This page doesn't exist. But your next set might.</p>
        <div className="flex gap-4 justify-center">
          <Link href="/" className="btn-primary px-6 py-3 text-sm">Go Home</Link>
          <Link href="/feed" className="btn-secondary px-6 py-3 text-sm">Explore Sets</Link>
        </div>
      </div>
    </div>
  )
}
