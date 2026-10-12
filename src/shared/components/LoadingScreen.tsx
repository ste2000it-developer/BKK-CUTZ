type LoadingScreenProps = {
  message: string;
  spinnerClassName: "loading-spinner" | "spinner";
};

export function LoadingScreen({
  message,
  spinnerClassName,
}: LoadingScreenProps) {
  return (
    <div role="status" aria-label={message}>
      <div className={spinnerClassName} aria-hidden="true" />
    </div>
  );
}
