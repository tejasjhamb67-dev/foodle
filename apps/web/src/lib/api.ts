"use client";
import type { Edition, GuessOption, GuessResult, GuessRow, Mode, PuzzleInfo } from "@foodle/game";
import { accessToken } from "./supabase";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await accessToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body) headers.set("Content-Type", "application/json");
  let res: Response;
  try {
    res = await fetch(path, { ...init, headers });
  } catch {
    throw new ApiError(0, "offline", "You're offline. Your board is saved.");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, data?.error?.code ?? "error", data?.error?.message ?? "Something went wrong");
  return data as T;
}

export const api = {
  puzzle: (mode: Mode, edition: Edition, number: number, daily: boolean) =>
    call<PuzzleInfo>(`/api/puzzle?mode=${mode}&edition=${edition}&number=${number}${daily ? "&daily=1" : ""}`),
  guess: (mode: Mode, edition: Edition, number: number, guesses: string[], daily: boolean) =>
    call<GuessResult & { rows: GuessRow[] }>(`/api/guess`, {
      method: "POST",
      body: JSON.stringify({ mode, edition, number, guesses, daily }),
    }),
  options: (mode: Mode, edition: Edition, number: number, guesses: string[], daily: boolean) =>
    call<{ options: GuessOption[] }>(`/api/options`, { method: "POST", body: JSON.stringify({ mode, edition, number, guesses, daily }) }),
  guessList: (mode: Mode, edition: Edition) =>
    call<{ version: string; options: GuessOption[] }>(`/api/guess-list?mode=${mode}&edition=${edition}`),
  get: <T>(path: string) => call<T>(path),
  post: <T>(path: string, body: unknown) => call<T>(path, { method: "POST", body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => call<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(path: string, body: unknown) => call<T>(path, { method: "DELETE", body: JSON.stringify(body) }),
};
