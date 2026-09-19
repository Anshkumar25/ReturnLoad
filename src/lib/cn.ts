/** Tiny clsx-style helper — no dependency needed for a handful of classes. */
export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}