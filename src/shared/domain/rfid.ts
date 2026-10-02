export function normalizeRfidUid(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase()
    .replace(/[^0-9A-F]/g, "");
}

export type RfidBarber = {
  rfidUid?: unknown;
};

export type RfidMatchResult<T> = {
  barber: T | null;
  error: string | null;
};

export function findBarberByRfid<T extends RfidBarber>(
  barbers: readonly T[],
  cardUid: unknown,
): RfidMatchResult<T> {
  const normalizedCardUid = normalizeRfidUid(cardUid);

  if (!normalizedCardUid) {
    return {
      barber: null,
      error: "ไม่พบ UID ของบัตร",
    };
  }

  const matches = barbers.filter(
    (barber) => normalizeRfidUid(barber.rfidUid) === normalizedCardUid,
  );

  if (matches.length === 0) {
    return {
      barber: null,
      error: "ไม่พบบัตรนี้ในระบบ",
    };
  }

  if (matches.length > 1) {
    return {
      barber: null,
      error: "บัตร RFID นี้ถูกผูกกับช่างมากกว่า 1 คน กรุณาแก้ข้อมูลในระบบ",
    };
  }

  return {
    barber: matches[0],
    error: null,
  };
}