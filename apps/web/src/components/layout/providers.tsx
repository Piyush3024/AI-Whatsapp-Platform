// "use client";

// import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
// import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
// import { useState } from "react";
// import { Toaster } from "sonner";

// import { useAuthInit } from "@/hooks/use-auth-init";

// function AuthInitializer() {
//   useAuthInit();
//   return null;
// }

// export function Providers({ children }: { children: React.ReactNode }) {
//   // useState se QueryClient — har request pe naya client nahi banega
//   const [queryClient] = useState(
//     () =>
//       new QueryClient({
//         defaultOptions: {
//           queries: {
//             staleTime: 60 * 1000, // 1 minute
//             retry: 1,
//             refetchOnWindowFocus: false,
//           },
//         },
//       }),
//   );

//   return (
//     <QueryClientProvider client={queryClient}>
//       <AuthInitializer />
//       {children}
//       <Toaster position="top-right" richColors />
//       {process.env.NODE_ENV === "development" && (
//         <ReactQueryDevtools initialIsOpen={false} />
//       )}
//     </QueryClientProvider>
//   );
// }

"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { Toaster } from "sonner";

import { TooltipProvider } from "@repo/ui/components/tooltip";
import { useAuthInit } from "@/hooks/use-auth-init";

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
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthInitializer />
        {children}
        <Toaster position="top-right" richColors />
        {process.env.NODE_ENV === "development" && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
}
