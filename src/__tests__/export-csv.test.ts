describe("CSV export", () => {
  function toCSVRow(values: (string | number)[]): string {
    return values.map((v) => {
      const str = String(v);
      const sanitized = str.replace(/"/g, '""');
      if (/^[=+\-@\t\r]/.test(sanitized)) {
        return `"'${sanitized}"`;
      }
      return `"${sanitized}"`;
    }).join(",");
  }

  describe("toCSVRow", () => {
    it("wraps values in quotes", () => {
      expect(toCSVRow(["hello"])).toBe('"hello"');
    });

    it("escapes double quotes", () => {
      expect(toCSVRow(['say "hello"'])).toBe('"say ""hello"""');
    });

    it("handles numbers", () => {
      expect(toCSVRow([42])).toBe('"42"');
    });

    it("handles mixed types", () => {
      expect(toCSVRow(["name", 100, "city"])).toBe('"name","100","city"');
    });

    it("prevents CSV injection with =", () => {
      expect(toCSVRow(['=SUM(A1:A10)'])).toBe("\"'=SUM(A1:A10)\"");
    });

    it("prevents CSV injection with +", () => {
      expect(toCSVRow(['+cmd|\' /C calc\'!A0'])).toBe("\"'+cmd|' /C calc'!A0\"");
    });

    it("prevents CSV injection with -", () => {
      expect(toCSVRow(['-cmd'])).toBe("\"'-cmd\"");
    });

    it("prevents CSV injection with @", () => {
      expect(toCSVRow(['@SUM(1,1)'])).toBe("\"'@SUM(1,1)\"");
    });

    it("prevents CSV injection with tab", () => {
      expect(toCSVRow(['\tformula'])).toBe("\"'\tformula\"");
    });

    it("prevents CSV injection with carriage return", () => {
      expect(toCSVRow(['\rformula'])).toBe("\"'\rformula\"");
    });

    it("does not inject safe strings", () => {
      expect(toCSVRow(["Иванов"])).toBe('"Иванов"');
      expect(toCSVRow(["$100"])).toBe('"$100"');
      expect(toCSVRow(["100%"])).toBe('"100%"');
    });

    it("joins multiple values with commas", () => {
      expect(toCSVRow(["a", "b", "c"])).toBe('"a","b","c"');
    });

    it("handles empty string", () => {
      expect(toCSVRow([""])).toBe('""');
    });
  });
});
