import { useEffect, useMemo, useState, type FormEvent } from "react";
import { normalizeRfidUid } from "../../../shared/domain/rfid";
import {
  listBarbers,
  saveBarber,
  setBarberActive,
  type BarberRecord,
} from "../../../shared/firebase/repositories/barbers";

type BarberForm = {
  name: string;
  pin: string;
  rfidUid: string;
  active: boolean;
};

const emptyForm: BarberForm = {
  name: "",
  pin: "",
  rfidUid: "",
  active: true,
};

function pinText(value: string | number | undefined): string {
  return String(value ?? "").trim();
}

export function BarbersPage() {
  const [barbers, setBarbers] = useState<BarberRecord[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<BarberRecord | null>(null);
  const [form, setForm] = useState<BarberForm>(emptyForm);

  async function loadBarbers() {
    setLoading(true);
    setError("");
    try {
      setBarbers(await listBarbers());
    } catch (loadError) {
      console.error(loadError);
      setError(loadError instanceof Error ? loadError.message : "โหลดข้อมูลช่างไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadBarbers();
  }, []);

  useEffect(() => {
    if (!editorOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) closeEditor();
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [editorOpen, saving]);

  const filteredBarbers = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase("th");
    const matches = needle
      ? barbers.filter((barber) => {
          const fields = [barber.name, barber.id, pinText(barber.pin), barber.rfidUid || ""];
          return fields.some((value) => String(value).toLocaleLowerCase("th").includes(needle));
        })
      : barbers;

    return [...matches].sort((left, right) => {
      const leftMatch = left.id.match(/(\d+)$/);
      const rightMatch = right.id.match(/(\d+)$/);
      const leftNumber = leftMatch ? Number(leftMatch[1]) : Number.POSITIVE_INFINITY;
      const rightNumber = rightMatch ? Number(rightMatch[1]) : Number.POSITIVE_INFINITY;

      if (leftNumber !== rightNumber) return leftNumber - rightNumber;
      return left.id.localeCompare(right.id, undefined, { numeric: true, sensitivity: "base" });
    });
  }, [barbers, search]);

  const activeCount = barbers.filter((barber) => barber.active).length;
  const rfidCount = barbers.filter((barber) => Boolean(normalizeRfidUid(barber.rfidUid))).length;

  function closeEditor() {
    setEditorOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setStatus("");
  }

  function startAdd() {
    setEditing(null);
    setForm(emptyForm);
    setError("");
    setStatus("");
    setEditorOpen(true);
  }

  function startEdit(barber: BarberRecord) {
    setEditing(barber);
    setForm({
      name: barber.name,
      pin: pinText(barber.pin),
      rfidUid: normalizeRfidUid(barber.rfidUid),
      active: barber.active,
    });
    setError("");
    setStatus("");
    setEditorOpen(true);
  }

  function validateUniqueFields() {
    const pin = form.pin.trim();
    const uid = normalizeRfidUid(form.rfidUid);
    const others = barbers.filter((barber) => barber.id !== editing?.id);

    if (others.some((barber) => pinText(barber.pin) === pin)) {
      throw new Error("PIN นี้ถูกใช้กับช่างคนอื่นแล้ว");
    }
    if (uid && others.some((barber) => normalizeRfidUid(barber.rfidUid) === uid)) {
      throw new Error("RFID UID นี้ถูกผูกกับช่างคนอื่นแล้ว");
    }
  }

  async function submitBarber(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = form.name.trim();
    const pin = form.pin.trim();
    if (!name) {
      setError("กรุณาใส่ชื่อช่าง");
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError("PIN ต้องเป็นตัวเลข 4 หลัก");
      return;
    }

    try {
      validateUniqueFields();
    } catch (validationError) {
      setError(validationError instanceof Error ? validationError.message : "ข้อมูลซ้ำ");
      return;
    }

    setSaving(true);
    setError("");
    setStatus("กำลังบันทึก...");
    try {
      await saveBarber(editing?.id || null, {
        name,
        pin,
        rfidUid: normalizeRfidUid(form.rfidUid),
        active: form.active,
      });
      await loadBarbers();
      closeEditor();
    } catch (saveError) {
      console.error(saveError);
      setError(saveError instanceof Error ? saveError.message : "บันทึกข้อมูลช่างไม่สำเร็จ");
      setStatus("");
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(barber: BarberRecord) {
    const nextActive = !barber.active;
    const verb = nextActive ? "เปิดใช้งาน" : "ปิดใช้งาน";
    if (!window.confirm(`${verb} ${barber.name} ใช่ไหม?`)) return;

    setError("");
    setStatus(`${verb} ${barber.name}...`);
    try {
      await setBarberActive(barber.id, nextActive);
      await loadBarbers();
      setStatus(`${verb}เรียบร้อย`);
    } catch (toggleError) {
      console.error(toggleError);
      setError(toggleError instanceof Error ? toggleError.message : `${verb}ไม่สำเร็จ`);
      setStatus("");
    }
  }

  return (
    <div className="barbers-admin-page">
      <section className="barber-summary-grid" aria-label="สรุปข้อมูลช่าง">
        <div className="barber-summary-card"><span>ช่างทั้งหมด</span><strong>{barbers.length}</strong><small>คนในระบบ</small></div>
        <div className="barber-summary-card"><span>เปิดใช้งาน</span><strong>{activeCount}</strong><small>เข้า POS ได้</small></div>
        <div className="barber-summary-card"><span>ผูก RFID</span><strong>{rfidCount}</strong><small>ใบที่พร้อมใช้งาน</small></div>
      </section>

      <section className="barber-admin-card">
        <div className="barber-toolbar">
          <div>
            <h2>รายชื่อช่าง</h2>
            <p>เพิ่มช่าง เปลี่ยน PIN / RFID และเปิด-ปิดสถานะการใช้งาน</p>
          </div>
          <button className="add-button" type="button" onClick={startAdd}>+ เพิ่มช่าง</button>
        </div>

        <div className="barber-filter-row">
          <label className="barber-search-field">
            <span className="barber-search-icon" aria-hidden="true"><i className="fa-solid fa-magnifying-glass" /></span>
            <input
              type="search"
              aria-label="ค้นหาช่าง" placeholder="ค้นหาชื่อ / PIN / RFID"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        </div>

        {error && <div className="status-box" role="alert">{error}</div>}
        {status && <div className="status-box" role="status">{status}</div>}

        <div className="barber-table-wrap">
          {loading ? <div className="empty">กำลังโหลดข้อมูลช่าง...</div> : filteredBarbers.length === 0 ? <div className="empty">ไม่พบข้อมูลช่าง</div> : (
            <>
              <div className="barber-table-head">
                <div>ช่าง</div><div>PIN</div><div>RFID UID</div><div>สถานะ</div><div>จัดการ</div>
              </div>
              {filteredBarbers.map((barber) => (
                <div className="barber-table-row" key={barber.id}>
                  <div className="barber-identity-cell">
                    <strong>{barber.name || "-"}</strong>
                    <span>{barber.id}</span>
                  </div>
                  <div className="barber-pin-cell">{pinText(barber.pin) || "-"}</div>
                  <div className="barber-rfid-cell">{normalizeRfidUid(barber.rfidUid) || "ยังไม่ผูกบัตร"}</div>
                  <div><span className={`service-status ${barber.active ? "is-active" : "is-off"}`}>{barber.active ? "เปิดใช้งาน" : "ปิดใช้งาน"}</span></div>
                  <div className="barber-actions">
                    <button className="edit-button" type="button" onClick={() => startEdit(barber)}>แก้ไข</button>
                    <button className="barber-toggle-button" type="button" onClick={() => void toggleActive(barber)}>{barber.active ? "ปิดใช้งาน" : "เปิดใช้งาน"}</button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      </section>

      {editorOpen && (
        <div className="admin-modal-overlay">
          <button className="admin-modal-backdrop" type="button" aria-label="ปิด" disabled={saving} onClick={closeEditor} />
          <form className="admin-modal-card barber-editor-modal" role="dialog" aria-modal="true" aria-labelledby="barberEditorTitle" onSubmit={(event) => void submitBarber(event)}>
            <div className="admin-modal-head">
              <div>
                <div className="section-kicker">BARBER PROFILE</div>
                <h2 id="barberEditorTitle">{editing ? "แก้ไขข้อมูลช่าง" : "เพิ่มช่างใหม่"}</h2>
                <p>{editing ? `รหัสช่าง ${editing.id}` : "สร้างข้อมูลช่างสำหรับ PIN และ RFID"}</p>
              </div>
              <button className="secondary-button admin-modal-close" type="button" aria-label="ปิด" disabled={saving} onClick={closeEditor}><i className="fa-solid fa-xmark" aria-hidden="true" /></button>
            </div>

            <div className="barber-editor-body">
              <label htmlFor="barberName">ชื่อช่าง</label>
              <input id="barberName" autoFocus placeholder="เช่น ช่างนพ" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />

              <label htmlFor="barberPin">PIN 4 หลัก</label>
              <input
                id="barberPin"
                className="barber-pin-input"
                inputMode="numeric"
                autoComplete="off"
                maxLength={4}
                placeholder="0000"
                value={form.pin}
                onChange={(event) => setForm({ ...form, pin: event.target.value.replace(/\D/g, "").slice(0, 4) })}
              />
              <div className="barber-field-note">PIN ต้องไม่ซ้ำกับช่างคนอื่น และรองรับเลข 0 นำหน้า เช่น 0123</div>

              <label htmlFor="barberRfid">RFID UID</label>
              <input
                id="barberRfid"
                className="barber-rfid-input"
                autoComplete="off"
                placeholder="เช่น A1B2C3D4"
                value={form.rfidUid}
                onChange={(event) => setForm({ ...form, rfidUid: event.target.value.toUpperCase().replace(/[^0-9A-F]/g, "") })}
              />
              <div className="barber-field-note">เว้นว่างได้ถ้ายังไม่ผูกบัตร ระบบจะเก็บ UID เป็นตัวพิมพ์ใหญ่โดยไม่มีเว้นวรรค</div>

              <label className="barber-active-row">
                <input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />
                <span><strong>เปิดใช้งานช่างคนนี้</strong><small>ถ้าปิด ช่างจะไม่ปรากฏสำหรับการเข้างานรอบใหม่</small></span>
              </label>

              {error && <div className="status-box" role="alert">{error}</div>}
              {status && <div className="status-box" role="status">{status}</div>}
            </div>

            <div className="barber-editor-actions">
              <button className="cancel-button" type="button" disabled={saving} onClick={closeEditor}>ยกเลิก</button>
              <button className="save-button" type="submit" disabled={saving}>{saving ? "กำลังบันทึก..." : "บันทึกข้อมูลช่าง"}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
