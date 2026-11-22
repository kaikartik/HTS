import { strings } from "@/lib/khushaan/strings";
import styles from "./console.module.css";

export function IpecLogo({ compact = false }: { compact?: boolean }) {
  return (
    <span className={styles.logoLockup}>
      <svg
        aria-label={strings.brand.placeholderLogo}
        className={styles.logoMark}
        role="img"
        viewBox="0 0 48 48"
      >
        <path d="M24 3 42 10v12c0 11-7.5 18.5-18 23C13.5 40.5 6 33 6 22V10L24 3Z" fill="currentColor" />
        <path d="M14 30V18l10-6 10 6v12M18 30V20l6-4 6 4v10M21 30v-6h6v6" fill="none" stroke="white" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" />
      </svg>
      {!compact && (
        <span className={styles.brandText}>
          <strong className={styles.brandName}>{strings.brand.name}</strong>
          <span className={styles.brandTagline}>{strings.brand.tagline}</span>
        </span>
      )}
    </span>
  );
}