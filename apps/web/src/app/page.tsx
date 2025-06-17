"use client";
import React from "react";
import { Button } from "@repo/ui/button";
import { ModeToggle } from "@/components/dark-mode-toggle";
import { authClient } from "@repo/auth/client";
import { useTRPC } from "@/utils/trpc";
import { useQuery } from "@tanstack/react-query";

export default function page() {
  const signIn = authClient.signIn.social;
  const trpc = useTRPC();

  const { data, isLoading } = useQuery(
    trpc.hello.greeting.queryOptions({ name: "Manas Madan" })
  );

  return (
    <div>
      <Button
        onClick={async () => {
          try {
            console.log("Signing in with Google");
            await signIn({
              provider: "google",
            });
            console.log("Signed in with Google");
          } catch (error) {
            console.error("Error signing in with Google:", error);
          }
        }}
      >
        Click me
      </Button>
      <ModeToggle />
      <p>{isLoading ? "Loading" : data}</p>
    </div>
  );
}
