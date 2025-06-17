"use client";
import React from "react";
import { Button } from "@repo/ui/button";
import { ModeToggle } from "@/components/dark-mode-toggle";
import { authClient } from "@repo/auth/client";

export default function page() {
  const signIn = authClient.signIn.social;

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
    </div>
  );
}
