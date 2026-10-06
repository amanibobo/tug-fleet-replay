"use client";

import dynamic from "next/dynamic";
import { recordingUrl as resolveRecordingUrl } from "@/lib/env";
import { useCallback, useEffect, useState } from "react";
import styles from "./RerunInspector.module.css";

/** Loaded only when the slide-over opens; the viewer ships a large wasm bundle. */
const WebViewer = dynamic(() => import("@rerun-io/web-viewer-react"), {
  ssr: false,
  loading: () => <Skeleton />,
});

interface Props {
  open: boolean;
  onClose: () => void;
  recordingUrl: string | null;
  title: string;
}

type Availability = "checking" | "ok" | "missing";

export default function RerunInspector({ open, onClose, recordingUrl, title }: Props) {
  // `ready` is reset whenever the panel closes (adjusting state on a prop change, during render).
  const [ready, setReady] = useState(false);
  const [prevOpen, setPrevOpen] = useState(open);
  if (open !== prevOpen) {
    setPrevOpen(open);
    if (!open) setReady(false);
  }
  const [copied, setCopied] = useState(false);
  const [checked, setChecked] = useState<{ url: string; ok: boolean } | null>(null);

  // Only resolved while open, which can only happen on the client, so SSR output stays stable.
  const absUrl = open && recordingUrl ? resolveRecordingUrl(recordingUrl, window.location.origin) : null;
  const avail: Availability = checked && checked.url === absUrl ? (checked.ok ? "ok" : "missing") : "checking";
  const mounted = open;

  useEffect(() => {
    if (!open || !absUrl) return;
    const ctrl = new AbortController();
    fetch(absUrl, { method: "HEAD", signal: ctrl.signal })
      .then((r) => setChecked({ url: absUrl, ok: r.ok }))
      .catch(() => {
        if (!ctrl.signal.aborted) setChecked({ url: absUrl, ok: false });
      });
    return () => ctrl.abort();
  }, [open, absUrl]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const copy = useCallback(async () => {
    if (!absUrl) return;
    try {
      await navigator.clipboard.writeText(absUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      window.prompt("Recording link", absUrl);
    }
  }, [absUrl]);

  return (
    <>
      <div className={styles.backdrop} data-open={open || undefined} onClick={onClose} aria-hidden={!open} />
      <aside className={styles.panel} data-open={open || undefined} aria-hidden={!open} aria-label="Rerun inspector">
        <header className={styles.head}>
          <div className={styles.titles}>
            <span className="label">Rerun inspector</span>
            <span className="heading">{title}</span>
          </div>
          <div className={styles.actions}>
            <button type="button" className="btn btnSecondary" onClick={copy} disabled={!absUrl}>
              {copied ? "Copied" : "Copy recording link"}
            </button>
            <button type="button" className={styles.close} onClick={onClose} aria-label="Close inspector">
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden>
                <path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" />
              </svg>
            </button>
          </div>
        </header>

        <div className={styles.body}>
          {mounted && absUrl ? (
            avail === "missing" ? (
              <div className={styles.missing}>
                <p>Recording not available.</p>
                <p className={`mono ${styles.url}`}>{absUrl}</p>
                <p className="muted">
                  Recordings are written by the Python pipeline as .rrd files and served next to the data files.
                </p>
              </div>
            ) : avail === "checking" ? (
              <Skeleton />
            ) : (
              <>
                {!ready ? <Skeleton /> : null}
                <div className={styles.viewer} data-ready={ready || undefined}>
                  <WebViewer
                    rrd={absUrl}
                    width="100%"
                    height="100%"
                    hide_welcome_screen
                    theme="dark"
                    onReady={() => setReady(true)}
                  />
                </div>
              </>
            )
          ) : null}
        </div>
      </aside>
    </>
  );
}

function Skeleton() {
  return (
    <div className={styles.skeleton} role="status">
      <div className={styles.skelBar} />
      <span className="muted">Loading inspector (about 25 MB)</span>
    </div>
  );
}
