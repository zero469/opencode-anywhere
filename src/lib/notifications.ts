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

export async function notifyReadyForInput(sessionTitle?: string): Promise<void> {
  if (!Capacitor.isNativePlatform() || !permissionGranted) {
    return;
  }
  
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Date.now(),
          title: "Ready for input",
          body: sessionTitle || "OpenCode is waiting for your response",
          schedule: { at: new Date(Date.now() + 100) },
          sound: "default",
        },
      ],
    });
  } catch {}
}

export async function notifyPermissionRequest(toolName: string, sessionTitle?: string): Promise<void> {
  if (!Capacitor.isNativePlatform() || !permissionGranted) {
    return;
  }
  
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Date.now(),
          title: sessionTitle || "Permission Required",
          body: `Wants to run: ${toolName}`,
          schedule: { at: new Date(Date.now() + 100) },
          sound: "default",
        },
      ],
    });
  } catch {}
}

export async function notifyQuestion(header: string, sessionTitle?: string): Promise<void> {
  if (!Capacitor.isNativePlatform() || !permissionGranted) {
    return;
  }
  
  try {
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Date.now(),
          title: sessionTitle || "Question from OpenCode",
          body: header,
          schedule: { at: new Date(Date.now() + 100) },
          sound: "default",
        },
      ],
    });
  } catch {}
}
