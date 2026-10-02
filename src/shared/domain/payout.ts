export type PayoutTransaction = {
  id?: string;
  barberId?: unknown;
  barberName?: string;
  dateKey?: unknown;
  services?: unknown;
  tipAmount?: unknown;
  branchName?: string;
  branchId?: string;
};

export type PayoutAttendance = {
  barberId?: unknown;
  barberName?: string;
  dateKey?: unknown;
  branchName?: string;
  branchId?: string;
};

export type PayoutCycle = {
  payoutDateKey: string;
  startKey: string;
  endKey: string;
  payoutDate: Date;
  startDate: Date;
  endDate: Date;
};

export type PayoutDailyAccumulator = {
  dateKey: string;
  worked: boolean;
  branches: Set<string>;
  transactionCount: number;
  commissionAmount: number;
  guaranteeAmount: number;
  tipAmount: number;
  totalAmount: number;
};

export type PayoutDailyBreakdown = Omit<PayoutDailyAccumulator, "branches"> & {
  branches: string[];
};

export type PayoutRow = {
  barberId: string;
  barberName: string;
  days: Map<string, PayoutDailyAccumulator>;
  transactionIds: string[];
  workDays: number;
  transactionCount: number;
  commissionAmount: number;
  guaranteeAmount: number;
  tipAmount: number;
  totalAmount: number;
  guaranteeBase: number;
  dailyBreakdown: PayoutDailyBreakdown[];
};

export type PayoutWriteData = {
  payoutCycleId: string;
  payoutDate: string;
  periodStart: string;
  periodEnd: string;
  barberId: string;
  barberName: string;
  workDays: number;
  transactionCount: number;
  commissionAmount: number;
  guaranteeAmount: number;
  tipAmount: number;
  totalAmount: number;
  guaranteeBase: number;
  dailyBreakdown: Array<{
    dateKey: string;
    branches: string[];
    transactionCount: number;
    commissionAmount: number;
    guaranteeAmount: number;
    tipAmount: number;
    totalAmount: number;
  }>;
  transactionIds: string[];
  status: "paid";
  paidByUid: string;
  paidByEmail: string;
};

export function createPayoutWriteData(
  cycle: PayoutCycle,
  row: PayoutRow,
  paidBy: { uid?: string | null; email?: string | null },
): PayoutWriteData {
  return {
    payoutCycleId: cycle.payoutDateKey,
    payoutDate: cycle.payoutDateKey,
    periodStart: cycle.startKey,
    periodEnd: cycle.endKey,
    barberId: row.barberId,
    barberName: row.barberName,
    workDays: row.workDays,
    transactionCount: row.transactionCount,
    commissionAmount: row.commissionAmount,
    guaranteeAmount: row.guaranteeAmount,
    tipAmount: row.tipAmount,
    totalAmount: row.totalAmount,
    guaranteeBase: row.guaranteeBase,
    dailyBreakdown: row.dailyBreakdown.map((day) => ({
      dateKey: day.dateKey,
      branches: day.branches,
      transactionCount: day.transactionCount,
      commissionAmount: day.commissionAmount,
      guaranteeAmount: day.guaranteeAmount,
      tipAmount: day.tipAmount,
      totalAmount: day.totalAmount,
    })),
    transactionIds: row.transactionIds,
    status: "paid",
    paidByUid: paidBy.uid || "",
    paidByEmail: paidBy.email || "",
  };
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

export function toDateKey(date: Date): string {
  return [
    date.getFullYear(),
    pad2(date.getMonth() + 1),
    pad2(date.getDate()),
  ].join("-");
}

export function fromDateKey(value: unknown): Date {
  const [year, month, day] = String(value || "")
    .split("-")
    .map(Number);

  return new Date(year, month - 1, day);
}

export function getPayoutCycle(payoutDate: Date): PayoutCycle {
  let startDate: Date;
  let endDate: Date;

  if (payoutDate.getDate() === 1) {
    startDate = new Date(
      payoutDate.getFullYear(),
      payoutDate.getMonth() - 1,
      16,
    );
    endDate = new Date(
      payoutDate.getFullYear(),
      payoutDate.getMonth(),
      0,
    );
  } else {
    startDate = new Date(
      payoutDate.getFullYear(),
      payoutDate.getMonth(),
      1,
    );
    endDate = new Date(
      payoutDate.getFullYear(),
      payoutDate.getMonth(),
      15,
    );
  }

  return {
    payoutDateKey: toDateKey(payoutDate),
    startKey: toDateKey(startDate),
    endKey: toDateKey(endDate),
    payoutDate,
    startDate,
    endDate,
  };
}

export function getPayoutCycleForWorkDate(
  dateKey: string,
): PayoutCycle | null {
  const workDate = fromDateKey(dateKey);

  if (!Number.isFinite(workDate.getTime())) {
    return null;
  }

  const payoutDate = workDate.getDate() <= 15
    ? new Date(workDate.getFullYear(), workDate.getMonth(), 16)
    : new Date(workDate.getFullYear(), workDate.getMonth() + 1, 1);

  return getPayoutCycle(payoutDate);
}

export function getGuaranteeBase(barberId: string): number {
  return barberId === "barber01" ? 500 : 400;
}

export function calculateTransactionCommission(
  transaction: PayoutTransaction,
): number {
  const services = Array.isArray(transaction.services)
    ? transaction.services as Array<{ price?: unknown }>
    : [];

  return services
    .filter((service) => Number(service.price || 0) > 0)
    .reduce((sum, service) => {
      const price = Math.max(0, Number(service.price || 0));
      return sum + Math.min(price / 2, 100);
    }, 0);
}

function getOrCreateBarberRow(
  rowsByBarber: Map<string, Omit<PayoutRow, "workDays" | "transactionCount" | "commissionAmount" | "guaranteeAmount" | "tipAmount" | "totalAmount" | "guaranteeBase" | "dailyBreakdown">>,
  barberId: string,
  barberName?: string,
) {
  if (!rowsByBarber.has(barberId)) {
    rowsByBarber.set(barberId, {
      barberId,
      barberName: barberName || barberId,
      days: new Map(),
      transactionIds: [],
    });
  }

  const row = rowsByBarber.get(barberId)!;

  if (barberName && (!row.barberName || row.barberName === barberId)) {
    row.barberName = barberName;
  }

  return row;
}

function getOrCreateDailyRow(
  barberRow: { days: Map<string, PayoutDailyAccumulator> },
  dateKey: string,
): PayoutDailyAccumulator {
  if (!barberRow.days.has(dateKey)) {
    barberRow.days.set(dateKey, {
      dateKey,
      worked: false,
      branches: new Set(),
      transactionCount: 0,
      commissionAmount: 0,
      guaranteeAmount: 0,
      tipAmount: 0,
      totalAmount: 0,
    });
  }

  return barberRow.days.get(dateKey)!;
}

export function buildPayoutRows(
  transactions: readonly PayoutTransaction[],
  attendance: readonly PayoutAttendance[],
): PayoutRow[] {
  const rowsByBarber = new Map<
    string,
    Omit<PayoutRow, "workDays" | "transactionCount" | "commissionAmount" | "guaranteeAmount" | "tipAmount" | "totalAmount" | "guaranteeBase" | "dailyBreakdown">
  >();

  transactions.forEach((transaction) => {
    const barberId = String(transaction.barberId || "").trim();
    const dateKey = String(transaction.dateKey || "").trim();

    if (!barberId || !dateKey) {
      return;
    }

    const barberRow = getOrCreateBarberRow(
      rowsByBarber,
      barberId,
      transaction.barberName,
    );
    const day = getOrCreateDailyRow(barberRow, dateKey);

    day.worked = true;
    day.transactionCount += 1;
    day.commissionAmount += calculateTransactionCommission(transaction);
    day.tipAmount += Number(transaction.tipAmount || 0);

    if (transaction.branchName) {
      day.branches.add(transaction.branchName);
    } else if (transaction.branchId) {
      day.branches.add(transaction.branchId);
    }

    if (transaction.id !== undefined) {
      barberRow.transactionIds.push(transaction.id);
    }
  });

  attendance.forEach((record) => {
    const barberId = String(record.barberId || "").trim();
    const dateKey = String(record.dateKey || "").trim();

    if (!barberId || !dateKey) {
      return;
    }

    const barberRow = getOrCreateBarberRow(
      rowsByBarber,
      barberId,
      record.barberName,
    );
    const day = getOrCreateDailyRow(barberRow, dateKey);

    day.worked = true;

    if (record.branchName) {
      day.branches.add(record.branchName);
    } else if (record.branchId) {
      day.branches.add(record.branchId);
    }
  });

  return Array.from(rowsByBarber.values())
    .map((barberRow): PayoutRow => {
      const guaranteeBase = getGuaranteeBase(barberRow.barberId);
      const dailyBreakdown = Array.from(barberRow.days.values())
        .filter((day) => day.worked)
        .map((day): PayoutDailyBreakdown => {
          day.guaranteeAmount = Math.max(
            0,
            guaranteeBase - day.commissionAmount,
          );
          day.totalAmount = day.commissionAmount + day.guaranteeAmount + day.tipAmount;

          return {
            ...day,
            branches: Array.from(day.branches),
          };
        })
        .sort((first, second) => first.dateKey.localeCompare(second.dateKey));

      const totals = dailyBreakdown.reduce(
        (result, day) => {
          result.workDays += 1;
          result.transactionCount += day.transactionCount;
          result.commissionAmount += day.commissionAmount;
          result.guaranteeAmount += day.guaranteeAmount;
          result.tipAmount += day.tipAmount;
          result.totalAmount += day.totalAmount;
          return result;
        },
        {
          workDays: 0,
          transactionCount: 0,
          commissionAmount: 0,
          guaranteeAmount: 0,
          tipAmount: 0,
          totalAmount: 0,
        },
      );

      return {
        ...barberRow,
        ...totals,
        guaranteeBase,
        dailyBreakdown,
      };
    })
    .sort((first, second) =>
      String(first.barberName).localeCompare(String(second.barberName), "th"),
    );
}