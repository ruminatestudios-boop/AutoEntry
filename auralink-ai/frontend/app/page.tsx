"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { Hero } from "@/components/ui/animated-hero";
import BentoFourStepsSection from "@/components/ui/bento-four-steps-section";

const ScrollMorphHero = dynamic(
  () => import("@/components/ui/scroll-morph-hero").then((m) => m.default),
  { ssr: false }
);

/**
 * Home page with scroll-morph hero: scatter → line → circle → bottom arc.
 * SyncLyst messaging and CTAs are overlaid; scroll to explore the morph.
 */
export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 h-16 bg-white/70 backdrop-blur-xl border-b border-zinc-200/50">
        <div className="flex items-center gap-8">
          <Link
            href="#"
            className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            Features
          </Link>
          <Link
            href="#"
            className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            Pricing
          </Link>
        </div>
        <Link
          href="#"
          className="text-lg font-semibold tracking-tight text-zinc-900 uppercase"
        >
          SYNCLYST
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            Login
          </Link>
          <Link
            href="/dashboard"
            className="bg-zinc-900 text-white px-5 py-2 rounded-xl text-sm font-medium hover:bg-zinc-800 transition-colors"
          >
            Sign up
          </Link>
        </div>
      </header>

      <main className="flex-1 relative" style={{ minHeight: "100vh" }}>
        <Hero />
        <ScrollMorphHero />
      </main>

      <section id="how-it-works" className="bg-white">
        <BentoFourStepsSection />
      </section>

      <footer className="border-t border-zinc-200 bg-white py-6 px-6">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-6 text-sm text-zinc-500">
          <Link href="/dashboard" className="hover:text-zinc-900 transition-colors">
            Dashboard
          </Link>
          <Link href="/review" className="hover:text-zinc-900 transition-colors">
            Review & publish
          </Link>
          <a
            href="/landing.html?mode=scan"
            className="hover:text-zinc-900 transition-colors"
          >
            Photo → Shopify flow
          </a>
          <a
            href="/landing.html"
            className="hover:text-zinc-900 transition-colors"
          >
            Static landing
          </a>
          <a
            href="/stores-connect-shopify.html"
            className="hover:text-zinc-900 transition-colors"
          >
            Connect Shopify
          </a>
        </div>
      </footer>
    </div>
  );
}
