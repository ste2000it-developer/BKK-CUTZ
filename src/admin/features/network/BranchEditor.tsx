import { useEffect, useRef, useState, type FormEvent } from "react";
import { AppSelect } from "../../components/AppSelect";
import type { NetworkBranch } from "../../../shared/domain/branch-network";
import { saveBranch, type BranchInput } from "../../../shared/firebase/repositories/branches";

type Props = { branch: NetworkBranch | null; groups: string[]; close: () => void; saved: (id: string) => void };

export function BranchEditor({ branch, groups, close, saved }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const pending = useRef(false);
  const [form, setForm] = useState<BranchInput>(() => ({ id: branch?.id || "", name: branch?.name || "", serviceGroup: branch?.serviceGroup || "", active: branch ? branch.active === true : true }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => { const element = dialog.current!; element.showModal(); return () => element.close(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current) return;
    pending.current = true;
    setSaving(true);
    setError("");
    try { const id = await saveBranch(form, branch ? "update" : "create"); saved(id); }
    catch (issue) { setError(issue instanceof Error ? issue.message : "บันทึกสาขาไม่สำเร็จ กรุณาลองใหม่"); }
    finally { pending.current = false; setSaving(false); }
  }

  return <dialog ref={dialog} className="bn-editor" aria-labelledby="bn-editor-title" onCancel={(event) => { event.preventDefault(); if (!pending.current) close(); }}>
    <form onSubmit={(event) => void submit(event)}>
      <header className="bn-editor-head"><div><span className="bn-kicker">จัดการสาขา</span><h2 id="bn-editor-title">{branch ? "แก้ไขสาขา" : "เพิ่มสาขาใหม่"}</h2></div><button className="bn-close" type="button" aria-label="ปิดฟอร์มสาขา" disabled={saving} onClick={close}>×</button></header>
      <fieldset disabled={saving}>
        <label htmlFor="bn-edit-code">รหัสสาขา</label>
        <input id="bn-edit-code" value={form.id} readOnly={Boolean(branch)} required autoFocus={!branch} placeholder="เช่น BKK-05" onChange={(event) => setForm({ ...form, id: event.target.value })} aria-describedby="bn-code-help" />
        <p id="bn-code-help">{branch ? "รหัสสาขาเปลี่ยนไม่ได้ เพื่อให้ประวัติเดิมเชื่อมโยงกับสาขานี้" : "ใช้รหัสที่ไม่ซ้ำกับสาขาเดิม และจะใช้รหัสนี้เชื่อมกับบัญชี POS"}</p>
        <label htmlFor="bn-edit-name">ชื่อสาขา</label>
        <input id="bn-edit-name" value={form.name} required autoFocus={Boolean(branch)} placeholder="ชื่อสาขา" onChange={(event) => setForm({ ...form, name: event.target.value })} />
        <label htmlFor="bn-edit-group">กลุ่มราคา</label>
        <AppSelect id="bn-edit-group" aria-label="กลุ่มราคา" disabled={saving} placeholder="เลือกกลุ่มราคา" value={form.serviceGroup} onChange={(value) => setForm({ ...form, serviceGroup: value })}>{groups.map((group) => <option key={group} value={group}>กลุ่ม {group}</option>)}</AppSelect>
        <p>ใช้เมนูบริการและราคาของกลุ่มที่เลือก</p>
        <label htmlFor="bn-edit-status">สถานะสาขา</label>
        <AppSelect id="bn-edit-status" aria-label="สถานะสาขา" disabled={saving} value={form.active ? "active" : "inactive"} onChange={(value) => setForm({ ...form, active: value === "active" })}><option value="active">เปิดใช้งาน</option><option value="inactive">ปิดใช้งาน / ปิดกิจการ</option></AppSelect>
        <div className={"bn-editor-note" + (!form.active ? " is-inactive" : "")}>{!form.active ? "สาขาจะถูกปิดใช้งาน ประวัติยอดขาย การเข้างาน และการปิดร้านยังดูย้อนหลังได้ และเปิดใช้งานสาขาอีกครั้งได้ภายหลัง" : branch ? "การแก้ไขมีผลกับข้อมูลสาขาปัจจุบัน ไม่เปลี่ยนรายการขายที่บันทึกไว้แล้ว" : "เมื่อเพิ่มสาขาแล้ว ต้องมีบัญชี POS ที่ผูกกับรหัสสาขานี้ จึงจะเข้าสู่ระบบขายได้"}</div>
      </fieldset>
      {error && <p className="bn-editor-error" role="alert">{error}</p>}
      <footer className="bn-editor-actions"><button className="bn-secondary" type="button" disabled={saving} onClick={close}>ยกเลิก</button><button className="bn-primary" type="submit" disabled={saving}>{saving ? "กำลังบันทึก…" : branch ? "บันทึกการแก้ไข" : "เพิ่มสาขา"}</button></footer>
    </form>
  </dialog>;
}
