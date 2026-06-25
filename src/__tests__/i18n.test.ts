import ru from "../i18n/ru.json";
import ro from "../i18n/ro.json";

describe("i18n translations", () => {
  const ruKeys = Object.keys(ru);
  const roKeys = Object.keys(ro);

  describe("ru.json", () => {
    it("has all required keys", () => {
      const requiredKeys = [
        "app.title", "nav.dashboard", "shift.start", "shift.end",
        "salary.title", "schedule.title", "settings.title",
        "auth.accessDenied", "common.loading", "employee.hello",
        "month.january", "day.mon",
      ];
      for (const key of requiredKeys) {
        expect(ruKeys).toContain(key);
      }
    });

    it("has all month names", () => {
      const months = [
        "month.january", "month.february", "month.march", "month.april",
        "month.may", "month.june", "month.july", "month.august",
        "month.september", "month.october", "month.november", "month.december",
      ];
      for (const m of months) {
        expect(ruKeys).toContain(m);
      }
    });

    it("has all day names", () => {
      const days = ["day.mon", "day.tue", "day.wed", "day.thu", "day.fri", "day.sat", "day.sun"];
      for (const d of days) {
        expect(ruKeys).toContain(d);
      }
    });

    it("has schedule types", () => {
      expect(ruKeys).toContain("schedule.work");
      expect(ruKeys).toContain("schedule.off");
      expect(ruKeys).toContain("schedule.vacation");
      expect(ruKeys).toContain("schedule.sick");
    });

    it("has schedule abbreviations", () => {
      expect(ruKeys).toContain("schedule.abbrWork");
      expect(ruKeys).toContain("schedule.abbrOff");
      expect(ruKeys).toContain("schedule.abbrVacation");
      expect(ruKeys).toContain("schedule.abbrSick");
    });

    it("has no empty values", () => {
      for (const [, value] of Object.entries(ru)) {
        expect(typeof value).toBe("string");
        expect((value as string).length).toBeGreaterThan(0);
      }
    });
  });

  describe("ro.json", () => {
    it("has same keys as ru.json", () => {
      expect(roKeys.sort()).toEqual(ruKeys.sort());
    });

    it("has no empty values", () => {
      for (const [, value] of Object.entries(ro)) {
        expect(typeof value).toBe("string");
        expect((value as string).length).toBeGreaterThan(0);
      }
    });
  });
});
