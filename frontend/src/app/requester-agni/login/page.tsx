"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import AuthLayout from "../_components/AuthLayout";
import { login } from "../_lib/requesterApi";
import { themeClasses } from "../_lib/theme";

type FormErrors = {
  email?: string;
  password?: string;
};

export default function RequesterLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextErrors: FormErrors = {};
    const normalizedEmail = email.trim();

    if (!normalizedEmail) {
      nextErrors.email = "Enter your email address.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      nextErrors.email = "Enter a valid email address.";
    }

    if (!password) {
      nextErrors.password = "Enter your password.";
    } else if (password.length < 8) {
      nextErrors.password = "Your password must be at least 8 characters.";
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setIsLoading(true);
    try {
      await login({ email: normalizedEmail, password });
      router.push("/requester-agni/dashboard");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className={`min-h-screen ${themeClasses.page} sm:flex sm:items-center sm:justify-center sm:p-8`}>
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col bg-[#FFFFFF] shadow-[0_24px_80px_rgba(15,31,51,0.12)] sm:min-h-0 sm:flex-row sm:overflow-hidden sm:rounded-[10px]">
        <AuthLayout />

        <section className="flex flex-1 items-center px-6 py-10 sm:px-12 sm:py-14 lg:px-16">
          <div className="mx-auto w-full max-w-sm">
            <p className="text-sm font-medium text-[#00448E]">Welcome back</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#0F1F33] sm:text-[1.8rem]">Sign in to your account</h2>
            <p className="mt-2 text-sm leading-6 text-[#5B6B80]">Use your email and password to continue.</p>

            <form className="mt-8 space-y-5" noValidate onSubmit={handleSubmit}>
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-[#0F1F33]">Email address</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => {
                    setEmail(event.target.value);
                    if (errors.email) setErrors((current) => ({ ...current, email: undefined }));
                  }}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? "email-error" : undefined}
                  className="min-h-12 w-full rounded-md border border-[#D9E2EF] bg-white px-3.5 text-base text-[#0F1F33] outline-none transition placeholder:text-[#5B6B80] hover:border-[#00448E]/50 focus-visible:border-[#00448E] focus-visible:ring-2 focus-visible:ring-[#00448E]/25 aria-invalid:border-[#b33b38] aria-invalid:focus-visible:ring-[#b33b38]/20"
                  placeholder="you@example.com"
                />
                {errors.email && <p id="email-error" className="mt-1.5 text-sm text-[#a52d2a]" role="alert">{errors.email}</p>}
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label htmlFor="password" className="block text-sm font-medium text-[#0F1F33]">Password</label>
                  <a href="/requester-agni/forgot-password" className="text-sm font-medium text-[#00448E] underline decoration-transparent underline-offset-4 hover:decoration-current focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E]">Forgot password?</a>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value);
                    if (errors.password) setErrors((current) => ({ ...current, password: undefined }));
                  }}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? "password-error" : undefined}
                  className="min-h-12 w-full rounded-md border border-[#D9E2EF] bg-white px-3.5 text-base text-[#0F1F33] outline-none transition placeholder:text-[#5B6B80] hover:border-[#00448E]/50 focus-visible:border-[#00448E] focus-visible:ring-2 focus-visible:ring-[#00448E]/25 aria-invalid:border-[#b33b38] aria-invalid:focus-visible:ring-[#b33b38]/20"
                  placeholder="At least 8 characters"
                />
                {errors.password && <p id="password-error" className="mt-1.5 text-sm text-[#a52d2a]" role="alert">{errors.password}</p>}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`flex min-h-12 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 ${themeClasses.primaryButton} ${themeClasses.focusOutline} disabled:cursor-wait disabled:bg-[#5B6B80]`}
              >
                {isLoading && <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}
                {isLoading ? "Signing in..." : "Sign in"}
              </button>
            </form>

            <p className="mt-7 text-center text-sm text-[#5B6B80]">
              New to the helpdesk?{" "}
              <a href="/requester-agni/register" className="font-semibold text-[#00448E] underline decoration-transparent underline-offset-4 hover:decoration-current focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E]">Register</a>
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}