"use client";

import { motion } from "motion/react";
import { MoveRight, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";

function Hero() {
  return (
    <div className="w-full bg-white">
      <div className="container mx-auto">
        <div className="flex gap-8 py-20 lg:py-40 items-center justify-center flex-col">
          <div>
            <Button variant="secondary" size="sm" className="gap-2" asChild>
              <Link href="#how-it-works">
                See how it works <MoveRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
          <div className="flex gap-4 flex-col">
            <h1 className="text-5xl md:text-7xl max-w-2xl tracking-tighter text-center font-regular">
              <motion.span
                className="font-bold text-zinc-900"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                Stop listing manually
              </motion.span>
            </h1>

            <motion.p
              className="text-lg md:text-xl leading-relaxed tracking-tight text-zinc-600 max-w-2xl text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              Upload a single product photo. SyncLyst turns it into a full eBay
              listing—title, description, and details—so you can list faster.
            </motion.p>
          </div>
          <div className="flex flex-row gap-3 flex-wrap justify-center">
            <Button size="lg" className="gap-2" variant="outline" asChild>
              <Link href="/review">
                Start listing <Upload className="w-4 h-4" />
              </Link>
            </Button>
            <Button size="lg" className="gap-2" asChild>
              <Link href="/dashboard">
                Sign up <MoveRight className="w-4 h-4" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export { Hero };
