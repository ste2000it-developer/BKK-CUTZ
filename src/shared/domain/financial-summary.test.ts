import { describe, expect, it } from "vitest";
import { calculateFinancialSummary } from "./financial-summary";

describe("calculateFinancialSummary", () => {
  it("calculates revenue, expenses, and net profit accurately", () => {
    const transactions = [
      { id: "t1", branchId: "b1", serviceTotal: 500, tipAmount: 50, grandTotal: 550, paymentMethod: "cash" },
      { id: "t2", branchId: "b1", serviceTotal: 300, tipAmount: 0, grandTotal: 300, paymentMethod: "scan" },
    ];
    const payouts = [
      { id: "p1", barberId: "barber1", totalAmount: 400, branchId: "b1" },
    ];
    const shopExpenses = [
      { id: "e1", branchId: "b1", branchName: "สาขา 1", barberName: "ช่างเอก", amount: 120, reason: "ซื้อแชมพู", dateKey: "2026-10-07", createdAt: "", source: "pos" as const },
    ];
    const advances = [
      { id: "a1", barberId: "barber1", barberName: "ช่างเอก", branchId: "b1", amount: 200, dateKey: "2026-10-07", createdAt: "", status: "active" as const },
    ];

    const summary = calculateFinancialSummary({
      transactions,
      payouts,
      shopExpenses,
      advances,
    });

    expect(summary.serviceRevenue).toBe(800);
    expect(summary.tipRevenue).toBe(50);
    expect(summary.totalRevenue).toBe(850);
    expect(summary.cashRevenue).toBe(550);
    expect(summary.scanRevenue).toBe(300);
    expect(summary.transactionCount).toBe(2);

    expect(summary.barberPayoutTotal).toBe(400);
    expect(summary.shopExpenseTotal).toBe(120);
    expect(summary.barberAdvanceTotal).toBe(200);
    expect(summary.totalExpenses).toBe(720); // 400 + 120 + 200

    expect(summary.netTotal).toBe(130); // 850 - 720
    expect(summary.marginPercent).toBeCloseTo(15.3, 1);
  });

  it("filters correctly by branchId", () => {
    const transactions = [
      { id: "t1", branchId: "b1", serviceTotal: 500, paymentMethod: "cash" },
      { id: "t2", branchId: "b2", serviceTotal: 1000, paymentMethod: "scan" },
    ];
    const payouts = [
      { id: "p1", barberId: "barber1", totalAmount: 250, branchId: "b1" },
      { id: "p2", barberId: "barber2", totalAmount: 500, branchId: "b2" },
    ];
    const shopExpenses = [
      { id: "e1", branchId: "b1", branchName: "B1", barberName: "ช่าง1", amount: 50, reason: "ทิชชู่", dateKey: "2026-10-07", createdAt: "", source: "pos" as const },
      { id: "e2", branchId: "b2", branchName: "B2", barberName: "ช่าง2", amount: 100, reason: "ใบมีด", dateKey: "2026-10-07", createdAt: "", source: "pos" as const },
    ];
    const advances = [
      { id: "a1", barberId: "barber1", barberName: "ช่าง1", branchId: "b1", amount: 100, dateKey: "2026-10-07", createdAt: "", status: "active" as const },
      { id: "a2", barberId: "barber2", barberName: "ช่าง2", branchId: "b2", amount: 300, dateKey: "2026-10-07", createdAt: "", status: "active" as const },
    ];

    const summary = calculateFinancialSummary({
      transactions,
      payouts,
      shopExpenses,
      advances,
      branchId: "b1",
    });

    expect(summary.totalRevenue).toBe(500);
    expect(summary.shopExpenseTotal).toBe(50);
    expect(summary.barberAdvanceTotal).toBe(100);
    expect(summary.barberPayoutTotal).toBe(250);
    expect(summary.totalExpenses).toBe(400);
    expect(summary.netTotal).toBe(100);
  });
  it("matches payout daily branch names to branch IDs and only counts that branch's days", () => {
    const payouts = [
      {
        id: "p1",
        barberId: "barber1",
        totalAmount: 700,
        dailyBreakdown: [
          { dateKey: "2026-09-20", branches: ["สะพานใหม่"], totalAmount: 300 },
          { dateKey: "2026-09-21", branches: ["ม.รังสิต"], totalAmount: 400 },
        ],
      },
    ];

    const summary = calculateFinancialSummary({
      transactions: [],
      payouts,
      shopExpenses: [],
      advances: [],
      branchId: "b001",
      branches: [
        { id: "b001", name: "สะพานใหม่" },
        { id: "b002", name: "ม.รังสิต" },
      ],
    });

    expect(summary.barberPayoutTotal).toBe(300);
    expect(summary.barberPayoutCount).toBe(1);
  });

  it("does not duplicate a whole payout when one barber worked multiple branches in the same cycle", () => {
    const payout = {
      id: "p1",
      barberId: "barber1",
      totalAmount: 700,
      dailyBreakdown: [
        { dateKey: "2026-09-20", branches: ["B1"], totalAmount: 300 },
        { dateKey: "2026-09-21", branches: ["B2"], totalAmount: 400 },
      ],
    };
    const branches = [
      { id: "b1", name: "B1" },
      { id: "b2", name: "B2" },
    ];

    const b1 = calculateFinancialSummary({
      transactions: [], payouts: [payout], shopExpenses: [], advances: [], branchId: "b1", branches,
    });
    const b2 = calculateFinancialSummary({
      transactions: [], payouts: [payout], shopExpenses: [], advances: [], branchId: "b2", branches,
    });

    expect(b1.barberPayoutTotal).toBe(300);
    expect(b2.barberPayoutTotal).toBe(400);
    expect(b1.barberPayoutTotal + b2.barberPayoutTotal).toBe(700);
  });

  it("splits legacy same-day multi-branch payout data without double counting", () => {
    const payout = {
      id: "p1",
      barberId: "barber1",
      totalAmount: 400,
      dailyBreakdown: [
        { dateKey: "2026-09-20", branches: ["b1", "B2"], totalAmount: 400 },
      ],
    };
    const branches = [
      { id: "b1", name: "B1" },
      { id: "b2", name: "B2" },
    ];

    const b1 = calculateFinancialSummary({
      transactions: [], payouts: [payout], shopExpenses: [], advances: [], branchId: "b1", branches,
    });
    const b2 = calculateFinancialSummary({
      transactions: [], payouts: [payout], shopExpenses: [], advances: [], branchId: "b2", branches,
    });

    expect(b1.barberPayoutTotal).toBe(200);
    expect(b2.barberPayoutTotal).toBe(200);
  });

  it("excludes voided sales from revenue and transaction counts", () => {
    const summary = calculateFinancialSummary({
      transactions: [
        { id: "active", branchId: "b1", serviceTotal: 300, tipAmount: 20, grandTotal: 320, paymentMethod: "cash" },
        { id: "voided", branchId: "b1", serviceTotal: 500, tipAmount: 50, grandTotal: 550, paymentMethod: "cash", status: "voided", voidedAt: { seconds: 1 } },
      ],
      payouts: [],
      shopExpenses: [],
      advances: [],
    });

    expect(summary.transactionCount).toBe(1);
    expect(summary.serviceRevenue).toBe(300);
    expect(summary.tipRevenue).toBe(20);
    expect(summary.totalRevenue).toBe(320);
    expect(summary.cashRevenue).toBe(320);
  });

});
