"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { 
  CapacitorBarcodeScanner, 
  CapacitorBarcodeScannerTypeHint,
  CapacitorBarcodeScannerCameraDirection 
} from "@capacitor/barcode-scanner";
import { useAppStore } from "@/store";
import { relay } from "@/lib/relay";
import type { QRCodeData } from "@/types";

interface QRScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function QRScanner({ isOpen, onClose, onSuccess }: QRScannerProps) {
  const { relayToken, fetchDevices, devices, saveDeviceEncryptionKey, setRelayToken } = useAppStore();
  const [error, setError] = useState<string | null>(null);
  const [isPairing, setIsPairing] = useState(false);
  const [showNameInput, setShowNameInput] = useState(false);
  const [deviceName, setDeviceName] = useState("");
  const [pendingQRData, setPendingQRData] = useState<QRCodeData | null>(null);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showNameInput && inputRef.current) {
      inputRef.current.focus();
    }
  }, [showNameInput]);

  const processQRCode = useCallback(async (content: string) => {
    let data: QRCodeData;
    try {
      data = JSON.parse(content);
    } catch {
      setError("Invalid QR code: not valid JSON");
      return;
    }
    
    if (data.v !== 1 || !data.r || !data.p || !data.c) {
      setError("Invalid QR code format");
      return;
    }

    let tokenToUse = relayToken;

    // If not logged in, try auto-login (works for self-hosted single-user mode)
    if (!tokenToUse) {
      try {
        const { token } = await relay.autoLogin(data.r);
        // Auto-login succeeded - this is a self-hosted server
        tokenToUse = token;
        setPendingToken(token);
      } catch {
        // Auto-login failed - this is a multi-user server, need to login first
        setNeedsLogin(true);
        return;
      }
    }

    setPendingQRData(data);
    setDeviceName(data.h || `My Mac ${new Date().toLocaleDateString()}`);
    setShowNameInput(true);
  }, [relayToken]);

  const confirmPairing = useCallback(async () => {
    const tokenToUse = pendingToken || relayToken;
    if (!tokenToUse || !pendingQRData) return;

    const name = deviceName.trim() || pendingQRData.h || `My Mac ${new Date().toLocaleDateString()}`;
    
    setShowNameInput(false);
    setIsPairing(true);
    setError(null);

    try {
      await relay.completePairing(
        pendingQRData.r,
        tokenToUse,
        pendingQRData.p,
        pendingQRData.c,
        name
      );

      if (pendingToken) {
        setRelayToken(pendingToken);
      }

      const previousDeviceIds = new Set(devices.map(d => d.id));
      await fetchDevices();
      
      if (pendingQRData.k) {
        const { devices: updatedDevices } = useAppStore.getState();
        const newDevice = updatedDevices.find(d => !previousDeviceIds.has(d.id));
        if (newDevice) {
          saveDeviceEncryptionKey(newDevice.id, pendingQRData.k);
        }
      }
      
      setIsPairing(false);
      setPendingQRData(null);
      setPendingToken(null);
      setDeviceName("");
      onSuccess();
    } catch (err) {
      setIsPairing(false);
      setError(err instanceof Error ? err.message : "Failed to pair device");
    }
  }, [relayToken, pendingToken, pendingQRData, deviceName, devices, fetchDevices, saveDeviceEncryptionKey, setRelayToken, onSuccess]);

  const cancelNameInput = useCallback(() => {
    setShowNameInput(false);
    setPendingQRData(null);
    setPendingToken(null);
    setDeviceName("");
  }, []);

  const startScanning = useCallback(async () => {
    setError(null);
    setNeedsLogin(false);
    
    try {
      const result = await CapacitorBarcodeScanner.scanBarcode({
        hint: CapacitorBarcodeScannerTypeHint.QR_CODE,
        scanInstructions: "Point camera at QR code from tunnel-client",
        scanButton: false,
        cameraDirection: CapacitorBarcodeScannerCameraDirection.BACK,
      });

      if (result.ScanResult) {
        await processQRCode(result.ScanResult);
      } else {
        onClose();
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("cancelled")) {
        onClose();
      } else {
        setError(err instanceof Error ? err.message : "Failed to scan");
      }
    }
  }, [processQRCode, onClose]);

  if (!isOpen) return null;

  // Show "needs login" message for multi-user servers
  if (needsLogin) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--background)', paddingTop: 'var(--safe-area-top)', paddingBottom: 'var(--safe-area-bottom)' }}>
        <div className="absolute top-0 left-0 right-0 p-4" style={{ paddingTop: 'calc(var(--safe-area-top) + 16px)' }}>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full flex items-center justify-center"
            style={{ backgroundColor: 'var(--background-element)', color: 'var(--foreground)' }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col items-center justify-center px-8 text-center">
          <div className="w-16 h-16 rounded-full bg-yellow-600/20 flex items-center justify-center mb-6">
            <svg className="w-8 h-8 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Login Required</h2>
          <p className="mb-6" style={{ color: 'var(--foreground-muted)' }}>
            This server requires authentication. Please go back and login or register first.
          </p>
          <button
            onClick={onClose}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-medium transition-colors"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (showNameInput) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--background)', paddingTop: 'var(--safe-area-top)', paddingBottom: 'var(--safe-area-bottom)' }}>
        <div className="w-full max-w-sm px-6">
          <div className="w-16 h-16 rounded-2xl bg-green-600/20 flex items-center justify-center mb-6 mx-auto">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold mb-2 text-center" style={{ color: 'var(--foreground)' }}>QR Code Scanned</h2>
          <p className="mb-6 text-center" style={{ color: 'var(--foreground-muted)' }}>Enter a name for this device</p>
          
          <input
            ref={inputRef}
            type="text"
            value={deviceName}
            onChange={(e) => setDeviceName(e.target.value)}
            placeholder="e.g. MacBook Pro Office"
            className="w-full px-4 py-3 rounded-xl focus:outline-none focus:border-blue-500 mb-4"
            style={{ backgroundColor: 'var(--background-element)', borderWidth: '1px', borderStyle: 'solid', borderColor: 'var(--border)', color: 'var(--foreground)' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmPairing();
            }}
          />
          
          <div className="flex gap-3">
            <button
              onClick={cancelNameInput}
              className="flex-1 px-4 py-3 rounded-xl font-medium transition-colors hover:opacity-80"
              style={{ backgroundColor: 'var(--background-element)', color: 'var(--foreground)' }}
            >
              Cancel
            </button>
            <button
              onClick={confirmPairing}
              className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-medium transition-colors"
            >
              Pair Device
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center" style={{ backgroundColor: 'var(--background)', paddingTop: 'var(--safe-area-top)', paddingBottom: 'var(--safe-area-bottom)' }}>
      <div className="absolute top-0 left-0 right-0 p-4" style={{ paddingTop: 'calc(var(--safe-area-top) + 16px)' }}>
        <button
          onClick={onClose}
          className="w-10 h-10 rounded-full flex items-center justify-center"
          style={{ backgroundColor: 'var(--background-element)', color: 'var(--foreground)' }}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col items-center justify-center px-8 text-center">
        {isPairing ? (
          <>
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-6" />
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Pairing Device</h2>
            <p style={{ color: 'var(--foreground-muted)' }}>Please wait...</p>
          </>
        ) : error ? (
          <>
            <div className="w-16 h-16 rounded-full bg-red-600/20 flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Scan Failed</h2>
            <p className="mb-6" style={{ color: 'var(--foreground-muted)' }}>{error}</p>
            <button
              onClick={startScanning}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-medium transition-colors"
            >
              Try Again
            </button>
          </>
        ) : (
          <>
            <div className="w-24 h-24 rounded-2xl flex items-center justify-center mb-6" style={{ backgroundColor: 'var(--background-element)' }}>
              <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--foreground)' }}>Scan QR Code</h2>
            <p className="mb-6" style={{ color: 'var(--foreground-muted)' }}>
              Run <code className="px-2 py-0.5 rounded text-sm" style={{ backgroundColor: 'var(--background-element)' }}>tunnel-client start</code> on your Mac to display a QR code
            </p>
            <button
              onClick={startScanning}
              className="px-8 py-4 bg-blue-600 hover:bg-blue-500 rounded-xl text-white font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Open Camera
            </button>
          </>
        )}
      </div>
    </div>
  );
}
