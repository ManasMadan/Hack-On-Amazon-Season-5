import "./globals.css";
import ThemeProvider from "@/components/theme-provider";
import { CustomTRPCProvider } from "@/utils/trpc-provider";
import { ReactLenis } from "lenis/react";
import Cursor from "@/components/cursor";
import { Space_Mono } from "next/font/google";
import Navbar from "@/components/navbar";

const space_monos = Space_Mono({ weight: ["400", "700"], subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${space_monos.className} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <CustomTRPCProvider>
            <ReactLenis root />
            <Cursor />
            <Navbar />
            {children}
          </CustomTRPCProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
