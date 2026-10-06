"use client";

import { useEffect, useState } from "react";
import styles from "./Docs.module.css";

type Item = { slug: string; heading: string };

/** The sticky table of contents; the active link follows the section nearest the top of the viewport. */
export default function Toc({ items }: { items: Item[] }) {
  const [active, setActive] = useState(items[0]?.slug ?? "");

  // keep the active link visible inside the contents column as the reader scrolls
  useEffect(() => {
    const link = document.querySelector<HTMLElement>(`[data-toc="${active}"]`);
    link?.scrollIntoView({ block: "nearest" });
  }, [active]);

  useEffect(() => {
    const sections = items.map((i) => document.getElementById(i.slug)).filter((el): el is HTMLElement => el !== null);
    if (!sections.length) return;
    const pick = () => {
      const line = 120;
      let current = sections[0].id;
      for (const el of sections) {
        if (el.getBoundingClientRect().top <= line) current = el.id;
      }
      setActive(current);
    };
    pick();
    window.addEventListener("scroll", pick, { passive: true });
    window.addEventListener("resize", pick);
    return () => {
      window.removeEventListener("scroll", pick);
      window.removeEventListener("resize", pick);
    };
  }, [items]);

  return (
    <nav className={styles.toc} aria-label="Sections">
      <p className={styles.tocLabel}>Contents</p>
      <ol className={styles.tocList}>
        {items.map((item) => (
          <li key={item.slug}>
            <a
              href={`#${item.slug}`}
              className={styles.tocLink}
              aria-current={active === item.slug ? "true" : undefined}
              data-toc={item.slug}
            >
              {item.heading}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
