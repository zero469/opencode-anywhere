"use client";

import { useAppStore } from "@/store";

export function PermissionDialog() {
  const { pendingPermissions, respondPermission, currentSessionId } = useAppStore();

  const currentSessionPermissions = pendingPermissions.filter(
    p => p.sessionID === currentSessionId
  );

  if (currentSessionPermissions.length === 0) return null;

  const permission = currentSessionPermissions[0];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="rounded-2xl p-6 max-w-sm w-full" style={{ backgroundColor: 'var(--background-panel)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)' }}>
        <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Permission Request</h3>
        <p className="text-sm mb-4" style={{ color: 'var(--foreground-muted)' }}>
          OpenCode wants to use the following tool:
        </p>
        
        <div className="rounded-lg p-3 mb-4" style={{ backgroundColor: 'var(--background-element)' }}>
          <code className="text-blue-400 font-mono text-sm">{permission.permission}</code>
          {permission.patterns && permission.patterns.length > 0 && (
            <pre className="text-xs mt-2 overflow-x-auto max-h-32 overflow-y-auto" style={{ color: 'var(--foreground-muted)' }}>
              {permission.patterns.join(", ")}
            </pre>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => respondPermission(permission.id, false)}
            className="no-select flex-1 py-2 px-4 rounded-lg font-medium transition-colors hover:opacity-80"
            style={{ backgroundColor: 'var(--background-element)', color: 'var(--foreground)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)' }}
          >
            Deny
          </button>
          <button
            onClick={() => respondPermission(permission.id, true)}
            className="no-select flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded-lg text-white font-medium transition-colors"
          >
            Allow
          </button>
        </div>
      </div>
    </div>
  );
}
