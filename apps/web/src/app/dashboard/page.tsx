"use client";
import { useTRPC } from "@/utils/trpc";
import { serverSignOut } from "@repo/auth/server";
import { Button } from "@repo/ui/button";
import { useQuery } from "@tanstack/react-query";
import React from "react";

export default function dashboard() {
  const trpc = useTRPC();
  const userQuery = useQuery(trpc.test.protectedTest.queryOptions());

  return (
    <div>
      <p>{userQuery.data?.message}</p>

      <Button onClick={serverSignOut}>Logout</Button>
    </div>
  );
}
