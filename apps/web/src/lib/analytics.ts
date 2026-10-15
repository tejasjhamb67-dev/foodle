"use client";
/**
 * Analytics events from spec 13.8. Wire a provider by setting window.foodleAnalytics;
 * in development events are logged to the console.
 */
type Props = Record<string, string | number | boolean | undefined>;
declare global {
  interface Window {
    foodleAnalytics?: (event: string, props: Props) => void;
  }
}
export function track(event: string, props: Props = {}) {
  if (typeof window === "undefined") return;
  try {
    window.foodleAnalytics?.(event, props);
    if (process.env.NODE_ENV === "development") console.debug("[track]", event, props);
  } catch {
    /* never let analytics break play */
  }
}
