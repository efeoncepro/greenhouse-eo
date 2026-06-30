import { NextResponse } from 'next/server'

const ALLOWED_PUBLIC_FORM_ORIGINS = new Set(['https://efeoncepro.com', 'https://www.efeoncepro.com'])

export const publicFormsCorsHeaders = (request: Request, methods: string): HeadersInit => {
  const origin = request.headers.get('origin')

  const headers: Record<string, string> = {
    Vary: 'Origin',
  }

  if (origin && ALLOWED_PUBLIC_FORM_ORIGINS.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
    headers['Access-Control-Allow-Methods'] = methods
    headers['Access-Control-Allow-Headers'] = 'content-type, accept'
    headers['Access-Control-Max-Age'] = '86400'
  }

  return headers
}

export const publicFormsOptionsResponse = (request: Request, methods: string): NextResponse =>
  new NextResponse(null, {
    status: 204,
    headers: publicFormsCorsHeaders(request, methods),
  })
