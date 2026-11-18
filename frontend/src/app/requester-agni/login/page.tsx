"use client";

import { useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import AuthLayout from "../_components/AuthLayout";
import PasswordInput from "../_components/PasswordInput";
import PrimaryButton from "../_components/PrimaryButton";
import TextField from "../_components/TextField";
import { login } from "../_lib/requesterApi";

type FormErrors = {
  email?: string;
  password?: string;
};

export default function RequesterLoginPage() {
  const router = useRouter();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
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
    if (Object.keys(nextErrors).length > 0) {
      if (nextErrors.email) emailRef.current?.focus();
      else passwordRef.current?.focus();
      return;
    }

    setIsLoading(true);
    try {
      await login({ email: normalizedEmail, password });
      router.push("/requester-agni/dashboard");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <AuthLayout>
      <p className="text-sm font-medium text-[#00448E]">Welcome back</p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[#0F1F33] md:text-[1.8rem]">Sign in to your account</h1>
      <p className="mt-2 text-sm leading-6 text-[#5B6B80]">Use your email and password to continue.</p>

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
          error={errors.email}
          placeholder="you@example.com"
          required
          onChange={(event) => {
            setEmail(event.target.value);
            if (errors.email) setErrors((current) => ({ ...current, email: undefined }));
          }}
        />

        <PasswordInput
          id="password"
          name="password"
          label="Password"
          autoComplete="current-password"
          inputRef={passwordRef}
          value={password}
          error={errors.password}
          placeholder="At least 8 characters"
          required
          labelAction={<a href="/requester-agni/forgot-password" className="text-sm font-medium text-[#00448E] underline decoration-transparent underline-offset-4 hover:decoration-current focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E]">Forgot password?</a>}
          onChange={(event) => {
            setPassword(event.target.value);
            if (errors.password) setErrors((current) => ({ ...current, password: undefined }));
          }}
        />

        <PrimaryButton isLoading={isLoading}>Sign in</PrimaryButton>
      </form>

      <p className="mt-6 text-center text-sm text-[#5B6B80]">
        New to the helpdesk?{" "}
        <a href="/requester-agni/register" className="font-semibold text-[#00448E] underline decoration-transparent underline-offset-4 hover:decoration-current focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#00448E]">Register</a>
      </p>
    </AuthLayout>
  );
}