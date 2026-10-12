import { describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { buildPayoutRows, getPayoutCycle } from "../../../shared/domain/payout";
import { buildPayoutWorkbook } from "./exportPayout";

describe("payout Excel export", () => {
  it("round-trips Thai names, numeric amounts, status and daily totals in a real xlsx", async () => {
    const rows = buildPayoutRows([
      { id: "t1", barberId: "b1", barberName: "ช่างหนึ่ง", dateKey: "2026-10-02", branchName: "รังสิต", services: [{ price: 300 }], tipAmount: 50.5 },
    ], [{ barberId: "b2", barberName: "=ชื่อช่าง", dateKey: "2026-10-03", branchName: "รังสิต" }]);
    const book = buildPayoutWorkbook(getPayoutCycle(new Date(2026, 9, 16)), rows, new Map([["b1", { id: "paid" }]]));
    const loaded = new ExcelJS.Workbook();
    await loaded.xlsx.load(await book.xlsx.writeBuffer());
    const summary = loaded.getWorksheet("สรุปยอดช่าง")!;
    const daily = loaded.getWorksheet("ช่างหนึ่ง")!;
    const branchSummary = loaded.getWorksheet("สรุปยอดสาขา")!;
    expect(loaded.worksheets).toHaveLength(4);
    expect(loaded.getWorksheet("=ชื่อช่าง")!.getCell("A4").value).toContain("b2");
    expect(daily.getCell("A4").value).toContain("b1");
    const exported = [summary.getRow(9), summary.getRow(10)];
    const paid = exported.find((row) => row.getCell(1).value === "b1")!;
    expect(paid.getCell(2).text).toBe("ช่างหนึ่ง");
    expect(paid.getCell(8).value).toBe(0);
    expect(paid.getCell(9).value).toBe(450.5);
    expect(paid.getCell(10).value).toBe("จ่ายแล้ว");
    const unpaid = exported.find((row) => row.getCell(1).value === "b2")!;
    expect(unpaid.getCell(2).text).toBe("=ชื่อช่าง");
    expect(unpaid.getCell(10).value).toBe("ยังไม่จ่าย");
    expect(summary.getCell("I11").value).toEqual({ formula: "SUM(I9:I10)", result: 850.5 });
    expect(daily.getCell("H10").value).toEqual({ formula: "SUM(H9:H9)", result: 450.5 });
    expect(summary.getCell("I9").numFmt).toContain("#,##0.00");
    expect(summary.getCell("A6").value).toEqual({ formula: "I11", result: 850.5 });
    expect(summary.getCell("D6").value).toEqual({ formula: 'SUMIF(J9:J10,"จ่ายแล้ว",I9:I10)', result: 450.5 });
    expect(summary.getCell("H6").value).toEqual({ formula: "A6-D6", result: 400 });
    expect(daily.getCell("A6").value).toEqual({ formula: "D10+E10", result: 400 });
    expect(daily.getCell("G6").value).toEqual({ formula: "H10", result: 450.5 });
    expect(branchSummary.getCell("A9").value).toBe("รังสิต");
    expect(branchSummary.getCell("B9").value).toBe(100);
    expect(branchSummary.getCell("C9").value).toBe(700);
    expect(branchSummary.getCell("D9").value).toBe(50.5);
    expect(branchSummary.getCell("E9").value).toBe(0);
    expect(branchSummary.getCell("F9").value).toBe(850.5);
    expect(branchSummary.getCell("F10").value).toEqual({ formula: "SUM(F9:F9)", result: 850.5 });
    expect(branchSummary.views?.[0]?.state).not.toBe("frozen");
    for (const side of ["top", "bottom", "left", "right"] as const) {
      expect(daily.getCell("D9").border[side]?.style).toBe("thin");
    }
    expect(summary.views?.[0]?.state).not.toBe("frozen");
    expect((summary.views?.[0] as Record<string, unknown>)?.ySplit).toBeUndefined();
  });
  it("handles duplicate, reserved, long and invalid sheet names", async () => {
    const names = ["same", "SAME", "สรุปยอดช่าง", "History", "a/b:c?d*e[f]", "ก".repeat(50), "ก".repeat(50)];
    const rows = buildPayoutRows([], names.map((barberName, index) => ({ barberId: String(index), barberName, dateKey: "2026-10-02" })));
    const book = buildPayoutWorkbook(getPayoutCycle(new Date(2026, 9, 16)), rows, new Map());
    const loaded = new ExcelJS.Workbook();
    await loaded.xlsx.load(await book.xlsx.writeBuffer());
    const sheets = loaded.worksheets.map((sheet) => sheet.name);
    expect(new Set(sheets.map((name) => name.toLowerCase())).size).toBe(9);
    expect(sheets.every((name) => name.length <= 31 && !/[\\/*?:\[\]]/.test(name))).toBe(true);
  });
});
