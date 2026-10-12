import { useEffect, useMemo, useState } from "react";
import { bangkokBusinessDate } from "../../../shared/domain/cash-closing";
import { buildBranchNetwork, branchStatus, type BranchNode, type NetworkData } from "../../../shared/domain/branch-network";
import { watchBranchNetwork } from "../../../shared/firebase/repositories/branch-network";
import { formatMoney } from "../../../shared/domain/pos-history";
import { notificationTime } from "../../../shared/domain/admin-notifications";
import "./branch-network.css";

function StoreIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 10v10h16V10M3 7l2-4h14l2 4v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0V7ZM3 7h18M9 20v-6h6v6" /></svg>;
}

function BranchDetail({ node, close }: { node: BranchNode; close: () => void }) {
  return <aside className="bn-detail" aria-labelledby="branch-detail-title">
    <header className="bn-detail-head">
      <div>
        <span className="bn-kicker">รายละเอียดสาขา</span>
        <h3 id="branch-detail-title">{node.name}</h3>
        <span className="bn-branch-code">{node.id}</span>
      </div>
      <button type="button" className="bn-close" onClick={close} aria-label="ปิดรายละเอียดสาขา">×</button>
    </header>

    <div className="bn-detail-status-row">
      <span className={"bn-status " + node.status}><i />{branchStatus[node.status]}</span>
    </div>

    <div className="bn-detail-primary">
      <span>ยอดขายวันนี้</span>
      <strong>฿{formatMoney(node.sales)}</strong>
      <small>รวมทิป · ไม่รวมบิลยกเลิก</small>
    </div>

    <div className="bn-detail-metrics">
      <div><span>จำนวนบิล</span><strong>{node.bills}</strong></div>
      <div><span>ค่าบริการ</span><strong>฿{formatMoney(node.sales - node.tips)}</strong></div>
      <div><span>ทิป</span><strong>฿{formatMoney(node.tips)}</strong></div>
    </div>

    <div className="bn-detail-section">
      <div className="bn-detail-section-title"><h4>ช่างที่อยู่ในร้าน</h4><span>{node.barbers.length} คน</span></div>
      {node.barbers.length ? <ul className="bn-barber-list">{node.barbers.map((barber) => <li key={barber.barberId}><span className="bn-avatar">{(barber.barberName || barber.barberId).slice(0, 1)}</span><span>{barber.barberName || barber.barberId}</span><i className="bn-online-dot" /></li>)}</ul> : <p className="bn-muted">ยังไม่มีช่างเข้างานอยู่ในขณะนี้</p>}
    </div>

    {node.closing && <div className="bn-closing">
      <strong>ปิดร้านแล้ววันนี้</strong>
      <p>ผู้ปิดร้าน: {node.closing.closedByBarberName || "ไม่ระบุ"}</p>
      <p>{node.closing.closedAt ? notificationTime(node.closing.closedAt) : "ไม่ระบุเวลา"}</p>
    </div>}
  </aside>;
}

export function BranchNetworkPage() {
  const [dateKey, setDateKey] = useState(() => bangkokBusinessDate());
  const [snapshot, setSnapshot] = useState<{ dateKey: string; data: NetworkData; cached: boolean; at: Date } | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setDateKey(bangkokBusinessDate());
    const timer = window.setInterval(tick, 15000);
    window.addEventListener("focus", tick);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", tick); };
  }, []);

  useEffect(() => {
    setSnapshot(null);
    setError("");
    setSelected(null);
    return watchBranchNetwork(
      dateKey,
      (data, cached) => setSnapshot({ dateKey, data, cached, at: new Date() }),
      () => setError("โหลดข้อมูลสาขาไม่สำเร็จ กรุณาลองใหม่"),
    );
  }, [dateKey, attempt]);

  const current = snapshot?.dateKey === dateKey ? snapshot : null;
  const nodes = useMemo(() => current ? buildBranchNetwork(current.data, dateKey) : [], [current, dateKey]);
  const total = nodes.reduce((sum, branch) => sum + branch.sales, 0);
  const people = nodes.reduce((sum, branch) => sum + branch.barbers.length, 0);
  const bills = nodes.reduce((sum, branch) => sum + branch.bills, 0);
  const detail = nodes.find((node) => node.id === selected) || null;
  const activeBranches = nodes.filter((node) => node.status === "working").length;
  const closedBranches = nodes.filter((node) => node.status === "closed").length;
  const thaiDate = new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", day: "numeric", month: "long", year: "numeric" }).format(new Date(dateKey + "T12:00:00+07:00"));

  return <section className="bn-page" aria-label="ภาพรวมเครือข่ายสาขา">
    <header className="bn-top">
      <div>
        <span className="bn-kicker">ภาพรวมทุกสาขา</span>
        <h2>ผังเครือข่ายสาขา</h2>
        <p>{thaiDate}</p>
      </div>
      <span className={"bn-live" + (current?.cached || error ? " is-cached" : "")}><i />{error ? "เชื่อมต่อขัดข้อง" : !current ? "กำลังเชื่อมต่อ" : current.cached ? "ข้อมูลที่เก็บไว้" : "อัปเดตอัตโนมัติ"}</span>
    </header>

    {error ? <div className="bn-message" role="alert"><span>{error}</span><button type="button" onClick={() => setAttempt((value) => value + 1)}>ลองใหม่</button></div> : !current ? <div className="bn-message" role="status">กำลังรวบรวมข้อมูลทุกสาขา...</div> : <>
      <div className="bn-summary">
        <div className="bn-summary-card"><span>ยอดขายรวมวันนี้</span><strong>฿{formatMoney(total)}</strong><small>รวมทิป · ไม่รวมบิลยกเลิก</small></div>
        <div className="bn-summary-card"><span>จำนวนบิล</span><strong>{bills}</strong><small>บิลสำเร็จวันนี้</small></div>
        <div className="bn-summary-card"><span>ช่างที่อยู่ในร้าน</span><strong>{people}</strong><small>{activeBranches} สาขามีช่างเข้างาน</small></div>
        <div className="bn-summary-card"><span>สถานะสาขา</span><strong>{activeBranches}/{nodes.length}</strong><small>{closedBranches} สาขาปิดร้านแล้ว</small></div>
      </div>

      {!nodes.length ? <div className="bn-message">ยังไม่มีข้อมูลสาขา</div> : <div className={"bn-workspace" + (detail ? " has-detail" : "")}>
        <div className="bn-board">
          <div className="bn-board-head"><div><h3>สาขาทั้งหมด</h3><p>กดการ์ดเพื่อดูรายละเอียด</p></div><span>{nodes.length} สาขา</span></div>
          <div className="bn-grid">
            {nodes.map((node) => <button key={node.id} type="button" className={"bn-card " + node.status + (selected === node.id ? " selected" : "")} onClick={() => setSelected(node.id)} aria-pressed={selected === node.id}>
              <div className="bn-card-head">
                <span className="bn-store"><StoreIcon /></span>
                <div><span className="bn-card-code">{node.id}</span><strong>{node.name}</strong></div>
                <span className="bn-arrow" aria-hidden="true">›</span>
              </div>
              <span className={"bn-status " + node.status}><i />{branchStatus[node.status]}</span>
              <div className="bn-card-sales"><span>ยอดขายวันนี้</span><strong>฿{formatMoney(node.sales)}</strong></div>
              <div className="bn-card-meta"><span><b>{node.bills}</b> บิล</span><span><b>{node.barbers.length}</b> ช่าง</span></div>
            </button>)}
          </div>
        </div>
        {detail && <BranchDetail node={detail} close={() => setSelected(null)} />}
      </div>}

      <footer className="bn-footer"><span>ข้อมูลอัปเดตแบบเรียลไทม์</span><span>ล่าสุด {new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(current.at)}</span></footer>
    </>}
  </section>;
}
