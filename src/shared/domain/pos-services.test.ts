import { describe, expect, it } from "vitest";
import {
  calculatePosServiceTotal,
  getHaircutDiscountAmount,
  makeSelectedService,
} from "./pos-services";

describe("POS service selection domain", () => {
  it("keeps the transaction service snapshot fields and display labels", () => {
    expect(makeSelectedService({
      id: "haircut",
      groupId: "A",
      name: "ตัดผม",
      type: "fixed",
      serviceCode: "haircut",
      price: 200,
    }, 200)).toEqual({
      id: "haircut",
      serviceCode: "haircut",
      name: "ตัดผม",
      type: "fixed",
      price: 200,
      basePrice: 200,
    });
    expect(makeSelectedService({
      id: "free",
      groupId: "A",
      name: "free",
      type: "free_cut",
    }, -200, { discountAmount: 200, targetServiceCode: "haircut" }).name)
      .toBe("ตัดผมฟรี 1 ครั้ง");
  });

  it("rounds percentage discounts and keeps totals from going below zero", () => {
    const haircut = {
      id: "haircut",
      serviceCode: "haircut",
      name: "ตัดผม",
      type: "fixed",
      price: 101,
      basePrice: 101,
    };
    expect(getHaircutDiscountAmount({
      id: "half",
      groupId: "A",
      name: "ลดครึ่ง",
      type: "half_cut",
      discountPercent: 50,
    }, haircut)).toBe(51);
    expect(calculatePosServiceTotal([
      haircut,
      { ...haircut, id: "discount", price: -200 },
    ])).toBe(0);
  });
});