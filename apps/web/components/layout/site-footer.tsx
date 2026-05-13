'use client'

import Link from 'next/link'
import { SettLogo } from '@/components/ui/sett-logo'

export function SiteFooter() {
  const currentYear = new Date().getFullYear()

  const footerSections = [
    {
      title: 'Platform',
      links: [
        { href: '/feed', label: 'Explore Sets' },
        { href: '/canvas', label: 'Canvas Editor' },
        { href: '/challenges', label: 'Style Challenges' },
        { href: '/trending', label: 'Trending Items' },
      ],
    },
    {
      title: 'Resources',
      links: [
        { href: '/creators', label: 'Creator Program' },
        { href: '/blog', label: 'Style Journal' },
        { href: '/help', label: 'Design Guide' },
        { href: '/affiliates', label: 'Affiliate Info' },
      ],
    },
    {
      title: 'Company',
      links: [
        { href: '/about', label: 'Our Story' },
        { href: '/careers', label: 'Careers' },
        { href: '/legal/privacy', label: 'Privacy' },
        { href: '/legal/terms', label: 'Terms' },
      ],
    },
  ]

  const socialLinks = [
    {
      href: 'https://instagram.com/sett',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><rect x="2" y="2" width="20" height="20" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" /></svg>
    },
    {
      href: 'https://tiktok.com/@sett',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" /></svg>
    },
    {
      href: 'https://pinterest.com/sett',
      icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4"><circle cx="12" cy="12" r="10" /><path d="M8 16a6 6 0 0 1 6-6 6 6 0 0 1-6 6z" /><path d="M12 12v6" /></svg>
    },
  ]

  return (
    <footer className="bg-white border-t border-gray-border pt-16 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Top Section: Branding & Newsletter */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 mb-16">
          <div className="lg:col-span-4 space-y-6">
            <Link href="/" className="inline-block transition-transform hover:scale-105">
              <SettLogo className="h-7 text-near-black" />
            </Link>
            <p className="text-sm text-gray-500 leading-relaxed max-w-sm">
              The premier destination for digital moodboarding and affiliate-powered style curation. Built for the next generation of creators.
            </p>
            <div className="flex items-center gap-3">
              {socialLinks.map((social, i) => (
                <a 
                  key={i} 
                  href={social.href} 
                  className="w-9 h-9 flex items-center justify-center rounded-full border border-gray-200 text-gray-400 hover:border-near-black hover:text-near-black transition-all"
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          <div className="lg:col-span-8">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
              {footerSections.map((section) => (
                <div key={section.title} className="space-y-6">
                  <h3 className="text-[11px] font-black text-near-black uppercase tracking-[0.2em]">
                    {section.title}
                  </h3>
                  <ul className="space-y-4">
                    {section.links.map((link) => (
                      <li key={link.href}>
                        <Link 
                          href={link.href} 
                          className="text-[13px] text-gray-500 hover:text-near-black transition-colors font-medium"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Middle Section: CTA / Newsletter Card */}
        <div className="mb-16 p-8 rounded-3xl bg-gray-50 border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1">
            <h4 className="text-lg font-bold text-near-black">Stay in the loop</h4>
            <p className="text-sm text-gray-500">Get the weekly digest of trending sets and creator tips.</p>
          </div>
          <div className="flex w-full md:w-auto gap-2">
            <input 
              type="email" 
              placeholder="Email address" 
              className="flex-1 md:w-64 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-near-black/5 transition-all"
            />
            <button className="bg-near-black text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-black transition-all active:scale-95">
              Join
            </button>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-gray-100 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-8">
            <p className="text-xs text-gray-400 font-medium">
              © {currentYear} SETT Technologies Inc.
            </p>
            <div className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Systems Operational</span>
            </div>
          </div>
          
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <span>Designed in New York</span>
            <span className="mx-1">·</span>
            <span>Polyvore-Proofed</span>
          </div>
        </div>
      </div>
    </footer>
  )
}