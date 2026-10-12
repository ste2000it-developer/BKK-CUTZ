import { Children, isValidElement, useEffect, useId, useRef, useState, type ReactNode } from "react";

type Props = { value: string; onChange: (value: string) => void; children: ReactNode; disabled?: boolean; id?: string; "aria-label"?: string; className?: string; placeholder?: string };

export function AppSelect({ value, onChange, children, disabled, id, "aria-label": label, className = "", placeholder = "เลือก" }: Props) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const listId = useId();
  const options = Children.toArray(children).flatMap((child): { value: string; label: ReactNode }[] => {
    if (Array.isArray(child)) return [];
    if (!isValidElement<{ value: string | number; children: ReactNode }>(child)) return [];
    return [{ value: String(child.props.value), label: child.props.children }];
  });
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener("pointerdown", outside);
    const buttons = root.current?.querySelectorAll<HTMLButtonElement>("[role=option]");
    buttons?.[Math.max(0, options.findIndex((option) => option.value === value))]?.focus();
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);
  return <div ref={root} className={`app-select${open ? " open" : ""} ${className}`} onBlur={(event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }} onKeyDown={(event) => {
    if (event.key === "Escape") { event.preventDefault(); setOpen(false); trigger.current?.focus(); }
    if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
      event.preventDefault();
      if (!open) { setOpen(true); return; }
      const buttons = Array.from(root.current?.querySelectorAll<HTMLButtonElement>("[role=option]") || []);
      const current = buttons.indexOf(document.activeElement as HTMLButtonElement);
      const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (current + (event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
      buttons[next]?.focus();
    }
  }}>
    <button ref={trigger} id={id} type="button" className="app-select-trigger" disabled={disabled} aria-label={label} aria-haspopup="listbox" aria-expanded={open} aria-controls={listId} onClick={() => setOpen(!open)}>
      <span>{options.find((option) => option.value === value)?.label || placeholder}</span><i className="fa-solid fa-chevron-down" aria-hidden="true" />
    </button>
    {open && <div id={listId} className="app-select-menu" role="listbox" aria-label={label}>
      {options.map((option) => <button key={option.value} type="button" role="option" aria-selected={option.value === value} tabIndex={-1} className={`app-select-option${option.value === value ? " selected" : ""}`} onClick={() => {
        onChange(option.value); setOpen(false); trigger.current?.focus();
      }}>{option.label}<i className="fa-solid fa-check" aria-hidden="true" /></button>)}
    </div>}
  </div>;
}
