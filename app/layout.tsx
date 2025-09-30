import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SupabaseAuthProvider } from "@/lib/supabaseAuthProvider";
import SkillSwapAIAssistant from "@/app/components/SkillSwapAIAssistant";
import HeaderWrapper from "@/app/components/HeaderWrapper";
import { UiLoaderProvider } from "@/app/components/UiLoaderProvider";

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
    <html lang="en" data-scroll-behavior="smooth" className={`${primaryFont.className} scroll-smooth`}>
      <body className="antialiased bg-white text-slate-800">
        <UiLoaderProvider>
          <SupabaseAuthProvider>
            <HeaderWrapper />
            <main className="min-h-screen">{children}</main>
            {/* Global Assistant (fixed) */}
            <div className="fixed bottom-4 right-4 z-50">
              <SkillSwapAIAssistant />
            </div>
          </SupabaseAuthProvider>
        </UiLoaderProvider>
      </body>
    </html>
  );
}