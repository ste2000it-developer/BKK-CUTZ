import { describe, expect, it } from "vitest";
import { createShopExpenseId, saveShopExpense } from "./shop-expenses";

describe("shop-expenses repository", () => {
  it("validates input fields correctly", async () => {
    await expect(saveShopExpense({
      branchId: "b1",
      branchName: "สาขา 1",
      barberName: "ช่างเอก",
      amount: 0,
      reason: "ซื้อของ",
    })).rejects.toThrow("ต้องมากกว่า 0 บาท");

    await expect(saveShopExpense({
      branchId: "b1",
      branchName: "สาขา 1",
      barberName: "",
      amount: 100,
      reason: "ซื้อของ",
    })).rejects.toThrow("กรุณาระบุชื่อผู้เบิก");

    await expect(saveShopExpense({
      branchId: "b1",
      branchName: "สาขา 1",
      barberName: "ช่างเอก",
      amount: 100,
      reason: "   ",
    })).rejects.toThrow("กรุณาระบุรายการที่ซื้อ");
  });

  it("generates unique expense IDs starting with exp_", () => {
    const id = createShopExpenseId();
    expect(id).toMatch(/^exp_/);
  });
});
