export type VoidableTransaction = {
  status?: unknown;
  voidedAt?: unknown;
};

/** Legacy transactions have no status. Only explicit void markers remove a sale from money calculations. */
export function isVoidedTransaction(transaction: VoidableTransaction): boolean {
  const status = String(transaction.status || "").trim().toLowerCase();
  return status === "voided" || status === "cancelled" || Boolean(transaction.voidedAt);
}
