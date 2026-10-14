import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ listeners: [] as Array<{ q: unknown; next: (value: unknown) => void; stop: ReturnType<typeof vi.fn> }> }));
vi.mock("../client", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  collection: (_db: unknown, name: string) => name,
  query: (...parts: unknown[]) => parts,
  where: (...parts: unknown[]) => parts,
  onSnapshot: (q: unknown, _options: unknown, next: (value: unknown) => void) => { const stop = vi.fn(); mock.listeners.push({ q, next, stop }); return stop; },
}));
import { watchBranchNetwork } from "./branch-network";
beforeEach(() => { mock.listeners.length = 0; });
it("reads persistent attendance for the selected past date and ignores callbacks after leaving", () => {
  const next = vi.fn();
  const stop = watchBranchNetwork("2026-10-13", next, vi.fn(), true);
  expect(mock.listeners.map(l => l.q)).toEqual([
    ["branches"], ["transactions", ["dateKey", "==", "2026-10-13"]],
    ["barber_attendance", ["dateKey", "==", "2026-10-13"]], ["daily_closings", ["dateKey", "==", "2026-10-13"]],
  ]);
  const snapshot = { docs: [], metadata: { fromCache: false } };
  mock.listeners.slice(0, 3).forEach(l => l.next(snapshot));
  expect(next).not.toHaveBeenCalled();
  mock.listeners[3].next(snapshot);
  expect(next).toHaveBeenCalledOnce();
  stop();
  mock.listeners.forEach(l => { expect(l.stop).toHaveBeenCalledOnce(); l.next(snapshot); });
  expect(next).toHaveBeenCalledOnce();
});
it("retains live presence for today", () => {
  const stop = watchBranchNetwork("2026-10-14", vi.fn(), vi.fn());
  expect(mock.listeners[2].q).toEqual(["barber_presence", ["dateKey", "==", "2026-10-14"]]);
  stop();
});
