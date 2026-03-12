"use client";

import React, {
  ComponentPropsWithoutRef,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AnimatePresence, motion, MotionProps } from "motion/react";
import { cn } from "@/lib/utils";

export function AnimatedListItem({ children }: { children: React.ReactNode }) {
  const animations: MotionProps = {
    initial: { scale: 0, opacity: 0 },
    animate: { scale: 1, opacity: 1, originY: 0 },
    exit: { scale: 0, opacity: 0 },
    transition: { type: "spring", stiffness: 350, damping: 40 },
  };

  return (
    <motion.div {...animations} layout className="mx-auto w-full">
      {children}
    </motion.div>
  );
}

export interface AnimatedListProps extends ComponentPropsWithoutRef<"div"> {
  children: React.ReactNode;
  delay?: number;
}

const AnimatedList = React.memo(
  ({ children, className, delay = 1000, ...props }: AnimatedListProps) => {
    const [index, setIndex] = useState(0);
    const childrenArray = useMemo(
      () => React.Children.toArray(children),
      [children]
    );

    useEffect(() => {
      if (index < childrenArray.length - 1) {
        const timeout = setTimeout(() => {
          setIndex((prevIndex) => (prevIndex + 1) % childrenArray.length);
        }, delay);

        return () => clearTimeout(timeout);
      }
    }, [index, delay, childrenArray.length]);

    const itemsToShow = useMemo(() => {
      const result = childrenArray.slice(0, index + 1).reverse();
      return result;
    }, [index, childrenArray]);

    return (
      <div
        className={cn("flex flex-col items-center gap-4", className)}
        {...props}
      >
        <AnimatePresence>
          {itemsToShow.map((item) => (
            <AnimatedListItem key={(item as React.ReactElement).key}>
              {item}
            </AnimatedListItem>
          ))}
        </AnimatePresence>
      </div>
    );
  }
);
AnimatedList.displayName = "AnimatedList";

/* ---------- Comparison / workflow relevant list ---------- */
interface ComparisonStep {
  from: string;
  to: string;
  label?: string;
}

const COMPARISON_STEPS: ComparisonStep[] = [
  { from: "Data Entry 20m", to: "Scan 1s", label: "Photo to draft" },
  { from: "SEO Research 10m", to: "AI 1.5s", label: "Title & tags" },
  { from: "Image Prep 5m", to: "Sync 0.5s", label: "Push to store" },
  { from: "35 mins", to: "3 secs", label: "Total time" },
];

const ComparisonNotification = ({ from, to, label }: ComparisonStep) => (
  <div
    className={cn(
      "relative mx-auto min-h-fit w-full cursor-pointer overflow-hidden rounded-2xl p-4",
      "transition-all duration-200 ease-in-out hover:scale-[1.02]",
      "bg-white border border-zinc-200 shadow-sm"
    )}
  >
    <div className="flex items-center gap-3">
      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-zinc-100 border border-zinc-200 flex items-center justify-center">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-zinc-600"
        >
          <path d="M13 17h8M13 12h8M7 17h.01M7 12h.01" />
          <path d="M3 6h18v12H3z" />
        </svg>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-zinc-900 truncate">
          <span className="text-zinc-400 line-through">{from}</span>
          <span className="mx-1.5 text-zinc-300">→</span>
          <span className="text-zinc-900">{to}</span>
        </p>
        {label && (
          <p className="text-xs font-normal text-zinc-500 truncate mt-0.5">
            {label}
          </p>
        )}
      </div>
    </div>
  </div>
);

/* ---------- Original notification list (for demo) ---------- */
interface Item {
  avatar: string;
  title: string;
  subtitle: string;
}

const MESSAGES: Item[] = [
  {
    avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop",
    title: "Roman Joined the Team!",
    subtitle: "Congratulate him",
  },
  {
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop",
    title: "New message",
    subtitle: "Salma sent you new message",
  },
  {
    avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop",
    title: "Bianca sent payment",
    subtitle: "Check your earnings",
  },
  {
    avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop",
    title: "Jolly completed tasks",
    subtitle: "Assign her new tasks",
  },
  {
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop",
    title: "John received payment",
    subtitle: "$230 deducted from account",
  },
];

const NOTIFICATIONS_LIST = Array.from({ length: 2 }, () => MESSAGES).flat();

const Notification = ({ avatar, title, subtitle }: Item) => (
  <div
    className={cn(
      "relative mx-auto min-h-fit w-full cursor-pointer overflow-hidden rounded-2xl p-4",
      "transition-all duration-200 ease-in-out hover:scale-[1.02]",
      "bg-white border border-zinc-200 shadow-sm"
    )}
  >
    <div className="flex items-center">
      <span className="flex-shrink-0 relative">
        <img
          src={avatar}
          width={45}
          height={45}
          alt=""
          className="rounded-full object-cover"
        />
      </span>
      <div className="ps-4 min-w-0">
        <h5 className="text-sm font-semibold text-zinc-900 mb-1 truncate">
          {title}
        </h5>
        <p className="text-xs font-normal text-zinc-500 truncate">{subtitle}</p>
      </div>
    </div>
  </div>
);

/* ---------- Demos ---------- */

/** Animated list with comparison steps (Manual → SyncLyst AI). Use in comparison / pricing sections. */
export function AnimatedComparisonListDemo() {
  return (
    <div className="relative h-80 flex items-center w-full flex-col overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4">
      <p className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-3 w-full text-center">
        Improvement
      </p>
      <AnimatedList delay={1200} className="flex-1 w-full max-w-sm">
        {COMPARISON_STEPS.map((step, idx) => (
          <ComparisonNotification {...step} key={idx} />
        ))}
      </AnimatedList>
      <div className="from-zinc-50/50 pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t" />
    </div>
  );
}

/** Original animated list with notification-style items. */
export default function AnimatedListDemo() {
  return (
    <div className="relative h-96 flex items-center w-full flex-col overflow-hidden p-2">
      <AnimatedList>
        {NOTIFICATIONS_LIST.map((item, idx) => (
          <Notification {...item} key={idx} />
        ))}
      </AnimatedList>
      <div className="from-background pointer-events-none absolute inset-x-0 bottom-0 h-1/4 bg-gradient-to-t" />
    </div>
  );
}
