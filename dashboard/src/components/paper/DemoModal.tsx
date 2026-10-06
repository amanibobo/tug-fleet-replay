"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import styles from "./Paper.module.css";

/** Fill in once the demo is on YouTube, e.g. "dQw4w9WgXcQ". Until then the modal shows the poster. */
export const YOUTUBE_ID: string | null = null;

interface Props {
  open: boolean;
  onClose: () => void;
}

/** A dialog over everything that plays the demo. Esc, the backdrop and the close control dismiss it. */
export default function DemoModal({ open, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    if (!open && el.open) el.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className={styles.modal}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label="Demo video"
    >
      <div className={styles.modalBody}>
        <div className={styles.player}>
          {open && YOUTUBE_ID ? (
            <iframe
              className={styles.frame}
              src={`https://www.youtube-nocookie.com/embed/${YOUTUBE_ID}?autoplay=1&rel=0&modestbranding=1`}
              title="Tugboard demo"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : (
            <>
              <Image src="/poster.png" alt="" width={1280} height={720} className={styles.frame} unoptimized />
              <span className={styles.modalNote}>Demo video coming soon</span>
            </>
          )}
        </div>
        <div className={styles.modalBar}>
          <span className={styles.modalTitle}>Tugboard demo</span>
          <button type="button" className={styles.modalClose} onClick={onClose} aria-label="Close">
            <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
              <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>
    </dialog>
  );
}

/** The YouTube mark: a rounded rectangle with a play triangle, drawn small and monochrome. */
export function YouTubeMark({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size * 0.7} viewBox="0 0 20 14" aria-hidden>
      <rect x="0.5" y="0.5" width="19" height="13" rx="3.5" fill="none" stroke="currentColor" />
      <path d="M8 4l5 3-5 3z" fill="currentColor" />
    </svg>
  );
}
