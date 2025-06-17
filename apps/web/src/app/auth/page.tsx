import React from "react";
import { authClient } from "@repo/auth/client";
import { redirect } from "next/navigation";

export default async function index() {
  const result = await authClient.getSession();

  if (!result.data) {
    return redirect("/auth/login");
  }
  if (!result.data.session || !result.data.user) {
    return redirect("/auth/login");
  }

  return redirect("/auth/dashboard");
}
