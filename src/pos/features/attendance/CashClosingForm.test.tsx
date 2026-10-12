import { expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CashClosingForm } from "./CashClosingForm";
const review = { branchName: "สาขาทดสอบ", closer: { name: "ช่างเอ" }, summary: { branchId: "b", businessDate: "2026-10-09", cashSales: 8500, shopExpenses: 700, cashTipWithdrawals: 300, expectedCash: 7500 } };
it.each([["7500", "ยอดตรง"], ["7450", "ขาด 50 บาท"], ["7550", "เกิน 50 บาท"]])("shows actual %s as %s", (actualCash, label) => {
  const html = renderToStaticMarkup(<CashClosingForm review={review} actualCash={actualCash} pending={false} onChange={vi.fn()} onSubmit={vi.fn()} onBack={vi.fn()} />);
  expect(html).toContain(label); expect(html).toContain("ช่างเอ"); expect(html).toContain("สาขาทดสอบ");
});
it.each(["", "-1", "1e3", "1.001"])("blocks invalid actual %s", (actualCash) => {
  const html = renderToStaticMarkup(<CashClosingForm review={review} actualCash={actualCash} pending={false} onChange={vi.fn()} onSubmit={vi.fn()} onBack={vi.fn()} />);
  expect(html).toContain('type="submit" disabled=""');
});
