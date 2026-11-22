import type { InputHTMLAttributes, ReactNode, Ref } from "react";
import { themeClasses } from "../_lib/theme";

export type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "type"> & {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  inputRef?: Ref<HTMLInputElement>;
  labelAction?: ReactNode;
  trailingControl?: ReactNode;
  type?: InputHTMLAttributes<HTMLInputElement>["type"];
};

export default function TextField({
  id,
  label,
  error,
  hint,
  inputRef,
  labelAction,
  trailingControl,
  type = "text",
  className,
  ...inputProps
}: TextFieldProps) {
  const describedBy = [error && `${id}-error`, hint && `${id}-hint`].filter(Boolean).join(" ") || undefined;

  return (
    <div>
      <div className="mb-2 flex min-h-5 items-center justify-between gap-3">
        <label htmlFor={id} className="block text-sm font-medium text-[#0F1F33]">{label}</label>
        {labelAction}
      </div>
      <div className="relative">
        <input
          {...inputProps}
          ref={inputRef}
          id={id}
          type={type}
          aria-invalid={Boolean(error)}
          aria-describedby={describedBy}
          className={`${themeClasses.authInput} ${trailingControl ? "pr-12" : ""} ${className ?? ""}`}
        />
        {trailingControl && <div className="absolute inset-y-0 right-0 flex items-center pr-0.5">{trailingControl}</div>}
      </div>
      {error && (
        <p id={`${id}-error`} className="mt-1.5 flex items-start gap-1.5 text-sm text-[#a52d2a]" role="alert">
          <svg aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7">
            <circle cx="10" cy="10" r="7.5" />
            <path d="M10 6.5v4.25m0 2.75h.01" strokeLinecap="round" />
          </svg>
          <span>{error}</span>
        </p>
      )}
      {hint && <p id={`${id}-hint`} className="mt-1.5 text-xs leading-5 text-[#5B6B80]">{hint}</p>}
    </div>
  );
}