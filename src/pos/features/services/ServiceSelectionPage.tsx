import { useMemo, useState } from "react";
import type { ServiceRecord } from "../../../shared/firebase/repositories/services";
import {
  calculatePosServiceTotal,
  getHaircutDiscountAmount,
  getPosServiceDisplayName,
  makeSelectedService,
  type SelectedService,
} from "../../../shared/domain/pos-services";

import type { Barber } from "../../../shared/domain/pos-attendance";
import { BackButton } from "../../../shared/components/BackButton";
type OptionMode = "choice" | "range" | "custom" | null;

const iconByCode: Record<string, string> = {
  haircut: "content_cut",
  kids: "child_care",
  trim: "health_and_beauty",
  shave: "cleaning_services",
  wash: "shower",
  product: "inventory_2",
  custom: "more_horiz",
  free_cut: "redeem",
  half_cut: "percent",
};

function formatMoney(value: number): string {
  return Number(value || 0).toLocaleString("th-TH", { maximumFractionDigits: 2 });
}

export function ServiceSelectionPage({ services, barber, onBack, onCheckout }: { services: ServiceRecord[]; barber: Barber; onBack: () => void; onCheckout: (services: SelectedService[]) => void }) {
  const [selected, setSelected] = useState<Map<string, SelectedService>>(new Map());
  const [pendingService, setPendingService] = useState<ServiceRecord | null>(null);
  const [optionMode, setOptionMode] = useState<OptionMode>(null);
  const [rangePrice, setRangePrice] = useState("");
  const [customDetail, setCustomDetail] = useState("");
  const [customPrice, setCustomPrice] = useState("");
  const [error, setError] = useState("");

  const selectedRows = Array.from(selected.values());
  const total = calculatePosServiceTotal(selectedRows);

  const buttonPrice = (service: ServiceRecord) => {
    const chosen = selected.get(service.id);
    if (service.type === "choice") {
      if (chosen) return `${formatMoney(chosen.price)} บาท`;
      const choices = Array.isArray(service.choices) ? service.choices : [];
      if (service.serviceCode === "shave" && choices.length >= 2) {
        return `${formatMoney(Math.min(...choices.map(Number)))} - ${formatMoney(Math.max(...choices.map(Number)))} บาท`;
      }
      return choices.length ? `เลือก ${choices.map((price) => formatMoney(Number(price))).join(" / ")}` : "เลือกราคา";
    }
    if (service.type === "custom") return chosen ? `${formatMoney(chosen.price)} บาท` : "กรอกราคาเอง";
    if (service.type === "free_cut") return "ตัดผมฟรี";
    if (service.type === "half_cut") return `ลด ${Number(service.discountPercent || 0)}%`;
    return `${formatMoney(Number(service.price || 0))} บาท`;
  };

  function closeOptions() {
    setOptionMode(null);
    setPendingService(null);
    setError("");
  }

  function selectDiscount(service: ServiceRecord) {
    const targets = selectedRows.filter((item) => item.serviceCode === "haircut" || item.serviceCode === "kids");
    const target = targets.at(-1);
    if (!target) {
      setError("กรุณาเลือก ตัดผม หรือ ตัดผมเด็ก ก่อนใช้ส่วนลด");
      return;
    }

    const next = new Map(selected);
    for (const [id, item] of next) {
      if (item.type === "free_cut" || item.type === "half_cut") next.delete(id);
    }
    const discountAmount = getHaircutDiscountAmount(service, target);
    next.set(service.id, makeSelectedService(service, -discountAmount, {
      discountAmount,
      targetServiceCode: target.serviceCode,
      discountPercent: Number(service.discountPercent || 0),
    }));
    setSelected(next);
    setError("");
  }

  function removeService(service: ServiceRecord) {
    const next = new Map(selected);
    next.delete(service.id);
    if (service.serviceCode === "haircut" || service.serviceCode === "kids") {
      for (const [id, item] of next) {
        if ((item.type === "free_cut" || item.type === "half_cut") && item.targetServiceCode === service.serviceCode) next.delete(id);
      }
    }
    setSelected(next);
  }

  function clickService(service: ServiceRecord) {
    setError("");
    if (selected.has(service.id)) {
      removeService(service);
      return;
    }
    if (service.type === "choice") {
      setPendingService(service);
      setRangePrice("");
      setOptionMode(service.serviceCode === "shave" ? "range" : "choice");
      return;
    }
    if (service.type === "custom") {
      setPendingService(service);
      setCustomDetail("");
      setCustomPrice("");
      setOptionMode("custom");
      return;
    }
    if (service.type === "free_cut" || service.type === "half_cut") {
      selectDiscount(service);
      return;
    }
    const next = new Map(selected);
    next.set(service.id, makeSelectedService(service, Number(service.price || 0)));
    setSelected(next);
  }

  function commitOption(price: number, extra: Partial<SelectedService> = {}) {
    if (!pendingService) return;
    const next = new Map(selected);
    next.set(pendingService.id, makeSelectedService(pendingService, price, extra));
    setSelected(next);
    closeOptions();
  }

  const rangeBounds = useMemo(() => {
    const values = Array.isArray(pendingService?.choices)
      ? pendingService.choices.map(Number).filter(Number.isFinite)
      : [];
    return {
      min: values.length ? Math.min(...values) : 150,
      max: values.length ? Math.max(...values) : 200,
    };
  }, [pendingService]);

  function checkout() {
    if (!barber || selected.size === 0) return;
    onCheckout(selectedRows);
  }

  return (
    <div className="service-selection-react">
      <div className="page-topline compact">
        <div className="service-title-row"><BackButton onClick={onBack} /><div><div className="page-kicker">เลือกบริการให้ลูกค้า</div><h1>{barber?.name || "-"}</h1></div></div>
        <div className="steps"><div className="step done"><span>01</span><b>เลือกช่าง</b></div><div className="step-line" /><div className="step active"><span>02</span><b>เลือกบริการ</b></div><div className="step-line" /><div className="step"><span>03</span><b>ชำระเงิน</b></div><div className="step-line" /><div className="step"><span>04</span><b>เสร็จสิ้น</b></div></div>
      </div>
      <div className="service-layout">
        <section className="service-panel"><div className="panel-title"><div><h2>เลือกบริการ</h2><p>เลือกหนึ่งหรือหลายรายการ เพื่อเพิ่มในตะกร้าบริการ</p></div></div>
          <div className="service-list">{services.length === 0 ? <p className="empty-summary">ยังไม่มีเมนูสำหรับกลุ่มราคานี้</p> : services.map((service) => {
            const isSelected = selected.has(service.id);
            const iconCode = service.serviceCode || service.type || "custom";
            return <button className={`service-button${isSelected ? " selected" : ""}`} type="button" key={service.id} onClick={() => clickService(service)}><span className="service-left"><span className="service-icon"><span className="material-symbols-outlined" aria-hidden="true">{iconByCode[iconCode] || iconByCode.custom}</span></span><span className="service-copy"><span className="service-name">{getPosServiceDisplayName(service)}</span></span><span className="service-check">{isSelected ? "✓" : ""}</span></span><span className="service-price">{buttonPrice(service)}</span></button>;
          })}</div>
        </section>
        <aside className="summary-panel"><div className="summary-head"><div><h2>สรุปรายการ</h2><p>ตรวจสอบรายการที่เลือก</p></div></div>
          <div className="summary-list">{selectedRows.length === 0 ? <p className="empty-summary">ยังไม่ได้เลือกบริการ</p> : selectedRows.map((item) => <div className={`summary-row${item.price < 0 ? " discount-row" : ""}`} key={item.id}><span>{item.name}{item.detail && <span className="summary-detail">{item.detail}</span>}</span><strong>{item.price < 0 ? `-${formatMoney(Math.abs(item.price))}` : formatMoney(item.price)} บาท</strong></div>)}</div>
          <div className="summary-bottom"><div className="summary-total"><div><span>รวมทั้งสิ้น</span></div><strong>{formatMoney(total)} บาท</strong></div><button className="primary-button" type="button" disabled={!selected.size} onClick={checkout}>ยืนยันรายการ <span>→</span></button><div className="summary-note">รายการจะถูกบันทึกเมื่อยืนยันขั้นตอนถัดไป</div></div>
        </aside>
      </div>
      {optionMode && pendingService && <div className="modal"><button className="modal-backdrop" type="button" aria-label="ปิดตัวเลือก" onClick={closeOptions} /><section className="option-modal-card" role="dialog" aria-modal="true" aria-labelledby="posOptionTitle"><button className="modal-close" type="button" aria-label="ปิด" onClick={closeOptions}>×</button><h2 id="posOptionTitle">{getPosServiceDisplayName(pendingService)}</h2>
        {optionMode === "choice" && <div className="choice-options-area">{(Array.isArray(pendingService.choices) ? pendingService.choices : []).map((price, index) => <button className="choice-price-button" type="button" key={`${price}-${index}`} onClick={() => commitOption(Number(price))}>{formatMoney(Number(price))} บาท</button>)}</div>}
        {optionMode === "range" && <div className="range-service-area"><p>ใส่ราคา {formatMoney(rangeBounds.min)} - {formatMoney(rangeBounds.max)} บาท</p><input type="number" min={rangeBounds.min} max={rangeBounds.max} step="1" value={rangePrice} onChange={(event) => setRangePrice(event.target.value)} /><button className="primary-button" type="button" onClick={() => { const value = Number(rangePrice); if (!Number.isInteger(value) || value < rangeBounds.min || value > rangeBounds.max) { setError(`กรุณาใส่จำนวนเต็มตั้งแต่ ${formatMoney(rangeBounds.min)} ถึง ${formatMoney(rangeBounds.max)} บาท`); return; } commitOption(value); }}>ยืนยันราคา</button>{error && <div className="error-box" role="alert">{error}</div>}</div>}
        {optionMode === "custom" && <div className="custom-service-area"><label htmlFor="posCustomDetail">รายละเอียด</label><input id="posCustomDetail" value={customDetail} onChange={(event) => setCustomDetail(event.target.value)} /><label htmlFor="posCustomPrice">ราคา</label><input id="posCustomPrice" type="number" min="0" value={customPrice} onChange={(event) => setCustomPrice(event.target.value)} /><button className="primary-button" type="button" onClick={() => { const value = Number(customPrice); if (!customDetail.trim()) { setError("กรุณาใส่รายละเอียด"); return; } if (!Number.isFinite(value) || value < 0) { setError("กรุณาใส่ราคาให้ถูกต้อง"); return; } commitOption(value, { detail: customDetail.trim() }); }}>เพิ่มรายการ</button>{error && <div className="error-box" role="alert">{error}</div>}</div>}
      </section></div>}
      {error && !optionMode && <div className="notice-modal"><div className="modal-backdrop" onClick={() => setError("")} /><section className="notice-modal-card" role="alertdialog"><h2>แจ้งเตือน</h2><p>{error}</p><button className="primary-button" type="button" onClick={() => setError("")}>ตกลง</button></section></div>}
    </div>
  );
}
