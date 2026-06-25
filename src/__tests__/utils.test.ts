import { cn, formatDuration, formatHours, getElapsedSeconds } from "../lib/utils";

describe("cn (className merger)", () => {
  it("merges simple classes", () => {
    expect(cn("foo", "bar")).toBe("foo bar");
  });

  it("resolves Tailwind conflicts", () => {
    expect(cn("p-4", "p-8")).toBe("p-8");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "extra")).toBe("base extra");
  });

  it("handles undefined and null", () => {
    expect(cn("base", undefined, null)).toBe("base");
  });
});

describe("formatDuration", () => {
  it("formats 0 seconds", () => {
    expect(formatDuration(0)).toBe("00:00:00");
  });

  it("formats seconds only", () => {
    expect(formatDuration(45)).toBe("00:00:45");
  });

  it("formats minutes and seconds", () => {
    expect(formatDuration(125)).toBe("00:02:05");
  });

  it("formats hours, minutes, seconds", () => {
    expect(formatDuration(3661)).toBe("01:01:01");
  });

  it("formats large durations", () => {
    expect(formatDuration(36000)).toBe("10:00:00");
    expect(formatDuration(86399)).toBe("23:59:59");
  });

  it("pads single digits", () => {
    expect(formatDuration(61)).toBe("00:01:01");
    expect(formatDuration(3605)).toBe("01:00:05");
  });
});

describe("formatHours", () => {
  it("formats whole hours", () => {
    expect(formatHours(8)).toBe("08:00");
  });

  it("formats half hours", () => {
    expect(formatHours(8.5)).toBe("08:30");
  });

  it("formats quarter hours", () => {
    expect(formatHours(8.25)).toBe("08:15");
  });

  it("handles zero", () => {
    expect(formatHours(0)).toBe("00:00");
  });

  it("rounds minutes", () => {
    expect(formatHours(8.01)).toBe("08:01");
    expect(formatHours(8.99)).toBe("08:59");
  });

  it("handles large values", () => {
    expect(formatHours(24)).toBe("24:00");
    expect(formatHours(100.5)).toBe("100:30");
  });
});

describe("getElapsedSeconds", () => {
  it("calculates elapsed time", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const past = new Date("2026-01-01T11:00:00Z");
    expect(getElapsedSeconds(past.toISOString(), now)).toBe(3600);
  });

  it("returns 0 for future dates", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    const future = new Date("2026-01-01T13:00:00Z");
    expect(getElapsedSeconds(future.toISOString(), now)).toBe(0);
  });

  it("handles same time", () => {
    const now = new Date("2026-01-01T12:00:00Z");
    expect(getElapsedSeconds(now.toISOString(), now)).toBe(0);
  });

  it("handles sub-second differences", () => {
    const t1 = "2026-01-01T12:00:00.000Z";
    const t2 = new Date("2026-01-01T12:00:00.500Z");
    expect(getElapsedSeconds(t1, t2)).toBe(0);
  });
});
