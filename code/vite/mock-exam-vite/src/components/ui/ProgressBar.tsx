import React from "react";
import { cn } from "../utils/cn";

interface ProgressBarProps {
  value: number; // 0-100
  className?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ value, className }) => {
  const pct = Math.min(100, Math.max(0, value));
  return (
    <div className={cn("w-full h-2 bg-border rounded-full overflow-hidden", className)}>
      <div
        className="h-full bg-gradient-to-r from-[var(--gradient-start)] to-[var(--gradient-end)] transition-all duration-300"
        style={{ width: pct + "%" }}
      />
    </div>
  );
};

export default ProgressBar;
