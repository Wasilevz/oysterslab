interface BucketEntry {
  tokens: number;
  lastRefill: number;
}

const buckets = new Map<string, BucketEntry>();
const MAX_ENTRIES = 1000;

export function checkRateLimit(
  key: string,
  maxRequests: number = 10,
  windowMs: number = 60000,
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const refillRate = maxRequests / windowMs;
  const entry = buckets.get(key);

  if (entry && now - entry.lastRefill > windowMs) {
    buckets.delete(key);
  }

  if (!buckets.has(key)) {
    if (buckets.size >= MAX_ENTRIES) {
      const oldestKey = buckets.keys().next().value;
      if (oldestKey !== undefined) buckets.delete(oldestKey);
    }
    buckets.set(key, { tokens: maxRequests - 1, lastRefill: now });
    return { allowed: true, remaining: maxRequests - 1 };
  }

  const bucket = buckets.get(key)!;
  const elapsed = now - bucket.lastRefill;
  bucket.tokens = Math.min(maxRequests, bucket.tokens + elapsed * refillRate);
  bucket.lastRefill = now;

  if (bucket.tokens < 1) {
    return { allowed: false, remaining: 0 };
  }

  bucket.tokens -= 1;
  return { allowed: true, remaining: Math.floor(bucket.tokens) };
}
