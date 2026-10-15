"use client";
import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

/** Bottom sheet on phones, centred 480 px modal on desktop (spec 4). */
export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const startY = useRef<number | null>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        className="sheet"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onTouchStart={(e) => (startY.current = ref.current?.scrollTop === 0 ? e.touches[0].clientY : null)}
        onTouchEnd={(e) => {
          if (startY.current != null && e.changedTouches[0].clientY - startY.current > 80) onClose();
          startY.current = null;
        }}
      >
        <div className="handle" aria-hidden />
        <div className="sheet-head">
          <h2 className="t-title">{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <X size={20} strokeWidth={2} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
