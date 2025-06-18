"use client";
import React from "react";
import { redirect, usePathname } from "next/navigation";
import { Loader } from "lucide-react";
import { useCustomSession } from "@/hooks/useCustomSession";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { data, error, isPending } = useCustomSession();
  const path = usePathname();

  if (error) {
    return <div>Error</div>;
  }

  if (isPending) {
    return (
      <div className="grid place-items-center h-full min-h-[50vh]">
        <Loader size={40} className="animate-spin" />
      </div>
    );
  }

  const user = data?.user;
  const isAuthPage = path.startsWith("/auth");
  const isPublicAuthPage =
    path === "/auth/sign-in" ||
    path === "/auth/sign-up" ||
    path === "/auth/forgot-password" ||
    path === "/auth/reset-password";

  if (!user) {
    if (isPublicAuthPage) return children;
    return redirect("/auth/sign-in");
  }

  if (!user.profileComplete) {
    if (path !== "/auth/complete-profile") {
      return redirect("/auth/complete-profile");
    }
    return children;
  }

  if (!user.emailVerified) {
    if (path !== "/auth/verify-email") {
      return redirect("/auth/verify-email");
    }
    return children;
  }

  if (!user.phoneNumberVerified) {
    if (path !== "/auth/verify-phone") {
      return redirect("/auth/verify-phone");
    }
    return children;
  }

  if (isAuthPage && !isPublicAuthPage) {
    return redirect("/dashboard");
  }

  return <>{children}</>;
}
