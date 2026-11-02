import { beforeEach, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  listeners: [] as Array<{ q: unknown; next: (value: any) => void; error: (error: Error) => void; stop: ReturnType<typeof vi.fn> }>,
  update: vi.fn(async () => {}),
  get: vi.fn(),
  batchUpdate: vi.fn(),
  commit: vi.fn(async () => {}),
}));

vi.mock("../client", () => ({ db: {} }));
vi.mock("firebase/firestore", () => ({
  getDocsFromServer: mock.get,
  writeBatch: () => ({ update: mock.batchUpdate, commit: mock.commit }),
  collection: (_db: unknown, name: string) => name,
  doc: (_db: unknown, name: string, id: string) => name + "/" + id,
  query: (...parts: unknown[]) => parts,
  orderBy: (...parts: unknown[]) => ["orderBy", ...parts],
  startAfter: (cursor: unknown) => ["startAfter", cursor],
  limit: (n: number) => ["limit", n],
  updateDoc: mock.update,
  onSnapshot: (q: unknown, next: (value: any) => void, error: (issue: Error) => void) => {
    const stop = vi.fn();
    mock.listeners.push({ q, next, error, stop });
    return stop;
  },
}));

import { markAllAdminNotificationsRead, markAdminNotificationRead, watchAdminNotifications, watchAdminUnread } from "./admin-notifications";

const event = (id: string, data: Record<string, unknown>) => ({
  id,
  ref: "admin_notifications/" + id,
  data: () => data,
});

beforeEach(() => {
  mock.listeners.length = 0;
  vi.clearAllMocks();
});

it("shows the newest 50 and keeps read state independent per admin", () => {
  const first = vi.fn();
  const second = vi.fn();
  watchAdminNotifications("adminA", first, vi.fn());
  watchAdminNotifications("adminB", second, vi.fn());
  expect(mock.listeners[0].q).toEqual(["admin_notifications", ["orderBy", "eventAt", "desc"], ["limit", 50]]);
  const docs = [
    event("n1", { eventAt: 2, read: false, readBy: { adminA: true } }),
    event("n2", { eventAt: 1, read: true }),
  ];
  mock.listeners[0].next({ docs });
  mock.listeners[1].next({ docs });
  expect(first.mock.lastCall?.[0].map((row: { read: boolean }) => row.read)).toEqual([true, true]);
  expect(second.mock.lastCall?.[0].map((row: { read: boolean }) => row.read)).toEqual([false, true]);
});

it("counts recent unread items for each admin and writes only their own receipt", async () => {
  const count = vi.fn();
  watchAdminUnread("adminA", count, vi.fn());
  expect(mock.listeners[0].q).toEqual(["admin_notifications", ["orderBy", "eventAt", "desc"], ["limit", 101]]);
  mock.listeners[0].next({ docs: [
    event("a", { read: false }),
    event("b", { read: false, readBy: { adminA: true } }),
    event("c", { read: true }),
  ] });
  expect(count).toHaveBeenCalledWith(1);
  await markAdminNotificationRead("adminA", "a");
  expect(mock.update).toHaveBeenCalledWith("admin_notifications/a", { "readBy.adminA": true });
});

it("surfaces failed read writes and subscription errors", async () => {
  const failed = new Error("permission denied");
  const error = vi.fn();
  watchAdminNotifications("adminA", vi.fn(), error);
  mock.listeners[0].error(failed);
  expect(error).toHaveBeenCalledWith(failed);
  mock.update.mockRejectedValueOnce(failed);
  await expect(markAdminNotificationRead("adminA", "a")).rejects.toThrow("permission denied");
});

it("marks only unread events for this admin, including a second batch", async () => {
  const first = Array.from({ length: 100 }, (_, i) => event("n" + i, { read: false, readBy: i === 0 ? { adminA: true } : {} }));
  const next = [event("older", { read: false })];
  mock.get.mockResolvedValueOnce({ docs: first, empty: false, size: 100 })
    .mockResolvedValueOnce({ docs: next, empty: false, size: 1 });
  await markAllAdminNotificationsRead("adminA");
  expect(mock.get).toHaveBeenCalledTimes(2);
  expect(mock.get.mock.calls[1][0]).toEqual(["admin_notifications", ["orderBy", "eventAt", "desc"], ["startAfter", first[99]], ["limit", 100]]);
  expect(mock.batchUpdate).toHaveBeenCalledTimes(100);
  expect(mock.batchUpdate).toHaveBeenLastCalledWith("admin_notifications/older", { "readBy.adminA": true });
  expect(mock.commit).toHaveBeenCalledTimes(2);
});

it("does not commit when no unread remain and stops if a batch fails", async () => {
  mock.get.mockResolvedValueOnce({ docs: [], empty: true, size: 0 });
  await markAllAdminNotificationsRead("adminA");
  expect(mock.commit).not.toHaveBeenCalled();
  mock.get.mockResolvedValueOnce({ docs: [event("n1", { read: false })], empty: false, size: 1 });
  mock.commit.mockRejectedValueOnce(new Error("offline"));
  await expect(markAllAdminNotificationsRead("adminA")).rejects.toThrow("offline");
});
