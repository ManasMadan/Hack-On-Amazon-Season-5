"use client";
import React from "react";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@repo/ui/drawer";
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
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  const scrollToId = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    setOpen(false);
    e.preventDefault();
    const elementId = (e.target as HTMLAnchorElement).href.split(
      "#"
    )[1] as string;
    const element = document.getElementById(elementId);
    const navbar = document.getElementById("navbar");
    if (element) {
      scrollTo({
        top: element.offsetTop - (navbar?.offsetHeight || 0),
        left: 0,
        behavior: "smooth",
      });
    }
  };

  return (
    <div
      id="navbar"
      className="z-50 sticky bg-page-background top-0 px-4 sm:px-8 py-4 sm:py-8 flex justify-between items-center"
    >
      <Link
        href={pathname.startsWith("/dashboard") ? "/dashboard" : "/"}
        className="font-star-avenue text-4xl lg:text-5xl"
      >
        SecureVoice+
      </Link>

      <nav
        className={
          "hidden md:flex gap-4 lg:gap-8 text-lg lg:text-2xl items-center"
        }
      >
        <div
          className={cn("flex gap-4 lg:gap-8", {
            hidden:
              pathname.startsWith("/dashboard") || pathname.startsWith("/auth"),
          })}
        >
          <Link href="/#how-it-works" onClick={scrollToId}>
            How it Works?
          </Link>
          <Link href="/#features" onClick={scrollToId}>
            Features
          </Link>
          <Link href="/#team" onClick={scrollToId}>
            Team
          </Link>
        </div>
        <DarkModeToggle />
        <TryNowButton />
      </nav>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerTrigger asChild className="flex gap-4 items-center md:hidden">
          <div>
            <DarkModeToggle />
            <Menu className="h-6 w-6" />
          </div>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>
              <span
                onClick={() => setOpen(false)}
                className="text-3xl sm:text-4xl md:text-5xl font-star-avenue relative inline-block tracking-wider"
              >
                SecureVoice+
                <span className="absolute -left-[20px] -bottom-1 w-[calc(100%+30px)] h-1.5 bg-gradient-to-r from-purple-400 to-blue-400"></span>
              </span>
            </DrawerTitle>
            <div className="flex flex-col items-center gap-4 p-6 text-lg">
              <div
                className={cn("flex flex-col items-center gap-4 lg:gap-8", {
                  hidden:
                    pathname.startsWith("/dashboard") ||
                    pathname.startsWith("/auth"),
                })}
              >
                <Link href="/#how-it-works" onClick={scrollToId}>
                  How it Works?
                </Link>
                <Link href="/#features" onClick={scrollToId}>
                  Features
                </Link>
                <Link href="/#team" onClick={scrollToId}>
                  Team
                </Link>
              </div>
            </div>
          </DrawerHeader>
          <DrawerFooter>
            <TryNowButton />
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
