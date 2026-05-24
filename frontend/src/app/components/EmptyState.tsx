interface Props {
  message: string;
  emoji?: string;
  subMessage?: string;
  className?: string;
}

export function EmptyState({ message, emoji, subMessage, className = 'py-8' }: Props) {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 text-center ${className}`}>
      {emoji && <span className="text-[40px]">{emoji}</span>}
      <p className="text-[#7788a5] text-sm">{message}</p>
      {subMessage && <p className="text-[#354064] text-xs">{subMessage}</p>}
    </div>
  );
}
