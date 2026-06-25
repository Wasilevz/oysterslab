describe("Schedule calculations", () => {
  function getWeekStart(date: Date): Date {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    d.setDate(diff);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function getWeekDays(ws: Date): Date[] {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(ws);
      d.setDate(ws.getDate() + i);
      return d;
    });
  }

  function toDateStr(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  describe("getWeekStart", () => {
    it("returns Monday for a Tuesday", () => {
      const tuesday = new Date("2026-06-23"); // Tuesday
      const weekStart = getWeekStart(tuesday);
      expect(weekStart.getDay()).toBe(1); // Monday
      expect(weekStart.getDate()).toBe(22);
    });

    it("returns Monday for a Sunday", () => {
      const sunday = new Date("2026-06-28"); // Sunday
      const weekStart = getWeekStart(sunday);
      expect(weekStart.getDay()).toBe(1);
      expect(weekStart.getDate()).toBe(22);
    });

    it("returns same day for Monday", () => {
      const monday = new Date("2026-06-22"); // Monday
      const weekStart = getWeekStart(monday);
      expect(weekStart.getDate()).toBe(22);
    });

    it("handles month boundaries", () => {
      const march1 = new Date("2026-03-01"); // Sunday
      const weekStart = getWeekStart(march1);
      expect(weekStart.getDate()).toBe(23); // Feb 23
      expect(weekStart.getMonth()).toBe(1); // February
    });
  });

  describe("getWeekDays", () => {
    it("returns 7 days", () => {
      const weekStart = new Date("2026-06-22"); // Monday
      const days = getWeekDays(weekStart);
      expect(days).toHaveLength(7);
    });

    it("starts on Monday", () => {
      const weekStart = new Date("2026-06-22");
      const days = getWeekDays(weekStart);
      expect(days[0]!.getDay()).toBe(1);
    });

    it("ends on Sunday", () => {
      const weekStart = new Date("2026-06-22");
      const days = getWeekDays(weekStart);
      expect(days[6]!.getDay()).toBe(0);
    });
  });

  describe("toDateStr", () => {
    it("formats date correctly", () => {
      const d = new Date("2026-01-05T12:00:00Z");
      expect(toDateStr(d)).toBe("2026-01-05");
    });

    it("pads month and day", () => {
      const d = new Date("2026-03-09T12:00:00Z");
      expect(toDateStr(d)).toBe("2026-03-09");
    });
  });
});

describe("roundTo30", () => {
  function roundTo30(date: Date): Date {
    const rounded = new Date(date);
    const m = rounded.getMinutes();
    if (m >= 0 && m <= 15) {
      rounded.setMinutes(0, 0, 0);
    } else if (m >= 16 && m <= 30) {
      rounded.setMinutes(30, 0, 0);
    } else if (m >= 31 && m <= 45) {
      rounded.setMinutes(30, 0, 0);
    } else {
      rounded.setHours(rounded.getHours() + 1, 0, 0, 0);
    }
    return rounded;
  }

  it("rounds 0-15 down to :00", () => {
    expect(roundTo30(new Date("2026-01-01T10:00:00")).getMinutes()).toBe(0);
    expect(roundTo30(new Date("2026-01-01T10:05:00")).getMinutes()).toBe(0);
    expect(roundTo30(new Date("2026-01-01T10:15:00")).getMinutes()).toBe(0);
  });

  it("rounds 16-30 to :30", () => {
    expect(roundTo30(new Date("2026-01-01T10:16:00")).getMinutes()).toBe(30);
    expect(roundTo30(new Date("2026-01-01T10:25:00")).getMinutes()).toBe(30);
    expect(roundTo30(new Date("2026-01-01T10:30:00")).getMinutes()).toBe(30);
  });

  it("rounds 31-45 to :30", () => {
    expect(roundTo30(new Date("2026-01-01T10:31:00")).getMinutes()).toBe(30);
    expect(roundTo30(new Date("2026-01-01T10:40:00")).getMinutes()).toBe(30);
    expect(roundTo30(new Date("2026-01-01T10:45:00")).getMinutes()).toBe(30);
  });

  it("rounds 46-59 to next hour :00", () => {
    const result = roundTo30(new Date("2026-01-01T10:46:00"));
    expect(result.getHours()).toBe(11);
    expect(result.getMinutes()).toBe(0);
  });

  it("handles midnight rollover", () => {
    const result = roundTo30(new Date("2026-01-01T23:50:00"));
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getDate()).toBe(2);
  });
});
