import { checkRateLimit } from "../lib/rate-limit";

describe("checkRateLimit", () => {
  it("should allow first request", () => {
    const result = checkRateLimit("test1", 3, 60000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
  });

  it("should allow requests up to limit", () => {
    checkRateLimit("test2", 3, 60000);
    checkRateLimit("test2", 3, 60000);
    const result = checkRateLimit("test2", 3, 60000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(0);
  });

  it("should block after exceeding limit", () => {
    checkRateLimit("test3", 2, 60000);
    checkRateLimit("test3", 2, 60000);
    const result = checkRateLimit("test3", 2, 60000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it("should reset after window expires", () => {
    checkRateLimit("test4", 1, 1); // 1ms window
    // Wait for window to expire
    return new Promise((resolve) => setTimeout(resolve, 5)).then(() => {
      const result = checkRateLimit("test4", 1, 1);
      expect(result.allowed).toBe(true);
    });
  });
});
