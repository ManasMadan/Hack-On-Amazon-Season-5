"use client";
import React from "react";
import { Drawer, DrawerContent, DrawerTrigger } from "@repo/ui/drawer";
import { Menu } from "lucide-react";
import DarkModeToggle from "./dark-mode-toggle";
import Link from "next/link";
import { Skeleton } from "@repo/ui/skeleton";
import { usePathname } from "next/navigation";
import { cn } from "@repo/ui";
import { useCustomSession } from "@/hooks/useCustomSession";
import { Button } from "@repo/ui/button";
import { authClient } from "@repo/auth/client";

const TryNowButton = () => {
  const { data, isPending, error } = useCustomSession();
  const pathname = usePathname();

  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isHiddenRoute = pathname.startsWith("/auth");

  if (isHiddenRoute || error) {
    return <div className="hidden" />;
  }

  if (isPending) {
    return <Skeleton className="h-12 w-24 lg:w-32 rounded-xl lg:rounded-2xl" />;
  }

  if (data?.user && isDashboardRoute) {
    return (
      <Button
        className={cn(
          "font-lemon-mocktail text-2xl bg-primary text-white px-3 lg:px-4 py-2 rounded-xl lg:rounded-2xl h-12 flex items-center justify-center cursor-pointer hover:bg-primary-600"
        )}
        onClick={() => authClient.signOut()}
      >
        Logout
      </Button>
    );
  }

  const label = data?.user ? "Dashboard" : "Get Started";
  const link = data?.user ? "/dashboard" : "/auth";

  return (
    <Link
      href={link}
      className={cn(
        "font-lemon-mocktail bg-primary text-white px-3 lg:px-4 py-2 rounded-xl lg:rounded-2xl h-12 flex items-center justify-center cursor-pointer hover:bg-primary-600"
      )}
    >
      {label}
    </Link>
  );
};

export default function Navbar() {
  return (
    <div className="px-4 sm:px-8 py-4 sm:py-8 flex justify-between items-center">
      <div className="font-star-avenue text-4xl lg:text-5xl">SecureVoice+</div>

      <nav className="hidden md:flex gap-4 lg:gap-8 text-lg lg:text-2xl items-center">
        <div>How it Works?</div>
        <div>Features</div>
        <div>Team</div>
        <DarkModeToggle />
        <TryNowButton />
      </nav>

      <Drawer>
        <DrawerTrigger asChild className="flex gap-4 items-center md:hidden">
          <div>
            <DarkModeToggle />
            <Menu className="h-6 w-6" />
          </div>
        </DrawerTrigger>
        <DrawerContent>
          <div className="flex flex-col items-center gap-4 p-6 text-lg">
            <div>How it Works?</div>
            <div>Features</div>
            <div>Team</div>
            <TryNowButton />
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
