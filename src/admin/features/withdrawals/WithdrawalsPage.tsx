import { useEffect, useMemo, useRef, useState } from "react";
import { bangkokBusinessDate } from "../../../shared/domain/cash-closing";
import { listBranches, type BranchRecord } from "../../../shared/firebase/repositories/branches";
import { listBarberAdvances, type BarberAdvanceRecord } from "../../../shared/firebase/repositories/advances";
import { listShopExpensesByDate, type ShopExpenseRecord } from "../../../shared/firebase/repositories/shop-expenses";
import "./withdrawals.css";

type WithdrawalType = "tip" | "purchase";
type TypeFilter = "all" | WithdrawalType;
type Withdrawal = {
  key: string;
  kind: WithdrawalType;
  branchId: string;
  branchName: string;
  barberName: string;
  amount: number;
  reason: string;
  note: string;
  createdAt: string;
  dateKey: string;
  source: "pos" | "admin";
};

const money = (value: number) =>
  "฿" + value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const typeLabel = (kind: WithdrawalType) => kind === "tip" ? "เบิกทิปเงินสด" : "ซื้อของร้าน";
const typeIcon = (kind: WithdrawalType) => kind === "tip" ? "fa-money-bill-transfer" : "fa-basket-shopping";
const dateLabel = (dateKey: string) =>
  new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    timeZone: "Asia/Bangkok", day: "numeric", month: "long", year: "numeric",
  }).format(new Date(dateKey + "T12:00:00+07:00"));
const timeLabel = (iso: string) => {
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? "ไม่ระบุเวลา"
    : new Intl.DateTimeFormat("th-TH", {
      timeZone: "Asia/Bangkok", hour: "2-digit", minute: "2-digit", hour12: false,
    }).format(date) + " น.";
};
const shiftDate = (dateKey: string, delta: number) => {
  const date = new Date(dateKey + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + delta);
  return date.toISOString().slice(0, 10);
};

function normalizeExpenses(expenses: ShopExpenseRecord[]): Withdrawal[] {
  return expenses.map((item) => ({
    key: "purchase:" + item.id,
    kind: "purchase",
    branchId: item.branchId,
    branchName: item.branchName || item.branchId,
    barberName: item.barberName || item.barberId || "ไม่ระบุชื่อ",
    amount: Number(item.amount),
    reason: item.reason || "ซื้อของร้าน",
    note: item.note || "",
    createdAt: item.createdAt,
    dateKey: item.dateKey,
    source: item.source || "pos",
  }));
}

function normalizeTipWithdrawals(advances: BarberAdvanceRecord[]): Withdrawal[] {
  // Match the POS cash-closing rules exactly: these are cash tips paid from
  // the till, not salary advances or cancelled withdrawals.
  return advances
    .filter((item) => item.type === "tip" && item.source === "pos"
      && ["active", "approved", "deducted"].includes(item.status))
    .map((item) => ({
      key: "tip:" + item.id,
      kind: "tip",
      branchId: item.branchId || "",
      branchName: item.branchName || item.branchId || "ไม่ระบุสาขา",
      barberName: item.barberName || item.barberId || "ไม่ระบุชื่อ",
      amount: Number(item.amount),
      reason: item.reason || "เบิกทิปเงินสด",
      note: item.note || "",
      createdAt: item.createdAt,
      dateKey: item.dateKey,
      source: "pos",
    }));
}

export function WithdrawalsPage() {
  const [today, setToday] = useState(() => bangkokBusinessDate());
  const [dateKey, setDateKey] = useState(() => bangkokBusinessDate());
  const [branchFilter, setBranchFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [search, setSearch] = useState("");
  const [entries, setEntries] = useState<Withdrawal[]>([]);
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [loadedDate, setLoadedDate] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const detailDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const tick = () => setToday(bangkokBusinessDate());
    const interval = window.setInterval(tick, 60_000);
    window.addEventListener("focus", tick);
    return () => { window.clearInterval(interval); window.removeEventListener("focus", tick); };
  }, []);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError("");
    setSelectedKey(null);
    void Promise.all([
      listShopExpensesByDate(dateKey),
      listBarberAdvances(dateKey),
      listBranches(),
    ]).then(([expenses, advances, branchesResult]) => {
      if (!live) return;
      const combined = [
        ...normalizeExpenses(expenses),
        ...normalizeTipWithdrawals(advances),
      ].sort((a, b) => (Date.parse(b.createdAt) || 0) - (Date.parse(a.createdAt) || 0));
      setEntries(combined);
      setBranches(branchesResult);
      setLoadedDate(dateKey);
    }).catch((issue: unknown) => {
      if (!live) return;
      console.error("Admin withdrawal history failed:", issue);
      setLoadedDate("");
      setError("โหลดรายการเบิกเงินไม่สำเร็จ กรุณาลองใหม่อีกครั้ง");
    }).finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [dateKey, refresh]);

  const current = loadedDate === dateKey && !error ? entries : [];
  const branchOptions = useMemo(() => {
    const names = new Map<string, string>();
    for (const branch of branches) names.set(branch.id, branch.name || branch.id);
    for (const row of current) if (row.branchId && !names.has(row.branchId)) names.set(row.branchId, row.branchName);
    return [...names].sort((a, b) => a[1].localeCompare(b[1], "th"));
  }, [branches, current]);

  const branchMatches = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("th");
    return current.filter((row) =>
      (branchFilter === "all" || row.branchId === branchFilter) &&
      (!term || [row.barberName, row.branchName, row.reason, row.note]
        .some((field) => field.toLocaleLowerCase("th").includes(term))),
    );
  }, [current, branchFilter, search]);
  const filtered = useMemo(
    () => branchMatches.filter((row) => typeFilter === "all" || row.kind === typeFilter),
    [branchMatches, typeFilter],
  );

  const total = filtered.reduce((sum, row) => sum + row.amount, 0);
  // The two breakdown shortcuts always show the full amounts for the
  // selected branch/search, so switching tabs doesn't falsely show zero.
  const tipTotal = branchMatches.filter((row) => row.kind === "tip").reduce((sum, row) => sum + row.amount, 0);
  const purchaseTotal = branchMatches.filter((row) => row.kind === "purchase").reduce((sum, row) => sum + row.amount, 0);
  const chosenIndex = selectedKey ? filtered.findIndex((row) => row.key === selectedKey) : -1;
  const chosen = chosenIndex >= 0 ? filtered[chosenIndex] : null;

  useEffect(() => {
    const dialog = detailDialog.current;
    if (!dialog) return;
    if (!chosen) {
      if (dialog.open) dialog.close();
      return;
    }
    if (!dialog.open) dialog.showModal();

    const body = document.body, html = document.documentElement;
    const old = {
      bodyPosition: body.style.position, bodyTop: body.style.top,
      bodyWidth: body.style.width, bodyOverflow: body.style.overflow,
      htmlOverflow: html.style.overflow,
    };
    const scroll = window.scrollY;
    html.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = "-" + scroll + "px";
    body.style.width = "100%";
    body.style.overflow = "hidden";
    return () => {
      if (dialog.open) dialog.close();
      body.style.position = old.bodyPosition;
      body.style.top = old.bodyTop;
      body.style.width = old.bodyWidth;
      body.style.overflow = old.bodyOverflow;
      html.style.overflow = old.htmlOverflow;
      window.scrollTo(0, scroll);
    };
  }, [Boolean(chosen)]);

  useEffect(() => {
    if (!chosen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" && chosenIndex > 0) {
        event.preventDefault();
        setSelectedKey(filtered[chosenIndex - 1].key);
      } else if (event.key === "ArrowRight" && chosenIndex < filtered.length - 1) {
        event.preventDefault();
        setSelectedKey(filtered[chosenIndex + 1].key);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [chosenIndex, filtered, chosen]);

  const chooseDate = (value: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value > today) return;
    setSelectedKey(null);
    setDateKey(value);
  };
  const chooseType = (value: TypeFilter) => { setSelectedKey(null); setTypeFilter(value); };
  const chooseBranch = (value: string) => { setSelectedKey(null); setBranchFilter(value); };

  return (
    <section className="aw-page" aria-label="รายการเบิกเงิน">
      <header className="aw-header">
        <div>
          <h2>รายการเบิกเงิน</h2>
          <p>ตรวจสอบเงินสดที่เบิกออกจากร้านได้ทุกสาขา</p>
        </div>
        <button className="aw-refresh" type="button" disabled={loading} onClick={() => setRefresh((value) => value + 1)} aria-label="โหลดรายการใหม่" title="โหลดรายการใหม่">
          <i className="fa-solid fa-rotate-right" aria-hidden="true" />
        </button>
      </header>

      <section className="aw-filters" aria-label="ค้นหารายการเบิก">
        <div className="aw-filters-top">
          <div className="aw-date-nav">
            <button type="button" onClick={() => chooseDate(shiftDate(dateKey, -1))} aria-label="วันก่อนหน้า">
              <i className="fa-solid fa-chevron-left" aria-hidden="true" />
            </button>
            <label className="aw-date-picker">
              <i className="fa-regular fa-calendar-days" aria-hidden="true" />
              <span>{dateLabel(dateKey)}</span>
              <input type="date" aria-label="เลือกวันที่" value={dateKey} max={today} onChange={(event) => chooseDate(event.target.value)} />
            </label>
            <button type="button" onClick={() => chooseDate(shiftDate(dateKey, 1))} disabled={dateKey >= today} aria-label="วันถัดไป">
              <i className="fa-solid fa-chevron-right" aria-hidden="true" />
            </button>
          </div>
          {dateKey !== today && <button className="aw-today" type="button" onClick={() => chooseDate(today)}>วันนี้</button>}
          <label className="aw-branch-select">
            <i className="fa-solid fa-store" aria-hidden="true" />
            <select aria-label="เลือกสาขา" value={branchFilter} onChange={(event) => chooseBranch(event.target.value)}>
              <option value="all">ทุกสาขา</option>
              {branchOptions.map(([id, name]) => <option value={id} key={id}>{name}</option>)}
            </select>
            <i className="fa-solid fa-chevron-down" aria-hidden="true" />
          </label>
        </div>
        <div className="aw-types" role="group" aria-label="ประเภทการเบิก">
          {([
            ["all", "ทุกประเภท"],
            ["tip", "เบิกทิปเงินสด"],
            ["purchase", "ซื้อของร้าน"],
          ] as const).map(([value, label]) => (
            <button key={value} type="button" aria-pressed={typeFilter === value}
              className={typeFilter === value ? "aw-type is-active" : "aw-type"}
              onClick={() => chooseType(value)}>
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="aw-overview" aria-label="ยอดเบิกที่แสดง">
        <div className="aw-overview-main">
          <span>เงินสดที่เบิกออก{typeFilter === "all" ? "ทั้งหมด" : typeFilter === "tip" ? " · เบิกทิปเงินสด" : " · ซื้อของร้าน"}</span>
          <strong>{loadedDate === dateKey && !error ? money(total) : "—"}</strong>
          <small>{loading ? "กำลังอัปเดตข้อมูล..." : error ? "ยังไม่สามารถแสดงยอดได้" : filtered.length.toLocaleString("th-TH") + " รายการในวันที่เลือก"}</small>
        </div>
        <div className="aw-overview-breakdown" aria-label="แยกตามประเภท">
          <button type="button" className={typeFilter === "tip" ? "is-selected" : ""} onClick={() => chooseType(typeFilter === "tip" ? "all" : "tip")}>
            <i className="fa-solid fa-money-bill-transfer" aria-hidden="true" />
            <span>เบิกทิป</span>
            <strong>{loadedDate === dateKey && !error ? money(tipTotal) : "—"}</strong>
          </button>
          <button type="button" className={typeFilter === "purchase" ? "is-selected" : ""} onClick={() => chooseType(typeFilter === "purchase" ? "all" : "purchase")}>
            <i className="fa-solid fa-basket-shopping" aria-hidden="true" />
            <span>ซื้อของร้าน</span>
            <strong>{loadedDate === dateKey && !error ? money(purchaseTotal) : "—"}</strong>
          </button>
        </div>
      </section>

      <section className="aw-history" aria-labelledby="aw-history-title">
        <div className="aw-history-head">
          <div>
            <h3 id="aw-history-title">ประวัติการเบิก</h3>
            <p>เรียงตามเวลาที่บันทึกล่าสุด</p>
          </div>
          <label className="aw-search">
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
            <input type="search" aria-label="ค้นหารายการเบิก" placeholder="ค้นหาช่างหรือรายการ..." value={search} onChange={(event) => { setSearch(event.target.value); setSelectedKey(null); }} />
          </label>
        </div>

        {error && <div className="aw-message aw-message-error" role="alert">
          <span>{error}</span>
          <button type="button" onClick={() => setRefresh((value) => value + 1)}>ลองใหม่</button>
        </div>}
        {!error && loading && <div className="aw-message" role="status"><i className="fa-solid fa-spinner fa-spin" aria-hidden="true" /> กำลังโหลดรายการเบิก...</div>}
        {!error && !loading && filtered.length === 0 && (
          <div className="aw-empty" role="status">
            <i className="fa-regular fa-folder-open" aria-hidden="true" />
            <strong>ไม่พบรายการเบิกเงิน</strong>
            <span>{current.length === 0 ? "ยังไม่มีรายการเบิกในวันที่เลือก" : "ลองเปลี่ยนสาขา ประเภท หรือคำค้นหา"}</span>
            {(search || branchFilter !== "all" || typeFilter !== "all") && (
              <button type="button" onClick={() => { setSearch(""); chooseType("all"); chooseBranch("all"); }}>ล้างตัวกรอง</button>
            )}
          </div>
        )}
        {!error && filtered.length > 0 && (
          <div className="aw-list">
            {filtered.map((row) => (
              <button className="aw-item" key={row.key} type="button" onClick={() => setSelectedKey(row.key)}
                aria-label={"ดูรายละเอียด " + typeLabel(row.kind) + " ของ " + row.barberName + " " + money(row.amount)}>
                <span className={"aw-item-icon aw-item-icon-" + row.kind}>
                  <i className={"fa-solid " + typeIcon(row.kind)} aria-hidden="true" />
                </span>
                <span className="aw-item-body">
                  <strong>{typeLabel(row.kind)}</strong>
                  <span>{row.barberName} <i aria-hidden="true">·</i> {row.branchName}</span>
                  {row.kind === "purchase" && <small>{row.reason}</small>}
                </span>
                <span className="aw-item-side">
                  <strong>{money(row.amount)}</strong>
                  <span>{timeLabel(row.createdAt)}</span>
                </span>
                <i className="fa-solid fa-chevron-right aw-item-chevron" aria-hidden="true" />
              </button>
            ))}
          </div>
        )}
      </section>

      <p className="aw-footnote">ข้อมูลจาก POS และบันทึกค่าใช้จ่ายร้าน · หน้านี้ใช้สำหรับตรวจสอบเท่านั้น ไม่มีการแก้ไขยอดเงิน</p>

      <dialog ref={detailDialog} className="aw-detail-dialog" aria-label="รายละเอียดการเบิกเงิน"
        onCancel={() => setSelectedKey(null)} onClose={() => setSelectedKey(null)}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) setSelectedKey(null);
        }}>
        {chosen && (
          <div className="aw-detail">
            <header className="aw-detail-head">
              <div><span>รายละเอียดรายการ</span><h3>{typeLabel(chosen.kind)}</h3></div>
              <button type="button" onClick={() => setSelectedKey(null)} aria-label="ปิดรายละเอียด"><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
            </header>
            <div className="aw-detail-scroll">
              <div className="aw-detail-amount">
                <span>ยอดเงินที่เบิก</span>
                <strong>{money(chosen.amount)}</strong>
                <small><i className={"fa-solid " + typeIcon(chosen.kind)} aria-hidden="true" /> {typeLabel(chosen.kind)}</small>
              </div>
              <dl className="aw-detail-fields">
                <div><dt>วันที่</dt><dd>{dateLabel(chosen.dateKey)}</dd></div>
                <div><dt>เวลา</dt><dd>{timeLabel(chosen.createdAt)}</dd></div>
                <div><dt>สาขา</dt><dd>{chosen.branchName}</dd></div>
                <div><dt>ผู้เบิกเงิน</dt><dd>{chosen.barberName}</dd></div>
                <div><dt>รายการ / เหตุผล</dt><dd>{chosen.reason}</dd></div>
                {chosen.note && <div className="aw-detail-note"><dt>หมายเหตุ</dt><dd>{chosen.note}</dd></div>}
              </dl>
              <p className="aw-detail-readonly"><i className="fa-solid fa-lock" aria-hidden="true" /> รายการนี้แสดงเพื่อการตรวจสอบ ไม่สามารถแก้ไขยอดจากหน้านี้ได้</p>
            </div>
            <footer className="aw-detail-navigation">
              <button type="button" disabled={chosenIndex <= 0} onClick={() => setSelectedKey(filtered[chosenIndex - 1].key)}>
                <i className="fa-solid fa-chevron-left" aria-hidden="true" /> ก่อนหน้า
              </button>
              <span>{(chosenIndex + 1).toLocaleString("th-TH")} / {filtered.length.toLocaleString("th-TH")}</span>
              <button type="button" disabled={chosenIndex >= filtered.length - 1} onClick={() => setSelectedKey(filtered[chosenIndex + 1].key)}>
                ถัดไป <i className="fa-solid fa-chevron-right" aria-hidden="true" />
              </button>
            </footer>
          </div>
        )}
      </dialog>
    </section>
  );
}
