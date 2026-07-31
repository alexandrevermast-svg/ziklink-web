"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: React.ReactNode;
}

export default function Modal({ open, onClose, title, description, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 99999 }}>
      <div style={{ position: "absolute", inset: 0, background: "rgba(14, 11, 22, 0.8)" }} />
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        background: "var(--zik-card)", borderRadius: "12px", padding: "24px",
        width: "min(90vw, 640px)", maxHeight: "90vh", overflowY: "auto",
        boxShadow: "0 20px 60px rgba(0,0,0,0.5)", color: "var(--zik-text)",
      }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-xl font-bold text-zik-text">{title}</h2>
            {description && <p className="text-sm text-zik-muted mt-1">{description}</p>}
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-zik-card-hover text-zik-muted hover:text-zik-text transition-colors shrink-0 ml-4">
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
