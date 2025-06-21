import Features from "@/components/home/features";
import Hero from "@/components/home/hero";
import HowItWorks from "@/components/home/how-it-works";
import Team from "@/components/home/team";
import React from "react";

export default function page() {
  return (
    <div>
      <Hero />
      <div className="my-10">
        <Features />
        <HowItWorks />
      </div>
      <Team />
    </div>
  );
}
