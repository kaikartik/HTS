"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import AuthLayout from "../_components/AuthLayout";
import PasswordInput from "../_components/PasswordInput";
import PrimaryButton from "../_components/PrimaryButton";
import { resetPassword } from "../_lib/requesterApi";

type FormErrors = {
  password?: string;
  confirmPassword?: string;
};

export default function ResetPasswordPage() {
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [requestError, setRequestError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isReset, setIsReset] = useState(false);

  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token")?.trim() ?? "");
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors: FormErrors = {};

    if (!password) {
      nextErrors.password = "Enter a new password.";
    } else if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      nextErrors.password = "Use at least 8 characters, including an uppercase letter, a lowercase letter, and a number.";
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = "Confirm your new password.";
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      if (nextErrors.password) passwordRef.current?.focus();
      else confirmPasswordRef.current?.focus();
      return;
    }
    if (!token) return;

    setRequestError("");
    setIsLoading(true);
    try {
      await resetPassword(token, password);
      setIsReset(true);
    } catch (error) {
      setRequestError(error instanceof Error ? error.message : "Unable to reset your password.");
    } finally {
      setIsLoading(false);
    }
  }

  const isInvalidToken = token === "" || token === "expired";

  return (
    <AuthLayout>
      {token === null ? (
        <p className="text-sm text-[#5B6B80]" role="status">Checking reset link...</p>
      ) : isInvalidToken ? (
        <>
          <p className="flex items-center gap-2 text-sm font-medium text-[#a52d2a]" role="alert">
            <svg aria-hidden="true" className="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7"><circle cx="10" cy="10" r="7.5" /><path d="M10 6.5v4.25m0 2.75h.01" strokeLinecap="round" /></svg>
            This reset link has expired or is invalid
          </p>
          <a href="/requester-agni/forgot-password" className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#00448E] px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,68,142,0.16)] transition hover:bg-[#003470] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E]">Request a new reset link</a>
        </>
      ) : isReset ? (
        <>
          <p className="text-sm font-medium text-[#00448E]">Your password has been reset</p>
          <a href="/requester-agni/login" className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#00448E] px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,68,142,0.16)] transition hover:bg-[#003470] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E]">Sign in</a>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-[#00448E]">Secure your account</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#0F1F33] md:text-[1.8rem]">Set a new password</h1>
          <p className="mt-2 text-sm leading-6 text-[#5B6B80]">Choose a strong password you haven’t used before.</p>

          {requestError && <p className="mt-4 flex items-center gap-2 text-sm text-[#a52d2a]" role="alert"><span aria-hidden="true">!</span>{requestError}</p>}

          <form className="mt-7 space-y-5 md:mt-8" noValidate onSubmit={handleSubmit}>
            <PasswordInput
              id="password"
              name="password"
              label="New password"
              autoComplete="new-password"
              inputRef={passwordRef}
              value={password}
              error={errors.password}
              hint="At least 8 characters with uppercase, lowercase, and a number."
              placeholder="Create a secure password"
              required
              onChange={(event) => {
                setPassword(event.target.value);
                if (errors.password) setErrors((current) => ({ ...current, password: undefined }));
              }}
            />
            <PasswordInput
              id="confirm-password"
              name="confirm-password"
              label="Confirm new password"
              autoComplete="new-password"
              inputRef={confirmPasswordRef}
              value={confirmPassword}
              error={errors.confirmPassword}
              placeholder="Re-enter your new password"
              required
              onChange={(event) => {
                setConfirmPassword(event.target.value);
                if (errors.confirmPassword) setErrors((current) => ({ ...current, confirmPassword: undefined }));
              }}
            />
            <PrimaryButton isLoading={isLoading}>Reset password</PrimaryButton>
          </form>
        </>
      )}
    </AuthLayout>
  );
}