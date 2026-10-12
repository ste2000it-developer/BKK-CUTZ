import { bangkokBusinessDate } from "./cash-closing";
export function notificationTime(value: { toDate(): Date } | null, now = new Date()): string {
  if (!value) return "กำลังบันทึกเวลา";
  const date = value.toDate();
  const day = bangkokBusinessDate(date);
  const time = new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date);
  if (day === bangkokBusinessDate(now)) return "วันนี้ " + time;
  if (day === bangkokBusinessDate(new Date(now.getTime() - 86400000))) return "เมื่อวาน " + time;
  return new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", day: "2-digit", month: "2-digit", year: "2-digit" }).format(date) + " " + time;
}
export const unreadLabel = (count: number) => count > 100 ? "100+" : String(count);
