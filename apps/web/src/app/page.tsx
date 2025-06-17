import React from "react";
import { Button } from "@repo/ui/button";
import { ModeToggle } from "@/components/dark-mode-toggle";
import { prisma } from "@repo/prisma";

export default async function page() {
  return (
    <div>
      <Button>Click me</Button>
      <ModeToggle />
    </div>
  );
}
