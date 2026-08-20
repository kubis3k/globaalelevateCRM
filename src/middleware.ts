import { NextResponse, type NextRequest } from 'next/server'
import { getSessionCookie } from 'better-auth/cookies'

export async function middleware(request: NextRequest) {
  // Předcházení běhu pro statické soubory
  if (
    request.nextUrl.pathname.startsWith('/_next') ||
    request.nextUrl.pathname.includes('.')
  ) {
    return NextResponse.next()
  }

  // Veřejná kariérní stránka na vlastní doméně: jobs.globaalelevate.com/* → /jobs/*
  const host = request.headers.get('host') || ''
  if (host.startsWith('jobs.') && !request.nextUrl.pathname.startsWith('/jobs') && !request.nextUrl.pathname.startsWith('/api')) {
    const url = request.nextUrl.clone()
    url.pathname = `/jobs${request.nextUrl.pathname === '/' ? '' : request.nextUrl.pathname}`
    return NextResponse.rewrite(url)
  }

  // API routes si autorizaci řeší samy (Bearer tokeny u cron/importu, session
  // v route handlerech). Redirect na /login by rozbil strojová volání (pg_cron).
  if (request.nextUrl.pathname.startsWith('/api')) {
    return NextResponse.next()
  }

  // Jen kontrola existence cookie (edge runtime, žádné DB dotazy) — autoritativní
  // ověření session dělá getAuthContext()/requireTenant() (Node runtime).
  const hasSession = !!getSessionCookie(request)

  const isAuthRoute = request.nextUrl.pathname.startsWith('/login') || request.nextUrl.pathname.startsWith('/auth') || request.nextUrl.pathname.startsWith('/jobs') || request.nextUrl.pathname.startsWith('/invite')

  if (!hasSession && !isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (hasSession && request.nextUrl.pathname === '/login') {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
