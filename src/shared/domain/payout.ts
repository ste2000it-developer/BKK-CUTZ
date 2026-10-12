import { isVoidedTransaction } from "./transaction-status";
export type PayoutTransaction = {
  id?: string;
  barberId?: unknown;
  barberName?: string;
  dateKey?: unknown;
  services?: unknown;
  tipAmount?: unknown;
  branchName?: string;
  branchId?: string;
  status?: unknown;
  voidedAt?: unknown;
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

export type PayoutAdvanceItem = {
  id: string;
  dateKey: string;
  amount: number;
  reason?: string;
  note?: string;
  type?: "advance" | "tip";
};

export type PayoutCarryoverSource = {
  barberId: string;
  amount: number;
};

export type PayoutDailyAccumulator = {
  dateKey: string;
  worked: boolean;
  branches: Set<string>;
  transactionCount: number;
  commissionAmount: number;
  guaranteeAmount: number;
  tipAmount: number;
  grossTipAmount?: number;
  tipAdvanceAmount?: number;
  advanceAmount: number;
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
  advanceIds: string[];
  advances: PayoutAdvanceItem[];
  workDays: number;
  transactionCount: number;
  commissionAmount: number;
  guaranteeAmount: number;
  grossTipAmount?: number;
  tipAdvanceAmount?: number;
  tipAmount: number;
  grossAmount: number;
  currentAdvanceAmount: number;
  previousAdvanceCarryoverAmount: number;
  advanceAmount: number;
  advanceCarryoverAmount: number;
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
  grossTipAmount?: number;
  tipAdvanceAmount?: number;
  tipAmount: number;
  grossAmount?: number;
  currentAdvanceAmount?: number;
  previousAdvanceCarryoverAmount?: number;
  advanceAmount?: number;
  advanceCarryoverAmount?: number;
  advanceIds?: string[];
  totalAmount: number;
  guaranteeBase: number;
  dailyBreakdown: Array<{
    dateKey: string;
    branches: string[];
    transactionCount: number;
    commissionAmount: number;
    guaranteeAmount: number;
    tipAmount: number;
    grossTipAmount?: number;
    tipAdvanceAmount?: number;
    advanceAmount?: number;
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
  const result: PayoutWriteData = {
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
    grossAmount: row.grossAmount ?? (row.commissionAmount + row.guaranteeAmount + row.tipAmount),
    currentAdvanceAmount: row.currentAdvanceAmount ?? 0,
    previousAdvanceCarryoverAmount: row.previousAdvanceCarryoverAmount ?? 0,
    advanceAmount: row.advanceAmount ?? 0,
    advanceCarryoverAmount: row.advanceCarryoverAmount ?? 0,
    advanceIds: row.advanceIds || (row.advances || []).map((a) => a.id),
    totalAmount: row.totalAmount,
    guaranteeBase: row.guaranteeBase,
    dailyBreakdown: row.dailyBreakdown.map((day) => {
      const item: PayoutWriteData["dailyBreakdown"][number] = {
        dateKey: day.dateKey,
        branches: day.branches,
        transactionCount: day.transactionCount,
        commissionAmount: day.commissionAmount,
        guaranteeAmount: day.guaranteeAmount,
        tipAmount: day.tipAmount,
        advanceAmount: day.advanceAmount ?? 0,
        totalAmount: day.totalAmount,
      };
      if (day.tipAdvanceAmount && day.tipAdvanceAmount > 0) {
        item.grossTipAmount = day.grossTipAmount;
        item.tipAdvanceAmount = day.tipAdvanceAmount;
      }
      return item;
    }),
    transactionIds: row.transactionIds,
    status: "paid",
    paidByUid: paidBy.uid || "",
    paidByEmail: paidBy.email || "",
  };

  if (row.tipAdvanceAmount && row.tipAdvanceAmount > 0) {
    result.grossTipAmount = row.grossTipAmount;
    result.tipAdvanceAmount = row.tipAdvanceAmount;
  }

  return result;
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
  if (isVoidedTransaction(transaction)) return 0;
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
  rowsByBarber: Map<string, Omit<PayoutRow, "workDays" | "transactionCount" | "commissionAmount" | "guaranteeAmount" | "tipAmount" | "grossAmount" | "currentAdvanceAmount" | "previousAdvanceCarryoverAmount" | "advanceAmount" | "advanceCarryoverAmount" | "totalAmount" | "guaranteeBase" | "dailyBreakdown">>,
  barberId: string,
  barberName?: string,
) {
  if (!rowsByBarber.has(barberId)) {
    rowsByBarber.set(barberId, {
      barberId,
      barberName: barberName || barberId,
      days: new Map(),
      transactionIds: [],
      advanceIds: [],
      advances: [],
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
      tipAdvanceAmount: 0,
      advanceAmount: 0,
      totalAmount: 0,
    });
  }

  return barberRow.days.get(dateKey)!;
}

export type PayoutAdvanceSource = {
  id?: string;
  barberId?: unknown;
  barberName?: string;
  amount?: unknown;
  reason?: string;
  note?: string;
  dateKey?: unknown;
  status?: string;
  type?: unknown; // "advance" | "tip"
};

export function buildPayoutRows(
  transactions: readonly PayoutTransaction[],
  attendance: readonly PayoutAttendance[],
  advances: readonly PayoutAdvanceSource[] = [],
  previousCarryovers: readonly PayoutCarryoverSource[] = [],
): PayoutRow[] {
  const rowsByBarber = new Map<
    string,
    Omit<
      PayoutRow,
      | "workDays"
      | "transactionCount"
      | "commissionAmount"
      | "guaranteeAmount"
      | "tipAmount"
      | "grossTipAmount"
      | "tipAdvanceAmount"
      | "grossAmount"
      | "currentAdvanceAmount"
      | "previousAdvanceCarryoverAmount"
      | "advanceAmount"
      | "advanceCarryoverAmount"
      | "totalAmount"
      | "guaranteeBase"
      | "dailyBreakdown"
    >
  >();

  transactions.forEach((transaction) => {
    if (isVoidedTransaction(transaction)) return;

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

  const carryoverByBarber = new Map<string, number>();
  previousCarryovers.forEach((record) => {
    const barberId = String(record.barberId || "").trim();
    const amount = Number(record.amount || 0);
    if (!barberId || !Number.isFinite(amount) || amount <= 0) return;

    carryoverByBarber.set(
      barberId,
      Math.round(((carryoverByBarber.get(barberId) || 0) + amount) * 100) / 100,
    );
    getOrCreateBarberRow(rowsByBarber, barberId);
  });

  advances.forEach((record) => {
    if (record.status === "cancelled" || record.status === "deducted") return;
    const barberId = String(record.barberId || "").trim();
    const dateKey = String(record.dateKey || "").trim();
    if (!barberId) return;

    const amt = Number(record.amount || 0);
    if (!Number.isFinite(amt) || amt <= 0) return;

    const barberRow = getOrCreateBarberRow(
      rowsByBarber,
      barberId,
      record.barberName,
    );

    const isTipAdvance = record.type === "tip";
    const advanceItem: PayoutAdvanceItem = {
      id: record.id || "",
      dateKey,
      amount: amt,
      reason: record.reason,
      note: record.note,
      type: isTipAdvance ? "tip" : "advance",
    };
    barberRow.advances.push(advanceItem);
    if (advanceItem.id) barberRow.advanceIds.push(advanceItem.id);

    if (dateKey) {
      const day = getOrCreateDailyRow(barberRow, dateKey);
      if (isTipAdvance) {
        day.tipAdvanceAmount = (day.tipAdvanceAmount || 0) + amt;
      } else {
        day.advanceAmount += amt;
      }
    }
  });

  return Array.from(rowsByBarber.values())
    .map((barberRow): PayoutRow => {
      const guaranteeBase = getGuaranteeBase(barberRow.barberId);

      const tipAdvances = barberRow.advances.filter((a) => a.type === "tip");
      const regularAdvances = barberRow.advances.filter((a) => a.type !== "tip");
      const totalTipAdvanceFromList = tipAdvances.reduce((s, a) => s + a.amount, 0);
      const totalRegularAdvanceFromList = regularAdvances.reduce((s, a) => s + a.amount, 0);

      const dailyBreakdown = Array.from(barberRow.days.values())
        .filter((day) => day.worked || day.advanceAmount > 0 || (day.tipAdvanceAmount || 0) > 0)
        .map((day): PayoutDailyBreakdown => {
          day.guaranteeAmount = day.worked
            ? Math.max(0, guaranteeBase - day.commissionAmount)
            : 0;

          const rawTip = day.tipAmount;
          const dayTipAdvance = day.tipAdvanceAmount || 0;
          const dayNetTip = Math.max(0, rawTip - dayTipAdvance);
          const dayExcessTipAdv = Math.max(0, dayTipAdvance - rawTip);
          day.tipAmount = dayNetTip;
          const effectiveDayAdvance = day.advanceAmount + dayExcessTipAdv;

          day.totalAmount = Math.max(0, Math.round(
            (day.commissionAmount + day.guaranteeAmount + dayNetTip - effectiveDayAdvance) * 100,
          ) / 100);

          const breakdownItem: PayoutDailyBreakdown = {
            dateKey: day.dateKey,
            worked: day.worked,
            branches: Array.from(day.branches),
            transactionCount: day.transactionCount,
            commissionAmount: day.commissionAmount,
            guaranteeAmount: day.guaranteeAmount,
            tipAmount: dayNetTip,
            advanceAmount: day.advanceAmount,
            totalAmount: day.totalAmount,
          };
          if (rawTip > 0 && dayTipAdvance > 0) {
            breakdownItem.grossTipAmount = rawTip;
          }
          if (dayTipAdvance > 0) {
            breakdownItem.tipAdvanceAmount = dayTipAdvance;
          }
          return breakdownItem;
        })
        .sort((first, second) => first.dateKey.localeCompare(second.dateKey));

      const totals = dailyBreakdown.reduce(
        (result, day) => {
          if (day.worked) result.workDays += 1;
          result.transactionCount += day.transactionCount;
          result.commissionAmount += day.commissionAmount;
          result.guaranteeAmount += day.guaranteeAmount;
          result.grossTipAmount += (day.grossTipAmount ?? day.tipAmount);
          result.tipAdvanceAmount += (day.tipAdvanceAmount || 0);
          result.advanceAmount += day.advanceAmount;
          return result;
        },
        {
          workDays: 0,
          transactionCount: 0,
          commissionAmount: 0,
          guaranteeAmount: 0,
          grossTipAmount: 0,
          tipAdvanceAmount: 0,
          advanceAmount: 0,
        },
      );

      const totalTipAdvance = Math.max(totals.tipAdvanceAmount, totalTipAdvanceFromList);
      const finalRegularAdvance = Math.max(totals.advanceAmount, totalRegularAdvanceFromList);

      const grossTipAmount = totals.grossTipAmount;
      const netTipAmount = Math.max(0, grossTipAmount - totalTipAdvance);
      const excessTipAdvance = Math.max(0, totalTipAdvance - grossTipAmount);
      const currentAdvanceAmount = finalRegularAdvance + excessTipAdvance;
      const previousAdvanceCarryoverAmount = carryoverByBarber.get(barberRow.barberId) || 0;
      const totalAdvanceDue = previousAdvanceCarryoverAmount + currentAdvanceAmount;

      const grossAmount = totals.commissionAmount + totals.guaranteeAmount + netTipAmount;
      const advanceAmount = Math.min(grossAmount, totalAdvanceDue);
      const advanceCarryoverAmount = Math.max(0, totalAdvanceDue - advanceAmount);
      const totalAmount = Math.max(0, Math.round((grossAmount - advanceAmount) * 100) / 100);

      // The advance source date and the payout deduction date are different concepts.
      // Re-allocate the amount actually deducted across worked days so the daily
      // breakdown adds up to the row total and never shows a negative payout.
      let remainingAdvanceDeduction = Math.round(advanceAmount * 100) / 100;
      dailyBreakdown.forEach((day) => {
        const dayGross = Math.round(
          (day.commissionAmount + day.guaranteeAmount + day.tipAmount) * 100,
        ) / 100;
        const applied = Math.min(dayGross, remainingAdvanceDeduction);
        day.advanceAmount = Math.round(applied * 100) / 100;
        day.totalAmount = Math.round((dayGross - applied) * 100) / 100;
        remainingAdvanceDeduction = Math.round((remainingAdvanceDeduction - applied) * 100) / 100;
      });

      return {
        ...barberRow,
        workDays: totals.workDays,
        transactionCount: totals.transactionCount,
        commissionAmount: totals.commissionAmount,
        guaranteeAmount: totals.guaranteeAmount,
        grossTipAmount,
        tipAdvanceAmount: totalTipAdvance,
        tipAmount: netTipAmount,
        grossAmount,
        currentAdvanceAmount: Math.round(currentAdvanceAmount * 100) / 100,
        previousAdvanceCarryoverAmount: Math.round(previousAdvanceCarryoverAmount * 100) / 100,
        advanceAmount: Math.round(advanceAmount * 100) / 100,
        advanceCarryoverAmount: Math.round(advanceCarryoverAmount * 100) / 100,
        totalAmount,
        guaranteeBase,
        dailyBreakdown,
      };
    })
    .sort((first, second) =>
      String(first.barberName).localeCompare(String(second.barberName), "th"),
    );
}