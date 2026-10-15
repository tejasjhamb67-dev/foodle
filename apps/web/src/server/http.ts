import "server-only";
import { NextResponse } from "next/server";

export const json = (data: unknown, init?: number | ResponseInit) =>
  NextResponse.json(data, typeof init === "number" ? { status: init } : init);

export const fail = (status: number, code: string, message: string) => json({ error: { code, message } }, status);
