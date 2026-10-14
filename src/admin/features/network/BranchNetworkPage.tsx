import { useEffect, useMemo, useState } from "react";
import { bangkokBusinessDate } from "../../../shared/domain/cash-closing";
import { buildBranchNetwork, branchStatus, shiftNetworkDate, type BranchNode, type NetworkBranch, type NetworkData } from "../../../shared/domain/branch-network";
import { watchBranchNetwork } from "../../../shared/firebase/repositories/branch-network";
import { formatMoney } from "../../../shared/domain/pos-history";
import { notificationTime } from "../../../shared/domain/admin-notifications";
import { BranchEditor } from "./BranchEditor";
import "./branch-network.css";

function StoreIcon() {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 10v10h16V10M3 7l2-4h14l2 4v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0V7ZM3 7h18M9 20v-6h6v6" /></svg>;
}

function BranchDetail({ node, close, historical, dateLabel, edit, registered }: { node: BranchNode; close: () => void; historical: boolean; dateLabel: string; edit: () => void; registered?: NetworkBranch }) {
  return <aside className="bn-detail" aria-labelledby="branch-detail-title">
    <header className="bn-detail-head">
      <div>
        <span className="bn-kicker">รายละเอียดสาขา</span>
        <h3 id="branch-detail-title">{node.name}</h3>
        <span className="bn-branch-code">{node.id} · {dateLabel}</span>
      </div>
      <button type="button" className="bn-close" onClick={close} aria-label="ปิดรายละเอียดสาขา">×</button>
    </header>

    {registered && <div className="bn-manage-row"><span>สถานะปัจจุบัน: {registered.active === true ? "เปิดใช้งาน" : "ปิดใช้งาน"}</span><button type="button" className="bn-secondary" onClick={edit}>แก้ไขสาขา</button></div>}

    <div className="bn-detail-status-row">
      <span className={"bn-status " + node.status}><i />{branchStatus[node.status]}</span>
    </div>

    <div className="bn-detail-primary">
      <span>{historical ? "ยอดขายในวันที่เลือก" : "ยอดขายวันนี้"}</span>
      <strong>฿{formatMoney(node.sales)}</strong>
      <small>รวมทิป · ไม่รวมบิลยกเลิก</small>
    </div>

    <div className="bn-detail-metrics">
      <div><span>จำนวนบิล</span><strong>{node.bills}</strong></div>
      <div><span>ค่าบริการ</span><strong>฿{formatMoney(node.sales - node.tips)}</strong></div>
      <div><span>ทิป</span><strong>฿{formatMoney(node.tips)}</strong></div>
    </div>

    <div className="bn-detail-section">
      <div className="bn-detail-section-title"><h4>{historical ? "ช่างที่เข้างานในวันนั้น" : "ช่างที่อยู่ในร้าน"}</h4><span>{node.barbers.length} คน</span></div>
      {node.barbers.length ? <ul className="bn-barber-list">{node.barbers.map((barber) => <li key={barber.barberId}><span className="bn-avatar">{(barber.barberName || barber.barberId).slice(0, 1)}</span><span>{barber.barberName || barber.barberId}</span>{!historical && <i className="bn-online-dot" />}</li>)}</ul> : <p className="bn-muted">{historical ? "ไม่มีประวัติเข้างานในวันที่เลือก" : "ยังไม่มีช่างเข้างานอยู่ในขณะนี้"}</p>}
    </div>

    {node.closing && <div className="bn-closing">
      <strong>{historical ? "บันทึกการปิดร้านในวันนั้น" : "ปิดร้านแล้ววันนี้"}</strong>
      <p>ผู้ปิดร้าน: {node.closing.closedByBarberName || "ไม่ระบุ"}</p>
      <p>{node.closing.closedAt ? notificationTime(node.closing.closedAt) : "ไม่ระบุเวลา"}</p>
    </div>}
  </aside>;
}

export function BranchNetworkPage() {
  const [today, setToday] = useState(() => bangkokBusinessDate());
  const [chosenDate, setChosenDate] = useState<string | null>(null);
  const dateKey = chosenDate || today;
  const historical = dateKey !== today;
  const [search, setSearch] = useState("");
  const [snapshot, setSnapshot] = useState<{ dateKey: string; data: NetworkData; cached: boolean; at: Date } | null>(null);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [editor, setEditor] = useState<{ branch: NetworkBranch | null } | null>(null);
  const [saveNotice, setSaveNotice] = useState("");
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const tick = () => setToday(bangkokBusinessDate());
    const timer = window.setInterval(tick, 15000);
    window.addEventListener("focus", tick);
    return () => { window.clearInterval(timer); window.removeEventListener("focus", tick); };
  }, []);

  useEffect(() => {
    setSnapshot(null);
    setError("");
    return watchBranchNetwork(
      dateKey,
      (data, cached) => setSnapshot({ dateKey, data, cached, at: new Date() }),
      () => setError("โหลดข้อมูลสาขาไม่สำเร็จ กรุณาลองใหม่"),
      historical,
    );
  }, [dateKey, historical, attempt]);

  const current = snapshot?.dateKey === dateKey ? snapshot : null;
  const nodes = useMemo(() => current ? buildBranchNetwork(current.data, dateKey, historical) : [], [current, dateKey, historical]);
  const groups = [...new Set(["A", "B", "C", "D", ...(current?.data.branches.map((branch) => branch.serviceGroup || "").filter(Boolean) || [])])].sort();
  const visibleNodes = nodes.filter((node) => (node.name + " " + node.id).toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()));
  const recordedBranches = nodes.filter((node) => node.bills || node.barbers.length || node.closing).length;
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
        <h2>ทุกสาขา ในมุมเดียว</h2>
        <p>ติดตามยอดขาย ทีมช่าง และการปิดร้านของแต่ละสาขา</p>
      </div>
      <div className="bn-top-actions"><button type="button" className="bn-primary" onClick={() => { setSaveNotice(""); setEditor({ branch: null }); }}>+ เพิ่มสาขา</button><span className={"bn-live" + (current?.cached || error ? " is-cached" : "")}><i />{error ? "เชื่อมต่อขัดข้อง" : !current ? "กำลังเชื่อมต่อ" : current.cached ? "ข้อมูลที่เก็บไว้" : historical ? "ข้อมูลย้อนหลัง" : "อัปเดตอัตโนมัติ"}</span></div>
    </header>

    {saveNotice && <p className="bn-save-notice" role="status">{saveNotice}</p>}
    {editor && <BranchEditor branch={editor.branch} groups={groups} close={() => setEditor(null)} saved={(id) => { setEditor(null); setSaveNotice(`บันทึกสาขา ${id} เรียบร้อยแล้ว`); setSelected(id); }} />}

    <div className="bn-toolbar">
      <div className="bn-date-controls">
        <button type="button" aria-label="วันก่อนหน้า" onClick={() => setChosenDate(shiftNetworkDate(dateKey, -1))}>‹</button>
        <label><span>วันที่แสดงข้อมูล</span><input aria-label="วันที่แสดงข้อมูล" type="date" value={dateKey} max={today} onChange={(event) => { const value = event.target.value; if (/^\d{4}-\d{2}-\d{2}$/.test(value) && value <= today) setChosenDate(value === today ? null : value); }} /></label>
        <button type="button" aria-label="วันถัดไป" disabled={!historical} onClick={() => { const next = shiftNetworkDate(dateKey, 1); setChosenDate(next >= today ? null : next); }}>›</button>
      </div>
      <div className="bn-shortcuts"><button type="button" aria-pressed={!historical} className={!historical ? "is-active" : ""} onClick={() => setChosenDate(null)}>วันนี้</button><button type="button" aria-pressed={dateKey === shiftNetworkDate(today, -1)} className={dateKey === shiftNetworkDate(today, -1) ? "is-active" : ""} onClick={() => setChosenDate(shiftNetworkDate(today, -1))}>เมื่อวาน</button></div>
      <span className="bn-date-caption">{thaiDate}</span>
    </div>
    {historical && <p className="bn-history-note">กำลังดูข้อมูลย้อนหลัง · จำนวนช่างมาจากประวัติเข้างานของวันนั้น ชื่อสาขาอ้างอิงทะเบียนปัจจุบัน</p>}

    {error ? <div className="bn-message" role="alert"><span>{error}</span><button type="button" onClick={() => setAttempt((value) => value + 1)}>ลองใหม่</button></div> : !current ? <div className="bn-message" role="status">กำลังรวบรวมข้อมูลทุกสาขา...</div> : <>
      <div className="bn-summary">
        <div className="bn-summary-card"><span>{historical ? "ยอดขายรวมในวันที่เลือก" : "ยอดขายรวมวันนี้"}</span><strong>฿{formatMoney(total)}</strong><small>รวมทิป · ไม่รวมบิลยกเลิก</small></div>
        <div className="bn-summary-card"><span>จำนวนบิล</span><strong>{bills}</strong><small>ไม่รวมบิลยกเลิก</small></div>
        <div className="bn-summary-card"><span>{historical ? "ช่างที่เข้างานในวันนั้น" : "ช่างที่อยู่ในร้าน"}</span><strong>{people}</strong><small>{historical ? "รวมจำนวนช่างของแต่ละสาขา" : `${activeBranches} สาขามีช่างเข้างาน`}</small></div>
        <div className="bn-summary-card"><span>{historical ? "สาขาที่มีข้อมูล" : "สาขาที่มีช่างอยู่"}</span><strong>{historical ? recordedBranches : activeBranches}<em> / {nodes.length}</em></strong><small>{closedBranches} สาขาปิดร้านแล้ว</small></div>
      </div>

      {historical && nodes.length > 0 && recordedBranches === 0 && <p className="bn-muted bn-empty-day" role="status">ไม่มีรายการขาย ประวัติเข้างาน หรือบันทึกปิดร้านในวันที่เลือก ลองเลือกวันอื่นเพื่อดูข้อมูล</p>}

      {!nodes.length ? <div className="bn-message">ยังไม่มีข้อมูลสาขา</div> : <div className={"bn-workspace" + (detail ? " has-detail" : "")}>
        <div className="bn-board">
          <div className="bn-board-head"><div><h3>สาขาทั้งหมด</h3><p>เรียงตามรหัสสาขา · กดการ์ดเพื่อดูหรือแก้ไข</p></div><label className="bn-search"><span className="bn-sr-only">ค้นหาสาขา</span><input type="search" placeholder="ค้นหาชื่อหรือรหัสสาขา…" value={search} onChange={(event) => setSearch(event.target.value)} /></label></div>
          <div className="bn-list-caption">แสดง {visibleNodes.length} จาก {nodes.length} สาขา</div>
          <div className="bn-grid">
            {visibleNodes.map((node) => <button key={node.id} type="button" className={"bn-card " + node.status + (selected === node.id ? " selected" : "")} onClick={() => setSelected(node.id)} aria-pressed={selected === node.id}>
              <div className="bn-card-head">
                <span className="bn-store"><StoreIcon /></span>
                <div><span className="bn-card-code">{node.id}</span><strong>{node.name}</strong></div>
                <span className="bn-arrow" aria-hidden="true">›</span>
              </div>
              <span className={"bn-status " + node.status}><i />{branchStatus[node.status]}</span>
              <div className="bn-card-sales"><span>{historical ? "ยอดขายในวันที่เลือก" : "ยอดขายวันนี้"}</span><strong>฿{formatMoney(node.sales)}</strong></div>
              <div className="bn-card-meta"><span><b>{node.bills}</b> บิล</span><span><b>{node.barbers.length}</b> ช่าง</span></div>
            </button>)}
          </div>
          {!visibleNodes.length && <p className="bn-muted">ไม่พบสาขาที่ค้นหา ลองใช้ชื่อหรือรหัสอื่น</p>}
        </div>
        {detail && <BranchDetail node={detail} historical={historical} dateLabel={thaiDate} registered={current.data.branches.find((branch) => branch.id === detail.id)} edit={() => { const branch = current.data.branches.find((branch) => branch.id === detail.id); if (branch) { setSaveNotice(""); setEditor({ branch }); } }} close={() => setSelected(null)} />}
      </div>}

      <footer className="bn-footer"><span>{historical ? "ข้อมูลตามวันที่เลือก · เวลาไทย" : "ข้อมูลอัปเดตแบบเรียลไทม์ · เวลาไทย"}</span><span>ล่าสุด {new Intl.DateTimeFormat("th-TH", { timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(current.at)}</span></footer>
    </>}
  </section>;
}
