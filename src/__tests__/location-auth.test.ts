import { isIPAllowed } from "../lib/location-auth";

describe("isIPAllowed", () => {
  it("should return true for exact match", () => {
    expect(isIPAllowed("192.168.1.100", ["192.168.1.100"])).toBe(true);
  });

  it("should return false for different IP", () => {
    expect(isIPAllowed("192.168.1.100", ["192.168.1.200"])).toBe(false);
  });

  it("should return false for empty allowed list", () => {
    expect(isIPAllowed("192.168.1.100", [])).toBe(false);
  });

  it("should handle multiple allowed IPs", () => {
    expect(isIPAllowed("192.168.1.100", ["10.0.0.1", "192.168.1.100"])).toBe(true);
    expect(isIPAllowed("192.168.1.100", ["10.0.0.1", "192.168.1.200"])).toBe(false);
  });

  it("should handle empty strings in allowed list", () => {
    expect(isIPAllowed("192.168.1.100", ["", "192.168.1.100"])).toBe(true);
    expect(isIPAllowed("192.168.1.100", ["", ""])).toBe(false);
  });

  it("should handle case insensitivity", () => {
    expect(isIPAllowed("192.168.1.100", ["192.168.1.100"])).toBe(true);
    expect(isIPAllowed("192.168.1.100", ["192.168.1.100"])).toBe(true);
  });
});
