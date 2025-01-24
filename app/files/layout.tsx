'use client';

import { createBrowserClient } from '@supabase/ssr';
import { redirect } from 'next/navigation';
import { PropsWithChildren, useEffect, useState } from 'react';

export default function FilesLayout({ children }: PropsWithChildren) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);

  useEffect(() => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        redirect('/login');
      } else {
        setIsAuthenticated(true);
      }
    };

    checkUser();
  }, []);

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
