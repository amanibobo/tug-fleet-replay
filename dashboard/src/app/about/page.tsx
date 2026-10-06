import type { Metadata } from "next";
import Footer from "@/components/Footer";
import AboutContent from "@/components/about/AboutContent";
import styles from "./about.module.css";

export const metadata: Metadata = {
  title: "About · Tug fleet replay",
};

export default function AboutPage() {
  return (
    <main className={`page ${styles.page}`}>
      <AboutContent />
      <Footer className={styles.footer} />
    </main>
  );
}
