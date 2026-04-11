import type { Metadata } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/ThemeProvider";
import { SessionProvider } from "next-auth/react";

export const metadata: Metadata = {
  title: "AURAE VOICE — AI English Tutor",
  description: "Your personal AI-powered English speaking coach, powered by AURAE VOICE",
  icons: {
    icon: [{ url: "/aurae-voice-logo-v2.png", type: "image/png" }],
    apple: [{ url: "/aurae-voice-logo-v2.png", sizes: "180x180", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">
        <SessionProvider>
          <ThemeProvider>{children}</ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
