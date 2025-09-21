"use client";

import { Icon } from "@iconify/react";
import Link from "next/link";
import { useState } from "react";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccess(null);
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/newsletter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to subscribe");
      setSuccess("Thanks for subscribing! We'll be in touch.");
      setEmail("");
    } catch (err: any) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <footer className="mt-20 border-t border-slate-200/70 bg-white/70 backdrop-blur">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <Link
              href="/"
              aria-label="Go to home"
              className="mb-3 flex items-center gap-2 group"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-blue-500 to-orange-400 text-white">
              
              </div>
              <span className="text-base font-medium tracking-tight text-slate-800 group-hover:opacity-90">
                Skill Swap
              </span>
            </Link>
            <p className="text-sm text-slate-600">Teach and learn from real people through quick, friendly sessions.</p>
          </div>

          <div>
            <h4 className="text-sm font-medium text-slate-800">Company</h4>
            <ul className="mt-3 space-y-2 text-sm text-slate-600">
              <li><Link href="#about" className="hover:text-slate-900">About Us</Link></li>
              <li><Link href="#contact" className="hover:text-slate-900">Contact</Link></li>
              <li><Link href="#privacy" className="hover:text-slate-900">Privacy Policy</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-medium text-slate-800">Follow</h4>
            <div className="mt-3 flex gap-3">
              <a href="#" aria-label="Twitter" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"><Icon icon="mdi:twitter" width={18} /></a>
              <a href="#" aria-label="Facebook" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"><Icon icon="ic:baseline-facebook" width={18} /></a>
              <a href="#" aria-label="Instagram" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-600 hover:bg-slate-50"><Icon icon="mdi:instagram" width={18} /></a>
            </div>
          </div>

          <div>
            <h4 className="text-sm font-medium text-slate-800">Newsletter</h4>
            <form className="mt-3 flex overflow-hidden rounded-xl border border-slate-200" onSubmit={onSubmit}>
              <input
                suppressHydrationWarning
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full px-3 py-2 text-sm outline-none"
              />
              <button
                suppressHydrationWarning
                type="submit"
                disabled={submitting}
                className="bg-gradient-to-r from-blue-600 to-orange-500 px-4 text-sm text-white disabled:opacity-60"
              >
                {submitting ? "Joining..." : "Join"}
              </button>
            </form>
            {success && (
              <p className="mt-2 text-xs text-green-700">{success}</p>
            )}
            {error && (
              <p className="mt-2 text-xs text-red-700">{error}</p>
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-col items-start justify-between gap-3 border-t border-slate-100 pt-6 text-xs text-slate-500 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} Skill Swap. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="#privacy" className="hover:text-slate-700">Privacy Policy</Link>
            <Link href="#terms" className="hover:text-slate-700">Terms</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
