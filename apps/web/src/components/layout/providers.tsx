"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { useState } from "react";
import { Toaster } from "sonner";

import { TooltipProvider } from "@repo/ui/components/tooltip";
import { useAuthInit } from "@/hooks/use-auth-init";
import { ThemeProvider } from "next-themes";

function AuthInitializer() {
  useAuthInit();
  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000, 
            gcTime: 5 * 60 * 1000, 
            retry: 1,
            refetchOnWindowFocus: false,
          },
          mutations: {
            onError: (error) => {
              console.error("[mutation error]", error);
            },
          },
        },
      }),
  );

  return (
    <NuqsAdapter>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <TooltipProvider>
            <AuthInitializer />
            {children}
            <Toaster position="top-right" richColors />
            {process.env.NODE_ENV === "development" && (
              <ReactQueryDevtools initialIsOpen={false} />
            )}
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </NuqsAdapter>
  );
}
