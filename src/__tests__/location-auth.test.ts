import { isIPAllowed, getClientIP } from "../lib/location-auth";

describe("isIPAllowed - comprehensive", () => {
  describe("exact IP matching", () => {
    it("matches exact IP", () => {
      expect(isIPAllowed("192.168.1.1", ["192.168.1.1"])).toBe(true);
    });

    it("rejects different IP", () => {
      expect(isIPAllowed("192.168.1.1", ["192.168.1.2"])).toBe(false);
    });

    it("rejects partial match", () => {
      expect(isIPAllowed("192.168.1.10", ["192.168.1.1"])).toBe(false);
    });

    it("handles localhost", () => {
      expect(isIPAllowed("127.0.0.1", ["127.0.0.1"])).toBe(true);
    });
  });

  describe("CIDR matching", () => {
    it("matches /24 subnet", () => {
      expect(isIPAllowed("192.168.1.50", ["192.168.1.0/24"])).toBe(true);
    });

    it("rejects outside /24 subnet", () => {
      expect(isIPAllowed("192.168.2.50", ["192.168.1.0/24"])).toBe(false);
    });

    it("matches /16 subnet", () => {
      expect(isIPAllowed("10.0.5.1", ["10.0.0.0/16"])).toBe(true);
    });

    it("rejects outside /16 subnet", () => {
      expect(isIPAllowed("11.0.0.1", ["10.0.0.0/16"])).toBe(false);
    });

    it("matches /8 subnet", () => {
      expect(isIPAllowed("10.255.255.255", ["10.0.0.0/8"])).toBe(true);
    });

    it("rejects outside /8 subnet", () => {
      expect(isIPAllowed("11.0.0.1", ["10.0.0.0/8"])).toBe(false);
    });

    it("rejects invalid CIDR format", () => {
      expect(isIPAllowed("192.168.1.1", ["not-a-cidr/24"])).toBe(false);
    });

    it("handles /32 CIDR (single host)", () => {
      expect(isIPAllowed("192.168.1.1", ["192.168.1.1/32"])).toBe(true);
      expect(isIPAllowed("192.168.1.2", ["192.168.1.1/32"])).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("returns false for empty allowed list", () => {
      expect(isIPAllowed("192.168.1.1", [])).toBe(false);
    });

    it("handles whitespace in IPs", () => {
      expect(isIPAllowed(" 192.168.1.1 ", ["192.168.1.1"])).toBe(true);
    });

    it("handles multiple allowed IPs", () => {
      expect(isIPAllowed("10.0.0.1", ["192.168.1.1", "10.0.0.1"])).toBe(true);
      expect(isIPAllowed("172.16.0.1", ["192.168.1.1", "10.0.0.1"])).toBe(false);
    });

    it("handles mixed exact and CIDR", () => {
      expect(isIPAllowed("192.168.1.50", ["10.0.0.0/8", "192.168.1.50"])).toBe(true);
      expect(isIPAllowed("172.16.0.1", ["10.0.0.0/8", "192.168.1.50"])).toBe(false);
    });

    it("handles empty strings in list", () => {
      expect(isIPAllowed("192.168.1.1", ["", "192.168.1.1"])).toBe(true);
      expect(isIPAllowed("192.168.1.1", ["", ""])).toBe(false);
    });
  });
});

describe("getClientIP", () => {
  function createRequest(headers: Record<string, string>): Request {
    return new Request("http://localhost", { headers });
  }

  it("extracts IP from x-forwarded-for", () => {
    const req = createRequest({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" });
    expect(getClientIP(req)).toBe("1.2.3.4");
  });

  it("extracts IP from x-real-ip", () => {
    const req = createRequest({ "x-real-ip": "1.2.3.4" });
    expect(getClientIP(req)).toBe("1.2.3.4");
  });

  it("strips ::ffff: prefix", () => {
    const req = createRequest({ "x-forwarded-for": "::ffff:192.168.1.1" });
    expect(getClientIP(req)).toBe("192.168.1.1");
  });

  it("returns 127.0.0.1 when no headers", () => {
    const req = createRequest({});
    expect(getClientIP(req)).toBe("127.0.0.1");
  });

  it("prefers x-forwarded-for over x-real-ip", () => {
    const req = createRequest({
      "x-forwarded-for": "1.1.1.1",
      "x-real-ip": "2.2.2.2",
    });
    expect(getClientIP(req)).toBe("1.1.1.1");
  });
});
