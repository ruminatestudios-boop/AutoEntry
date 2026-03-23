"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BentoGridShowcase } from "@/components/ui/bento-product-features";
import { Camera, FileText, Upload, Send } from "lucide-react";

/* Step 1: Snap or upload (tall card) */
const SnapUploadCard = () => (
  <Card className="flex h-full flex-col border-zinc-200">
    <CardHeader>
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 border border-zinc-200">
        <Camera className="h-6 w-6 text-zinc-700" />
      </div>
      <CardTitle className="text-xl">Snap or upload</CardTitle>
      <CardDescription>
        Take a picture of your product or upload one from your device. One photo
        is enough to get started.
      </CardDescription>
    </CardHeader>
    <CardFooter className="mt-auto">
      <Button variant="outline" size="sm" asChild>
        <a href="/scan">
          <Camera className="mr-2 h-4 w-4" />
          Try scan
        </a>
      </Button>
    </CardFooter>
  </Card>
);

/* Step 2: Review draft */
const ReviewDraftCard = () => (
  <Card className="h-full border-zinc-200">
    <CardContent className="flex h-full flex-col justify-between p-6">
      <div>
        <CardTitle className="text-base font-medium flex items-center gap-2">
          <FileText className="h-4 w-4 text-zinc-600" />
          Review draft
        </CardTitle>
        <CardDescription>AI fills in title, description, category, and tags.</CardDescription>
      </div>
      <p className="text-xs text-zinc-500 mt-2">
        Check the result and edit anything before pushing.
      </p>
    </CardContent>
  </Card>
);

/* Stat: 1 minute */
const StatisticCard = () => (
  <Card className="relative h-full w-full overflow-hidden border-zinc-200">
    <div
      className="absolute inset-0 opacity-20"
      style={{
        backgroundImage: "radial-gradient(#71717a 1px, transparent 1px)",
        backgroundSize: "16px 16px",
      }}
    />
    <CardContent className="relative z-10 flex h-full items-center justify-center p-6">
      <span className="text-6xl md:text-8xl font-bold text-zinc-800/90">1m</span>
    </CardContent>
  </Card>
);

/* Step 3: Push to store */
const PushToStoreCard = () => (
  <Card className="h-full border-zinc-200">
    <CardContent className="flex h-full flex-col justify-between p-6">
      <div className="flex items-start justify-between">
        <div>
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Upload className="h-4 w-4 text-zinc-600" />
            Push to store
          </CardTitle>
          <CardDescription>Send the listing to your connected store as a draft.</CardDescription>
        </div>
        <Badge variant="outline" className="border-zinc-300 text-zinc-600 shrink-0">
          Draft
        </Badge>
      </div>
      <p className="text-xs text-zinc-500">It won’t go live until you say so.</p>
    </CardContent>
  </Card>
);

/* Step 4: Publish ready */
const PublishReadyCard = () => (
  <Card className="h-full border-zinc-200">
    <CardContent className="flex h-full flex-col justify-end p-6">
      <CardTitle className="text-base font-medium flex items-center gap-2">
        <Send className="h-4 w-4 text-zinc-600" />
        Publish ready
      </CardTitle>
      <CardDescription>
        In your store admin, review the draft, make final tweaks, then hit
        Publish. Ready for buyers.
      </CardDescription>
    </CardContent>
  </Card>
);

/* Shortcuts / Multi-store */
const ShortcutsCard = () => (
  <Card className="h-full border-zinc-200">
    <CardContent className="flex h-full flex-wrap items-center justify-between gap-4 p-6">
      <div>
        <CardTitle className="text-base font-medium">Multi-store sync</CardTitle>
        <CardDescription>
          Shopify, Etsy, eBay, TikTok Shop, Amazon—one draft, list everywhere.
        </CardDescription>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-zinc-200 bg-zinc-50 text-zinc-600 text-xs font-medium">
          +
        </div>
        <span className="text-zinc-400 text-sm">Connect</span>
      </div>
    </CardContent>
  </Card>
);

export default function BentoFourStepsSection() {
  return (
    <section className="w-full py-20 md:py-32 px-4 md:px-10 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="mb-10 md:mb-12 text-center">
          <h2 className="text-3xl md:text-5xl font-semibold tracking-tight text-zinc-900 mb-4">
            From photo to live in 4 steps
          </h2>
          <p className="text-zinc-500 text-lg max-w-xl mx-auto">
            Do this to get your products on your stores—no typing required.
          </p>
        </div>

        <BentoGridShowcase
          integration={<SnapUploadCard />}
          trackers={<ReviewDraftCard />}
          statistic={<StatisticCard />}
          focus={<PushToStoreCard />}
          productivity={<PublishReadyCard />}
          shortcuts={<ShortcutsCard />}
        />
      </div>
    </section>
  );
}
