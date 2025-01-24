import LogoutButton from '@/components/LogoutButton';
import { Toaster } from '@/components/ui/toaster';
import Providers from '@/lib/providers';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { CookieOptions } from '@supabase/ssr';
import Link from 'next/link';
import { PropsWithChildren } from 'react';
import 'three-dots/dist/three-dots.css';
import './globals.css';

export const metadata = {
  title: 'Create Next App',
  description: 'Generated by create next app',
};

export default async function RootLayout({ children }: PropsWithChildren) {
  // Keep cookies in the JS execution context for Next.js build
  const cookieStore = await cookies();

  // Cookie methods for getting values
  const getCookie = (name: string) => {
    return cookieStore.get(name)?.value;
  };

  const getAllCookies = () => {
    return cookieStore.getAll();
  };

  const hasCookie = (name: string) => {
    return cookieStore.has(name);
  };

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!supabaseUrl || !supabaseKey) {
    return (
      <html lang="en" className="h-full">
        <body className="h-full flex items-center justify-center">
          <div className="text-center">
            <h1 className="text-2xl font-bold">Missing Environment Variables</h1>
            <p>Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_KEY in your environment.</p>
            <p>Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.</p>
          </div>
        </body>
      </html>
    );
  }
  const supabase = createServerClient(
    supabaseUrl,
    supabaseKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set(name, value, options)
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set(name, '', options)
        },
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <html lang="en" className="h-full">
      <body className="h-full">
        <Providers>
          <div className="flex flex-col items-center h-full">
            <nav className="w-full flex justify-center border-b border-b-foreground/10">
              <div className="max-w-6xl flex grow justify-end items-center text-sm text-foreground">
                <div className="flex flex-row grow">
                  <Link
                    href="/"
                    className="py-4 px-6 cursor-pointer hover:bg-slate-100 font-bold"
                  >
                    <svg
                      width="20px"
                      height="20px"
                      version="1.1"
                      viewBox="0 0 100 100"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <g>
                        <path d="m11.906 46.43c-1.7852 1.4883-4.168 0.89453-5.0586-1.1914-1.1914-2.082-0.59375-4.7617 1.1914-5.9531l40.18-30.355c1.1914-0.89453 2.6797-0.89453 3.8672 0l40.18 30.355c1.4883 1.1914 2.082 3.8672 0.89453 5.9531-0.89453 2.082-3.2734 2.6797-5.0586 1.1914l-38.094-28.867-38.094 28.867z" />
                        <path
                          d="m83.633 48.809v37.5c0 2.9766-2.3828 5.6562-5.6562 5.6562h-15.773v-28.57c0-2.9766-2.3828-5.0586-5.0586-5.0586h-13.988c-2.9766 0-5.0586 2.082-5.0586 5.0586v28.57h-16.07c-2.9766 0-5.6562-2.6797-5.6562-5.6562v-37.5l33.633-25.297 33.633 25.297z"
                          fillRule="evenodd"
                        />
                      </g>
                    </svg>
                  </Link>
                  {user && (
                    <>
                      <Link
                        href="/files"
                        className="py-4 px-6 cursor-pointer hover:bg-slate-100 font-bold"
                      >
                        Files
                      </Link>
                      <Link
                        href="/chat"
                        className="py-4 px-6 cursor-pointer hover:bg-slate-100 font-bold"
                      >
                        Chat
                      </Link>
                    </>
                  )}
                </div>
                <div className="flex flex-row">
                  {user ? (
                    <div className="flex items-center gap-4">
                      <div className="hidden sm:block">Hey, {user.email}!</div>
                      <LogoutButton />
                    </div>
                  ) : (
                    <Link
                      href="/login"
                      className="py-4 px-6 rounded-md no-underline bg-btn-background hover:bg-btn-background-hover"
                    >
                      Login
                    </Link>
                  )}
                </div>
              </div>
            </nav>
            <main className="w-full grow bg-background flex flex-col items-center h-[calc(100%-5rem)]">
              {children}
            </main>
            <Toaster />
          </div>
        </Providers>
      </body>
    </html>
  );
}
