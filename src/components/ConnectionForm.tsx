"use client";

import { useState } from "react";
import { useAppStore } from "@/store";

export function ConnectionForm() {
  const { setConfig, status, isLoading } = useAppStore();
  const [baseUrl, setBaseUrl] = useState("http://localhost:4096");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    await setConfig({
      baseUrl: baseUrl.replace(/\/$/, ""),
      username: username || undefined,
      password: password || undefined,
    });
  };

  return (
    <form onSubmit={handleConnect} className="space-y-4 w-full max-w-md">
      <div>
        <label className="block text-sm font-medium text-zinc-300 mb-1">
          Server URL
        </label>
        <input
          type="url"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          placeholder="http://localhost:4096"
          className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            Username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="opencode"
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-zinc-300 mb-1">
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Optional"
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {status.error && (
        <p className="text-red-400 text-sm">{status.error}</p>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-zinc-700 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
      >
        {isLoading ? "Connecting..." : "Connect"}
      </button>
    </form>
  );
}
