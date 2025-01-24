import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

// Add route segment config to handle auth callback
export const runtime = 'edge'
export const dynamic = 'force-dynamic'

// This file must be placed in app/auth/callback/route.ts to handle the auth callback
// If getting 404, ensure:
// 1. This file is located at app/auth/callback/route.ts
// 2. The Next.js server is running
// 3. The URL matches exactly - check for any typos in the path
export async function GET(request: Request) {
  // The `/auth/callback` route is required for the server-side auth flow implemented
  // by the Auth Helpers package. It exchanges an auth code for the user's session.
  // https://supabase.com/docs/guides/auth/auth-helpers/nextjs#managing-sign-in-with-code-exchange
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  console.log('code', code);
  if (code) {
    const cookieStore = await cookies()
    // Log cookie store to verify cookies are being passed correctly
    console.log('Cookie store:', cookieStore.getAll())

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: CookieOptions) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: CookieOptions) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      },
    )

    // Log supabase auth cookie after exchange
    const session = await supabase.auth.exchangeCodeForSession(code)
    console.log('Auth cookies after exchange:', cookieStore.getAll())
  }

  // URL to redirect to after sign in process completes
  return NextResponse.redirect(requestUrl.origin)
}
