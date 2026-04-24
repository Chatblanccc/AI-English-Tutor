import type { Metadata } from "next";
import type React from "react";

export const metadata: Metadata = {
  title: "Sign in | AURAE VOICE AI English Tutor",
  description:
    "Sign in to AURAE VOICE to continue AI English speaking practice, vocabulary review, and progress tracking.",
  alternates: {
    canonical: "/sign-in",
  },
  openGraph: {
    title: "Sign in | AURAE VOICE AI English Tutor",
    description:
      "Continue your AI English tutor sessions and personalized speaking plan.",
    url: "/sign-in",
    type: "website",
  },
};

export default function SignInLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
