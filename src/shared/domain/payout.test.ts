import { describe, expect, it } from "vitest";
import {
  buildPayoutRows,
  calculateTransactionCommission,
  createPayoutWriteData,
  getPayoutCycle,
  getPayoutCycleForWorkDate,
} from "./payout";

describe("payout calculations", () => {
  it("applies commission caps, barber guarantee, tips, and attendance-only days", () => {
    const rows = buildPayoutRows(
      [
        {
          id: "transaction-1",
          barberId: "barber01",
          barberName: "ช่างเอ",
          dateKey: "2026-01-15",
          branchId: "branch-a",
          services: [
            { price: 100 },
            { price: 300 },
            { price: 0 },
          ],
          tipAmount: 25,
        },
      ],
      [
        {
          barberId: "barber01",
          barberName: "ช่างเอ",
          dateKey: "2026-01-16",
          branchName: "สาขาบี",
        },
      ],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      barberId: "barber01",
      guaranteeBase: 500,
      workDays: 2,
      transactionCount: 1,
      commissionAmount: 150,
      guaranteeAmount: 850,
      tipAmount: 25,
      totalAmount: 1025,
      transactionIds: ["transaction-1"],
    });
    expect(rows[0].dailyBreakdown).toEqual([
      {
        dateKey: "2026-01-15",
        worked: true,
        branches: ["branch-a"],
        transactionCount: 1,
        commissionAmount: 150,
        guaranteeAmount: 350,
        tipAmount: 25,
        totalAmount: 525,
      },
      {
        dateKey: "2026-01-16",
        worked: true,
        branches: ["สาขาบี"],
        transactionCount: 0,
        commissionAmount: 0,
        guaranteeAmount: 500,
        tipAmount: 0,
        totalAmount: 500,
      },
    ]);
    expect(rows[0].days.get("2026-01-16")?.branches).toEqual(
      new Set(["สาขาบี"]),
    );
  });

  it("uses the standard guarantee and excludes invalid commission prices", () => {
    expect(
      calculateTransactionCommission({
        services: [
          { price: 200 },
          { price: 250 },
          { price: -10 },
          { price: "invalid" },
        ],
      }),
    ).toBe(200);

    const rows = buildPayoutRows([], [
      {
        barberId: "barber02",
        dateKey: "2026-01-08",
      },
    ]);

    expect(rows[0]).toMatchObject({
      guaranteeBase: 400,
      workDays: 1,
      guaranteeAmount: 400,
      totalAmount: 400,
    });
  });

  it("maps work dates on each half-month boundary to the matching payout cycle", () => {
    expect(getPayoutCycleForWorkDate("2026-01-15")).toMatchObject({
      payoutDateKey: "2026-01-16",
      startKey: "2026-01-01",
      endKey: "2026-01-15",
    });
    expect(getPayoutCycleForWorkDate("2026-01-16")).toMatchObject({
      payoutDateKey: "2026-02-01",
      startKey: "2026-01-16",
      endKey: "2026-01-31",
    });
  });

  it("returns no payout cycle for an invalid work date", () => {
    expect(getPayoutCycleForWorkDate("not-a-date")).toBeNull();
  });

  it("builds the persisted payout snapshot with the established field names", () => {
    const cycle = getPayoutCycle(new Date(2026, 0, 16));
    const [row] = buildPayoutRows(
      [
        {
          id: "transaction-7",
          barberId: "barber02",
          barberName: "ช่างบี",
          dateKey: "2026-01-08",
          branchId: "branch-c",
          services: [{ price: 200 }],
          tipAmount: 30,
        },
      ],
      [],
    );

    expect(createPayoutWriteData(cycle, row, {
      uid: "admin-uid",
      email: "admin@example.com",
    })).toEqual({
      payoutCycleId: "2026-01-16",
      payoutDate: "2026-01-16",
      periodStart: "2026-01-01",
      periodEnd: "2026-01-15",
      barberId: "barber02",
      barberName: "ช่างบี",
      workDays: 1,
      transactionCount: 1,
      commissionAmount: 100,
      guaranteeAmount: 300,
      tipAmount: 30,
      totalAmount: 430,
      guaranteeBase: 400,
      dailyBreakdown: [
        {
          dateKey: "2026-01-08",
          branches: ["branch-c"],
          transactionCount: 1,
          commissionAmount: 100,
          guaranteeAmount: 300,
          tipAmount: 30,
          totalAmount: 430,
        },
      ],
      transactionIds: ["transaction-7"],
      status: "paid",
      paidByUid: "admin-uid",
      paidByEmail: "admin@example.com",
    });
  });
});