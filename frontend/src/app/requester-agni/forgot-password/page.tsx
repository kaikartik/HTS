"use client";

import { useRef, useState, type FormEvent } from "react";
import AuthLayout from "../_components/AuthLayout";
import PrimaryButton from "../_components/PrimaryButton";
import TextField from "../_components/TextField";
import { forgotPassword } from "../_lib/requesterApi";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export default function ForgotPasswordPage() {
  const emailRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      setEmailError("Enter your email address.");
      emailRef.current?.focus();
      return;
    }
    if (!emailPattern.test(normalizedEmail)) {
      setEmailError("Enter a valid email address.");
      emailRef.current?.focus();
      return;
    }

    setEmailError("");
    setIsLoading(true);
    try {
      await forgotPassword(normalizedEmail);
      setIsSent(true);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthLayout>
      {isSent ? (
        <>
          <p className="text-sm font-medium text-[#00448E]">Reset link requested</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#0F1F33] md:text-[1.8rem]">If this email is registered, a reset link has been sent. The link is valid for 30 minutes.</h1>
          <a href="/requester-agni/login" className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#00448E] px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,68,142,0.16)] transition hover:bg-[#003470] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E]">Back to sign in</a>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-[#00448E]">Account recovery</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#0F1F33] md:text-[1.8rem]">Forgot your password?</h1>
          <p className="mt-2 text-sm leading-6 text-[#5B6B80]">Enter your email and we’ll send a link to reset your password.</p>

          <form className="mt-7 space-y-5 md:mt-8" noValidate onSubmit={handleSubmit}>
            <TextField
              id="email"
              name="email"
              label="Email address"
              type="email"
              inputMode="email"
              autoComplete="email"
              inputRef={emailRef}
              value={email}
              error={emailError}
              placeholder="you@example.com"
              required
              onChange={(event) => {
                setEmail(event.target.value);
                if (emailError) setEmailError("");
              }}
            />
            <PrimaryButton isLoading={isLoading}>Send reset link</PrimaryButton>
          </form>

          <p className="mt-6 text-center text-sm text-[#5B6B80]">
            <a href="/requester-agni/login" className="font-semibold text-[#00448E] underline decoration-transparent underline-offset-4 hover:decoration-current focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E]">Back to sign in</a>
          </p>
        </>
      )}
    </AuthLayout>
  );
}