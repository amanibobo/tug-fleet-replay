"use client";

import { useEffect, useRef } from "react";
import styles from "./Paper.module.css";

/** The demo recording, an mp4 hosted on UploadThing. */
export const DEMO_SRC = "https://e8lo91gxtp.ufs.sh/f/wTLW5tuvHS7NBpHjtsDHf3T29XVDcqjxLmQOR1thkPr8i40z";

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
          {open && (
            <video
              className={styles.video}
              src={DEMO_SRC}
              poster="/poster.png"
              title="Tugboard demo"
              controls
              autoPlay
              playsInline
            />
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
