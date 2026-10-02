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
  PayoutTransaction,
  PayoutWriteData,
} from "../../domain/payout";
import { db } from "../client";

export type FirestoreRecord = {
  id: string;
  [field: string]: unknown;
};

export type PayoutRecord = FirestoreRecord & {
  barberId?: string;
  payoutCycleId?: string;
  payoutDate?: string;
  status?: string;
};

export type PayoutCycleSources = {
  transactions: FirestoreRecord[];
  attendance: FirestoreRecord[];
  payouts: PayoutRecord[];
};

export type PayoutCycleData = {
  transactions: PayoutTransaction[];
  attendance: PayoutAttendance[];
  paidPayouts: PayoutRecord[];
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

export async function listPayoutCycleSources(): Promise<PayoutCycleSources> {
  const [transactionSnapshot, attendanceSnapshot, payoutSnapshot] =
    await Promise.all([
      getDocs(collection(db, "transactions")),
      getDocs(collection(db, "barber_attendance")),
      getDocs(collection(db, "barber_payouts")),
    ]);

  return {
    transactions: mapFirestoreRecords<PayoutTransaction>(
      transactionSnapshot.docs,
    ),
    attendance: mapFirestoreRecords<PayoutAttendance>(
      attendanceSnapshot.docs,
    ),
    payouts: mapFirestoreRecords(payoutSnapshot.docs),
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
  const paidQuery = query(
    collection(db, "barber_payouts"),
    where("payoutCycleId", "==", payoutCycleId),
  );

  const [transactionSnapshot, attendanceSnapshot, paidSnapshot] =
    await Promise.all([
      getDocs(transactionQuery),
      getDocs(attendanceQuery),
      getDocs(paidQuery),
    ]);

  return {
    transactions: mapFirestoreRecords<PayoutTransaction>(
      transactionSnapshot.docs,
    ),
    attendance: mapFirestoreRecords<PayoutAttendance>(
      attendanceSnapshot.docs,
    ),
    paidPayouts: mapFirestoreRecords(paidSnapshot.docs),
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