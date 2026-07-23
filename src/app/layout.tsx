import { Inter } from "next/font/google";
import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Digital Mart — Trust-First Digital Marketplace", template: "%s | Digital Mart" },
  description: "Buy and sell digital goods, courses, and career mentorship — escrow-backed, with personalized career-path guidance.",
  keywords: ["marketplace", "digital goods", "courses", "escrow", "career mentorship"],
  authors: [{ name: "Digital Mart" }],
  openGraph: {
    type: "website",
    locale: "en_IN",
    title: "Digital Mart — Trust-First Digital Marketplace",
    description: "Escrow-backed marketplace for software keys, subscriptions, courses, and career mentorship.",
    siteName: "Digital Mart",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
};

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className="font-sans antialiased bg-gray-50 text-gray-900">
        {children}
      </body>
    </html>
  );
}
