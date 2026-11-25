import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { AppSelect } from "./AppSelect";
import { AdminDateNavigator, adminDateLabel, shiftAdminDate } from "./AdminDateNavigator";
import { floatingPanelPlacement } from "./floating-panel";

describe("Admin shared UI contracts", () => {
  it("renders the same date navigator on all daily history pages", () => {
    const html = renderToStaticMarkup(createElement(AdminDateNavigator, {
      value: "2026-11-25",
      maxDate: "2026-11-25",
      onChange: () => undefined,
      label: "เลือกวันที่ขาย",
    }));
    expect(html).toContain("25 พฤศจิกายน 2569");
    expect(html).toContain('aria-label="วันก่อนหน้า"');
    expect(html).toContain('aria-label="วันถัดไป"');
    expect(html).toContain("disabled");
    expect(html).toContain('aria-haspopup="dialog"');
    expect(html).not.toContain('type="date"');
  });

  it("navigates calendar days across month and leap-year boundaries", () => {
    expect(shiftAdminDate("2026-11-01", -1)).toBe("2026-10-31");
    expect(shiftAdminDate("2026-11-30", 1)).toBe("2026-12-01");
    expect(shiftAdminDate("2024-02-28", 1)).toBe("2024-02-29");
    expect(adminDateLabel("2026-11-01")).toContain("2569");
  });

  it("renders the same accessible dropdown control for branch and payout filters", () => {
    const select = (value: string) => renderToStaticMarkup(createElement(AppSelect, {
      "aria-label": "เลือกสาขา",
      value,
      onChange: () => undefined,
      children: [
        createElement("option", { value: "all", key: "all" }, "ทุกสาขา"),
        createElement("option", { value: "a", key: "a" }, "สาขา A"),
      ],
    }));
    const html = select("all");
    expect(html).toContain("app-select-trigger");
    expect(html).toContain('aria-haspopup="listbox"');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("ทุกสาขา");
    expect(html).not.toContain("<select");
    expect(select("a")).toContain("สาขา A");
  });
  it("positions both dropdowns and calendars inside their available viewport", () => {
    const viewport = { top: 0, bottom: 750 };
    const nearTop = floatingPanelPlacement({ top: 90, bottom: 138 }, viewport, 292, 7);
    expect(nearTop).toEqual({ openAbove: false, maxHeight: 292 });

    const nearBottom = floatingPanelPlacement({ top: 650, bottom: 698 }, viewport, 292, 7);
    expect(nearBottom).toEqual({ openAbove: true, maxHeight: 292 });

    const cramped = floatingPanelPlacement({ top: 165, bottom: 213 }, { top: 0, bottom: 320 }, 290);
    expect(cramped.openAbove).toBe(true);
    expect(cramped.maxHeight).toBeLessThanOrEqual(146);

    // Visual viewport may be offset while the mobile keyboard is visible.
    const offset = floatingPanelPlacement({ top: 420, bottom: 468 }, { top: 300, bottom: 550 }, 270);
    expect(offset).toEqual({ openAbove: true, maxHeight: 101 });
  });

});
