"use client";

import { useAppStore } from "@/store";

export function PermissionDialog() {
  const { pendingPermissions, respondPermission, currentSessionId } = useAppStore();

  const currentSessionPermissions = pendingPermissions.filter(
    p => p.sessionID === currentSessionId
  );

  console.log("[PermissionDialog] pendingPermissions:", pendingPermissions.length, "for current session:", currentSessionPermissions.length);

  if (currentSessionPermissions.length === 0) return null;

  const permission = currentSessionPermissions[0];

  console.log("[PermissionDialog] Rendering permission:", permission.id, permission.permission);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-zinc-900 rounded-2xl p-6 max-w-sm w-full border border-zinc-700">
        <h3 className="text-lg font-semibold text-white mb-2">Permission Request</h3>
        <p className="text-zinc-400 text-sm mb-4">
          OpenCode wants to use the following tool:
        </p>
        
        <div className="bg-zinc-800 rounded-lg p-3 mb-4">
          <code className="text-blue-400 font-mono text-sm">{permission.permission}</code>
          {permission.patterns && permission.patterns.length > 0 && (
            <pre className="text-xs text-zinc-500 mt-2 overflow-x-auto max-h-32 overflow-y-auto">
              {permission.patterns.join(", ")}
            </pre>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => respondPermission(permission.id, false)}
            className="flex-1 py-2 px-4 bg-zinc-700 hover:bg-zinc-600 rounded-lg text-white font-medium transition-colors"
          >
            Deny
          </button>
          <button
            onClick={() => respondPermission(permission.id, true)}
            className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
          >
            Allow
          </button>
        </div>
      </div>
    </div>
  );
}
