"use client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { useState } from "react";
import { TRPCProvider } from "./trpc";
import type { AppRouter } from "backend";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
    },
  });
}
let browserQueryClient: QueryClient | undefined = undefined;
function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient();
  } else {
    if (!browserQueryClient) browserQueryClient = makeQueryClient();
    return browserQueryClient;
  }
}
export function CustomTRPCProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const queryClient = getQueryClient();
  const [trpcClient] = useState(() => {
    return createTRPCClient<AppRouter>({
      links: [
        httpBatchLink({
          url:
            `${process.env.NEXT_PUBLIC_BACKEND_URL}/trpc` ||
            "http://localhost:3001/trpc",
          headers: () => {
            return {
              Cookie: document.cookie,
            };
          },
          fetch(url, options) {
            return fetch(url, {
              ...options,
              credentials: "include",
            });
          },
        }),
      ],
    });
  });
  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  );
}
