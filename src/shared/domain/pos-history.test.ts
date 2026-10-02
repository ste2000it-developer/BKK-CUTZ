import { expect, it } from "vitest";
import { filterHistory, historyAmounts, historyBarbers, historyServices } from "./pos-history";
it("renders legacy total fallback, tips and stored totals without recalculating historical prices", () => {
  expect(historyAmounts({ id: "a", total: 100, tipAmount: 20 })).toEqual({ serviceTotal: 100, tipAmount: 20, grandTotal: 120 });
  expect(historyAmounts({ id: "a", total: 100, serviceTotal: 0, grandTotal: 0 })).toEqual({ serviceTotal: 0, tipAmount: 0, grandTotal: 0 });
  expect(historyServices({ id: "a", services: [{ name: "Cut", price: 200 }, { name: "Discount", price: -100, detail: "50%" }] })).toEqual([
    { name: "Cut", price: 200, detail: "" }, { name: "Discount", price: -100, detail: "50%" },
  ]);
  expect(historyServices({ id: "a", services: null })).toEqual([]);
});
it("deduplicates barber filters and keeps all or selected records", () => {
  const rows = [{ id: "1", barberId: "a", barberName: "A" }, { id: "2", barberId: "b", barberName: "B" }, { id: "3", barberId: "a", barberName: "A" }];
  expect(historyBarbers(rows)).toEqual([{ id: "a", name: "A" }, { id: "b", name: "B" }]);
  expect(filterHistory(rows, "all")).toHaveLength(3); expect(filterHistory(rows, "a").map((row) => row.id)).toEqual(["1", "3"]);
});
