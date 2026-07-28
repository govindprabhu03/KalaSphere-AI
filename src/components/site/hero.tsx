"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: 0.08 * i, ease: [0.22, 1, 0.36, 1] as const },
  }),
};

export function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Decorative gradient blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 left-1/2 -z-10 size-[520px] -translate-x-1/2 rounded-full bg-gradient-to-br from-violet-500/25 to-pink-500/25 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-24 -z-10 size-[420px] rounded-full bg-gradient-to-br from-sky-400/20 to-violet-500/20 blur-3xl"
      />

      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:py-28">
        <motion.span
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/60 px-3 py-1 text-xs font-medium text-muted-foreground"
        >
          <span className="size-1.5 animate-pulse rounded-full bg-emerald-500" />
          In development · Sankhali, Goa
        </motion.span>

        <motion.h1
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="mt-6 font-heading text-4xl font-semibold tracking-tight text-balance sm:text-6xl"
        >
          One home for every{" "}
          <span className="bg-gradient-to-br from-violet-600 to-pink-600 bg-clip-text text-transparent">
            cultural experience
          </span>
          .
        </motion.h1>

        <motion.p
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="mx-auto mt-5 max-w-xl text-base text-muted-foreground text-pretty sm:text-lg"
        >
          Discover events and workshops, join cultural classes, track student
          growth, book venues, order from the canteen, and connect with artists —
          all in one place.
        </motion.p>

        <motion.div
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="mt-8 flex items-center justify-center gap-3"
        >
          <a href="#modules" className={cn(buttonVariants({ size: "lg" }), "h-11 px-6 text-base")}>
            Explore the platform
          </a>
          <Link
            href="/login"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "h-11 px-6 text-base")}
          >
            Log in
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
