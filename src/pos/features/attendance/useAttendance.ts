import { useEffect, useRef, useState } from "react";
import type { Barber, PosBranch } from "../../../shared/domain/pos-attendance";
import { createAttendanceSession } from "./session";

export function useAttendance(branch: PosBranch) {
  const [barbers, setBarbers] = useState<Barber[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  const session = useRef<ReturnType<typeof createAttendanceSession> | null>(null);
  useEffect(() => {
    let live = true;
    setReady(false);
    setBarbers([]);
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
    closeStore: (pin: string) => { if (!session.current) return Promise.reject(new Error("ยังไม่พบข้อมูลสาขา")); return session.current.closeStore(pin); },
  };
}
