export function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    let ip = forwarded.split(",")[0].trim();
    if (ip.startsWith("::ffff:")) ip = ip.slice(7);
    return ip;
  }
  const realIP = request.headers.get("x-real-ip");
  if (realIP) {
    let ip = realIP;
    if (ip.startsWith("::ffff:")) ip = ip.slice(7);
    return ip;
  }
  return "127.0.0.1";
}

export function isIPAllowed(clientIP: string, allowedIPs: string[]): boolean {
  if (allowedIPs.length === 0) return false;

  const normalizedClient = clientIP.toLowerCase().trim();

  return allowedIPs.some((allowed) => {
    const trimmed = allowed.trim().toLowerCase();
    if (!trimmed) return false;

    if (trimmed.includes("/")) {
      const prefix = trimmed.split("/")[0];
      return normalizedClient.startsWith(prefix);
    }

    return normalizedClient === trimmed;
  });
}
