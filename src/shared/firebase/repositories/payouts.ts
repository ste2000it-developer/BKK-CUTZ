import {
  collection,
  doc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  where,
} from "firebase/firestore";
import type {
  PayoutAttendance,
  PayoutCarryoverSource,
  PayoutTransaction,
  PayoutWriteData,
} from "../../domain/payout";
import { db } from "../client";

import { listBarberAdvances, type BarberAdvanceRecord } from "./advances";

export type FirestoreRecord = {
  id: string;
  [field: string]: unknown;
};

export type PayoutRecord = FirestoreRecord & {
  barberId?: string;
  payoutCycleId?: string;
  payoutDate?: string;
  status?: string;
  totalAmount?: number;
  advanceCarryoverAmount?: number;
};

export type PayoutCycleSources = {
  transactions: FirestoreRecord[];
  attendance: FirestoreRecord[];
  payouts: PayoutRecord[];
  advances?: FirestoreRecord[];
};

export type PayoutCycleData = {
  transactions: PayoutTransaction[];
  attendance: PayoutAttendance[];
  paidPayouts: PayoutRecord[];
  advances: BarberAdvanceRecord[];
  previousCarryovers: PayoutCarryoverSource[];
};

export class PayoutAlreadyExistsError extends Error {
  constructor() {
    super("PAYOUT_ALREADY_EXISTS");
    this.name = "PayoutAlreadyExistsError";
  }
}

export async function createPayoutIfMissing(
  hasExistingPayout: () => Promise<boolean>,
  createPayout: () => void | Promise<void>,
): Promise<void> {
  if (await hasExistingPayout()) {
    throw new PayoutAlreadyExistsError();
  }

  await createPayout();
}

type SnapshotLike<T> = {
  id: string;
  data(): T;
};

export function mapFirestoreRecords<T extends object>(
  documents: readonly SnapshotLike<T>[],
): Array<T & { id: string }> {
  return documents.map((snapshot) => ({
    id: snapshot.id,
    ...snapshot.data(),
  }));
}

export function getPreviousPayoutCarryovers(
  payouts: readonly PayoutRecord[],
  currentPayoutCycleId: string,
): PayoutCarryoverSource[] {
  const latestByBarber = new Map<string, PayoutRecord>();

  payouts.forEach((record) => {
    if (record.status && record.status !== "paid") return;

    const barberId = String(record.barberId || "").trim();
    const cycleId = String(record.payoutCycleId || record.payoutDate || "").trim();
    if (!barberId || !cycleId || cycleId >= currentPayoutCycleId) return;

    const existing = latestByBarber.get(barberId);
    const existingCycle = String(existing?.payoutCycleId || existing?.payoutDate || "");
    if (!existing || cycleId > existingCycle) latestByBarber.set(barberId, record);
  });

  return Array.from(latestByBarber.entries())
    .map(([barberId, record]) => {
      const explicit = Number(record.advanceCarryoverAmount);
      const legacyNegative = Math.max(0, -Number(record.totalAmount || 0));
      const amount = Number.isFinite(explicit) ? Math.max(0, explicit) : legacyNegative;
      return { barberId, amount: Math.round(amount * 100) / 100 };
    })
    .filter((item) => item.amount > 0);
}

export async function listPayoutCycleSources(): Promise<PayoutCycleSources> {
  const [transactionSnapshot, attendanceSnapshot, payoutSnapshot, advanceSnapshot] =
    await Promise.all([
      getDocs(collection(db, "transactions")),
      getDocs(collection(db, "barber_attendance")),
      getDocs(collection(db, "barber_payouts")),
      getDocs(collection(db, "barber_advances")).catch(() => ({ docs: [] as any[] })),
    ]);

  return {
    transactions: mapFirestoreRecords<PayoutTransaction>(
      transactionSnapshot.docs,
    ),
    attendance: mapFirestoreRecords<PayoutAttendance>(
      attendanceSnapshot.docs,
    ),
    payouts: mapFirestoreRecords(payoutSnapshot.docs),
    advances: mapFirestoreRecords(advanceSnapshot.docs),
  };
}

export async function loadPayoutCycleData(
  startKey: string,
  endKey: string,
  payoutCycleId: string,
): Promise<PayoutCycleData> {
  const transactionQuery = query(
    collection(db, "transactions"),
    where("dateKey", ">=", startKey),
    where("dateKey", "<=", endKey),
  );
  const attendanceQuery = query(
    collection(db, "barber_attendance"),
    where("dateKey", ">=", startKey),
    where("dateKey", "<=", endKey),
  );
  const [transactionSnapshot, attendanceSnapshot, payoutSnapshot, advances] =
    await Promise.all([
      getDocs(transactionQuery),
      getDocs(attendanceQuery),
      getDocs(collection(db, "barber_payouts")),
      listBarberAdvances(startKey, endKey),
    ]);

  const payouts = mapFirestoreRecords(payoutSnapshot.docs) as PayoutRecord[];

  return {
    transactions: mapFirestoreRecords<PayoutTransaction>(
      transactionSnapshot.docs,
    ),
    attendance: mapFirestoreRecords<PayoutAttendance>(
      attendanceSnapshot.docs,
    ),
    paidPayouts: payouts.filter(
      (record) => String(record.payoutCycleId || record.payoutDate || "") === payoutCycleId,
    ),
    advances,
    previousCarryovers: getPreviousPayoutCarryovers(payouts, payoutCycleId),
  };
}

export async function listPayoutHistory(): Promise<PayoutRecord[]> {
  const snapshot = await getDocs(collection(db, "barber_payouts"));
  return mapFirestoreRecords(snapshot.docs);
}

export async function savePayoutRecord(
  payoutId: string,
  data: PayoutWriteData,
): Promise<void> {
  const payoutRef = doc(db, "barber_payouts", payoutId);

  await runTransaction(db, async (transaction) => {
    await createPayoutIfMissing(
      async () => (await transaction.get(payoutRef)).exists(),
      () => {
        transaction.set(payoutRef, {
          ...data,
          paidAt: serverTimestamp(),
        });
      },
    );
  });
}