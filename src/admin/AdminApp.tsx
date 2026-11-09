import { useEffect, useRef, useState, type FormEvent } from "react";
import type { User } from "firebase/auth";
import { NotificationCenter } from "./components/NotificationCenter";
import { LoadingScreen } from "../shared/components/LoadingScreen";
import { login, logout, watchAuth } from "../shared/firebase/auth";
import { getUserProfile } from "../shared/firebase/repositories/identity";
import "./admin-reset.css";

/**
 * Minimal Admin workspace: preserve login and existing notification functions,
 * while keeping former Admin feature modules on disk for future redesign.
 * Desktop has a permanent sidebar; smaller screens use the drawer.
 * The main workspace remains intentionally empty.
 */
export function AdminApp() {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginPending, setLoginPending] = useState(false);
  const menu = useRef<HTMLDialogElement>(null);
  const hamburger = useRef<HTMLButtonElement>(null);

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
    const dialog = menu.current;
    if (!dialog) return;
    if (menuOpen && !dialog.open) {
      dialog.showModal();
    } else if (!menuOpen && dialog.open) {
      dialog.close();
      hamburger.current?.focus();
    }
  }, [menuOpen, user]);

  useEffect(() => {
    const desktop = window.matchMedia("(min-width: 1024px)");
    const closeMobileDrawer = () => {
      if (desktop.matches) setMenuOpen(false);
    };
    desktop.addEventListener("change", closeMobileDrawer);
    closeMobileDrawer();
    return () => desktop.removeEventListener("change", closeMobileDrawer);
  }, []);

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

  return (
    <div className="admin-reset-shell">
      <aside className="admin-reset-desktop-sidebar" aria-label="แถบเมนู Admin">
        <div className="admin-reset-sidebar-content">
          <div className="admin-reset-sidebar-title">เมนูระบบ</div>
          <button className="admin-reset-sidebar-logout" type="button" onClick={() => void logout()}>
            <i className="fa-solid fa-right-from-bracket" aria-hidden="true" /> ออกจากระบบ
          </button>
        </div>
      </aside>

      <header className="admin-reset-topbar">
        <button
          ref={hamburger}
          type="button"
          className="admin-reset-hamburger"
          aria-label="เปิดเมนู"
          aria-haspopup="dialog"
          aria-controls="admin-reset-navigation"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen(true)}
        >
          <span className="admin-reset-hamburger-lines" aria-hidden="true"><span /><span /><span /></span>
        </button>
        <div className="admin-reset-headline">
          
          <h1>BKK-CUTZ</h1>
          <div className="admin-reset-email">{user.email || "Admin"}</div>
        </div>
        <div className="admin-reset-header-actions">
          <NotificationCenter key={user.uid} userId={user.uid} />
          <button
            className="admin-reset-header-logout"
            type="button"
            onClick={() => void logout()}
            aria-label="ออกจากระบบ"
          >
            <i className="fa-solid fa-right-from-bracket" aria-hidden="true" />
            <span>ออกจากระบบ</span>
          </button>
        </div>
      </header>

      <main className="admin-reset-canvas" aria-label="พื้นที่ Admin สำหรับออกแบบใหม่" />

      <dialog
        ref={menu}
        id="admin-reset-navigation"
        className="admin-reset-menu-dialog"
        aria-label="เมนู Admin"
        onCancel={(event) => { event.preventDefault(); setMenuOpen(false); }}
        onClick={(event) => {
          if (event.target === event.currentTarget) setMenuOpen(false);
        }}
      >
        <div className="admin-reset-menu-content">
          <button className="admin-reset-menu-close" type="button" aria-label="ปิดเมนู" onClick={() => setMenuOpen(false)}>×</button>
          <button className="admin-reset-logout" type="button" onClick={() => void logout()}>
            <i className="fa-solid fa-right-from-bracket" aria-hidden="true" /> ออกจากระบบ
          </button>
        </div>
      </dialog>
    </div>
  );
}
