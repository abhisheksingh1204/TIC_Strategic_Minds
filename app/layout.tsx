// Layout for the entire application


import type { Metadata } from "next";
import { Geist_Mono, Manrope, Sora } from "next/font/google";
import "./globals.css";




const bodyFont = Manrope({
  variable: "--font-body",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const headingFont = Sora({
  variable: "--font-heading",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PowerFusion",
  description: "Calculate, simulate, and optimize electricity usage across your properties.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${bodyFont.variable} ${headingFont.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-[#040814] text-white">{children}</body>
    </html>
  );
}
