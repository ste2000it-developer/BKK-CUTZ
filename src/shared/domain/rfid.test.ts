import { describe, expect, it } from "vitest";
import { findBarberByRfid, normalizeRfidUid } from "./rfid";

describe("normalizeRfidUid", () => {
  it("normalizes case and removes separators", () => {
    expect(normalizeRfidUid("04:ab-cd 12")).toBe("04ABCD12");
  });

  it("returns an empty string for missing or non-hex input", () => {
    expect(normalizeRfidUid(null)).toBe("");
    expect(normalizeRfidUid("  xyz ")).toBe("");
  });
});

describe("findBarberByRfid", () => {
  const barbers = [
    { id: "barber-1", name: "A", rfidUid: "04:AB:CD" },
    { id: "barber-2", name: "B", rfidUid: "1234" },
  ];

  it("matches normalized card UIDs", () => {
    expect(findBarberByRfid(barbers, "04ab-cd")).toEqual({
      barber: barbers[0],
      error: null,
    });
  });

  it("returns the existing errors for missing and unknown cards", () => {
    expect(findBarberByRfid(barbers, " ").error).toBe(
      "ไม่พบ UID ของบัตร",
    );
    expect(findBarberByRfid(barbers, "FFFF").error).toBe(
      "ไม่พบบัตรนี้ในระบบ",
    );
  });

  it("rejects a UID assigned to multiple barbers", () => {
    const duplicateBarbers = [
      ...barbers,
      { id: "barber-3", name: "C", rfidUid: "04ABCD" },
    ];

    expect(findBarberByRfid(duplicateBarbers, "04ABCD")).toEqual({
      barber: null,
      error: "บัตร RFID นี้ถูกผูกกับช่างมากกว่า 1 คน กรุณาแก้ข้อมูลในระบบ",
    });
  });
});