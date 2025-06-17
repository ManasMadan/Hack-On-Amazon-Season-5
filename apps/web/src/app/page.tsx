import DarkModeToggle from "@/components/dark-mode-toggle";
import Navbar from "@/components/navbar";
import React from "react";

export default function page() {
  return (
    <div>
      <Navbar />
      <DarkModeToggle />
    </div>
  );
}
