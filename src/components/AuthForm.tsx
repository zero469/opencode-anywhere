"use client";

import { useState, FormEvent, useEffect } from "react";
import { useAppStore } from "@/store";

type RegisterStep = "email" | "code" | "password";

export function AuthForm() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [registerStep, setRegisterStep] = useState<RegisterStep>("email");
  const [countdown, setCountdown] = useState(0);
  
  const { login, register, sendVerification, isLoading, authError, clearAuthError } = useAppStore();

  useEffect(() => {
    clearAuthError();
    if (isLogin) {
      setRegisterStep("email");
      setCode("");
    }
  }, [isLogin, clearAuthError]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const handleSendCode = async () => {
    if (!email || countdown > 0) return;
    try {
      await sendVerification(email);
      setCountdown(60);
      setRegisterStep("code");
    } catch {}
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (isLogin) {
      await login(email, password);
      return;
    }

    if (registerStep === "email") {
      await handleSendCode();
    } else if (registerStep === "code") {
      if (code.length === 6) {
        setRegisterStep("password");
      }
    } else if (registerStep === "password") {
      await register(email, password, code);
    }
  };

  const renderRegisterForm = () => {
    if (registerStep === "email") {
      return (
        <>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-zinc-400 mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500"
              placeholder="you@example.com"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !email}
            className="w-full py-2 px-4 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 rounded-md font-semibold transition-colors"
          >
            {isLoading ? "Sending..." : "Send Verification Code"}
          </button>
        </>
      );
    }

    if (registerStep === "code") {
      return (
        <>
          <p className="text-sm text-zinc-400 text-center mb-4">
            Verification code sent to <span className="text-white">{email}</span>
          </p>
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-zinc-400 mb-1">
              Verification Code
            </label>
            <input
              id="code"
              name="code"
              type="text"
              inputMode="numeric"
              maxLength={6}
              required
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500 text-center text-2xl tracking-widest"
              placeholder="000000"
            />
          </div>
          <button
            type="submit"
            disabled={code.length !== 6}
            className="w-full py-2 px-4 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 rounded-md font-semibold transition-colors"
          >
            Continue
          </button>
          <button
            type="button"
            onClick={handleSendCode}
            disabled={countdown > 0 || isLoading}
            className="w-full py-2 text-sm text-zinc-400 hover:text-white disabled:text-zinc-600"
          >
            {countdown > 0 ? `Resend in ${countdown}s` : "Resend Code"}
          </button>
        </>
      );
    }

    return (
      <>
        <p className="text-sm text-zinc-400 text-center mb-4">
          Set password for <span className="text-white">{email}</span>
        </p>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-zinc-400 mb-1">
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500"
            placeholder="At least 6 characters"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || password.length < 6}
          className="w-full py-2 px-4 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 rounded-md font-semibold transition-colors"
        >
          {isLoading ? "Creating Account..." : "Create Account"}
        </button>
      </>
    );
  };

  const renderLoginForm = () => (
    <>
      <div>
        <label htmlFor="email" className="block text-sm font-medium text-zinc-400 mb-1">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500"
          placeholder="you@example.com"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-zinc-400 mb-1">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-500"
          placeholder="••••••••"
        />
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2 px-4 bg-zinc-800 hover:bg-zinc-700 disabled:bg-zinc-900 disabled:text-zinc-600 rounded-md font-semibold transition-colors"
      >
        {isLoading ? "Loading..." : "Login"}
      </button>
    </>
  );

  const getTitle = () => {
    if (isLogin) return "Welcome Back";
    if (registerStep === "email") return "Create Account";
    if (registerStep === "code") return "Verify Email";
    return "Set Password";
  };

  return (
    <div className="flex flex-col items-center justify-center h-full bg-zinc-950 text-white p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-3xl font-bold text-center mb-8">{getTitle()}</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isLogin ? renderLoginForm() : renderRegisterForm()}
          
          {authError && (
            <p className="text-sm text-red-500 text-center">{authError}</p>
          )}
        </form>

        <div className="text-center mt-6">
          <button
            onClick={() => setIsLogin(!isLogin)}
            className="text-sm text-zinc-400 hover:text-white"
          >
            {isLogin
              ? "Don't have an account? Register"
              : "Already have an account? Login"}
          </button>
        </div>
      </div>
    </div>
  );
}
