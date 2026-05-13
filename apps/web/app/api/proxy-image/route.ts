import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const src = request.nextUrl.searchParams.get('src')
  if (!src) return new NextResponse('Missing src', { status: 400 })

  // Only allow proxying from our own API to prevent SSRF attacks
  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
  if (!src.startsWith(apiBase)) {
    return new NextResponse('Invalid src', { status: 400 })
  }

  try {
    const res = await fetch(src)
    if (!res.ok) return new NextResponse('Image not found', { status: res.status })

    const contentType = res.headers.get('content-type') || 'image/png'
    const buffer = await res.arrayBuffer()

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    })
  } catch {
    return new NextResponse('Failed to fetch image', { status: 502 })
  }
}