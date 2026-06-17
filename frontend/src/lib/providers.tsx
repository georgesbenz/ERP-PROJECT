'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60_000,   // 1 min — data considered fresh; no background refetch
            gcTime: 300_000,     // 5 min — keep unused data in memory before evicting
            retry: 1,
            refetchOnWindowFocus: false, // avoid refetch every time user alt-tabs back
          },
        },
      }),
  );
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
