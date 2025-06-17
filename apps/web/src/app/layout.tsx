import "./globals.css";
import ThemeProvider from "@/components/theme-provider";
import { CustomTRPCProvider } from "@/utils/trpc-provider";

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
          <CustomTRPCProvider>{children}</CustomTRPCProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
