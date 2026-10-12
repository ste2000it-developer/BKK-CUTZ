import { expect, it } from "vitest";
import { notificationTime, unreadLabel } from "./admin-notifications";
const stamp = (iso: string) => ({ toDate: () => new Date(iso) });
it("uses Bangkok dates across UTC midnight and Thai year for older history", () => {
  const now = new Date("2026-10-12T18:00:00Z");
  expect(notificationTime(stamp("2026-10-12T17:12:00Z"), now)).toBe("วันนี้ 00:12");
  expect(notificationTime(stamp("2026-10-12T16:59:00Z"), now)).toBe("เมื่อวาน 23:59");
  expect(notificationTime(stamp("2026-10-09T02:12:00Z"), now)).toBe("09/10/69 09:12");
});
it("caps unread display without presenting a capped count as exact", () => {
  expect(unreadLabel(0)).toBe("0"); expect(unreadLabel(3)).toBe("3");
  expect(unreadLabel(100)).toBe("100"); expect(unreadLabel(101)).toBe("100+");
});
it("does not invent a time for pending server timestamps", () => {
  expect(notificationTime(null)).toBe("กำลังบันทึกเวลา");
});
