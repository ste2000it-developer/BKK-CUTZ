import { expect, it } from "vitest";
import { buildBranchNetwork, shiftNetworkDate, type NetworkData } from "./branch-network";
const day = "2026-10-13";
const data = (): NetworkData => ({ branches: [{ id: "a", name: "สาขาเอ", active: false }, { id: "b", name: "สาขาบี" }], transactions: [], presence: [], closings: [] });
it("counts checked-out attendance in history without applying today's disabled state", () => {
  const source = data();
  const barber = { id: "one", barberId: "one", branchId: "a", dateKey: day, active: false, attended: true };
  source.presence = [barber, { ...barber, id: "duplicate" }, { ...barber, id: "wrong-day", barberId: "two", dateKey: "2026-10-12" }];
  source.closings = [{ id: "close", branchId: "a", dateKey: day }];
  const nodes = buildBranchNetwork(source, day, true);
  const branch = nodes.find(b => b.id === "a")!;
  const empty = nodes.find(b => b.id === "b")!;
  expect(branch.barbers).toHaveLength(1);
  expect(branch.status).toBe("closed");
  expect(empty.status).toBe("unknown");
  expect(buildBranchNetwork(source, day).find(b => b.id === "a")).toMatchObject({ status: "disabled", barbers: [] });
});
it("includes historical branches absent from today's directory and excludes cancelled or other-day sales", () => {
  const source = data();
  source.transactions = [
    { id: "sale", branchId: "old", branchName: "สาขาเก่า", dateKey: day, serviceTotal: 100.10, tipAmount: 20.20 },
    { id: "legacy", branchId: "old", dateKey: day, total: 50 },
    { id: "void", branchId: "old", dateKey: day, total: 999, status: "voided" },
    { id: "other", branchId: "old", dateKey: "2026-10-14", total: 999 },
  ];
  expect(buildBranchNetwork(source, day, true).find(b => b.id === "old")).toMatchObject({ name: "สาขาเก่า", sales: 170.3, tips: 20.2, bills: 2, status: "recorded" });
});
it("keeps live presence limited to active barbers", () => {
  const source = data();
  source.presence = [{ id: "one", barberId: "one", branchId: "b", dateKey: day, active: true }, { id: "two", barberId: "two", branchId: "b", dateKey: day, active: false }];
  expect(buildBranchNetwork(source, day).find(b => b.id === "b")).toMatchObject({ status: "working", barbers: [source.presence[0]] });
});
it("navigates across months, years and leap days", () => {
  expect(shiftNetworkDate("2026-01-01", -1)).toBe("2025-12-31");
  expect(shiftNetworkDate("2024-03-01", -1)).toBe("2024-02-29");
  expect(shiftNetworkDate("2026-09-30", 1)).toBe("2026-10-01");
});

it("sorts branches by code using numeric order, independently of name and active status", () => {
  const source = data();
  source.branches = [{ id: "BKK-10", name: "A" }, { id: "BKK-2", name: "Z", active: false }, { id: "BKK-1", name: "Y" }];
  expect(buildBranchNetwork(source, day).map(b => b.id)).toEqual(["BKK-1", "BKK-2", "BKK-10"]);
  expect(buildBranchNetwork(source, day, true).map(b => b.id)).toEqual(["BKK-1", "BKK-2", "BKK-10"]);
});
