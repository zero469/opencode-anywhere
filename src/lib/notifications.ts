import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";

let permissionGranted = false;

export async function requestNotificationPermission(): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) {
    return false;
  }
  
  try {
    const { display } = await LocalNotifications.checkPermissions();
    if (display === "granted") {
      permissionGranted = true;
      return true;
    }
    
    const result = await LocalNotifications.requestPermissions();
    permissionGranted = result.display === "granted";
    return permissionGranted;
  } catch {
    return false;
  }
}

export async function notifyTaskComplete(sessionTitle?: string): Promise<void> {
  if (!Capacitor.isNativePlatform() || !permissionGranted) {
    return;
  }
  
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Date.now(),
          title: "✅ Task Complete",
          body: sessionTitle || "Session finished",
          schedule: { at: new Date(Date.now() + 100) },
          sound: "default",
        },
      ],
    });
  } catch {}
}

export async function notifyApprovalNeeded(toolName: string, sessionTitle?: string): Promise<void> {
  if (!Capacitor.isNativePlatform() || !permissionGranted) {
    return;
  }
  
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Date.now(),
          title: "⚠️ Approval Needed",
          body: sessionTitle ? `${sessionTitle}: ${toolName}` : toolName,
          schedule: { at: new Date(Date.now() + 100) },
          sound: "default",
        },
      ],
    });
  } catch {}
}

export async function notifyInputNeeded(header: string, sessionTitle?: string): Promise<void> {
  if (!Capacitor.isNativePlatform() || !permissionGranted) {
    return;
  }
  
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Date.now(),
          title: "❓ Input Needed",
          body: sessionTitle ? `${sessionTitle}: ${header}` : header,
          schedule: { at: new Date(Date.now() + 100) },
          sound: "default",
        },
      ],
    });
  } catch {}
}
