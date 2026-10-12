import { describe, expect, it } from "vitest";
import {
  createPayoutIfMissing,
  getPreviousPayoutCarryovers,
  mapFirestoreRecords,
  PayoutAlreadyExistsError,
} from "./payouts";

describe("mapFirestoreRecords", () => {
  it("adds snapshot IDs without changing stored fields", () => {
    const records = mapFirestoreRecords([
      {
        id: "2026-01-16_barber01",
        data: () => ({
          payoutCycleId: "2026-01-16",
          barberId: "barber01",
          totalAmount: 525,
          status: "paid",
        }),
      },
    ]);

    expect(records).toEqual([
      {
        id: "2026-01-16_barber01",
        payoutCycleId: "2026-01-16",
        barberId: "barber01",
        totalAmount: 525,
        status: "paid",
      },
    ]);
  });
});

describe("createPayoutIfMissing", () => {
  it("creates a payout when the deterministic document ID is unused", async () => {
    let writeCount = 0;

    await createPayoutIfMissing(
      async () => false,
      () => {
        writeCount += 1;
      },
    );

    expect(writeCount).toBe(1);
  });

  it("rejects an existing payout without calling the write callback", async () => {
    let writeCount = 0;

    await expect(
      createPayoutIfMissing(
        async () => true,
        () => {
          writeCount += 1;
        },
      ),
    ).rejects.toBeInstanceOf(PayoutAlreadyExistsError);

    expect(writeCount).toBe(0);
  });
});

describe("getPreviousPayoutCarryovers", () => {
  it("uses the latest prior paid payout for each barber", () => {
    expect(getPreviousPayoutCarryovers([
      {
        id: "old",
        barberId: "barber01",
        payoutCycleId: "2026-01-16",
        status: "paid",
        advanceCarryoverAmount: 500,
      },
      {
        id: "latest",
        barberId: "barber01",
        payoutCycleId: "2026-02-01",
        status: "paid",
        advanceCarryoverAmount: 300,
      },
      {
        id: "other",
        barberId: "barber02",
        payoutCycleId: "2026-02-01",
        status: "paid",
        advanceCarryoverAmount: 100,
      },
    ], "2026-02-16")).toEqual([
      { barberId: "barber01", amount: 300 },
      { barberId: "barber02", amount: 100 },
    ]);
  });

  it("recovers legacy negative payout totals as carryover", () => {
    expect(getPreviousPayoutCarryovers([
      {
        id: "legacy",
        barberId: "barber01",
        payoutCycleId: "2026-01-16",
        status: "paid",
        totalAmount: -250,
      },
    ], "2026-02-01")).toEqual([
      { barberId: "barber01", amount: 250 },
    ]);
  });
});