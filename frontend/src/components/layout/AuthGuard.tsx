'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';
import { PageLoader } from '@/components/ui/Spinner';

// Flatten the nested roles→permissions structure from /auth/me into ["module:ACTION", ...]
function extractPermissions(profile: any): string[] {
  const perms = new Set<string>();
  for (const userRole of profile?.roles ?? []) {
    for (const rp of userRole?.role?.permissions ?? []) {
      const { module, action } = rp?.permission ?? {};
      if (module && action) perms.add(`${module}:${action}`);
    }
  }
  return Array.from(perms);
}

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, permissionsLoaded, setPermissions, setUser, logout } = useAuthStore();
  const router = useRouter();
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    // Fetch full profile (with permissions) once per session mount
    if (!permissionsLoaded && !fetchedRef.current) {
      fetchedRef.current = true;
      authService.me()
        .then((profile) => {
          const permissions = extractPermissions(profile);
          setPermissions(permissions);
          // Also refresh user display name in case it changed
          if (profile) {
            setUser({
              id: profile.id,
              email: profile.email,
              firstName: profile.firstName,
              lastName: profile.lastName,
              tenantId: profile.tenantId,
              roles: (profile.roles ?? []).map((ur: any) => ur?.role?.name).filter(Boolean),
            });
          }
        })
        .catch(() => {
          // Token may be invalid — log out
          logout();
          router.replace('/login');
        });
    }
  }, [isAuthenticated, permissionsLoaded, setPermissions, setUser, logout, router]);

  if (!isAuthenticated) return <PageLoader />;

  // Show loader while we fetch permissions for the first time
  if (!permissionsLoaded) return <PageLoader />;

  return <>{children}</>;
}
