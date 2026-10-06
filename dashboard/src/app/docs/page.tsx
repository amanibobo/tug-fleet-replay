import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import Article from "@/components/docs/Article";
import { parseBuildLog } from "@/components/docs/parse";

export const metadata: Metadata = {
  title: "How I built Tugboard",
  description: "The research, the data, the rules, the energy model and the stack behind Tugboard, in order.",
};

/**
 * docs/BUILD_LOG.md is the source of truth for this page. The repo copy lives outside the dashboard, so a
 * copy under dashboard/content/ is read first (the Vercel build is rooted at dashboard/); the repo copy is the fallback.
 */
function loadBuildLog(): string {
  const local = path.join(process.cwd(), "content", "BUILD_LOG.md");
  if (fs.existsSync(local)) return fs.readFileSync(local, "utf8");
  // The repo copy, one level above the dashboard; outside the project, so Turbopack must not trace it.
  const repo = path.join(process.cwd(), "..", "docs", "BUILD_LOG.md");
  return fs.readFileSync(/*turbopackIgnore: true*/ repo, "utf8");
}

export default function DocsPage() {
  const doc = parseBuildLog(loadBuildLog());
  return <Article doc={doc} />;
}
