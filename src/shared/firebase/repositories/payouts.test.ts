import { describe, expect, it } from "vitest";
import {
  createPayoutIfMissing,
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