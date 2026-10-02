type LoadingScreenProps = {
  message: string;
  spinnerClassName: "loading-spinner" | "spinner";
  messageElement: "p" | "div";
};

export function LoadingScreen({
  message,
  spinnerClassName,
  messageElement,
}: LoadingScreenProps) {
  const Message = messageElement;

  return (
    <>
      <div className="loading-brand">BKK-CUTZ</div>
      <div className={spinnerClassName} aria-hidden="true" />
      <Message>{message}</Message>
    </>
  );
}