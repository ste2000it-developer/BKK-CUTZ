import { useEffect, useState, type FormEvent } from "react";
import type { Barber, PosBranch } from "../../../shared/domain/pos-attendance";
import { saveShopExpense } from "../../../shared/firebase/repositories/shop-expenses";
import { saveBarberAdvance } from "../../../shared/firebase/repositories/advances";
import { AppSelect } from "../../../admin/components/AppSelect";

function formatMoney(value: number): string {
  return Number(value || 0).toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

function cleanBarberName(name: string): string {
  return name.replace(/\s*\(ช่างประจำวัน\)/g, "").trim();
}

const COMMON_ITEMS = [
  "ซื้อแชมพู / ครีมนวด",
  "ใบมีดโกน",
  "กระดาษทิชชู่ / ของใช้",
  "น้ำยาทำความสะอาด",
  "น้ำดื่ม / ขนมต้อนรับ",
  "ถุงขยะ / อุปกรณ์ร้าน",
];

const QUICK_AMOUNTS = [50, 100, 200, 300, 500, 1000];

type ExpenseType = "tip" | "shop_expense";

export function ShopExpenseModal({
  branch,
  barbers,
  onClose,
}: {
  branch: PosBranch;
  barbers: readonly Barber[];
  onClose: () => void;
}) {
  const [expenseType, setExpenseType] = useState<ExpenseType>("tip");
  const [selectedBarberId, setSelectedBarberId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("เบิกทิปเงินสด");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [savedReceipt, setSavedReceipt] = useState<{
    type: ExpenseType;
    barberName: string;
    amount: number;
    reason: string;
    createdAt: string;
  } | null>(null);

  useEffect(() => {
    if (selectedBarberId && !barbers.some((b) => b.id === selectedBarberId)) {
      setSelectedBarberId("");
    }
  }, [barbers, selectedBarberId]);

  const rawBarber = barbers.find((b) => b.id === selectedBarberId);
  const currentBarberName = rawBarber ? cleanBarberName(rawBarber.name || rawBarber.id) : selectedBarberId;

  function handleTypeChange(nextType: ExpenseType) {
    setExpenseType(nextType);
    if (nextType === "tip") {
      setReason("เบิกทิปเงินสด");
    } else {
      setReason("");
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError("");

    if (!rawBarber || !currentBarberName) {
      setError("กรุณาเลือกช่างผู้เบิกเงิน");
      return;
    }

    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError("กรุณากรอกจำนวนเงินให้ถูกต้อง (มากกว่า 0 บาท)");
      return;
    }

    const trimmedReason = expenseType === "tip" ? "เบิกทิปเงินสด" : reason.trim() || "ซื้อของร้าน";

    setSaving(true);
    try {
      if (expenseType === "shop_expense") {
        const record = await saveShopExpense({
          branchId: branch.id,
          branchName: branch.name || branch.id,
          barberId: selectedBarberId === "other" ? "" : selectedBarberId,
          barberName: currentBarberName,
          amount: numericAmount,
          reason: trimmedReason,
          note: note.trim(),
          source: "pos",
        });

        setSavedReceipt({
          type: "shop_expense",
          barberName: record.barberName,
          amount: record.amount,
          reason: record.reason,
          createdAt: record.createdAt,
        });
      } else {
        const record = await saveBarberAdvance({
          branchId: branch.id,
          branchName: branch.name || branch.id,
          barberId: selectedBarberId === "other" ? "" : selectedBarberId,
          barberName: currentBarberName,
          type: expenseType,
          amount: numericAmount,
          reason: trimmedReason,
          note: note.trim(),
          source: "pos",
        });

        setSavedReceipt({
          type: expenseType,
          barberName: record.barberName,
          amount: record.amount,
          reason: record.reason || "เบิกทิปเงินสด",
          createdAt: record.createdAt,
        });
      }
    } catch (submitError) {
      console.error("Save expense/advance failed:", submitError);
      setError(submitError instanceof Error ? submitError.message : "บันทึกการเบิกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  function resetForNext() {
    setSavedReceipt(null);
    setSelectedBarberId("");
    setAmount("");
    setReason(expenseType === "tip" ? "เบิกทิปเงินสด" : "");
    setNote("");
    setError("");
  }

  return (
    <div className="modal" id="shopExpenseModal">
      <button
        className="modal-backdrop"
        type="button"
        aria-label="ปิดหน้าต่างเบิกเงิน"
        onClick={onClose}
      />
      <section
        className="shop-expense-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="shopExpenseTitle"
      >
        <button className="modal-close" type="button" aria-label="ปิด" onClick={onClose}>
          ×
        </button>

        {savedReceipt ? (
          <div className="shop-expense-success">
            <div className="shop-expense-success-badge">✓</div>
            <h2>บันทึกการเบิกเงินสำเร็จ</h2>
            <p>
              {savedReceipt.type === "tip"
                ? "เงินสดถูกบันทึกออกจากเก๊ะร้าน และจะนำไปหักออกจากทิปในรอบจ่ายเงินช่างอัตโนมัติ"
                : "เงินสดถูกบันทึกออกจากเก๊ะร้านเรียบร้อยแล้ว"}
            </p>

            <div className="shop-expense-receipt-box">
              <div className="shop-expense-receipt-row">
                <span>ประเภทการเบิก</span>
                <strong className="shop-expense-receipt-type" style={{ color: savedReceipt.type === "tip" ? "#047857" : "#1f2937" }}>
                  <span className="material-symbols-outlined" aria-hidden="true">
                    {savedReceipt.type === "tip" ? "payments" : "shopping_bag"}
                  </span>
                  {savedReceipt.type === "tip"
                    ? "เบิกทิปเงินสด (หักทิปในระบบ)"
                    : "ซื้อของร้าน (ค่าใช้จ่ายร้าน)"}
                </strong>
              </div>
              <div className="shop-expense-receipt-row">
                <span>สาขา</span>
                <strong>{branch.name || branch.id}</strong>
              </div>
              <div className="shop-expense-receipt-row">
                <span>ผู้เบิกเงิน</span>
                <strong>{savedReceipt.barberName}</strong>
              </div>
              <div className="shop-expense-receipt-row">
                <span>รายการ / เหตุผล</span>
                <strong>{savedReceipt.reason}</strong>
              </div>
              <div className="shop-expense-receipt-row highlight">
                <span>ยอดเงินที่เบิก</span>
                <strong>{formatMoney(savedReceipt.amount)} บาท</strong>
              </div>
              <div className="shop-expense-receipt-row">
                <span>เวลาที่บันทึก</span>
                <strong>
                  {new Date(savedReceipt.createdAt).toLocaleTimeString("th-TH", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}{" "}
                  น.
                </strong>
              </div>
            </div>

            <div className="shop-expense-success-actions">
              <button
                className="secondary-button"
                type="button"
                onClick={resetForNext}
              >
                เบิกรายการอื่นเพิ่ม
              </button>
              <button
                className="primary-button"
                type="button"
                autoFocus
                onClick={onClose}
              >
                เสร็จสิ้น
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)}>
            <div className="shop-expense-head">
              <div className="page-kicker">เบิกเงินสดร้าน / เบิกทิป / ซื้อของร้าน</div>
              <h2 id="shopExpenseTitle">
                {expenseType === "tip"
                  ? "เบิกทิปเงินสด"
                  : "เบิกเงินร้านไปซื้อของ"}
              </h2>
              <p>
                สาขา <strong>{branch.name || branch.id}</strong> ·{" "}
                {expenseType === "tip"
                  ? "ช่างรับเงินสดจากเก๊ะร้านล่วงหน้าสำหรับยอดทิปที่ลูกค้าโอน (ระบบจะนำไปหักออกจากทิป)"
                  : "บันทึกเงินสดนำไปซื้อของใช้ร้าน"}
              </p>
            </div>

            {/* ประเภทการเบิก */}
            <div className="shop-expense-form-group">
              <label>เลือกประเภทการเบิก</label>
              <div className="shop-expense-type-chips">
                <button
                  type="button"
                  className={`shop-expense-type-btn ${expenseType === "tip" ? "active" : ""}`}
                  aria-pressed={expenseType === "tip"}
                  onClick={() => handleTypeChange("tip")}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">payments</span>
                  เบิกทิปเงินสด
                </button>
                <button
                  type="button"
                  className={`shop-expense-type-btn ${expenseType === "shop_expense" ? "active" : ""}`}
                  aria-pressed={expenseType === "shop_expense"}
                  onClick={() => handleTypeChange("shop_expense")}
                >
                  <span className="material-symbols-outlined" aria-hidden="true">shopping_bag</span>
                  ซื้อของร้าน
                </button>
              </div>
            </div>

            <div className="shop-expense-form-group">
              <label htmlFor="expenseBarberSelect">เลือกช่างผู้เบิกเงิน (ช่างเข้างานวันนี้)</label>
              {barbers.length === 0 ? (
                <div className="error-box" style={{ marginTop: 0 }}>
                  ยังไม่มีช่างเข้างานวันนี้ กรุณาให้ช่างเข้างานก่อนเบิกเงิน
                </div>
              ) : (
                <AppSelect
                  id="expenseBarberSelect"
                  aria-label="เลือกช่างผู้เบิกเงินจากช่างเข้างานวันนี้"
                  placeholder="กรุณาเลือกช่างผู้เบิกเงิน"
                  value={selectedBarberId}
                  onChange={(val) => setSelectedBarberId(val)}
                >
                  {barbers.map((b) => (
                    <option key={b.id} value={b.id}>
                      {cleanBarberName(b.name || b.id)}
                    </option>
                  ))}
                </AppSelect>
              )}
            </div>

            <div className="shop-expense-form-group">
              <label htmlFor="expenseAmount">จำนวนเงินที่เบิก (บาท)</label>
              <div className="shop-expense-amount-wrap">
                <input
                  id="expenseAmount"
                  type="number"
                  min="1"
                  step="1"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  autoFocus
                />
                <span className="shop-expense-amount-unit">บาท</span>
              </div>
              <div className="shop-expense-quick-chips">
                {QUICK_AMOUNTS.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    className="shop-expense-chip"
                    onClick={() => setAmount(String(amt))}
                  >
                    {amt}฿
                  </button>
                ))}
              </div>
            </div>

            {expenseType === "shop_expense" && <div className="shop-expense-form-group">
              <label htmlFor="expenseReason">
                รายการที่ซื้อ / ซื้ออะไร
              </label>
              <input
                id="expenseReason"
                type="text"
                placeholder="เช่น แชมพูสระผม 2 ขวด, ใบมีดโกน"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
              <div className="shop-expense-suggest-tags">
                {COMMON_ITEMS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="shop-expense-tag"
                    onClick={() => setReason(item)}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>}

            <div className="shop-expense-form-group">
              <label htmlFor="expenseNote">หมายเหตุเพิ่มเติม (ถ้ามี)</label>
              <input
                id="expenseNote"
                type="text"
                placeholder={
                  expenseType === "tip"
                    ? "เช่น ลูกค้าโอนทิปเข้ามาบ่ายสอง"
                    : "เช่น ซื้อจากเซเว่น, มีใบเสร็จแนบ"
                }
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>

            {error && (
              <div className="error-box" role="alert">
                {error}
              </div>
            )}

            <button
              className="primary-button shop-expense-submit"
              type="submit"
              disabled={saving || !rawBarber}
            >
              {saving
                ? "กำลังบันทึก..."
                : barbers.length === 0
                  ? "ไม่มีช่างเข้างาน (เบิกไม่ได้)"
                  : expenseType === "tip"
                    ? "ยืนยันบันทึกเบิกทิปเงินสด"
                    : "ยืนยันบันทึกการเบิกซื้อของ"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
