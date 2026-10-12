import { NotificationCenter } from "./components/NotificationCenter";
import { useEffect, useRef, useState, type ComponentType, type FormEvent } from "react";
import type { User } from "firebase/auth";
import { LoadingScreen } from "../shared/components/LoadingScreen";
import { login, logout, watchAuth } from "../shared/firebase/auth";
import { getUserProfile } from "../shared/firebase/repositories/identity";
import { ServicesPage } from "./features/services/ServicesPage";

type AdminPage = "network" | "services" | "barbers" | "payouts" | "payout-history" | "daily-history" | "advances" | "summary";

const adminPageLoaders = {
  network: () => import("./features/network/BranchNetworkPage").then(({ BranchNetworkPage }) => BranchNetworkPage),
  services: async () => ServicesPage,
  barbers: () => import("./features/barbers/BarbersPage").then(({ BarbersPage }) => BarbersPage),
  payouts: () => import("./features/payouts/PayoutPage").then(({ PayoutPage }) => PayoutPage),
  "payout-history": () => import("./features/payouts/PayoutHistoryPage").then(({ PayoutHistoryPage }) => PayoutHistoryPage),
  "daily-history": () => import("./features/daily-history/DailyHistoryPage").then(({ DailyHistoryPage }) => DailyHistoryPage),
  advances: () => import("./features/advances/AdvancePage").then(({ AdvancePage }) => AdvancePage),
  summary: () => import("./features/summary/FinancialSummaryPage").then(({ FinancialSummaryPage }) => FinancialSummaryPage),
};

const navigation: Array<{ id: AdminPage; icon: string; label: string; title: string }> = [
  { id: "network", icon: "◉", label: "ผังเครือข่ายสาขา", title: "ผังเครือข่ายสาขา" },
  { id: "services", icon: "✂", label: "เมนูบริการ / ราคา", title: "เมนูบริการ / ราคา" },
  { id: "barbers", icon: "♙", label: "จัดการช่าง", title: "จัดการช่าง" },
  { id: "payouts", icon: "฿", label: "จ่ายเงินช่าง", title: "จ่ายเงินช่าง" },
  { id: "payout-history", icon: "◷", label: "ประวัติจ่ายเงินช่าง", title: "ประวัติจ่ายเงินช่าง" },
  { id: "daily-history", icon: "≡", label: "ประวัติรายวัน", title: "ประวัติรายวัน" },
  { id: "advances", icon: "⇄", label: "เบิกล่วงหน้า", title: "เบิกล่วงหน้า" },
  { id: "summary", icon: "∑", label: "สรุปยอด", title: "สรุปยอด" },
];

export function AdminApp() {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [page, setPage] = useState<AdminPage>("network");
  const [loadedPages, setLoadedPages] = useState(() => new Map<AdminPage, ComponentType>([["services", ServicesPage]]));
  const [pageLoadError, setPageLoadError] = useState("");
  const navigationRequest = useRef(0);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginPending, setLoginPending] = useState(false);

  useEffect(() => watchAuth(async (nextUser) => {
    if (!nextUser) {
      setUser(null);
      setInitializing(false);
      return;
    }

    try {
      const profile = await getUserProfile(nextUser.uid);
      if (profile.active !== true || profile.role !== "admin") {
        await logout();
        setUser(null);
        setLoginError("บัญชีนี้ไม่มีสิทธิ์ Admin");
      } else {
        setUser(nextUser);
        setLoginError("");
      }
    } catch (error) {
      console.error("Admin profile check failed:", error);
      setUser(null);
      setLoginError(error instanceof Error ? error.message : "ตรวจสอบบัญชีไม่สำเร็จ");
    } finally {
      setInitializing(false);
    }
  }), []);

  useEffect(() => {
    if (!user) return;
    const detail = { user };
    if (page === "services") window.dispatchEvent(new CustomEvent("bkk:admin:services:activate", { detail }));
    if (page === "payouts") window.dispatchEvent(new CustomEvent("bkk:payout:activate", { detail }));
    if (page === "payout-history") window.dispatchEvent(new CustomEvent("bkk:payout-history:activate", { detail }));
    if (page === "daily-history") window.dispatchEvent(new CustomEvent("bkk:daily-history:activate", { detail }));
  }, [page, user]);

  useEffect(() => {
    if (!user || loadedPages.has("network")) return;
    void adminPageLoaders.network().then((Page) => {
      setLoadedPages((loaded) => loaded.has("network") ? loaded : new Map(loaded).set("network", Page));
    }).catch((error) => {
      console.error("Admin network page preload failed:", error);
    });
  }, [user, loadedPages]);

  async function navigateToPage(nextPage: AdminPage) {
    const request = ++navigationRequest.current;
    setPageLoadError("");
    try {
      const Page = await adminPageLoaders[nextPage]();
      if (request !== navigationRequest.current) return;

      setLoadedPages((loaded) => new Map(loaded).set(nextPage, Page));
      setPage(nextPage);
    } catch (error) {
      if (request !== navigationRequest.current) return;
      console.error("Admin page load failed:", error);
      setPageLoadError("โหลดหน้าไม่สำเร็จ กรุณาลองใหม่");
    }
  }

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginPending(true);
    setLoginError("");
    try {
      await login(email.trim(), password);
      setPassword("");
    } catch (error) {
      console.error("Admin login failed:", error);
      setLoginError("เข้าสู่ระบบไม่สำเร็จ ตรวจสอบอีเมลและรหัสผ่าน");
    } finally {
      setLoginPending(false);
    }
  }

  if (initializing) {
    return <section className="loading-page"><LoadingScreen message="กำลังตรวจสอบบัญชี..." spinnerClassName="spinner" /></section>;
  }

  if (!user) {
    return (
      <section className="login-page">
        <form className="login-card" onSubmit={(event) => void submitLogin(event)}>
          <h1>Admin</h1>
          <p className="subtitle">ระบบจัดการ BKK-CUTZ</p>
          <label htmlFor="reactAdminEmail">อีเมล</label>
          <input id="reactAdminEmail" type="email" autoComplete="username" value={email} required onChange={(event) => setEmail(event.target.value)} />
          <label htmlFor="reactAdminPassword">รหัสผ่าน</label>
          <div className="password-field">
            <input id="reactAdminPassword" type={passwordVisible ? "text" : "password"} autoComplete="current-password" value={password} required onChange={(event) => setPassword(event.target.value)} />
            <button className="password-toggle-button" type="button" aria-label={passwordVisible ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"} onClick={() => setPasswordVisible((visible) => !visible)}><i className={`fa-regular ${passwordVisible ? "fa-eye-slash" : "fa-eye"}`} aria-hidden="true" /></button>
          </div>
          {loginError && <div className="error-box" role="alert">{loginError}</div>}
          <button className="primary-button" type="submit" disabled={loginPending}>{loginPending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ Admin"}</button>
        </form>
      </section>
    );
  }

  const BranchNetworkPage = loadedPages.get("network");
  const BarbersPage = loadedPages.get("barbers");
  const PayoutPage = loadedPages.get("payouts");
  const PayoutHistoryPage = loadedPages.get("payout-history");
  const DailyHistoryPage = loadedPages.get("daily-history");
  const AdvancePage = loadedPages.get("advances");
  const FinancialSummaryPage = loadedPages.get("summary");

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div><div className="sidebar-brand">BKK-CUTZ</div><div className="sidebar-subbrand">ADMIN PANEL</div></div>
        <div className="sidebar-menu-title">เมนูระบบ</div>
        <nav className="admin-nav" aria-label="เมนู Admin">
          {navigation.map((item) => <button className={`admin-nav-button${page === item.id ? " active" : ""}`} key={item.id} type="button" aria-current={page === item.id ? "page" : undefined} onClick={() => void navigateToPage(item.id)}><span className="nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span><b aria-hidden="true">›</b></button>)}
        </nav>
        <div className="sidebar-footer"><div>STAY SHARP</div><div>LOOK FRESH</div></div>
      </aside>
      <main className="admin-main">
        <div className="admin-main-inner">
          <header className="admin-topbar"><div><div className="admin-kicker">BKK-CUTZ CONTROL</div><h1>{navigation.find((item) => item.id === page)?.title}</h1><div className="admin-email">{user.email || "Admin"}</div></div><div className="admin-header-actions"><NotificationCenter key={user.uid} /><button className="logout-button" type="button" onClick={() => void logout()}>ออกจากระบบ</button></div></header>
          {pageLoadError && <div className="error-box" role="alert">{pageLoadError}</div>}
          {BranchNetworkPage && <section className={page === "network" ? "" : "hidden"}><BranchNetworkPage /></section>}
          <section className={page === "services" ? "" : "hidden"}><ServicesPage /></section>
          {BarbersPage && <section className={page === "barbers" ? "" : "hidden"}><BarbersPage /></section>}
          {PayoutPage && <section className={page === "payouts" ? "" : "hidden"}><PayoutPage /></section>}
          {PayoutHistoryPage && <section className={page === "payout-history" ? "" : "hidden"}><PayoutHistoryPage /></section>}
          {DailyHistoryPage && <section className={page === "daily-history" ? "" : "hidden"}><DailyHistoryPage /></section>}
          {AdvancePage && <section className={page === "advances" ? "" : "hidden"}><AdvancePage /></section>}
          {FinancialSummaryPage && <section className={page === "summary" ? "" : "hidden"}><FinancialSummaryPage /></section>}
        </div>
      </main>
    </div>
  );
}
