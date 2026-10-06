/**
 * Turns docs/BUILD_LOG.md into sections. The file is the source of truth for the text: paragraphs are
 * rendered as written, and the `[diagram: ...]` and `[svg-anim: ...]` markers become figures keyed by section.
 */

export type Block =
  | { type: "p"; text: string }
  | { type: "diagram"; brief: string }
  | { type: "anim"; brief: string };

export type Section = {
  slug: string;
  heading: string;
  blocks: Block[];
};

export type Doc = {
  title: string;
  sections: Section[];
};

export function slugify(heading: string): string {
  return heading
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function parseBuildLog(md: string): Doc {
  const lines = md.replace(/\r\n/g, "\n").split("\n");
  let title = "";
  const sections: Section[] = [];
  let current: Section | null = null;
  let para: string[] = [];

  const flush = () => {
    if (para.length && current) current.blocks.push({ type: "p", text: para.join(" ").replace(/\s+/g, " ").trim() });
    para = [];
  };

  for (const raw of lines) {
    const line = raw.trimEnd();
    if (line.startsWith("# ")) {
      title = line.slice(2).trim();
      continue;
    }
    if (line.startsWith("## ")) {
      flush();
      const heading = line.slice(3).trim();
      current = { slug: slugify(heading), heading, blocks: [] };
      sections.push(current);
      continue;
    }
    // The leading blockquote is a note to the renderer, not part of the article.
    if (line.startsWith(">") || !current) continue;
    const marker = /^\[(diagram|svg-anim):\s*(.*)\]$/.exec(line.trim());
    if (marker) {
      flush();
      current.blocks.push({ type: marker[1] === "diagram" ? "diagram" : "anim", brief: marker[2] });
      continue;
    }
    if (line.trim() === "") {
      flush();
      continue;
    }
    para.push(line.trim());
  }
  flush();
  return { title, sections };
}
