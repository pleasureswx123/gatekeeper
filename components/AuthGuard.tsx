'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { apiClient } from '@/lib/api/client';
import { API_ENDPOINTS } from '@/lib/api/config';

const publicPaths = ['/login', '/register'];

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const verifySession = async () => {
      const isPublicPath = publicPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
      const token = apiClient.getToken();

      if (isPublicPath) {
        if (token) {
          try {
            await apiClient.get(API_ENDPOINTS.AUTH_ME);
            if (!cancelled) {
              router.replace(searchParams.get('redirect') || '/');
            }
          } catch {
            apiClient.clearToken();
          }
        }
        if (!cancelled) setIsChecking(false);
        return;
      }

      if (!token) {
        const redirectPath = pathname || '/';
        router.replace(`/login?redirect=${encodeURIComponent(redirectPath)}`);
        if (!cancelled) setIsChecking(false);
        return;
      }

      try {
        await apiClient.get(API_ENDPOINTS.AUTH_ME);
      } catch {
        apiClient.clearToken();
        router.replace(`/login?redirect=${encodeURIComponent(pathname || '/')}`);
      } finally {
        if (!cancelled) setIsChecking(false);
      }
    };

    verifySession();

    return () => {
      cancelled = true;
    };
  }, [pathname, router, searchParams]);

  if (isChecking) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>正在确认登录状态...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
