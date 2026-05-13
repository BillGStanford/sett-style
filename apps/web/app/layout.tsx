import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import '@/styles/globals.css'
import { Providers } from '@/shared/components/providers'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  metadataBase: new URL('https://sett.style'),
  title: {
    default: 'SETT — Style it. Share it. Shop it.',
    template: '%s | SETT',
  },
  description:
    'Create fashion collages from any product on the internet. Share your style. Earn when people shop your looks.',
  keywords: [
    'fashion collage',
    'polyvore alternative',
    'outfit builder',
    'shoppable fashion',
    'style creator',
    'affiliate fashion',
  ],
  authors: [{ name: 'SETT Technologies Inc.' }],
  creator: 'SETT Technologies Inc.',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://sett.style',
    siteName: 'SETT',
    title: 'SETT — Style it. Share it. Shop it.',
    description:
      'Create fashion collages from any product on the internet. Share your style. Earn when people shop your looks.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'SETT — Style it. Share it. Shop it.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SETT — Style it. Share it. Shop it.',
    description: 'Build fashion sets. Earn affiliate commissions. The Polyvore for the creator era.',
    images: ['/og-image.png'],
    creator: '@sett_style',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
}

export const viewport: Viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="min-h-screen bg-white antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
