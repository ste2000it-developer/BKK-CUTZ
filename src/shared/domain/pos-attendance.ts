export type PosBranch = { id: string; name: string; serviceGroup: string };
export type Barber = { id: string; name: string; pin?: string | number; rfidUid?: string };
export type Presence = { barberId: string; active: boolean; dateKey: string };
export type ReaderScan = { id: string; scanId: string; cardUid: string };
export type ReaderResult = { status: "success" | "already_active" | "error"; barber: Barber | null; message: string };

export function localDateKey(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export function attendanceId(branchId: string, barberId: string, dateKey: string): string {
  return `${dateKey}_${branchId}_${barberId}`;
}

export function barberByPin(barbers: readonly Barber[], pin: string): Barber {
  const matches = barbers.filter((barber) => String(barber.pin ?? "").trim() === pin);
  if (!matches.length) throw new Error("ไม่พบช่างที่ใช้ PIN นี้");
  if (matches.length > 1) throw new Error("PIN นี้ซ้ำกับช่างมากกว่า 1 คน กรุณาแก้ PIN ในระบบ");
  return matches[0];
}

/** Each reader document can be updated with a new scanId. Seed the whole initial snapshot. */
export function createScanGate() {
  const seen = new Set<string>();
  const key = (scan: ReaderScan) => `${scan.id}:${scan.scanId.trim()}`;
  return {
    seed(scans: readonly ReaderScan[]) {
      for (const scan of scans) if (scan.scanId.trim()) seen.add(key(scan));
    },
    accept(scan: ReaderScan, type: string) {
      if (type === "removed" || !scan.scanId.trim() || seen.has(key(scan))) return false;
      seen.add(key(scan));
      if (seen.size > 300) {
        const oldest = seen.values().next().value;
        if (oldest) seen.delete(oldest);
      }
      return true;
    },
  };
}
