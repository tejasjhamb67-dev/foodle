"use client";
import { useEffect } from "react";
import { useStore } from "@/lib/store";

/** Applies theme, contrast and motion settings to <html>. The inline script in layout does the first paint. */
export function ThemeController() {
  const { theme, highContrast, motion } = useStore((s) => s.settings);
  useEffect(() => {
    const root = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      root.dataset.theme = theme === "system" ? (mq.matches ? "dark" : "light") : theme;
    };
    apply();
    mq.addEventListener("change", apply);
    if (highContrast) root.dataset.contrast = "high";
    else delete root.dataset.contrast;
    root.classList.toggle("reduce-motion", motion === "reduced");
    root.classList.toggle("allow-motion", motion === "full");
    const meta = document.querySelector('meta[name="theme-color"]');
    meta?.setAttribute("content", root.dataset.theme === "dark" ? "#121213" : "#ffffff");
    return () => mq.removeEventListener("change", apply);
  }, [theme, highContrast, motion]);
  return null;
}

/** Runs before hydration so the first paint uses the saved theme. */
export const themeScript = `(function(){try{var s=JSON.parse(localStorage.getItem('foodle')||'{}').state||{};var t=(s.settings&&s.settings.theme)||'system';var d=t==='dark'||(t==='system'&&matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.dataset.theme=d?'dark':'light';if(s.settings&&s.settings.highContrast)r.dataset.contrast='high';if(s.settings&&s.settings.motion==='reduced')r.classList.add('reduce-motion');}catch(e){}})();`;
