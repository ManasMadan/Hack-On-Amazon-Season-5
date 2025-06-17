import React from "react";
import { prisma } from "@repo/prisma";
import { Button } from "@repo/ui/button";
import { ModeToggle } from "@/components/dark-mode-toggle";

export default function page() {
  return (
    <div>
      {prisma}
      <Button>Click me</Button>

      <ModeToggle />
    </div>
  );
}
