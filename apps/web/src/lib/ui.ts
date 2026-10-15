"use client";
import { create } from "zustand";

type Modal = "stats" | "help" | null;
interface Toast {
  id: number;
  text: string;
}
interface Ui {
  modal: Modal;
  drawer: boolean;
  toasts: Toast[];
  open(m: Modal): void;
  setDrawer(v: boolean): void;
  toast(text: string, ms?: number): void;
}

let nextId = 1;
export const useUi = create<Ui>((set) => ({
  modal: null,
  drawer: false,
  toasts: [],
  open: (modal) => set({ modal }),
  setDrawer: (drawer) => set({ drawer }),
  toast: (text, ms = 2000) => {
    const id = nextId++;
    set((s) => ({ toasts: [...s.toasts.filter((t) => t.text !== text), { id, text }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })), ms);
  },
}));
