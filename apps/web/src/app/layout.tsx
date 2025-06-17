import "./globals.css";
import ThemeProvider from "@/components/theme-provider";
import { CustomTRPCProvider } from "@/utils/trpc-provider";
import { ReactLenis } from "lenis/react";
import Cursor from "@/components/cursor";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <CustomTRPCProvider>
            <ReactLenis root />
            <Cursor />

            {children}
          </CustomTRPCProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
