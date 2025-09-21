import { ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getRequiredEnv(name: string): string {
  const value = process.env[name] as string | undefined;
  if (!value) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}
