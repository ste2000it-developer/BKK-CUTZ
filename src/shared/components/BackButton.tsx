type BackButtonProps = {
  onClick: () => void;
  disabled?: boolean;
  ariaLabel?: string;
};

export function BackButton({ onClick, disabled = false, ariaLabel = "กลับ" }: BackButtonProps) {
  return <button className="back-button" type="button" aria-label={ariaLabel} disabled={disabled} onClick={onClick}>
    <span className="back-button-arrow" aria-hidden="true">←</span>
    <span>กลับ</span>
  </button>;
}
