"use client";

import { authClient } from "@repo/auth/client";
import { Session } from "@repo/auth";

export function useCustomSession() {
  const { data: res, error, isPending, refetch } = authClient.useSession();

  return {
    data: res as Session | null,
    error,
    isPending,
    refetch,
  };
}
