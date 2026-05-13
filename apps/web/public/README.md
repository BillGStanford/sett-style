Place your Open Graph image here as `og-image.png` (1200×630px).

This image appears when SETT links are shared on:
- Twitter/X
- Facebook
- LinkedIn
- Discord
- iMessage link previews

Design spec:
- Background: #000000
- SETT wordmark: white, Inter Black, centered
- Tagline: "Style it. Share it. Shop it." in white/60 below
- Optional: grid of 4-6 set thumbnails as background texture

The og-image is referenced in apps/web/app/layout.tsx:
  openGraph.images[0].url = '/og-image.png'
