import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { CosmicAnalyticsProvider } from "cosmic-analytics";
import { SupabaseAuthProvider } from "@/lib/supabaseAuthProvider";

const primaryFont = Inter({
  weight: ["300", "400", "500", "600", "700"],
  subsets: ["latin"],
});

// Change the title and description to your own.
export const metadata: Metadata = {
  title: "SkillSwap - Learn & Teach Skills",
  description: "A peer-to-peer micro-learning platform where users can teach or learn skills through short sessions",
};

export default function RootLayout({
  children,
  
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${primaryFont.className} scroll-smooth`}>
      <body className="antialiased bg-white text-slate-800">
        <CosmicAnalyticsProvider>
          <SupabaseAuthProvider>
            <main className="min-h-screen">{children}</main>
          </SupabaseAuthProvider>
        </CosmicAnalyticsProvider>
      </body>
    </html>
  );
}