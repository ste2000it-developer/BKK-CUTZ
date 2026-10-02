import { useEffect, useState, type FormEvent } from "react";
import type { User } from "firebase/auth";
import { LoadingScreen } from "../shared/components/LoadingScreen";
import { login, logout, watchAuth } from "../shared/firebase/auth";
import { getUserProfile } from "../shared/firebase/repositories/identity";
import { DailyHistoryPage } from "./features/daily-history/DailyHistoryPage";
import { PayoutHistoryPage } from "./features/payouts/PayoutHistoryPage";
import { PayoutPage } from "./features/payouts/PayoutPage";
import { ServicesPage } from "./features/services/ServicesPage";

type AdminPage = "services" | "payouts" | "payout-history" | "daily-history";

const navigation: Array<{ id: AdminPage; icon: string; label: string; title: string }> = [
  { id: "services", icon: "✂", label: "เมนูบริการ / ราคา", title: "เมนูบริการ / ราคา" },
  { id: "payouts", icon: "฿", label: "จ่ายเงินช่าง", title: "จ่ายเงินช่าง" },
  { id: "payout-history", icon: "◷", label: "ประวัติจ่ายเงินช่าง", title: "ประวัติจ่ายเงินช่าง" },
  { id: "daily-history", icon: "≡", label: "ประวัติรายการรายวัน", title: "ประวัติรายการรายวัน" },
];

export function AdminApp() {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [page, setPage] = useState<AdminPage>("services");
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
    return <section className="loading-page"><LoadingScreen message="กำลังตรวจสอบบัญชี..." messageElement="div" spinnerClassName="spinner" /></section>;
  }

  if (!user) {
    return (
      <section className="login-page">
        <form className="login-card" onSubmit={(event) => void submitLogin(event)}>
          <div className="login-brand">BKK-CUTZ</div>
          <div className="login-subbrand">ADMIN PANEL</div>
          <div className="login-rule" />
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

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div><div className="sidebar-brand">BKK-CUTZ</div><div className="sidebar-subbrand">ADMIN PANEL</div></div>
        <div className="sidebar-menu-title">เมนูระบบ</div>
        <nav className="admin-nav" aria-label="เมนู Admin">
          {navigation.map((item) => <button className={`admin-nav-button${page === item.id ? " active" : ""}`} key={item.id} type="button" aria-current={page === item.id ? "page" : undefined} onClick={() => setPage(item.id)}><span className="nav-icon" aria-hidden="true">{item.icon}</span><span>{item.label}</span><b aria-hidden="true">›</b></button>)}
        </nav>
        <div className="sidebar-footer"><div>GOOD HAIR</div><div>BETTER PEOPLE</div></div>
      </aside>
      <main className="admin-main">
        <div className="admin-main-inner">
          <header className="admin-topbar"><div><div className="admin-kicker">BKK-CUTZ CONTROL</div><h1>{navigation.find((item) => item.id === page)?.title}</h1><div className="admin-email">{user.email || "Admin"}</div></div><button className="logout-button" type="button" onClick={() => void logout()}>ออกจากระบบ</button></header>
          <section className={page === "services" ? "" : "hidden"}><ServicesPage /></section>
          <section className={page === "payouts" ? "" : "hidden"}><PayoutPage /></section>
          <section className={page === "payout-history" ? "" : "hidden"}><PayoutHistoryPage /></section>
          <section className={page === "daily-history" ? "" : "hidden"}><DailyHistoryPage /></section>
        </div>
      </main>
    </div>
  );
}