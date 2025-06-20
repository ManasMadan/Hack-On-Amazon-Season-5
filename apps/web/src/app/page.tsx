import Hero from "@/components/hero";
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
      <div id="team" className="min-h-screen">
        Team
      </div>
    </div>
  );
}
