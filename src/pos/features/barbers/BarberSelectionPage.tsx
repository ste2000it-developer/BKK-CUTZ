import type { Barber } from "../../../shared/domain/pos-attendance";

export function BarberSelectionPage({ barbers, onSelect, onOpenShift }: { barbers: Barber[]; onSelect: (barber: Barber) => void; onOpenShift: () => void }) {
  return (
    <div className="barber-selection-react">
      <div className="page-topline">
        <div><div className="page-kicker">เริ่มรายการใหม่</div><h1>เลือกช่าง</h1><p>เลือกชื่อช่างที่จะรับรายการนี้</p></div>
        <div className="steps"><div className="step active"><span>01</span><b>เลือกช่าง</b></div><div className="step-line" /><div className="step"><span>02</span><b>เลือกบริการ</b></div><div className="step-line" /><div className="step"><span>03</span><b>ชำระเงิน</b></div><div className="step-line" /><div className="step"><span>04</span><b>เสร็จสิ้น</b></div></div>
      </div>
      {barbers.length === 0 ? (
        <div className="no-shift-state">
          <span className="material-symbols-outlined no-shift-icon" aria-hidden="true">person_check</span>
          <h2>ยังไม่มีช่างเข้างาน</h2>
          <p>กรุณาให้ช่างเข้างานก่อนเริ่มใช้งาน POS</p>
          <button className="primary-button no-shift-button" type="button" onClick={onOpenShift}>เข้างาน</button>
        </div>
      ) : (
        <div className="barber-grid">
          {barbers.map((barber) => <button className="barber-button" type="button" key={barber.id} onClick={() => onSelect(barber)}>{barber.name || barber.id}</button>)}
        </div>
      )}
    </div>
  );
}
