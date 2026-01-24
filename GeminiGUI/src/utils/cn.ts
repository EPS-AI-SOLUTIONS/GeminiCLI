import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility to merge Tailwind classes safely with clsx.
 * Handles conditional classes and conflicting Tailwind rules correctly.
 *
 * @param inputs - List of classes or conditional objects
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
