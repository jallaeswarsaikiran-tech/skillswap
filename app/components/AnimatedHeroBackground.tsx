"use client";

import { motion } from "framer-motion";

export default function AnimatedHeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden">
      {/* Heavy background image */}
      <img
        src="https://images.unsplash.com/photo-1543241545-56d4d8451f60"
        alt="Luminous deep blue abstract background"
        className="absolute inset-0 h-full w-full object-cover"
        loading="eager"
        decoding="async"
      />

      {/* Dark gradient overlay for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/60 to-black/70" />

      {/* Animated glow orbs */}
      <motion.div
        aria-hidden
        className="absolute -top-24 -left-24 h-[46rem] w-[46rem] rounded-full bg-cyan-500/15 blur-3xl"
        initial={{ x: -80, y: -60, opacity: 0.8 }}
        animate={{ x: 40, y: 60, opacity: 1 }}
        transition={{ duration: 12, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="absolute -bottom-20 -right-24 h-[40rem] w-[40rem] rounded-full bg-blue-500/15 blur-3xl"
        initial={{ x: 60, y: 40, opacity: 0.8 }}
        animate={{ x: -40, y: -60, opacity: 1 }}
        transition={{ duration: 14, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
      />

      {/* Subtle scanline shimmer */}
      <motion.div
        aria-hidden
        className="absolute inset-x-0 top-1/3 h-56 bg-gradient-to-b from-transparent via-white/5 to-transparent"
        initial={{ opacity: 0.2, y: 0 }}
        animate={{ opacity: 0.35, y: 40 }}
        transition={{ duration: 10, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
      />
    </div>
  );
}
