"use client";

import { useState, FormEvent, useEffect } from "react";
import { useAppStore } from "@/store";
import { QRScanner } from "@/components/QRScanner";
import { Capacitor } from '@capacitor/core';
import { SavePassword } from '@capgo/capacitor-autofill-save-password';

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
  
  const { login, register, sendVerification, isLoading, authError, clearAuthError } = useAppStore();

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
      // Capture credentials before login causes re-render/unmount
      const savedEmail = email;
      const savedPassword = password;
      
      await login(savedEmail, savedPassword);
      
      const state = useAppStore.getState();
      if (state.relayToken && Capacitor.isNativePlatform()) {
        // Fire-and-forget: don't await, let native dialog show independently of React lifecycle
        // The iOS system dialog is owned by the OS, not WKWebView, so it can persist after component unmounts
        SavePassword.promptDialog({
          username: savedEmail,
          password: savedPassword,
          url: 'opencode-relay.azurewebsites.net',
        }).catch((err) => {
          // Known: SecAddSharedWebCredential silently fails if credential already exists in keychain
          console.warn('SavePassword.promptDialog failed:', err);
        });
      }
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
        className="flex flex-col items-center justify-center min-h-screen p-6"
        style={{ paddingTop: 'var(--safe-area-top)', paddingBottom: 'var(--safe-area-bottom)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
      >
        <div className="w-full max-w-sm flex flex-col items-center">
          {/* Logo */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center mb-6">
            <svg className="w-12 h-12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
            </svg>
          </div>
          
          <h1 className="text-2xl font-bold text-center mb-2">OpenCode Anywhere</h1>
          <p className="text-center mb-8" style={{ color: 'var(--foreground-muted)' }}>Control your AI coding assistant from anywhere</p>
          
          {/* Primary action - Login */}
          <button
            onClick={() => setAuthView("login")}
            className="w-full py-4 px-6 bg-blue-600 hover:bg-blue-500 rounded-xl font-semibold transition-colors text-white"
          >
            Login
          </button>
          
          <p className="text-sm text-center mt-4" style={{ color: 'var(--foreground-muted)' }}>
            Don&apos;t have an account?{' '}
            <button
              onClick={() => setAuthView("register")}
              className="text-blue-500 hover:text-blue-400 font-medium transition-colors"
            >
              Register
            </button>
          </p>
          
          {/* Divider */}
          <div className="w-full flex items-center gap-4 my-8">
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
            <span className="text-xs font-medium" style={{ color: 'var(--foreground-muted)' }}>or</span>
            <div className="flex-1 h-px" style={{ backgroundColor: 'var(--border-subtle)' }} />
          </div>
          
          {/* Secondary - Self-hosted QR */}
          <p className="text-xs text-center mb-3" style={{ color: 'var(--foreground-muted)' }}>Self-hosted relay server?</p>
          <button
            onClick={() => setShowScanner(true)}
            className="w-full py-3 px-4 rounded-xl font-medium transition-colors hover:opacity-80 flex items-center justify-center gap-2"
            style={{ backgroundColor: 'var(--background-element)', border: '1px solid var(--border)' }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ color: 'var(--foreground-muted)' }}>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
            Scan QR Code to Connect
          </button>
          
          <p className="text-xs text-center mt-3" style={{ color: 'var(--foreground-muted)' }}>
            Run <code className="text-green-400 px-1.5 py-0.5 rounded" style={{ backgroundColor: 'var(--background-element)' }}>tunnel-client</code> on your computer
          </p>
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
            <label htmlFor="email" className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground-muted)' }}>
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
              className="w-full px-3 py-3 rounded-xl placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
              style={{ backgroundColor: 'var(--background-element)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)' }}
              placeholder="Email address"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !email}
            className="w-full py-3 px-4 rounded-xl font-semibold transition-colors bg-blue-600 hover:bg-blue-500 text-white disabled:bg-blue-600/50"
          >
            {isLoading ? "Sending..." : "Send Verification Code"}
          </button>
        </>
      );
    }

    if (registerStep === "code") {
      return (
        <>
          <p className="text-sm text-center mb-4" style={{ color: 'var(--foreground-muted)' }}>
            Verification code sent to <span style={{ color: 'var(--foreground)' }}>{email}</span>
          </p>
          <div>
            <label htmlFor="code" className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground-muted)' }}>
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
              className="w-full px-3 py-3 rounded-xl placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-center text-2xl tracking-widest"
              style={{ backgroundColor: 'var(--background-element)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)' }}
              placeholder="------"
            />
          </div>
          <button
            type="submit"
            disabled={code.length !== 6}
            className="w-full py-3 px-4 rounded-xl font-semibold transition-colors bg-blue-600 hover:bg-blue-500 text-white disabled:bg-blue-600/50"
          >
            Continue
          </button>
          <button
            type="button"
            onClick={handleSendCode}
            disabled={countdown > 0 || isLoading}
            className="w-full py-2 text-sm hover:opacity-80 disabled:opacity-50"
            style={{ color: 'var(--foreground-muted)' }}
          >
            {countdown > 0 ? `Resend in ${countdown}s` : "Resend Code"}
          </button>
        </>
      );
    }

    return (
      <>
        <p className="text-sm text-center mb-4" style={{ color: 'var(--foreground-muted)' }}>
          Set password for <span style={{ color: 'var(--foreground)' }}>{email}</span>
        </p>
        <div>
          <label htmlFor="password" className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground-muted)' }}>
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
            className="w-full px-3 py-3 rounded-xl placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            style={{ backgroundColor: 'var(--background-element)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)' }}
            placeholder="At least 6 characters"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || password.length < 6}
          className="w-full py-3 px-4 rounded-xl font-semibold transition-colors bg-blue-600 hover:bg-blue-500 text-white disabled:bg-blue-600/50"
        >
          {isLoading ? "Creating Account..." : "Create Account"}
        </button>
      </>
    );
  };

  const renderLoginForm = () => (
    <>
      <div>
        <label htmlFor="email" className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground-muted)' }}>
          Email
        </label>
        <input
          id="email"
          name="username"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full px-3 py-3 rounded-xl placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{ backgroundColor: 'var(--background-element)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)' }}
          placeholder="Email address"
        />
      </div>
      <div>
        <label htmlFor="password" className="block text-sm font-medium mb-1" style={{ color: 'var(--foreground-muted)' }}>
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
          className="w-full px-3 py-3 rounded-xl placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          style={{ backgroundColor: 'var(--background-element)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)' }}
          placeholder="Password"
        />
      </div>
      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-3 px-4 rounded-xl font-semibold transition-colors bg-blue-600 hover:bg-blue-500 text-white disabled:bg-blue-600/50"
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
      className="relative flex flex-col items-center justify-center min-h-screen p-4"
      style={{ paddingTop: 'var(--safe-area-top)', paddingBottom: 'var(--safe-area-bottom)', backgroundColor: 'var(--background)', color: 'var(--foreground)' }}
    >
      <button
        onClick={() => {
          setAuthView("welcome");
          setRegisterStep("email");
          setEmail("");
          setPassword("");
          setCode("");
        }}
        className="absolute left-4 flex items-center gap-2 hover:opacity-80"
        style={{ top: 'calc(var(--safe-area-top) + 16px)', color: 'var(--foreground-muted)' }}
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m15 18-6-6 6-6"/>
        </svg>
        Back
      </button>

      <div className="w-full max-w-sm">
        
        <h1 className="text-3xl font-bold text-center mb-8">{getTitle()}</h1>

        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="on" method="post">
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
            className="text-sm hover:opacity-80"
            style={{ color: 'var(--foreground-muted)' }}
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
