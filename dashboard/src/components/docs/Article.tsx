import type { ReactNode } from "react";
import Link from "next/link";
import { GITHUB_URL } from "@/components/Nav";
import type { Doc } from "./parse";
import { formatInline } from "./inline";
import { Figure } from "./rough";
import { FIGURES } from "./figures";
import HeaderShip from "./HeaderShip";
import Toc from "./Toc";
import styles from "./Docs.module.css";

/** Pull quotes for the decisions that mattered, placed after a paragraph of their section. Verbatim from the text. */
const QUOTES: Record<string, { after: number; text: string }> = {
  "labeling-what-a-tug-is-doing": {
    after: 0,
    text: "Slow and within 60 m of a ship's hull is assist, up to 8 knots when the ship is moving; slow and alone is idle; fast is transit.",
  },
  "the-energy-model-with-its-estimates-on-the-table": {
    after: 0,
    text: "Simulated continuously through the week, because charging happens overnight and the state of charge on Thursday depends on Wednesday.",
  },
  "design-and-getting-it-wrong-a-few-times": {
    after: 0,
    text: "It looked like every other AI dashboard.",
  },
};

export default function Article({ doc }: { doc: Doc }) {
  let figureIndex = 0;
  return (
    <main className={styles.page} data-landing>
      <div className={styles.wrap}>
        <Toc items={doc.sections.map(({ slug, heading }) => ({ slug, heading }))} />
        <article className={styles.article}>
          <header>
            <h1 className={styles.title}>{doc.title}</h1>
            <HeaderShip />
          </header>

          {doc.sections.map((section) => {
            const quote = QUOTES[section.slug];
            let paragraph = -1;
            const body: ReactNode[] = [];
            section.blocks.forEach((block, i) => {
              if (block.type === "p") {
                paragraph += 1;
                body.push(
                  <p key={i} className={styles.p}>
                    {formatInline(block.text, styles.mono)}
                  </p>,
                );
                if (quote && quote.after === paragraph) {
                  body.push(
                    <blockquote key={`q${i}`} className={styles.quote}>
                      {quote.text}
                    </blockquote>,
                  );
                }
              } else if (block.type === "diagram") {
                const def = FIGURES[section.slug];
                if (def) {
                  body.push(<Figure key={i} def={def} index={figureIndex} />);
                  figureIndex += 1;
                }
              }
              // "anim" markers in the build log are ignored: the page keeps the drawn figures only
            });
            return (
              <section key={section.slug} id={section.slug} className={styles.section}>
                <h2 className={styles.h2}>{section.heading}</h2>
                {body}
              </section>
            );
          })}

          <footer className={styles.end}>
            <Link href="/">← the landing</Link>
            <Link href="/app">open the console</Link>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer">
              source on github
            </a>
          </footer>
        </article>
      </div>
    </main>
  );
}
