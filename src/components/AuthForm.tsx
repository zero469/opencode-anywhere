"use client";

import { useState, FormEvent, useEffect } from "react";
import { useAppStore } from "@/store";
import { QRScanner } from "@/components/QRScanner";

type RegisterStep = "email" | "code" | "password";
type AuthView = "welcome" | "login" | "register";

export function AuthForm() {
  const [authView, setAuthView] = useState<AuthView>("welcome");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [registerStep, setRegisterStep] = useState<RegisterStep>("email");
  const [countdown, setCountdown] = useState(0);
  const [showScanner, setShowScanner] = useState(false);
  
  const { login, register, sendVerification, isLoading, authError, clearAuthError, relayToken } = useAppStore();

  useEffect(() => {
    clearAuthError();
    if (authView === "login") {
      setRegisterStep("email");
      setCode("");
    }
  }, [authView, clearAuthError]);

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
    
    if (authView === "login") {
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

  const handleScanSuccess = () => {
    setShowScanner(false);
  };

  // Welcome screen - main entry point
  if (authView === "welcome") {
    return (
      <div 
        className="flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white p-6"
        style={{ paddingTop: 'var(--safe-area-top)', paddingBottom: 'var(--safe-area-bottom)' }}
      >
        <div className="w-full max-w-sm flex flex-col items-center">
          {/* Logo */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mb-6">
            <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-center mb-2">OpenCode Anywhere</h1>
          <p className="text-zinc-400 text-center mb-10">Control your AI coding assistant from anywhere</p>
          
          {/* Primary action - Scan QR */}
          <button
            onClick={() => setShowScanner(true)}
            className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold transition-colors flex items-center justify-center gap-3"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            Scan QR Code to Connect
          </button>
          
          <p className="text-xs text-zinc-500 text-center mt-3 mb-4">
            Run <code className="text-green-400 bg-zinc-800 px-1.5 py-0.5 rounded">tunnel-client</code> on your computer to get the QR code
          </p>
          
          {/* Secondary - Cloud service login */}
          <div className="w-full border-t border-zinc-800 pt-6 mt-4">
            <p className="text-xs text-zinc-500 text-center mb-4">Using official cloud service?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setAuthView("login")}
                className="flex-1 py-3 px-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-medium transition-colors"
              >
                Login
              </button>
              <button
                onClick={() => setAuthView("register")}
                className="flex-1 py-3 px-4 bg-zinc-800 hover:bg-zinc-700 rounded-xl font-medium transition-colors"
              >
                Register
              </button>
            </div>
          </div>
        </div>
        
        <QRScanner 
          isOpen={showScanner} 
          onClose={() => setShowScanner(false)} 
          onSuccess={handleScanSuccess}
        />
      </div>
    );
  }

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
    if (authView === "login") return "Welcome Back";
    if (registerStep === "email") return "Create Account";
    if (registerStep === "code") return "Verify Email";
    return "Set Password";
  };

  return (
    <div 
      className="relative flex flex-col items-center justify-center min-h-screen bg-zinc-950 text-white p-4"
      style={{ paddingTop: 'var(--safe-area-top)', paddingBottom: 'var(--safe-area-bottom)' }}
    >
      <button
        onClick={() => {
          setAuthView("welcome");
          setRegisterStep("email");
          setEmail("");
          setPassword("");
          setCode("");
        }}
        className="absolute left-4 flex items-center gap-2 text-zinc-400 hover:text-white"
        style={{ top: 'calc(var(--safe-area-top) + 16px)' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6"/>
        </svg>
        Back
      </button>

      <div className="w-full max-w-sm">
        
        <h1 className="text-3xl font-bold text-center mb-8">{getTitle()}</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          {authView === "login" ? renderLoginForm() : renderRegisterForm()}
          
          {authError && (
            <p className="text-sm text-red-500 text-center">{authError}</p>
          )}
        </form>

        <div className="text-center mt-6">
          <button
            onClick={() => {
              setAuthView(authView === "login" ? "register" : "login");
              setRegisterStep("email");
            }}
            className="text-sm text-zinc-400 hover:text-white"
          >
            {authView === "login"
              ? "Don't have an account? Register"
              : "Already have an account? Login"}
          </button>
        </div>
      </div>
    </div>
  );
}
