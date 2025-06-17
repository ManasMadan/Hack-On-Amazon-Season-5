import React from "react";

export default function Hero() {
  return (
    <div className="my-8 mx-4">
      <div className="container mx-auto">
        <header className="text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold mb-4 sm:mb-6 leading-tight tracking-tight">
            Revolutionizing{" "}
            <span className="inline-block bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              digital payments
            </span>
            <span className="block">with SecureVoice+</span>
          </h1>
          <p className="text-lg sm:text-xl text-accent-foreground/50 dark:text-secondary/40 mb-6 sm:mb-8 max-w-2xl mx-auto leading-relaxed">
            A seamless, AI-driven platform offering voice biometric
            authentication, smart payment routing, and fraud-safe dispute
            resolution for users and merchants.
          </p>
        </header>
      </div>
    </div>
  );
}
