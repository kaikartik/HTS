"use client";

import { useRef, useState, type FormEvent } from "react";
import AuthLayout from "../_components/AuthLayout";
import PasswordInput from "../_components/PasswordInput";
import PrimaryButton from "../_components/PrimaryButton";
import TextField from "../_components/TextField";
import { register } from "../_lib/requesterApi";

type FormErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

export default function RequesterRegisterPage() {
  const nameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const confirmPasswordRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FormErrors = {};
    const normalizedName = name.trim();
    const normalizedEmail = email.trim();

    if (!normalizedName) {
      nextErrors.name = "Enter your full name.";
    } else if (normalizedName.length < 2) {
      nextErrors.name = "Your name must be at least 2 characters.";
    }

    if (!normalizedEmail) {
      nextErrors.email = "Enter your email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!password) {
      nextErrors.password = "Create a password.";
    } else if (password.length < 8 || !/[A-Z]/.test(password) || !/[a-z]/.test(password) || !/\d/.test(password)) {
      nextErrors.password = "Use at least 8 characters, including an uppercase letter, a lowercase letter, and a number.";
    }

    if (!confirmPassword) {
      nextErrors.confirmPassword = "Confirm your password.";
    } else if (confirmPassword !== password) {
      nextErrors.confirmPassword = "Passwords do not match.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      if (nextErrors.name) nameRef.current?.focus();
      else if (nextErrors.email) emailRef.current?.focus();
      else if (nextErrors.password) passwordRef.current?.focus();
      else confirmPasswordRef.current?.focus();
      return;
    }

    setIsLoading(true);
    try {
      await register({ name: normalizedName, email: normalizedEmail, password });
      setIsRegistered(true);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthLayout>
      {isRegistered ? (
        <>
          <p className="text-sm font-medium text-[#00448E]">Almost there</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#0F1F33] md:text-[1.8rem]">Check your email to verify your account</h1>
          <p className="mt-3 text-sm leading-6 text-[#5B6B80]">We sent a verification link to {email.trim()}.</p>
          <a href="/requester-agni/login" className="mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-[#00448E] px-4 text-sm font-semibold text-white shadow-[0_8px_18px_rgba(0,68,142,0.16)] transition hover:bg-[#003470] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E]">Back to sign in</a>
        </>
      ) : (
        <>
            <p className="text-sm font-medium text-[#00448E]">Get started</p>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#0F1F33] md:text-[1.8rem]">Create your account</h1>
            <p className="mt-2 text-sm leading-6 text-[#5B6B80]">Register to manage your requests and get support.</p>

            <form className="mt-6 space-y-4" noValidate onSubmit={handleSubmit}>
              <TextField id="name" name="name" label="Full name" autoComplete="name" inputRef={nameRef} value={name} error={errors.name} placeholder="Your name" required onChange={(event) => { setName(event.target.value); if (errors.name) setErrors((current) => ({ ...current, name: undefined })); }} />
              <TextField id="email" name="email" label="Email address" type="email" inputMode="email" autoComplete="email" inputRef={emailRef} value={email} error={errors.email} placeholder="you@example.com" required onChange={(event) => { setEmail(event.target.value); if (errors.email) setErrors((current) => ({ ...current, email: undefined })); }} />
              <PasswordInput id="password" name="password" label="Password" autoComplete="new-password" inputRef={passwordRef} value={password} error={errors.password} hint="At least 8 characters with uppercase, lowercase, and a number." placeholder="Create a secure password" required onChange={(event) => { setPassword(event.target.value); if (errors.password) setErrors((current) => ({ ...current, password: undefined })); }} />
              <PasswordInput id="confirm-password" name="confirm-password" label="Confirm password" autoComplete="new-password" inputRef={confirmPasswordRef} value={confirmPassword} error={errors.confirmPassword} placeholder="Re-enter your password" required onChange={(event) => { setConfirmPassword(event.target.value); if (errors.confirmPassword) setErrors((current) => ({ ...current, confirmPassword: undefined })); }} />
              <PrimaryButton isLoading={isLoading}>Create account</PrimaryButton>
            </form>

            <p className="mt-5 text-center text-sm text-[#5B6B80]">
              Already have an account?{" "}
              <a href="/requester-agni/login" className="font-semibold text-[#00448E] underline decoration-transparent underline-offset-4 hover:decoration-current focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E]">Sign in</a>
            </p>
        </>
      )}
    </AuthLayout>
  );
}