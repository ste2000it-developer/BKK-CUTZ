import { beforeEach, expect, it, vi } from "vitest";
const mock = vi.hoisted(() => ({ listeners: [] as Array<{ q: unknown; next: (value: unknown) => void; error: (error: Error) => void; stop: ReturnType<typeof vi.fn> }>, update: vi.fn(async () => {}), get: vi.fn(), batchUpdate: vi.fn(), commit: vi.fn(async () => {}) }));
vi.mock("../client", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  getDocsFromServer: mock.get,
  writeBatch: () => ({ update: mock.batchUpdate, commit: mock.commit }),
  collection: (_db: unknown, name: string) => name,
  doc: (_db: unknown, name: string, id: string) => name + "/" + id,
  query: (...parts: unknown[]) => parts,
  orderBy: (...parts: unknown[]) => ["orderBy", ...parts],
  where: (...parts: unknown[]) => ["where", ...parts],
  limit: (n: number) => ["limit", n], updateDoc: mock.update,
  onSnapshot: (q: unknown, next: (value: unknown) => void, error: (error: Error) => void) => {
    const stop = vi.fn(); mock.listeners.push({ q, next, error, stop }); return stop;
  },
}));
import { markAllAdminNotificationsRead, markAdminNotificationRead, watchAdminNotifications, watchAdminUnread } from "./admin-notifications";
beforeEach(() => { mock.listeners.length = 0; vi.clearAllMocks(); });
it("subscribes to the newest 50 across all branches and forwards later snapshots without reloading", () => {
  const next = vi.fn(); const stop = watchAdminNotifications(next, vi.fn());
  const subscription = mock.listeners[0];
  expect(subscription.q).toEqual(["admin_notifications", ["orderBy", "eventAt", "desc"], ["limit", 50]]);
  subscription.next({ docs: [] });
  const rows = [{ id: "new", data: () => ({ branchName: "สาขาสอง", eventAt: 20, read: false }) }, { id: "old", data: () => ({ branchName: "สาขาหนึ่ง", eventAt: 10, read: true }) }];
  subscription.next({ docs: rows });
  expect(next).toHaveBeenLastCalledWith([{ id: "new", branchName: "สาขาสอง", eventAt: 20, read: false }, { id: "old", branchName: "สาขาหนึ่ง", eventAt: 10, read: true }]);
  stop(); expect(subscription.stop).toHaveBeenCalledOnce();
  const reload = vi.fn(); watchAdminNotifications(reload, vi.fn());
  mock.listeners[1].next({ docs: rows }); expect(reload).toHaveBeenCalledWith(next.mock.calls[1][0]);
});
it("updates unread independently of the bounded history and writes only read", async () => {
  const count = vi.fn(); watchAdminUnread(count, vi.fn());
  expect(mock.listeners[0].q).toEqual(["admin_notifications", ["where", "read", "==", false], ["limit", 101]]);
  mock.listeners[0].next({ size: 3 }); expect(count).toHaveBeenLastCalledWith(3);
  await markAdminNotificationRead("first");
  expect(mock.update).toHaveBeenCalledWith("admin_notifications/first", { read: true });
  mock.listeners[0].next({ size: 2 }); expect(count).toHaveBeenLastCalledWith(2);
});
it("surfaces listener and mark-read failures", async () => {
  const error = vi.fn(); watchAdminNotifications(vi.fn(), error);
  const denied = new Error("permission denied"); mock.listeners[0].error(denied);
  expect(error).toHaveBeenCalledWith(denied);
  mock.update.mockRejectedValueOnce(denied);
  await expect(markAdminNotificationRead("first")).rejects.toThrow("permission denied");
});

it("marks all unread including history beyond 50 in bounded batches", async () => {
  const first = Array.from({ length: 100 }, (_, i) => ({ ref: "notification-" + i }));
  mock.get.mockResolvedValueOnce({ docs: first, empty: false, size: 100 })
    .mockResolvedValueOnce({ docs: [{ ref: "older-notification" }], empty: false, size: 1 });
  await markAllAdminNotificationsRead();
  expect(mock.get).toHaveBeenCalledTimes(2);
  expect(mock.get).toHaveBeenCalledWith(["admin_notifications", ["where", "read", "==", false], ["limit", 100]]);
  expect(mock.batchUpdate).toHaveBeenCalledTimes(101);
  expect(mock.batchUpdate).toHaveBeenLastCalledWith("older-notification", { read: true });
  expect(mock.commit).toHaveBeenCalledTimes(2);
});
it("does not write when there are no unread notifications", async () => {
  mock.get.mockResolvedValueOnce({ docs: [], empty: true, size: 0 });
  await markAllAdminNotificationsRead();
  expect(mock.commit).not.toHaveBeenCalled();
});
it("stops and surfaces a failed bulk mark-read commit for retry", async () => {
  mock.get.mockResolvedValueOnce({ docs: [{ ref: "first" }], empty: false, size: 1 });
  mock.commit.mockRejectedValueOnce(new Error("offline"));
  await expect(markAllAdminNotificationsRead()).rejects.toThrow("offline");
  expect(mock.get).toHaveBeenCalledOnce();
});
