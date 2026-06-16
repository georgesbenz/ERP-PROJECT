'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/auth.store';
import { authService } from '@/services/auth.service';
import { settingsService } from '@/services/settings.service';
import { setAppCurrency } from '@/lib/utils';
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
  const { isAuthenticated, permissionsLoaded, _hasHydrated, setPermissions, setUser, logout } = useAuthStore();
  const router = useRouter();
  const fetchedRef = useRef(false);

  useEffect(() => {
    // Wait until zustand has rehydrated from localStorage before making any
    // auth decision — without this guard a page refresh sees isAuthenticated=false
    // for a brief moment and incorrectly redirects to /login.
    if (!_hasHydrated) return;

    if (!isAuthenticated) {
      router.replace('/login');
      return;
    }

    // Fetch full profile (with permissions) + company settings once per session mount
    if (!permissionsLoaded && !fetchedRef.current) {
      fetchedRef.current = true;
      Promise.all([authService.me(), settingsService.getCompany()])
        .then(([profile, company]) => {
          const permissions = extractPermissions(profile);
          setPermissions(permissions);
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
          // Apply tenant currency globally so all formatCurrency() calls use it
          if (company?.currency) setAppCurrency(company.currency);
        })
        .catch(() => {
          // Token may be invalid — log out
          logout();
          router.replace('/login');
        });
    }
  }, [_hasHydrated, isAuthenticated, permissionsLoaded, setPermissions, setUser, logout, router]);

  // Still reading from localStorage — show nothing yet
  if (!_hasHydrated) return <PageLoader />;

  if (!isAuthenticated) return <PageLoader />;

  // Show loader while we fetch permissions for the first time
  if (!permissionsLoaded) return <PageLoader />;

  return <>{children}</>;
}
