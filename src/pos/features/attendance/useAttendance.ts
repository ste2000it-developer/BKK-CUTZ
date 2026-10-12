import { useEffect, useRef, useState } from "react";
import type { Barber, PosBranch } from "../../../shared/domain/pos-attendance";
import { createAttendanceSession } from "./session";
import type { CashClosingInput } from "../../../shared/domain/cash-closing";

export function useAttendance(branch: PosBranch) {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const session = useRef<ReturnType<typeof createAttendanceSession> | null>(null);
  useEffect(() => {
    let live = true;
    setError("");
    const current = createAttendanceSession(branch, setBarbers, (issue) => setError(issue.message));
    session.current = current;
    void current.ready.then(() => { if (live) setReady(true); }).catch((issue: unknown) => {
      if (live) setError(issue instanceof Error ? issue.message : "โหลดข้อมูลช่างไม่สำเร็จ");
    });
    return () => { live = false; current.dispose(); session.current = null; };
  }, [branch]);
  return { barbers, ready, error,
    checkInPin: (pin: string) => { if (!session.current) return Promise.reject(new Error("ยังไม่พบข้อมูลสาขา")); return session.current.checkInPin(pin); },
    prepareClosing: (pin: string) => { if (!session.current) return Promise.reject(new Error("ยังไม่พบข้อมูลสาขา")); return session.current.prepareClosing(pin); },
    closeStore: (pin: string, cash: CashClosingInput) => { if (!session.current) return Promise.reject(new Error("ยังไม่พบข้อมูลสาขา")); return session.current.closeStore(pin, cash); },
  };
}
