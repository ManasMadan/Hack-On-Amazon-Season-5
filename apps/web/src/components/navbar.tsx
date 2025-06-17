import React from "react";

export default function Navbar() {
  return (
    <div className="font-lemon-mocktail px-16 py-8 flex justify-between">
      <div className="text-6xl">SecureVoice+</div>
      <nav className="flex gap-8 text-2xl items-center">
        <div>How it Works ?</div>
        <div>Features</div>
        <div>Team</div>
        <div className="bg-primary px-4 py-2 rounded-2xl">Try Now</div>
        <div></div>
      </nav>
    </div>
  );
}
