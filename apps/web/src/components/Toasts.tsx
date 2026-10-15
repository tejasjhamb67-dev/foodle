"use client";
import { useUi } from "@/lib/ui";

export function Toasts() {
  const toasts = useUi((s) => s.toasts);
  return (
    <div className="toast-wrap" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className="toast">
          {t.text}
        </div>
      ))}
    </div>
  );
}
