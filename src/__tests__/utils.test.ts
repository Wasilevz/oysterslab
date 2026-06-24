import { formatDuration, formatHours, getElapsedSeconds } from "../lib/utils";

describe("formatDuration", () => {
  it("should format hours and minutes", () => {
    expect(formatDuration(3600)).toBe("01:00:00");
    expect(formatDuration(3661)).toBe("01:01:01");
  });

  it("should handle zero", () => {
    expect(formatDuration(0)).toBe("00:00:00");
  });

  it("should pad with zeros", () => {
    expect(formatDuration(61)).toBe("00:01:01");
  });
});

describe("formatHours", () => {
  it("should format hours correctly", () => {
    expect(formatHours(8.5)).toBe("08:30");
    expect(formatHours(8)).toBe("08:00");
  });

  it("should handle rounding", () => {
    expect(formatHours(8.01)).toBe("08:01");
  });
});

describe("getElapsedSeconds", () => {
  it("should calculate elapsed seconds", () => {
    const now = new Date();
    const past = new Date(now.getTime() - 60000); // 1 minute ago
    const result = getElapsedSeconds(past.toISOString(), now);
    expect(result).toBe(60);
  });

  it("should return 0 for future dates", () => {
    const future = new Date(Date.now() + 60000);
    const result = getElapsedSeconds(future.toISOString());
    expect(result).toBe(0);
  });
});
