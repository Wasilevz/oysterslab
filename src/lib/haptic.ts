export async function hapticImpact(style: "light" | "medium" | "heavy" = "light"): Promise<void> {
  try {
    const { default: WebApp } = await import("@twa-dev/sdk");
    WebApp.HapticFeedback.impactOccurred(style);
  } catch (err) {
    console.error(err);
  }
}

export async function hapticNotification(type: "success" | "error" | "warning"): Promise<void> {
  try {
    const { default: WebApp } = await import("@twa-dev/sdk");
    WebApp.HapticFeedback.notificationOccurred(type);
  } catch (err) {
    console.error(err);
  }
}
