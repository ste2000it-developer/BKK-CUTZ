import { useEffect, useState, type FormEvent } from "react";
import { LoadingScreen } from "../shared/components/LoadingScreen";
import { login } from "../shared/firebase/auth";
import type { PosBranch } from "../shared/domain/pos-attendance";
import { watchPosSession } from "./session";
import { PosWorkspace } from "./PosWorkspace";


export function PosApp() {
  const [initializing, setInitializing] = useState(true);
  const [branch, setBranch] = useState<PosBranch | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [loginPending, setLoginPending] = useState(false);

  useEffect(() => watchPosSession((current, loading) => {
    setBranch(current);
    setInitializing(loading);
  }, setLoginError), []);

  async function submitLogin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginPending(true);
    setLoginError("");
    try {
      await login(email.trim(), password);
      setPassword("");
    } catch (error) {
      console.error("POS login failed:", error);
      setLoginError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
    } finally {
      setLoginPending(false);
    }
  }

  if (initializing) {
    return <section className="loading-page"><LoadingScreen message="กำลังโหลดระบบ..." messageElement="p" spinnerClassName="loading-spinner" /></section>;
  }

  if (branch) return <PosWorkspace key={branch.id} branch={branch} />;

  return (
    <section className="login-page">
      <header className="login-topbar"><div><div className="system-brand">BKK-CUTZ</div><div className="system-subbrand">BARBER POS SYSTEM</div></div></header>
      <section className="login-stage">
        <form className="login-card" onSubmit={(event) => void submitLogin(event)}>
          <div className="login-card-brand">BKK-CUTZ</div>
          <div className="login-card-subbrand">BARBER POS SYSTEM</div>
          <div className="login-rule" />
          <h1>เข้าสู่ระบบสาขา</h1>
          <p className="login-subtitle">เข้าสู่ระบบด้วยบัญชีประจำสาขา</p>
          <label className="field-label" htmlFor="posReactEmail">อีเมล</label>
          <div className="field-shell"><input id="posReactEmail" type="email" autoComplete="username" required value={email} onChange={(event) => setEmail(event.target.value)} /><span className="field-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m4 7 8 6 8-6" /></svg></span></div>
          <label className="field-label" htmlFor="posReactPassword">รหัสผ่าน</label>
          <div className="field-shell"><input id="posReactPassword" type={passwordVisible ? "text" : "password"} autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} /><button className="field-icon-button" type="button" aria-label={passwordVisible ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน"} onClick={() => setPasswordVisible((visible) => !visible)}><i className={`fa-regular ${passwordVisible ? "fa-eye-slash" : "fa-eye"}`} aria-hidden="true" /></button></div>
          {loginError && <div className="login-error" role="alert">{loginError}</div>}
          <button className="primary-button" type="submit" disabled={loginPending}>{loginPending ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}</button>
        </form>
      </section>
    </section>
  );
}
