import Hero from "@/components/home/hero";
import Team from "@/components/home/team";
import React from "react";

export default function page() {
  return (
    <div>
      <Hero />
      <div id="how-it-works" className="min-h-screen">
        How It Works
      </div>
      <div id="features" className="min-h-screen">
        Features
      </div>
      <Team />
    </div>
  );
}
