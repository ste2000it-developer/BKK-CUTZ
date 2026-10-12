import type { TransactionHistoryRecord } from "../firebase/repositories/transactions";
import type { PayoutRecord } from "../firebase/repositories/payouts";
import type { ShopExpenseRecord } from "../firebase/repositories/shop-expenses";
import type { BarberAdvanceRecord } from "../firebase/repositories/advances";
import { isVoidedTransaction } from "./transaction-status";

export type FinancialBranchRef = {
  id: string;
  name?: string;
};

export type PayoutBranchAllocation = {
  matched: boolean;
  amount: number;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function normalizeBranchToken(value: unknown): string {
  return String(value || "").trim().toLocaleLowerCase("th-TH");
}

function buildBranchAliasMap(branches: readonly FinancialBranchRef[]): Map<string, string> {
  const aliases = new Map<string, string>();

  branches.forEach((branch) => {
    const id = String(branch.id || "").trim();
    if (!id) return;

    aliases.set(normalizeBranchToken(id), id);
    if (branch.name) {
      aliases.set(normalizeBranchToken(branch.name), id);
    }
  });

  return aliases;
}

/**
 * Allocates a saved payout to one branch without counting the whole payout again.
 * Historical payout records store dailyBreakdown.branches as branch names, while
 * the Admin filter uses branch IDs. We canonicalize both through the branch list.
 *
 * If an old daily breakdown contains more than one branch on the same day and no
 * finer branch split exists, the day's payout is divided evenly between those
 * distinct branches. This keeps the branch totals additive instead of duplicating
 * the full daily payout into every branch.
 */
export function allocatePayoutToBranch(
  payout: PayoutRecord,
  branchId?: string,
  branches: readonly FinancialBranchRef[] = [],
): PayoutBranchAllocation {
  const totalAmount = Number(payout.totalAmount || 0);

  if (!branchId || branchId === "all") {
    return { matched: true, amount: roundMoney(totalAmount) };
  }

  const aliasMap = buildBranchAliasMap(branches);
  const selectedId =
    aliasMap.get(normalizeBranchToken(branchId)) || String(branchId).trim();
  const breakdown = Array.isArray(payout.dailyBreakdown)
    ? (payout.dailyBreakdown as Array<{ branches?: unknown; totalAmount?: unknown }>)
    : [];

  let hasBranchInfo = false;
  let matched = false;
  let amount = 0;

  breakdown.forEach((day) => {
    const rawBranches = Array.isArray(day.branches)
      ? day.branches
          .map((value) => String(value || "").trim())
          .filter(Boolean)
      : [];

    if (rawBranches.length === 0) return;
    hasBranchInfo = true;

    const canonicalBranches = Array.from(
      new Set(
        rawBranches.map((value) => {
          const normalized = normalizeBranchToken(value);
          return aliasMap.get(normalized) || `raw:${normalized}`;
        }),
      ),
    );

    if (!canonicalBranches.includes(selectedId)) return;

    matched = true;
    const dayTotal = Number(day.totalAmount || 0);
    const divisor = Math.max(1, canonicalBranches.length);
    amount += dayTotal / divisor;
  });

  if (matched) {
    return { matched: true, amount: roundMoney(amount) };
  }

  // If the record has a daily branch breakdown, it is authoritative. Falling
  // back to a payout-level branch would re-introduce whole-payout duplication.
  if (hasBranchInfo) {
    return { matched: false, amount: 0 };
  }

  const payoutBranchId = String(payout.branchId || "").trim();
  const canonicalPayoutBranch =
    aliasMap.get(normalizeBranchToken(payoutBranchId)) || payoutBranchId;

  return canonicalPayoutBranch === selectedId
    ? { matched: true, amount: roundMoney(totalAmount) }
    : { matched: false, amount: 0 };
}

export type FinancialSummary = {
  // Revenue
  serviceRevenue: number;
  tipRevenue: number;
  totalRevenue: number;
  cashRevenue: number;
  scanRevenue: number;
  transactionCount: number;

  // Expenses
  barberPayoutTotal: number;
  barberPayoutCount: number;
  shopExpenseTotal: number;
  shopExpenseCount: number;
  barberAdvanceTotal: number;
  barberAdvanceCount: number;
  totalExpenses: number;

  // Net Balance
  netTotal: number;
  marginPercent: number;
};

export function calculateFinancialSummary({
  transactions,
  payouts,
  shopExpenses,
  advances,
  branchId,
  branches = [],
}: {
  transactions: readonly TransactionHistoryRecord[];
  payouts: readonly PayoutRecord[];
  shopExpenses: readonly ShopExpenseRecord[];
  advances: readonly BarberAdvanceRecord[];
  branchId?: string;
  branches?: readonly FinancialBranchRef[];
}): FinancialSummary {
  const isBranchMatch = (id?: string) => !branchId || branchId === "all" || id === branchId;

  // Filter transactions
  const filteredTransactions = transactions.filter((tx) => !isVoidedTransaction(tx) && isBranchMatch(tx.branchId));
  let serviceRevenue = 0;
  let tipRevenue = 0;
  let cashRevenue = 0;
  let scanRevenue = 0;

  filteredTransactions.forEach((tx) => {
    const serviceAmt = Number(tx.serviceTotal ?? tx.total ?? 0);
    const tipAmt = Number(tx.tipAmount || 0);
    serviceRevenue += serviceAmt;
    tipRevenue += tipAmt;

    const grand = Number(tx.grandTotal ?? serviceAmt + tipAmt);
    if (tx.paymentMethod === "cash") {
      cashRevenue += grand;
    } else {
      scanRevenue += grand;
    }
  });

  const totalRevenue = serviceRevenue + tipRevenue;
  const transactionCount = filteredTransactions.length;

  // Filter shop expenses (withdrawn from store to buy items)
  const filteredShopExpenses = shopExpenses.filter((exp) => isBranchMatch(exp.branchId));
  const shopExpenseTotal = filteredShopExpenses.reduce(
    (sum, exp) => sum + Number(exp.amount || 0),
    0,
  );
  const shopExpenseCount = filteredShopExpenses.length;

  // Attribute payouts by each day's branch instead of assigning the entire
  // payout cycle to every branch the barber worked at.
  const payoutAllocations = payouts
    .map((payout) => allocatePayoutToBranch(payout, branchId, branches))
    .filter((allocation) => allocation.matched);
  const barberPayoutTotal = payoutAllocations.reduce(
    (sum, allocation) => sum + allocation.amount,
    0,
  );
  const barberPayoutCount = payoutAllocations.length;

  // Filter advances
  const filteredAdvances = advances.filter(
    (adv) => adv.status !== "cancelled" && isBranchMatch(adv.branchId),
  );
  const barberAdvanceTotal = filteredAdvances.reduce(
    (sum, adv) => sum + Number(adv.amount || 0),
    0,
  );
  const barberAdvanceCount = filteredAdvances.length;

  const totalExpenses = barberPayoutTotal + shopExpenseTotal + barberAdvanceTotal;
  const netTotal = totalRevenue - totalExpenses;
  const marginPercent = totalRevenue > 0 ? Math.round((netTotal / totalRevenue) * 1000) / 10 : 0;

  return {
    serviceRevenue: Math.round(serviceRevenue * 100) / 100,
    tipRevenue: Math.round(tipRevenue * 100) / 100,
    totalRevenue: Math.round(totalRevenue * 100) / 100,
    cashRevenue: Math.round(cashRevenue * 100) / 100,
    scanRevenue: Math.round(scanRevenue * 100) / 100,
    transactionCount,

    barberPayoutTotal: Math.round(barberPayoutTotal * 100) / 100,
    barberPayoutCount,
    shopExpenseTotal: Math.round(shopExpenseTotal * 100) / 100,
    shopExpenseCount,
    barberAdvanceTotal: Math.round(barberAdvanceTotal * 100) / 100,
    barberAdvanceCount,
    totalExpenses: Math.round(totalExpenses * 100) / 100,

    netTotal: Math.round(netTotal * 100) / 100,
    marginPercent,
  };
}
