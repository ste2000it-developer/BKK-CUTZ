import { expect, it, vi } from "vitest";
import type { User } from "firebase/auth";
vi.mock("../shared/firebase/auth", () => ({ logout: vi.fn(), watchAuth: vi.fn() }));
vi.mock("../shared/firebase/repositories/identity", () => ({ getBranch: vi.fn(), getUserProfile: vi.fn() }));
import { watchPosSession } from "./session";
import type { getUserProfile } from "../shared/firebase/repositories/identity";
function fixture() {
  let callback!: (user: User | null) => void | Promise<void>;
  const stop = vi.fn(); const update = vi.fn(); const error = vi.fn();
  const deps = {
    logout: vi.fn(async () => {}),
    watchAuth: vi.fn((next: (user: User | null) => void) => { callback = next; return stop; }),
    getUserProfile: vi.fn<typeof getUserProfile>(async () => ({ id: "u", active: true, role: "branch", branchId: "b" })),
    getBranch: vi.fn(async () => ({ id: "b", name: "Branch", active: true, serviceGroup: "g" })),
  };
  const dispose = watchPosSession(update, error, deps);
  return { deps, update, error, stop, dispose, emit: (user: User | null) => callback(user) };
}
const user = { uid: "u" } as User;
it("validates active branch profile and service group before exposing workspace", async () => {
  const f = fixture(); await f.emit(user);
  expect(f.update).toHaveBeenLastCalledWith({ id: "b", name: "Branch", serviceGroup: "g" }, false);
  f.dispose(); expect(f.stop).toHaveBeenCalledOnce();
});
it.each([
  { active: false, role: "branch", branchId: "b" },
  { active: true, role: "admin", branchId: "b" },
  { active: true, role: "branch", branchId: "" },
])("rejects unauthorized profiles", async (profile) => {
  const f = fixture(); f.deps.getUserProfile.mockResolvedValueOnce({ id: "u", ...profile }); await f.emit(user);
  expect(f.deps.logout).toHaveBeenCalledOnce(); expect(f.deps.getBranch).not.toHaveBeenCalled(); f.dispose();
});
it("ignores stale auth completion after logout or unmount", async () => {
  const f = fixture(); let finish!: (profile: Awaited<ReturnType<typeof getUserProfile>>) => void;
  f.deps.getUserProfile.mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
  const old = f.emit(user); await f.emit(null); finish({ id: "u", active: true, role: "branch", branchId: "b" }); await old;
  expect(f.deps.getBranch).not.toHaveBeenCalled(); expect(f.update).toHaveBeenLastCalledWith(null, false); f.dispose();
});
