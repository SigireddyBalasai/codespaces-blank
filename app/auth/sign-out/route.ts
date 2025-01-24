// Add error handling for the signOut operation
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const cookieStore = await cookies();
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    );

    await supabase.auth.signOut();
    
    return NextResponse.redirect(`${requestUrl.origin}/login`, {
      // a 301 status is required to redirect from a POST to a GET route
      status: 301,
    });
  } catch (error) {
    console.error('Error during sign out:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
