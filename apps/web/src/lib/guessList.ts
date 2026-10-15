"use client";
import { useEffect, useState } from "react";
import { indexOptions, type Edition, type Indexed, type Mode } from "@foodle/game";
import { api } from "./api";

const memo = new Map<string, Indexed[]>();

/** Guess list for a mode, cached on the device by version (spec 13.6). */
export function useGuessList(mode: Mode, edition: Edition, version?: string) {
  const key = `${mode}:${edition}`;
  const [list, setList] = useState<Indexed[] | null>(memo.get(key) ?? null);
  useEffect(() => {
    let cancelled = false;
    const storeKey = `foodle-gl:${key}`;
    try {
      const cached = JSON.parse(localStorage.getItem(storeKey) ?? "null");
      if (cached && (!version || cached.version === version)) {
        const idx = indexOptions(cached.options);
        memo.set(key, idx);
        setList(idx);
        if (version) return;
      }
    } catch {
      /* ignore */
    }
    if (!version && memo.has(key)) return;
    api
      .guessList(mode, edition)
      .then((gl) => {
        if (cancelled) return;
        try {
          localStorage.setItem(storeKey, JSON.stringify(gl));
        } catch {
          /* storage full or blocked */
        }
        const idx = indexOptions(gl.options);
        memo.set(key, idx);
        setList(idx);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [key, mode, edition, version]);
  return list;
}
