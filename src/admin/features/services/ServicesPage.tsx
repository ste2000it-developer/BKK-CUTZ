import { useEffect, useState } from "react";
import {
  listBranches,
  type BranchRecord,
} from "../../../shared/firebase/repositories/branches";
import {
  listServicesByGroup,
  removeService,
  saveService,
  type ServiceRecord,
} from "../../../shared/firebase/repositories/services";

type ServiceType = "fixed" | "choice" | "custom" | "free_cut" | "half_cut";

type ServiceForm = {
  name: string;
  type: ServiceType;
  price: string;
  choices: string;
  discountPercent: string;
  sortOrder: string;
  active: boolean;
};

const emptyForm: ServiceForm = {
  name: "",
  type: "fixed",
  price: "",
  choices: "",
  discountPercent: "50",
  sortOrder: "1",
  active: true,
};

const typeLabels: Record<ServiceType, string> = {
  fixed: "ราคาปกติ",
  choice: "ช่วงราคา",
  custom: "กรอกราคา",
  free_cut: "สิทธิ์พิเศษ",
  half_cut: "ส่วนลด",
};

function getServicePriceText(service: ServiceRecord): string {
  if (service.type === "choice") {
    const choices = Array.isArray(service.choices) ? service.choices : [];
    return choices.map((price) => `${Number(price).toLocaleString("th-TH")} บาท`).join(" / ");
  }
  if (service.type === "custom") return "กรอกรายละเอียดและราคาเอง";
  if (service.type === "free_cut") return "ตัดผมฟรี 1 ครั้ง";
  if (service.type === "half_cut") return `ลดค่าตัดผม ${Number(service.discountPercent || 0)}%`;
  return `${Number(service.price || 0).toLocaleString("th-TH")} บาท`;
}

export function ServicesPage() {
  const [branches, setBranches] = useState<BranchRecord[]>([]);
  const [groupId, setGroupId] = useState("");
  const [services, setServices] = useState<ServiceRecord[]>([]);
  const [editingService, setEditingService] = useState<ServiceRecord | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [form, setForm] = useState<ServiceForm>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [activated, setActivated] = useState(false);

  async function loadServices(selectedGroup: string) {
    if (!selectedGroup) return;
    setLoading(true);
    setError("");
    try {
      setServices(await listServicesByGroup(selectedGroup));
    } catch (loadError) {
      console.error(loadError);
      setError(loadError instanceof Error ? loadError.message : "โหลดเมนูไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const handleActivation = async (_event: Event) => {
      setActivated(true);
      setLoading(true);
      setError("");
      try {
        const branchRecords = await listBranches();
        setBranches(branchRecords);
        const initialGroup = groupId || "A";
        setGroupId(initialGroup);
        await loadServices(initialGroup);
      } catch (loadError) {
        console.error(loadError);
        setError(loadError instanceof Error ? loadError.message : "โหลดสาขาไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    };

    window.addEventListener("bkk:admin:services:activate", handleActivation);
    return () => window.removeEventListener("bkk:admin:services:activate", handleActivation);
  }, [groupId]);

  function startAdd() {
    setEditingService(null);
    setEditorOpen(true);
    setForm({ ...emptyForm, sortOrder: String(services.length + 1) });
    setError("");
    setStatus("");
  }

  function startEdit(service: ServiceRecord) {
    setEditingService(service);
    setEditorOpen(true);
    setForm({
      name: service.name || "",
      type: (service.type || "fixed") as ServiceType,
      price: String(Number(service.price || 0)),
      choices: Array.isArray(service.choices) ? service.choices.join(", ") : "",
      discountPercent: String(Number(service.discountPercent || 50)),
      sortOrder: String(Number(service.sortOrder || 1)),
      active: service.active === true,
    });
    setError("");
    setStatus("");
  }

  async function submitService(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!groupId) return;
    const name = form.name.trim();
    if (!name) {
      setError("กรุณาใส่ชื่อเมนู");
      return;
    }

    const data: Parameters<typeof saveService>[1] = {
      groupId,
      name,
      type: form.type,
      active: form.active,
      sortOrder: Number(form.sortOrder || 1),
    };

    if (editingService?.serviceCode) data.serviceCode = editingService.serviceCode;
    if (form.type === "fixed") data.price = Number(form.price || 0);
    if (form.type === "choice") {
      const choices = form.choices.split(",").map((value) => Number(value.trim())).filter(Number.isFinite);
      if (choices.length === 0) {
        setError("กรุณาใส่ตัวเลือกราคา เช่น 150, 200");
        return;
      }
      data.price = 0;
      data.choices = choices;
    }
    if (form.type === "custom") data.price = 0;
    if (form.type === "free_cut") {
      data.price = 0;
      data.targetServiceCode = "haircut";
    }
    if (form.type === "half_cut") {
      data.price = 0;
      data.discountPercent = Number(form.discountPercent || 0);
      data.targetServiceCode = "haircut";
    }

    setSaving(true);
    setError("");
    setStatus("กำลังบันทึก...");
    try {
      await saveService(editingService?.id || null, data);
      await loadServices(groupId);
      setStatus("บันทึกเรียบร้อย");
      setEditingService(null);
      setEditorOpen(false);
      setForm(emptyForm);
    } catch (saveError) {
      console.error(saveError);
      setError(saveError instanceof Error ? saveError.message : "บันทึกไม่สำเร็จ");
      setStatus("");
    } finally {
      setSaving(false);
    }
  }

  async function deleteService(service: ServiceRecord) {
    if (!window.confirm(`ต้องการลบ "${service.name}" จากกลุ่ม ${groupId} ใช่ไหม?`)) return;
    setError("");
    try {
      await removeService(service.id);
      await loadServices(groupId);
      if (editingService?.id === service.id) {
        setEditingService(null);
        setEditorOpen(false);
      }
    } catch (deleteError) {
      console.error(deleteError);
      setError(deleteError instanceof Error ? deleteError.message : "ลบไม่สำเร็จ");
    }
  }

  const groupBranches = branches.filter((branch) => branch.serviceGroup === groupId);

  if (!activated) return <div className="empty">กำลังโหลดข้อมูลเมนูบริการ...</div>;

  return (
    <div className="services-react-page">
      <section className="group-card">
        <div className="group-heading"><div><h2>เลือกกลุ่มราคา</h2><p>จัดการเมนูและราคาตามกลุ่มของสาขา</p></div></div>
        <div className="group-buttons">
          {(["A", "B", "C", "D"] as const).map((group) => (
            <button className={`group-button${groupId === group ? " active" : ""}`} key={group} type="button" onClick={() => {
              setGroupId(group);
              setEditingService(null);
              setEditorOpen(false);
              setStatus("");
              setForm(emptyForm);
              void loadServices(group);
            }}><strong>กลุ่มราคา {group}</strong></button>
          ))}
        </div>
        <div className="group-branches">
          <div className="group-branch-label">สาขาในกลุ่ม {groupId}<span>{groupBranches.length} สาขา</span></div>
          <div className="group-branch-names">{groupBranches.length ? groupBranches.map((branch) => branch.name || branch.id).join(" · ") : "ยังไม่มีสาขาในกลุ่มนี้"}</div>
        </div>
      </section>

      <div className="admin-workspace">
        <section className="service-section">
          <div className="service-toolbar"><div><h2>เมนูบริการ — กลุ่ม {groupId}</h2><p>จัดการรายการบริการ ราคา และสถานะ</p></div>
            <button className="add-button" type="button" disabled={!groupId} onClick={startAdd}>+ เพิ่มเมนูบริการ</button>
          </div>
          {error && <div className="status-box" role="alert">{error}</div>}
          {status && <div className="status-box" role="status">{status}</div>}
          <div className="service-list">
            {loading ? <div className="empty">กำลังโหลดเมนู...</div> : services.length === 0 ? <div className="empty">ยังไม่มีเมนูในกลุ่มนี้</div> : <>
              <div className="service-table-head"><div>#</div><div>ชื่อเมนู</div><div>ประเภท</div><div>ราคา</div><div>สถานะ</div><div>จัดการ</div></div>
              {services.map((service, index) => (
                <div className="service-table-row" key={service.id}>
                  <div className="service-index">{index + 1}</div>
                  <div className="service-main"><div className="service-name">{service.name || "-"}</div><div className="service-code">{service.serviceCode || service.type}</div></div>
                  <div className="service-type">{typeLabels[service.type as ServiceType] || service.type}</div>
                  <div className="service-price">{getServicePriceText(service)}</div>
                  <div><span className={`service-status ${service.active === true ? "is-active" : "is-off"}`}>{service.active === true ? "เปิดใช้งาน" : "ปิดใช้งาน"}</span></div>
                  <div className="service-actions"><button className="edit-button" type="button" aria-label={`แก้ไข ${service.name}`} onClick={() => startEdit(service)}>แก้ไข</button><button className="delete-button" type="button" aria-label={`ลบ ${service.name}`} onClick={() => void deleteService(service)}>ลบ</button></div>
                </div>
              ))}
            </>}
          </div>
        </section>

        {editorOpen ? (
          <form className="editor" onSubmit={(event) => void submitService(event)}>
            <div className="editor-heading"><div><h2>{editingService ? `แก้ไขเมนู — กลุ่ม ${groupId}` : `เพิ่มเมนู — กลุ่ม ${groupId}`}</h2><p>ปรับข้อมูลรายการบริการ</p></div></div>
            <label htmlFor="reactServiceName">ชื่อเมนู</label><input id="reactServiceName" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} />
            <label htmlFor="reactServiceType">ประเภท</label>
            <select id="reactServiceType" className="native-app-select" value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value as ServiceType })}>
              <option value="fixed">ราคาปกติ</option><option value="choice">ช่วง / ตัวเลือกราคา</option><option value="custom">กรอกรายละเอียดและราคาเอง</option><option value="free_cut">ตัดผมฟรี</option><option value="half_cut">ส่วนลดค่าตัดผม</option>
            </select>
            {form.type === "fixed" && <><label htmlFor="reactServicePrice">ราคา (บาท)</label><input id="reactServicePrice" type="number" min="0" value={form.price} onChange={(event) => setForm({ ...form, price: event.target.value })} /></>}
            {form.type === "choice" && <><label htmlFor="reactServiceChoices">ช่วง / ตัวเลือกราคา</label><input id="reactServiceChoices" placeholder="เช่น 150, 200" value={form.choices} onChange={(event) => setForm({ ...form, choices: event.target.value })} /></>}
            {form.type === "half_cut" && <><label htmlFor="reactDiscountPercent">ส่วนลด %</label><input id="reactDiscountPercent" type="number" min="0" max="100" value={form.discountPercent} onChange={(event) => setForm({ ...form, discountPercent: event.target.value })} /></>}
            <label htmlFor="reactSortOrder">ลำดับแสดง</label><input id="reactSortOrder" type="number" min="1" value={form.sortOrder} onChange={(event) => setForm({ ...form, sortOrder: event.target.value })} />
            <label className="checkbox-row"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} />เปิดใช้งานเมนูนี้</label>
            <div className="editor-actions"><button className="cancel-button" type="button" onClick={() => { setEditingService(null); setEditorOpen(false); setStatus(""); setForm(emptyForm); }}>ยกเลิก</button><button className="save-button" type="submit" disabled={saving}>{saving ? "กำลังบันทึก..." : "บันทึก"}</button></div>
            {error && <div className="status-box" role="alert">{error}</div>}{status && <div className="status-box" role="status">{status}</div>}
          </form>
        ) : null}
      </div>
    </div>
  );
}