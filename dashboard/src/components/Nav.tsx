"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./Nav.module.css";

const LINKS = [
  { href: "/", label: "Fleet" },
  { href: "/about", label: "About" },
] as const;

export default function Nav() {
  const path = usePathname();
  return (
    <header className={styles.nav}>
      <Link href="/" className={styles.wordmark}>
        Tug replay
      </Link>
      <nav className={styles.links} aria-label="Primary">
        {LINKS.map((l) => {
          const active = l.href === "/" ? path === "/" || path.startsWith("/tugs") : path.startsWith(l.href);
          return (
            <Link key={l.href} href={l.href} className={styles.link} data-active={active || undefined}>
              {l.label}
            </Link>
          );
        })}
        <a
          href="https://github.com/amanibobo/tug-fleet-replay"
          className={styles.link}
          target="_blank"
          rel="noreferrer"
          title="Source on GitHub"
        >
          GitHub
        </a>
      </nav>
    </header>
  );
}
