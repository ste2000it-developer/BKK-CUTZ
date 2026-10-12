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
        advanceAmount: 0,
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
        advanceAmount: 0,
        totalAmount: 500,
      },
    ]);
    expect(rows[0].days.get("2026-01-16")?.branches).toEqual(
      new Set(["สาขาบี"]),
    );
  });

  it("deducts barber advances from payout total and daily breakdown", () => {
    const rows = buildPayoutRows(
      [
        {
          id: "t-1",
          barberId: "barber01",
          barberName: "ช่างเอ",
          dateKey: "2026-01-10",
          services: [{ price: 300 }],
        },
      ],
      [],
      [
        {
          id: "adv-1",
          barberId: "barber01",
          barberName: "ช่างเอ",
          amount: 200,
          dateKey: "2026-01-10",
          reason: "เบิกล่วงหน้า",
        },
      ],
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      barberId: "barber01",
      commissionAmount: 100,
      guaranteeAmount: 400,
      grossAmount: 500,
      advanceAmount: 200,
      totalAmount: 300,
    });
    expect(rows[0].advances).toHaveLength(1);
    expect(rows[0].advances[0]).toMatchObject({
      id: "adv-1",
      amount: 200,
      reason: "เบิกล่วงหน้า",
    });
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
      grossAmount: 430,
      currentAdvanceAmount: 0,
      previousAdvanceCarryoverAmount: 0,
      advanceAmount: 0,
      advanceCarryoverAmount: 0,
      advanceIds: [],
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
          advanceAmount: 0,
          totalAmount: 430,
        },
      ],
      transactionIds: ["transaction-7"],
      status: "paid",
      paidByUid: "admin-uid",
      paidByEmail: "admin@example.com",
    });
  });

  it("deducts tip advances directly from tipAmount and calculates total correctly", () => {
    const transactions = [
      {
        id: "tx-tip-1",
        barberId: "barber01",
        barberName: "ช่างเอ",
        dateKey: "2026-01-10",
        services: [{ price: 300 }],
        tipAmount: 100, // customer transferred 100 tip
      },
    ];
    const advances = [
      {
        id: "adv-tip-1",
        barberId: "barber01",
        barberName: "ช่างเอ",
        dateKey: "2026-01-10",
        amount: 60, // barber took 60 tip in cash from drawer
        type: "tip",
        reason: "เบิกทิปเงินสด",
      },
      {
        id: "adv-regular-1",
        barberId: "barber01",
        barberName: "ช่างเอ",
        dateKey: "2026-01-10",
        amount: 200, // regular advance against wage
        type: "advance",
        reason: "เบิกค่าแรงล่วงหน้า",
      },
    ];

    const rows = buildPayoutRows(transactions, [], advances);
    expect(rows).toHaveLength(1);
    const row = rows[0];

    // Commission: flat 100 (for 300 haircut)
    // Guarantee: 500 guarantee base - 100 commission = 400
    // Gross tip: 100
    // Tip advance: 60
    // Net tip: 100 - 60 = 40
    // Regular advance: 200
    // Gross amount: 100 + 400 + 40 = 540
    // Total amount: 540 - 200 = 340
    expect(row).toMatchObject({
      commissionAmount: 100,
      guaranteeAmount: 400,
      grossTipAmount: 100,
      tipAdvanceAmount: 60,
      tipAmount: 40, // net tip in system
      advanceAmount: 200, // regular advance
      grossAmount: 540,
      totalAmount: 340,
    });

    const day = row.dailyBreakdown[0];
    expect(day).toMatchObject({
      dateKey: "2026-01-10",
      tipAmount: 40,
      advanceAmount: 200,
      totalAmount: 340,
    });
  });

  it("floors payout at zero and carries excess advance to the next period", () => {
    const [row] = buildPayoutRows(
      [
        {
          id: "tx-carry-1",
          barberId: "barber01",
          barberName: "ช่างเอ",
          dateKey: "2026-01-10",
          services: [{ price: 300 }],
        },
      ],
      [],
      [
        {
          id: "adv-carry-1",
          barberId: "barber01",
          barberName: "ช่างเอ",
          dateKey: "2026-01-10",
          amount: 800,
          type: "advance",
        },
      ],
    );

    // Gross = 500 (100 commission + 400 guarantee), advance = 800.
    expect(row).toMatchObject({
      grossAmount: 500,
      currentAdvanceAmount: 800,
      previousAdvanceCarryoverAmount: 0,
      advanceAmount: 500,
      advanceCarryoverAmount: 300,
      totalAmount: 0,
    });
  });

  it("deducts previous carryover before paying the next period", () => {
    const [row] = buildPayoutRows(
      [
        {
          id: "tx-next-1",
          barberId: "barber01",
          barberName: "ช่างเอ",
          dateKey: "2026-01-20",
          services: [{ price: 300 }],
        },
        {
          id: "tx-next-2",
          barberId: "barber01",
          barberName: "ช่างเอ",
          dateKey: "2026-01-21",
          services: [{ price: 300 }],
        },
      ],
      [],
      [],
      [{ barberId: "barber01", amount: 300 }],
    );

    // Two work days = 1,000 gross for barber01. Carryover 300 -> pay 700.
    expect(row).toMatchObject({
      grossAmount: 1000,
      currentAdvanceAmount: 0,
      previousAdvanceCarryoverAmount: 300,
      advanceAmount: 300,
      advanceCarryoverAmount: 0,
      totalAmount: 700,
    });
  });
  it("ignores voided transactions for commission, tips, and transaction counts", () => {
    expect(calculateTransactionCommission({ status: "voided", services: [{ price: 300 }] })).toBe(0);

    const rowsWithoutAttendance = buildPayoutRows([
      {
        id: "voided-only",
        barberId: "barber02",
        barberName: "ช่างบี",
        dateKey: "2026-10-09",
        status: "voided",
        services: [{ price: 300 }],
        tipAmount: 100,
      },
    ], []);
    expect(rowsWithoutAttendance).toEqual([]);

    const rowsWithAttendance = buildPayoutRows([
      {
        id: "voided-sale",
        barberId: "barber02",
        barberName: "ช่างบี",
        dateKey: "2026-10-09",
        status: "voided",
        services: [{ price: 300 }],
        tipAmount: 100,
      },
    ], [
      { barberId: "barber02", barberName: "ช่างบี", dateKey: "2026-10-09", branchId: "b001" },
    ]);

    expect(rowsWithAttendance).toHaveLength(1);
    expect(rowsWithAttendance[0]).toMatchObject({
      transactionCount: 0,
      commissionAmount: 0,
      tipAmount: 0,
      workDays: 1,
      guaranteeAmount: 400,
      totalAmount: 400,
      transactionIds: [],
    });
  });

});