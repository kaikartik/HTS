import type { ButtonHTMLAttributes, ReactNode } from "react";
import { themeClasses } from "../_lib/theme";

type PrimaryButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
  isLoading?: boolean;
};

export default function PrimaryButton({ children, isLoading = false, disabled, ...buttonProps }: PrimaryButtonProps) {
  return (
    <button
      {...buttonProps}
      type={buttonProps.type ?? "submit"}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={`${themeClasses.primaryButton} ${buttonProps.className ?? ""}`}
    >
      {isLoading && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
      {isLoading ? "Please wait..." : children}
    </button>
  );
}