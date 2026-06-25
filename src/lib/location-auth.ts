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

function ipToNumber(ip: string): number {
  const parts = ip.split(".").map(Number);
  return ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

function isInCIDR(ip: string, cidr: string): boolean {
  const [network, prefixStr] = cidr.split("/");
  const prefix = parseInt(prefixStr, 10);

  const ipNum = ipToNumber(ip);
  const networkNum = ipToNumber(network);

  const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;

  return (ipNum & mask) === (networkNum & mask);
}

export function isIPAllowed(clientIP: string, allowedIPs: string[]): boolean {
  if (allowedIPs.length === 0) return false;

  const normalizedClient = clientIP.toLowerCase().trim();

  return allowedIPs.some((allowed) => {
    const trimmed = allowed.trim().toLowerCase();
    if (!trimmed) return false;

    if (trimmed.includes("/")) {
      if (!/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\/\d{1,2}$/.test(trimmed)) return false;
      return isInCIDR(normalizedClient, trimmed);
    }

    return normalizedClient === trimmed;
  });
}
