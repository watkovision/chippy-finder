import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDistance(metres: number | null | undefined): string {
  if (metres == null) return "Unknown distance";
  if (metres < 1000) {
    return `${Math.round(metres)}m`
  }
  return `${(metres / 1000).toFixed(1)}km`
}
