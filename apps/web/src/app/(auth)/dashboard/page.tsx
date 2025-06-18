"use client";
import { authClient } from "@repo/auth/client";
import { Button } from "@repo/ui/button";
import React from "react";

export default function dashboard() {
  return (
    <div>
      <Button onClick={() => authClient.signOut()}>Logout</Button>
    </div>
  );
}
