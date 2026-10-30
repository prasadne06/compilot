import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Joins class names and resolves Tailwind conflicts so the last one wins
 * (e.g. a size's `px-6` overridden by `px-0`). Without this, which conflicting
 * utility applies depends on stylesheet order, which differs between dev and build.
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
