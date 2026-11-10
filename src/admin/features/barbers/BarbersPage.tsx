import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { normalizeRfidUid } from "../../../shared/domain/rfid";
import {
  listBarbers,
  saveBarber,
  setBarberActive,
  type BarberRecord,
} from "../../../shared/firebase/repositories/barbers";

type BarberForm = { name: string; pin: string; rfidUid: string; active: boolean };
type DialogMode = "editor" | "toggle" | null;

const blankForm = (): BarberForm => ({ name: "", pin: "", rfidUid: "", active: true });
const pinText = (value: string | number | undefined) => String(value ?? "").trim();

export function BarbersPage() {
  const [barbers, setBarbers] = useState<BarberRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [saving, setSaving] = useState(false);
  const [modalError, setModalError] = useState("");
  const [dialogMode, setDialogMode] = useState<DialogMode>(null);
  const [editing, setEditing] = useState<BarberRecord | null>(null);
  const [pendingToggle, setPendingToggle] = useState<BarberRecord | null>(null);
  const [form, setForm] = useState<BarberForm>(blankForm);
  const [showPin, setShowPin] = useState(false);
  const modal = useRef<HTMLDialogElement>(null);

  async function reload() {
    setLoading(true);
    setLoadError("");
    try {
      setBarbers(await listBarbers());
    } catch (error) {
      console.error("Load barber profiles failed:", error);
      setLoadError(error instanceof Error ? error.message : "โหลดข้อมูลช่างไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void reload();
  }, []);

  useEffect(() => {
    const dialog = modal.current;
    if (!dialog) return;
    if (!dialogMode) {
      if (dialog.open) dialog.close();
      return;
    }
    if (!dialog.open) dialog.showModal();

    // Keep the page behind the editor in place on iPad and iPhone.
    const body = document.body;
    const html = document.documentElement;
    const previous = {
      bodyOverflow: body.style.overflow,
      bodyPosition: body.style.position,
      bodyTop: body.style.top,
      bodyWidth: body.style.width,
      htmlOverflow: html.style.overflow,
    };
    const scrollY = window.scrollY;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = "-" + scrollY + "px";
    body.style.width = "100%";

    return () => {
      if (dialog.open) dialog.close();
      body.style.overflow = previous.bodyOverflow;
      body.style.position = previous.bodyPosition;
      body.style.top = previous.bodyTop;
      body.style.width = previous.bodyWidth;
      html.style.overflow = previous.htmlOverflow;
      window.scrollTo(0, scrollY);
    };
  }, [dialogMode]);

  const filtered = useMemo(() => {
    const term = search.trim().toLocaleLowerCase("th");
    const matches = term
      ? barbers.filter((barber) =>
          [barber.name, barber.id, normalizeRfidUid(barber.rfidUid)]
            .some((value) => String(value).toLocaleLowerCase("th").includes(term)))
      : barbers;
    return [...matches].sort((a, b) => {
      const aNum = a.id.match(/(\d+)$/);
      const bNum = b.id.match(/(\d+)$/);
      const aValue = aNum ? Number(aNum[1]) : Number.POSITIVE_INFINITY;
      const bValue = bNum ? Number(bNum[1]) : Number.POSITIVE_INFINITY;
      return aValue - bValue || a.id.localeCompare(b.id, undefined, { numeric: true });
    });
  }, [barbers, search]);

  const activeCount = barbers.filter((barber) => barber.active).length;
  const rfidCount = barbers.filter((barber) => Boolean(normalizeRfidUid(barber.rfidUid))).length;

  function closeModal() {
    if (saving) return;
    setDialogMode(null);
    setModalError("");
    setShowPin(false);
  }

  function openEditor(barber: BarberRecord | null) {
    setEditing(barber);
    setPendingToggle(null);
    setForm(barber ? {
      name: barber.name,
      pin: pinText(barber.pin),
      rfidUid: normalizeRfidUid(barber.rfidUid),
      active: barber.active,
    } : blankForm());
    setShowPin(false);
    setModalError("");
    setNotice("");
    setDialogMode("editor");
  }

  function openToggle(barber: BarberRecord) {
    setPendingToggle(barber);
    setEditing(null);
    setModalError("");
    setNotice("");
    setDialogMode("toggle");
  }

  function validateUniqueFields() {
    const others = barbers.filter((barber) => barber.id !== editing?.id);
    const pin = form.pin.trim();
    const uid = normalizeRfidUid(form.rfidUid);
    if (others.some((barber) => pinText(barber.pin) === pin)) {
      throw new Error("PIN นี้ถูกใช้กับช่างคนอื่นแล้ว");
    }
    if (uid && others.some((barber) => normalizeRfidUid(barber.rfidUid) === uid)) {
      throw new Error("RFID UID นี้ถูกผูกกับช่างคนอื่นแล้ว");
    }
  }

  async function submitBarber(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    if (!form.name.trim()) {
      setModalError("กรุณาใส่ชื่อช่าง");
      return;
    }
    if (!/^\d{4}$/.test(form.pin.trim())) {
      setModalError("PIN ต้องเป็นตัวเลข 4 หลัก");
      return;
    }
    try {
      validateUniqueFields();
    } catch (error) {
      setModalError(error instanceof Error ? error.message : "ข้อมูลซ้ำ");
      return;
    }
    setSaving(true);
    setModalError("");
    try {
      await saveBarber(editing?.id || null, {
        name: form.name.trim(),
        pin: form.pin.trim(),
        rfidUid: normalizeRfidUid(form.rfidUid),
        active: form.active,
      });
      setDialogMode(null);
      setNotice("บันทึกข้อมูลช่างเรียบร้อยแล้ว");
      await reload();
    } catch (error) {
      console.error("Save barber failed:", error);
      setModalError(error instanceof Error ? error.message : "บันทึกข้อมูลช่างไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  async function confirmToggle() {
    if (!pendingToggle || saving) return;
    const nextActive = !pendingToggle.active;
    setSaving(true);
    setModalError("");
    try {
      await setBarberActive(pendingToggle.id, nextActive);
      setDialogMode(null);
      setNotice((nextActive ? "เปิดใช้งาน " : "ปิดใช้งาน ") + pendingToggle.name + " เรียบร้อยแล้ว");
      await reload();
    } catch (error) {
      console.error("Change barber status failed:", error);
      setModalError(error instanceof Error ? error.message : "เปลี่ยนสถานะไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="ab-page" aria-label="จัดการช่าง">
      <header className="ab-top">
        <div className="ab-title">
          <h2>จัดการช่าง</h2>
          <p>รายชื่อช่างและข้อมูลสำหรับเข้าใช้งาน POS ทุกสาขา</p>
        </div>
        <button className="ab-primary ab-add" type="button" onClick={() => openEditor(null)}>
          <i className="fa-solid fa-plus" aria-hidden="true" />
          <span>เพิ่มช่าง</span>
        </button>
      </header>

      <section className="ab-stats" aria-label="สรุปข้อมูลช่าง">
        <div className="ab-stat"><span>ช่างทั้งหมด</span><strong>{loading && !barbers.length ? "—" : barbers.length.toLocaleString("th-TH")}</strong></div>
        <div className="ab-stat"><span>เปิดใช้งาน</span><strong>{loading && !barbers.length ? "—" : activeCount.toLocaleString("th-TH")}</strong></div>
        <div className="ab-stat"><span>ผูก RFID</span><strong>{loading && !barbers.length ? "—" : rfidCount.toLocaleString("th-TH")}</strong></div>
      </section>

      <section className="ab-directory" aria-labelledby="ab-directory-title">
        <div className="ab-directory-heading">
          <div>
            <h3 id="ab-directory-title">รายชื่อช่าง</h3>
            <p>{loading ? "กำลังโหลดข้อมูล..." : "แสดง " + filtered.length.toLocaleString("th-TH") + " จาก " + barbers.length.toLocaleString("th-TH") + " คน"}</p>
          </div>
          <button className="ab-refresh" type="button" onClick={() => void reload()} aria-label="โหลดข้อมูลช่างใหม่" title="โหลดข้อมูลใหม่" disabled={loading}>
            <i className="fa-solid fa-rotate-right" aria-hidden="true" />
          </button>
        </div>
        <label className="ab-search">
          <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
          <span className="ab-sr-only">ค้นหาช่างด้วยชื่อ รหัสช่าง หรือ RFID</span>
          <input type="search" placeholder="ค้นหาชื่อหรือรหัสช่าง..." value={search} onChange={(event) => setSearch(event.target.value)} />
        </label>

        {notice && <div className="ab-notice" role="status">{notice}</div>}
        {loadError && <div className="ab-error" role="alert">{loadError} <button type="button" onClick={() => void reload()}>ลองใหม่</button></div>}

        <div className="ab-table" aria-busy={loading}>
          <div className="ab-table-heading" aria-hidden="true">
            <span>ช่าง</span><span>PIN</span><span>RFID</span><span>สถานะ</span><span>จัดการ</span>
          </div>
          {loading && !barbers.length && <p className="ab-empty" role="status">กำลังโหลดรายชื่อช่าง...</p>}
          {!loading && filtered.length === 0 && <p className="ab-empty">{barbers.length ? "ไม่พบช่างที่ค้นหา" : "ยังไม่มีรายชื่อช่าง กดเพิ่มช่างเพื่อเริ่มต้น"}</p>}
          {filtered.map((barber) => (
            <div className="ab-item" key={barber.id}>
              <button className="ab-item-main" type="button" onClick={() => openEditor(barber)} aria-label={"แก้ไขข้อมูล " + barber.name}>
                <span className="ab-avatar" aria-hidden="true">{(barber.name || "?").slice(0, 1)}</span>
                <span className="ab-item-identity">
                  <strong>{barber.name || "ไม่ระบุชื่อ"}</strong>
                  <small>{barber.id}</small>
                </span>
              </button>
              <div className="ab-item-pin">{pinText(barber.pin) ? "••••" : "—"}</div>
              <div className="ab-item-rfid">{normalizeRfidUid(barber.rfidUid) || "ยังไม่ผูกบัตร"}</div>
              <div className="ab-item-state">
                <span className={"ab-status" + (barber.active ? " ab-status--active" : " ab-status--inactive")}>
                  <i aria-hidden="true" />{barber.active ? "เปิดใช้งาน" : "ปิดใช้งาน"}
                </span>
              </div>
              <div className="ab-item-actions">
                <button type="button" onClick={() => openEditor(barber)} aria-label={"แก้ไข " + barber.name}>แก้ไข</button>
                <button type="button" onClick={() => openToggle(barber)}>{barber.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}</button>
              </div>
              <span className="ab-item-arrow" aria-hidden="true"><i className="fa-solid fa-chevron-right" /></span>
            </div>
          ))}
        </div>
      </section>
      <p className="ab-footnote">PIN ถูกซ่อนจากหน้ารายชื่อ กดชื่อช่างเพื่อแก้ไขข้อมูล การปิดใช้งานจะมีผลกับการเข้างานครั้งใหม่</p>

      <dialog
        className="ab-dialog"
        ref={modal}
        aria-label={dialogMode === "toggle" ? "ยืนยันสถานะช่าง" : "ข้อมูลช่าง"}
        onCancel={(event) => { if (saving) event.preventDefault(); else setDialogMode(null); }}
        onClose={() => { setDialogMode(null); setModalError(""); setShowPin(false); }}
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeModal();
        }}
      >
        {dialogMode === "editor" && (
          <form className="ab-form" onSubmit={(event) => void submitBarber(event)}>
            <div className="ab-dialog-top">
              <div><h3>{editing ? "แก้ไขข้อมูลช่าง" : "เพิ่มช่างใหม่"}</h3><p>{editing ? "รหัสช่าง " + editing.id : "ข้อมูลช่างสำหรับเข้าใช้งาน POS"}</p></div>
              <button type="button" className="ab-close" aria-label="ปิด" onClick={closeModal} disabled={saving}><i className="fa-solid fa-xmark" /></button>
            </div>
            <div className="ab-fields">
              <label htmlFor="ab-name">ชื่อช่าง</label>
              <input id="ab-name" required value={form.name} placeholder="เช่น ช่างนพ" onChange={(event) => setForm({ ...form, name: event.target.value })} disabled={saving} />

              <label htmlFor="ab-pin">PIN 4 หลัก</label>
              <div className="ab-password-field">
                <input id="ab-pin" required type={showPin ? "text" : "password"} inputMode="numeric" autoComplete="off" maxLength={4} value={form.pin} placeholder="••••" onChange={(event) => setForm({ ...form, pin: event.target.value.replace(/\D/g, "").slice(0, 4) })} disabled={saving} />
                <button type="button" aria-label={showPin ? "ซ่อน PIN" : "แสดง PIN"} onClick={() => setShowPin((value) => !value)} disabled={saving}><i className={"fa-regular " + (showPin ? "fa-eye-slash" : "fa-eye")} aria-hidden="true" /></button>
              </div>
              <small className="ab-field-hint">ตัวเลข 4 หลัก ไม่ซ้ำกับช่างคนอื่น และใช้เลข 0 นำหน้าได้</small>

              <label htmlFor="ab-rfid">RFID UID <span>ไม่บังคับ</span></label>
              <input id="ab-rfid" autoComplete="off" value={form.rfidUid} placeholder="ยังไม่ผูกบัตร" onChange={(event) => setForm({ ...form, rfidUid: event.target.value.toUpperCase().replace(/[^0-9A-F]/g, "") })} disabled={saving} />
              <small className="ab-field-hint">เว้นว่างได้หากยังไม่มีบัตร RFID</small>

              <label className="ab-active-row">
                <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} disabled={saving} />
                <span><strong>เปิดใช้งานช่างคนนี้</strong><small>เมื่อปิด จะไม่สามารถเข้างานรอบใหม่ได้</small></span>
              </label>
              {modalError && <div className="ab-error" role="alert">{modalError}</div>}
            </div>
            <div className="ab-dialog-actions">
              <button className="ab-secondary" type="button" onClick={closeModal} disabled={saving}>ยกเลิก</button>
              <button className="ab-primary" type="submit" disabled={saving}>{saving ? "กำลังบันทึก..." : "บันทึกข้อมูลช่าง"}</button>
            </div>
          </form>
        )}
        {dialogMode === "toggle" && pendingToggle && (
          <section className="ab-confirm">
            <div className="ab-dialog-top">
              <div><h3>{pendingToggle.active ? "ปิดใช้งานช่าง" : "เปิดใช้งานช่าง"}</h3><p>{pendingToggle.name} · {pendingToggle.id}</p></div>
              <button type="button" className="ab-close" aria-label="ปิด" onClick={closeModal} disabled={saving}><i className="fa-solid fa-xmark" /></button>
            </div>
            <p>ยืนยันว่าต้องการ{pendingToggle.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}ช่างคนนี้ใช่ไหม?</p>
            {modalError && <div className="ab-error" role="alert">{modalError}</div>}
            <div className="ab-dialog-actions">
              <button className="ab-secondary" type="button" onClick={closeModal} disabled={saving}>ยกเลิก</button>
              <button className="ab-primary" type="button" onClick={() => void confirmToggle()} disabled={saving}>{saving ? "กำลังบันทึก..." : "ยืนยัน"}</button>
            </div>
          </section>
        )}
      </dialog>
    </section>
  );
}
