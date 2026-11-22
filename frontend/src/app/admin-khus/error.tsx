"use client";

import { strings } from "@/lib/khushaan/strings";
import styles from "@/components/khushaan/console.module.css";

export default function AdminError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className={styles.emptyState}>
      <h2>{strings.common.errorTitle}</h2>
      <button className={styles.buttonPrimary} onClick={reset} type="button">{strings.common.retry}</button>
    </section>
  );
}