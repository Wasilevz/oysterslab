export async function hapticImpact(style: "light" | "medium" | "heavy" = "light") {
  try {
    const { default: WebApp } = await import("@twa-dev/sdk");
    WebApp.HapticFeedback.impactOccurred(style);
  } catch {}
}

export async function hapticNotification(type: "success" | "error" | "warning") {
  try {
    const { default: WebApp } = await import("@twa-dev/sdk");
    WebApp.HapticFeedback.notificationOccurred(type);
  } catch {}
}
