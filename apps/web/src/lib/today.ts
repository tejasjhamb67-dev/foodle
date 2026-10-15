"use client";
import { useEffect, useState } from "react";
import { localDate, msUntilLocalMidnight, puzzleNumber } from "@foodle/game";
import { LAUNCH_DATE } from "./config";

export function todayNumber() {
  return puzzleNumber(localDate(), LAUNCH_DATE);
}

/** Today's puzzle number in the player's local calendar; rolls over at local midnight. */
export function useToday(): number | null {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    setN(todayNumber());
    let t: ReturnType<typeof setTimeout>;
    const arm = () => {
      t = setTimeout(() => {
        setN(todayNumber());
        arm();
      }, msUntilLocalMidnight() + 500);
    };
    arm();
    return () => clearTimeout(t);
  }, []);
  return n;
}
