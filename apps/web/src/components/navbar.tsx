"use client";
import React from "react";
import { Drawer, DrawerContent, DrawerTrigger } from "@repo/ui/drawer";
import { Menu } from "lucide-react";
import DarkModeToggle from "./dark-mode-toggle";
import Link from "next/link";

export default function Navbar() {
  return (
    <div className="px-4 sm:px-8 py-4 sm:py-8 flex justify-between items-center">
      <div className="font-star-avenue text-4xl lg:text-5xl">SecureVoice+</div>

      <nav className="hidden md:flex gap-4 lg:gap-8 text-lg lg:text-2xl items-center">
        <div>How it Works?</div>
        <div>Features</div>
        <div>Team</div>
        <DarkModeToggle />
        <Link
          href="/auth"
          className="font-lemon-mocktail bg-primary text-white px-3 lg:px-4 py-2 rounded-xl lg:rounded-2xl h-12 flex items-center justify-center cursor-pointer hover:bg-primary-600"
        >
          Try Now
        </Link>
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
            <Link
              href="/auth"
              className="font-lemon-mocktail bg-primary text-white px-4 py-2 rounded-xl flex items-center cursor-pointer hover:bg-primary-600"
            >
              Try Now
            </Link>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
}
