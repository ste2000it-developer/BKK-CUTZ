import ExcelJS from "exceljs";
import type { PayoutCycle, PayoutRow } from "../../../shared/domain/payout";
import type { PayoutRecord } from "../../../shared/firebase/repositories/payouts";

const colors = { ink: "FF171717", yellow: "FFFDC717", pale: "FFFFF8DC", muted: "FF666666", line: "FFCBD0D6", green: "FF167343", red: "FFB42318" };
const moneyFormat = '#,##0.00;[Red](#,##0.00);"–"';
const headerRow = 8;
const firstDataRow = 9;
const fill = (argb: string): ExcelJS.Fill => ({ type: "pattern", pattern: "solid", fgColor: { argb } });
const gridBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: colors.line } },
  bottom: { style: "thin", color: { argb: colors.line } },
  left: { style: "thin", color: { argb: colors.line } },
  right: { style: "thin", color: { argb: colors.line } },
};

function metric(sheet: ExcelJS.Worksheet, from: number, to: number, label: string, formula: string, result: number, background: string, color = colors.ink) {
  heading(sheet, 5, from, to, label, background, 11, color);
  heading(sheet, 6, from, to, "", background, 22, color);
  const value = sheet.getCell(6, from);
  value.value = { formula, result };
  value.numFmt = '#,##0.00" บาท"';
  value.font = { name: "Tahoma", size: 22, bold: true, color: { argb: color } };
  for (const row of [5, 6]) sheet.getCell(row, from).border = gridBorder;
}
function thaiDate(key: string) {
  const [year, month, day] = key.split("-").map(Number);
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short", year: "numeric" }).format(new Date(year, month - 1, day));
}

function heading(sheet: ExcelJS.Worksheet, row: number, from: number, to: number, text: string, background = "FFFFFFFF", size = 11, color = colors.ink) {
  sheet.mergeCells(row, from, row, to);
  const cell = sheet.getCell(row, from);
  cell.value = text;
  cell.fill = fill(background);
  cell.font = { name: "Tahoma", size, bold: row === 1 || row === 5, color: { argb: color } };
  cell.alignment = { vertical: "middle", wrapText: true, indent: 1 };
}


type BranchPayoutSummary = {
  branchName: string;
  commissionAmount: number;
  guaranteeAmount: number;
  tipAmount: number;
  advanceAmount: number;
  totalAmount: number;
};

function roundMoney(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildBranchPayoutSummary(rows: readonly PayoutRow[]): BranchPayoutSummary[] {
  const byBranch = new Map<string, BranchPayoutSummary>();

  rows.forEach((row) => {
    row.dailyBreakdown.forEach((day) => {
      const branchNames = Array.from(
        new Set((day.branches || []).map((name) => String(name || "").trim()).filter(Boolean)),
      );
      const branches = branchNames.length > 0 ? branchNames : ["ไม่ระบุสาขา"];
      const divisor = Math.max(1, branches.length);

      branches.forEach((branchName) => {
        const current = byBranch.get(branchName) || {
          branchName,
          commissionAmount: 0,
          guaranteeAmount: 0,
          tipAmount: 0,
          advanceAmount: 0,
          totalAmount: 0,
        };

        // Historical daily payout rows may only tell us that one day touched
        // multiple branches, without a finer split. Divide that day's money
        // evenly so branch totals stay additive and never double-count payout.
        current.commissionAmount += Number(day.commissionAmount || 0) / divisor;
        current.guaranteeAmount += Number(day.guaranteeAmount || 0) / divisor;
        current.tipAmount += Number(day.tipAmount || 0) / divisor;
        current.advanceAmount += Number(day.advanceAmount || 0) / divisor;
        current.totalAmount += Number(day.totalAmount || 0) / divisor;
        byBranch.set(branchName, current);
      });
    });
  });

  return Array.from(byBranch.values())
    .map((row) => ({
      ...row,
      commissionAmount: roundMoney(row.commissionAmount),
      guaranteeAmount: roundMoney(row.guaranteeAmount),
      tipAmount: roundMoney(row.tipAmount),
      advanceAmount: roundMoney(row.advanceAmount),
      totalAmount: roundMoney(row.totalAmount),
    }))
    .sort((a, b) => a.branchName.localeCompare(b.branchName, "th"));
}

export function buildPayoutWorkbook(cycle: PayoutCycle, rows: readonly PayoutRow[], paidRecords: ReadonlyMap<string, PayoutRecord>) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "BKK-CUTZ";
  const summary = workbook.addWorksheet("สรุปยอดช่าง");
  const branchSummary = workbook.addWorksheet("สรุปยอดสาขา");
  const usedNames = new Set(["สรุปยอดช่าง", "สรุปยอดสาขา"]);
  const barberSheets = rows.map((row) => {
    const base = (row.barberName || row.barberId).replace(/[\\/*?:\[\]\x00-\x1f]/g, " ").replace(/^'+|'+$/g, "").trim() || "ช่าง";
    let name = base.slice(0, 31).replace(/'+$/g, "");
    let suffix = 1;
    while (usedNames.has(name.toLowerCase()) || name.toLowerCase() === "history") {
      const ending = ` (${suffix++})`;
      name = base.slice(0, 31 - ending.length) + ending;
    }
    usedNames.add(name.toLowerCase());
    return { row, sheet: workbook.addWorksheet(name) };
  });
  const summaryHeaders = ["รหัสช่าง", "ชื่อช่าง / ดูรายละเอียด", "วันทำงาน", "รายการ", "ค่ามือ", "ประกันมือ", "ทิป", "หักเบิกล่วงหน้า", "รวมจ่ายสุทธิ", "สถานะ"];
  const branchHeaders = ["สาขา", "ค่ามือ", "ประกันมือ", "ทิป", "หักเบิกล่วงหน้า", "รวมจ่ายสุทธิ"];
  const dailyHeaders = ["วันที่ทำงาน", "สาขา", "รายการ", "ค่ามือ", "ประกันมือ", "ทิป", "หักเบิก", "รวมจ่ายสุทธิ"];
  for (const sheet of workbook.worksheets) {
    const isSummary = sheet === summary;
    const isBranchSummary = sheet === branchSummary;
    const headers = isSummary ? summaryHeaders : isBranchSummary ? branchHeaders : dailyHeaders;
    const widths = isSummary
      ? [15, 29, 12, 12, 17, 17, 15, 17, 19, 16]
      : isBranchSummary
        ? [32, 18, 18, 16, 20, 20]
        : [22, 34, 12, 18, 18, 16, 17, 20];
    sheet.columns = widths.map((width) => ({ width }));
    const end = headers.length;
    sheet.properties.tabColor = { argb: isSummary ? colors.yellow : isBranchSummary ? colors.green : colors.ink };
    heading(sheet, 1, 1, end, "BKK-CUTZ  /  รายงานจ่ายเงินช่าง", colors.ink, 20, colors.yellow);
    heading(sheet, 2, 1, end, `รอบจ่าย ${thaiDate(cycle.payoutDateKey)}  •  ผลงาน ${thaiDate(cycle.startKey)} – ${thaiDate(cycle.endKey)}`, "FFFFFFFF", 11, colors.muted);
    sheet.getRow(1).height = 44;
    sheet.getRow(2).height = 30;
    sheet.getRow(3).height = 7;
    sheet.getRow(4).height = 30;
    sheet.getRow(5).height = 28;
    sheet.getRow(6).height = 46;
    sheet.getRow(7).height = 12;
    sheet.getRow(headerRow).values = headers;
    sheet.getRow(headerRow).height = 32;
    sheet.getRow(headerRow).eachCell((cell) => {
      cell.font = { name: "Tahoma", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = fill(colors.ink);
      cell.border = gridBorder;
      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    });
    sheet.views = [{ showGridLines: false, zoomScale: 90 }];
    sheet.pageSetup = {
      paperSize: 9, orientation: "landscape", fitToPage: true, fitToWidth: 1, fitToHeight: 0,
      horizontalCentered: true, printTitlesRow: "1:8",
      margins: { left: 0.25, right: 0.25, top: 0.4, bottom: 0.4, header: 0.15, footer: 0.15 },
    };
    sheet.headerFooter.oddFooter = "&LBKK-CUTZ&Rหน้า &P / &N";
  }
  const grand = rows.reduce((sum, row) => sum + row.totalAmount, 0);
  const paidCount = rows.filter((row) => paidRecords.has(row.barberId)).length;
  heading(summary, 4, 1, 10, `ช่าง ${rows.length} คน  •  จ่ายแล้ว ${paidCount}  •  รอจ่าย ${rows.length - paidCount}  •  คลิกชื่อช่างดูรายละเอียด`, "FFFFFFFF", 12);

  const branchRows = buildBranchPayoutSummary(rows);
  heading(branchSummary, 4, 1, 6, `สรุปค่าจ่ายช่างแยกตามสาขา  •  ${branchRows.length} สาขา  •  ยอดรวมทุกสาขาต้องเท่ากับยอดสุทธิทั้งรอบ`, "FFFFFFFF", 12);
  branchRows.forEach((branch) => {
    branchSummary.addRow([
      branch.branchName,
      branch.commissionAmount,
      branch.guaranteeAmount,
      branch.tipAmount,
      branch.advanceAmount,
      branch.totalAmount,
    ]);
  });

  for (const { row, sheet } of barberSheets) {
    const paid = paidRecords.has(row.barberId);
    summary.addRow([row.barberId, { text: row.barberName, hyperlink: `#'${sheet.name.replace(/'/g, "''")}'!A1` }, row.workDays, row.transactionCount, row.commissionAmount, row.guaranteeAmount, row.tipAmount, row.advanceAmount, row.totalAmount, paid ? "จ่ายแล้ว" : "ยังไม่จ่าย"]);
    const tipAdvText = row.tipAdvanceAmount && row.tipAdvanceAmount > 0 ? `  •  เบิกทิปเงินสด ${row.tipAdvanceAmount} บ.` : "";
    const carryText = row.advanceCarryoverAmount > 0 ? `  •  ค้างยกไปรอบหน้า ${row.advanceCarryoverAmount} บ.` : "";
    heading(sheet, 4, 1, 8, `${row.barberName} (${row.barberId})  •  ${paid ? "จ่ายแล้ว" : "รอจ่าย"}  •  ${row.workDays} วัน / ${row.transactionCount} รายการ${tipAdvText}${carryText}`, "FFFFFFFF", 12, paid ? colors.green : colors.ink);
    for (const day of row.dailyBreakdown) {
      sheet.addRow([thaiDate(day.dateKey), day.branches.join(" · ") || "–", day.transactionCount, day.commissionAmount, day.guaranteeAmount, day.tipAmount, day.advanceAmount, day.totalAmount]);
    }
  }
  for (const sheet of workbook.worksheets) {
    const isSummary = sheet === summary;
    const isBranchSummary = sheet === branchSummary;
    const end = isSummary ? 10 : isBranchSummary ? 6 : 8;
    const moneyStart = isSummary ? 5 : isBranchSummary ? 2 : 4;
    const moneyEnd = isSummary ? 9 : isBranchSummary ? 6 : 8;
    const lastDataRow = sheet.rowCount;
    sheet.autoFilter = { from: { row: headerRow, column: 1 }, to: { row: lastDataRow, column: end } };
    const total = sheet.addRow(["รวมทั้งรอบ"]);
    if (!isBranchSummary) sheet.mergeCells(total.number, 1, total.number, 2);
    const totalStartColumn = isBranchSummary ? 2 : 3;
    for (let col = totalStartColumn; col <= moneyEnd; col++) {
      const letter = sheet.getColumn(col).letter;
      let sum = 0;
      for (let r = firstDataRow; r <= lastDataRow; r++) sum += Number(sheet.getCell(r, col).value || 0);
      total.getCell(col).value = lastDataRow >= firstDataRow ? { formula: `SUM(${letter}${firstDataRow}:${letter}${lastDataRow})`, result: roundMoney(sum) } : 0;
    }
    for (let r = firstDataRow; r <= total.number; r++) {
      const line = sheet.getRow(r);
      const isTotal = r === total.number;
      const longest = Math.max(...[1, 2].map((col) => line.getCell(col).text.length / (sheet.getColumn(col).width! * 0.8)));
      line.height = isTotal ? 36 : Math.max(32, Math.ceil(longest) * 18 + 12);
      for (let col = 1; col <= end; col++) {
        const cell = line.getCell(col);
        cell.font = { name: "Tahoma", size: 11, bold: isTotal || col === moneyEnd, color: { argb: colors.ink } };
        cell.fill = fill(isTotal ? colors.yellow : col === moneyEnd ? colors.pale : r % 2 === 0 ? "FFF5F6F7" : "FFFFFFFF");
        cell.border = isTotal ? { ...gridBorder, top: { style: "medium", color: { argb: colors.ink } } } : gridBorder;
        cell.alignment = { vertical: "middle", wrapText: true, horizontal: col >= moneyStart && col <= moneyEnd ? "right" : col >= 3 ? "center" : "left", indent: col >= moneyStart && col <= moneyEnd ? 1 : 0 };
        if (col >= moneyStart && col <= moneyEnd) cell.numFmt = moneyFormat;
        if (isSummary && col === 2 && !isTotal) cell.font = { name: "Tahoma", size: 11, bold: true, underline: true, color: { argb: colors.ink } };
        if (isSummary && col === 10 && !isTotal) {
          const paid = cell.value === "จ่ายแล้ว";
          cell.font = { name: "Tahoma", size: 11, bold: true, color: { argb: paid ? colors.green : colors.red } };
          cell.fill = fill(paid ? "FFEAF5EE" : "FFFFF1F0");
        }
      }
    }
    if (isSummary) {
      const paidAmount = rows.filter((row) => paidRecords.has(row.barberId)).reduce((sum, row) => sum + row.totalAmount, 0);
      metric(sheet, 1, 3, "ยอดรวมสุทธิทั้งรอบ", `I${total.number}`, grand, colors.yellow);
      metric(sheet, 4, 7, "ยอดของรายการที่จ่ายแล้ว", rows.length ? `SUMIF(J9:J${lastDataRow},"จ่ายแล้ว",I9:I${lastDataRow})` : "0", paidAmount, "FFEAF5EE", colors.green);
      metric(sheet, 8, 10, "ยอดรอจ่าย", "A6-D6", grand - paidAmount, "FFFFF1F0", colors.red);
    } else if (isBranchSummary) {
      const branchGrand = branchRows.reduce((sum, row) => sum + row.totalAmount, 0);
      metric(sheet, 1, 2, "ค่ามือ + ประกันมือ", `B${total.number}+C${total.number}`, branchRows.reduce((sum, row) => sum + row.commissionAmount + row.guaranteeAmount, 0), "FFF0F2F5");
      metric(sheet, 3, 4, "ทิปช่าง", `D${total.number}`, branchRows.reduce((sum, row) => sum + row.tipAmount, 0), "FFEAF5EE", colors.green);
      metric(sheet, 5, 6, "รวมจ่ายสุทธิทุกสาขา", `F${total.number}`, branchGrand, colors.yellow);
    } else {
      const source = barberSheets.find((entry) => entry.sheet === sheet)!.row;
      metric(sheet, 1, 2, "ค่ามือ + ประกันมือ", `D${total.number}+E${total.number}`, source.commissionAmount + source.guaranteeAmount, "FFF0F2F5");
      metric(sheet, 3, 4, "ทิปช่าง", `F${total.number}`, source.tipAmount, "FFEAF5EE", colors.green);
      metric(sheet, 5, 6, "หักเบิกล่วงหน้า", `G${total.number}`, source.advanceAmount, "FFFFF1F0", colors.red);
      metric(sheet, 7, 8, "รวมจ่ายสุทธิ", `H${total.number}`, source.totalAmount, colors.yellow);
    }
    heading(sheet, total.number + 2, 1, end, "ตรวจยอด: (ค่ามือ + ประกันมือ + ทิป) - หักเบิกล่วงหน้าที่หักได้ในรอบนี้ = รวมจ่ายสุทธิ • ยอดเบิกส่วนเกินจะยกไปรอบถัดไป", "FFFFFFFF", 11);
    sheet.getRow(total.number + 2).height = 30;
    heading(sheet, total.number + 3, 1, end, isBranchSummary ? "กรณีข้อมูลเก่าระบุหลายสาขาในวันเดียวโดยไม่มีสัดส่วนแยก ระบบแบ่งยอดวันนั้นเท่า ๆ กันเพื่อไม่ให้นับซ้ำ" : "ยอดตามหน้าจ่ายเงินช่าง ณ เวลาส่งออก • ประกันมือคือยอดเติมให้ถึงขั้นต่ำรายวัน", "FFFFFFFF", 10, colors.muted);
    sheet.getRow(total.number + 3).height = 28;
    if (!isSummary) {
      const link = sheet.getCell(total.number + 4, 1);
      link.value = { text: "← กลับหน้าสรุป", hyperlink: "#'สรุปยอดช่าง'!A1" };
      link.font = { name: "Tahoma", size: 11, underline: true, color: { argb: colors.ink } };
      sheet.getRow(total.number + 4).height = 25;
    }
    sheet.pageSetup.printArea = `A1:${sheet.getColumn(end).letter}${sheet.rowCount}`;
  }
  return workbook;
}

export async function downloadPayoutExcel(cycle: PayoutCycle, rows: readonly PayoutRow[], paidRecords: ReadonlyMap<string, PayoutRecord>) {
  const buffer = await buildPayoutWorkbook(cycle, rows, paidRecords).xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([new Uint8Array(buffer)], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `BKK-CUTZ-payout-${cycle.payoutDateKey}.xlsx`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
