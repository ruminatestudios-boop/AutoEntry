/**
 * Merge class names (Tailwind-friendly). For full clsx + tailwind-merge, install: clsx tailwind-merge
 */
export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(" ");
}
