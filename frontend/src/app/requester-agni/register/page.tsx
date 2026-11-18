"use client";

import { useState, type FormEvent } from "react";
import AuthLayout from "../_components/AuthLayout";
import { register } from "../_lib/requesterApi";
import { themeClasses } from "../_lib/theme";

type FormErrors = {
  name?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

const inputClassName = "min-h-12 w-full rounded-md border border-[#D9E2EF] bg-white px-3.5 text-base text-[#0F1F33] outline-none transition placeholder:text-[#5B6B80] hover:border-[#00448E]/50 focus-visible:border-[#00448E] focus-visible:ring-2 focus-visible:ring-[#00448E]/25 aria-invalid:border-[#b33b38] aria-invalid:focus-visible:ring-[#b33b38]/20";

export default function RequesterRegisterPage() {
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
    if (Object.keys(nextErrors).length > 0) return;

    setIsLoading(true);
    try {
      await register({ name: normalizedName, email: normalizedEmail, password });
      setIsRegistered(true);
    } finally {
      setIsLoading(false);
    }
  }

  if (isRegistered) {
    return (
      <main className={`min-h-screen ${themeClasses.page} sm:flex sm:items-center sm:justify-center sm:p-8`}>
        <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col bg-[#FFFFFF] shadow-[0_24px_80px_rgba(15,31,51,0.12)] sm:min-h-0 sm:flex-row sm:overflow-hidden sm:rounded-[10px]">
          <AuthLayout />
          <section className="flex flex-1 items-center px-6 py-10 sm:px-12 sm:py-14 lg:px-16">
            <div className="mx-auto w-full max-w-sm">
              <p className="text-sm font-medium text-[#00448E]">Almost there</p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0F1F33] sm:text-[1.8rem]">Check your email to verify your account</h2>
              <p className="mt-3 text-sm leading-6 text-[#5B6B80]">We sent a verification link to {email.trim()}.</p>
              <a href="/requester-agni/login" className={`mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-md px-4 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 ${themeClasses.primaryButton} ${themeClasses.focusOutline}`}>Back to sign in</a>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className={`min-h-screen ${themeClasses.page} sm:flex sm:items-center sm:justify-center sm:p-8`}>
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col bg-[#FFFFFF] shadow-[0_24px_80px_rgba(15,31,51,0.12)] sm:min-h-0 sm:flex-row sm:overflow-hidden sm:rounded-[10px]">
        <AuthLayout />
        <section className="flex flex-1 items-center px-6 py-10 sm:px-12 sm:py-14 lg:px-16">
          <div className="mx-auto w-full max-w-sm">
            <p className="text-sm font-medium text-[#00448E]">Get started</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0F1F33] sm:text-[1.8rem]">Create your account</h2>
            <p className="mt-2 text-sm leading-6 text-[#5B6B80]">Register to manage your requests and get support.</p>

            <form className="mt-7 space-y-4" noValidate onSubmit={handleSubmit}>
              <div>
                <label htmlFor="name" className="mb-2 block text-sm font-medium text-[#0F1F33]">Full name</label>
                <input id="name" name="name" type="text" autoComplete="name" value={name} onChange={(event) => { setName(event.target.value); if (errors.name) setErrors((current) => ({ ...current, name: undefined })); }} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "name-error" : undefined} className={inputClassName} placeholder="Your name" />
                {errors.name && <p id="name-error" className="mt-1.5 text-sm text-[#a52d2a]" role="alert">{errors.name}</p>}
              </div>

              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-[#0F1F33]">Email address</label>
                <input id="email" name="email" type="email" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); if (errors.email) setErrors((current) => ({ ...current, email: undefined })); }} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "email-error" : undefined} className={inputClassName} placeholder="you@example.com" />
                {errors.email && <p id="email-error" className="mt-1.5 text-sm text-[#a52d2a]" role="alert">{errors.email}</p>}
              </div>

              <div>
                <label htmlFor="password" className="mb-2 block text-sm font-medium text-[#0F1F33]">Password</label>
                <input id="password" name="password" type="password" autoComplete="new-password" value={password} onChange={(event) => { setPassword(event.target.value); if (errors.password) setErrors((current) => ({ ...current, password: undefined })); }} aria-invalid={Boolean(errors.password)} aria-describedby={errors.password ? "password-error" : undefined} className={inputClassName} placeholder="Create a secure password" />
                {errors.password && <p id="password-error" className="mt-1.5 text-sm text-[#a52d2a]" role="alert">{errors.password}</p>}
              </div>

              <div>
                <label htmlFor="confirm-password" className="mb-2 block text-sm font-medium text-[#0F1F33]">Confirm password</label>
                <input id="confirm-password" name="confirm-password" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); if (errors.confirmPassword) setErrors((current) => ({ ...current, confirmPassword: undefined })); }} aria-invalid={Boolean(errors.confirmPassword)} aria-describedby={errors.confirmPassword ? "confirm-password-error" : undefined} className={inputClassName} placeholder="Re-enter your password" />
                {errors.confirmPassword && <p id="confirm-password-error" className="mt-1.5 text-sm text-[#a52d2a]" role="alert">{errors.confirmPassword}</p>}
              </div>

              <button type="submit" disabled={isLoading} className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 ${themeClasses.primaryButton} ${themeClasses.focusOutline} disabled:cursor-wait disabled:bg-[#5B6B80]`}>
                {isLoading && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                {isLoading ? "Creating account..." : "Create account"}
              </button>
            </form>

            <p className="mt-6 text-center text-sm text-[#5B6B80]">
              Already have an account?{" "}
              <a href="/requester-agni/login" className="font-semibold text-[#00448E] underline decoration-transparent underline-offset-4 hover:decoration-current focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E]">Sign in</a>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}