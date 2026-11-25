import { useEffect, useMemo, useRef, useState } from "react";
import "./admin-date-navigator.css";

/** In-app Admin calendar, shared by cash withdrawal and sales history. */
export const adminDateLabel = (dateKey: string) => new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
  timeZone: "Asia/Bangkok", day: "numeric", month: "long", year: "numeric",
}).format(new Date(dateKey + "T12:00:00+07:00"));

export function shiftAdminDate(dateKey: string, days: number) {
  const date = new Date(dateKey + "T12:00:00Z");
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

type Props = {
  value: string;
  maxDate: string;
  onChange: (dateKey: string) => void;
  label?: string;
  className?: string;
};

export function AdminDateNavigator({ value, maxDate, onChange, label = "เลือกวันที่", className = "" }: Props) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [month, setMonth] = useState(() => value.slice(0, 7));
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
        trigger.current?.focus();
      }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

  const days = useMemo(() => {
    const [year, monthNumber] = month.split("-").map(Number);
    const offset = new Date(Date.UTC(year, monthNumber - 1, 1)).getUTCDay();
    const count = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
    const result: Array<string | null> = Array(offset).fill(null);
    for (let day = 1; day <= count; day++) result.push(month + "-" + String(day).padStart(2, "0"));
    return result;
  }, [month]);

  const monthHeading = new Intl.DateTimeFormat("th-TH-u-ca-buddhist", {
    month: "long", year: "numeric", timeZone: "Asia/Bangkok",
  }).format(new Date(month + "-01T12:00:00+07:00"));

  const measureCalendarPlacement = () => {
    const rect = root.current?.getBoundingClientRect();
    if (!rect) return;
    const availableHeight = window.visualViewport?.height ?? window.innerHeight;
    const below = availableHeight - rect.bottom;
    const calendarHeight = Math.min(442, availableHeight * .66);
    setDropUp(below < calendarHeight + 12 && rect.top > below);
  };
  const changeDate = (next: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(next) || next > maxDate) return;
    setOpen(false);
    onChange(next);
  };
  const moveMonth = (delta: number) => {
    const date = new Date(month + "-01T12:00:00Z");
    date.setUTCMonth(date.getUTCMonth() + delta);
    const next = date.toISOString().slice(0, 7);
    if (next <= maxDate.slice(0, 7)) setMonth(next);
  };

  return (
    <div ref={root} className={"ui-date-nav ui-date-control" + (dropUp ? " drop-up" : "") + " " + className} role="group" aria-label={label}>
      <button type="button" aria-label="วันก่อนหน้า" onClick={() => changeDate(shiftAdminDate(value, -1))}>
        <i className="fa-solid fa-chevron-left" aria-hidden="true" />
      </button>
      <button ref={trigger} type="button" className="ui-date-trigger"
        aria-label={"เปิดปฏิทิน: " + adminDateLabel(value)}
        aria-expanded={open} aria-haspopup="dialog"
        onClick={() => {
          if (!open) { setMonth(value.slice(0, 7)); measureCalendarPlacement(); }
          setOpen((current) => !current);
        }}>
        <i className="fa-regular fa-calendar-days" aria-hidden="true" />
        <span>{adminDateLabel(value)}</span>
      </button>
      <button type="button" aria-label="วันถัดไป" disabled={value >= maxDate}
        onClick={() => changeDate(shiftAdminDate(value, 1))}>
        <i className="fa-solid fa-chevron-right" aria-hidden="true" />
      </button>

      {open && (
        <div className="ui-date-calendar" role="dialog" aria-label={label}>
          <div className="ui-date-calendar-head">
            <button type="button" aria-label="เดือนก่อนหน้า" onClick={() => moveMonth(-1)}>
              <i className="fa-solid fa-chevron-left" aria-hidden="true" />
            </button>
            <strong>{monthHeading}</strong>
            <button type="button" aria-label="เดือนถัดไป" disabled={month >= maxDate.slice(0, 7)}
              onClick={() => moveMonth(1)}>
              <i className="fa-solid fa-chevron-right" aria-hidden="true" />
            </button>
          </div>
          <div className="ui-date-calendar-grid">
            {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((day) =>
              <span key={day} className="ui-date-calendar-weekday">{day}</span>)}
            {days.map((day, index) => day ? (
              <button key={day} type="button" className={
                "ui-date-calendar-day" + (day === value ? " is-selected" : "") + (day === maxDate ? " is-today" : "")
              } aria-label={adminDateLabel(day)} aria-pressed={day === value}
                disabled={day > maxDate} onClick={() => changeDate(day)}>
                {Number(day.slice(-2))}
              </button>
            ) : <span key={"blank-" + index} aria-hidden="true" />)}
          </div>
          <button type="button" className="ui-date-calendar-today" onClick={() => changeDate(maxDate)}>
            <i className="fa-regular fa-calendar-check" aria-hidden="true" /> ไปวันนี้
          </button>
        </div>
      )}
    </div>
  );
}
