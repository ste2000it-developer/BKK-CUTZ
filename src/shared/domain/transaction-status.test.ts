import { expect, it } from "vitest";
import { isVoidedTransaction } from "./transaction-status";

it("treats legacy and completed transactions as active", () => {
  expect(isVoidedTransaction({})).toBe(false);
  expect(isVoidedTransaction({ status: "completed" })).toBe(false);
});

it("recognizes explicit void markers", () => {
  expect(isVoidedTransaction({ status: "voided" })).toBe(true);
  expect(isVoidedTransaction({ status: "cancelled" })).toBe(true);
  expect(isVoidedTransaction({ voidedAt: { seconds: 1 } })).toBe(true);
});
