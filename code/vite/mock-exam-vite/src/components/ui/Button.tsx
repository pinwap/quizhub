import React from "react";
import { cn } from "../utils/cn";

type Variant = "primary" | "outline" | "ghost" | "danger" | "success";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
};

const variantClasses: Record<Variant, string> = {
  primary: "btn-base btn-primary",
  outline: "btn-base btn-outline",
  ghost: "btn-base btn-ghost",
  danger: "btn-base btn-primary bg-danger hover:bg-red-700",
  success: "btn-base btn-primary bg-success hover:bg-green-600",
};

export const Button: React.FC<ButtonProps> = ({
  className,
  children,
  variant = "primary",
  loading,
  disabled,
  leftIcon,
  rightIcon,
  ...rest
}) => {
  return (
    <button
      className={cn(
        variantClasses[variant],
        loading && "relative text-transparent hover:text-transparent cursor-wait",
        className
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </span>
      )}
      {!loading && leftIcon}
      {!loading && <span>{children}</span>}
      {!loading && rightIcon}
    </button>
  );
};

export default Button;
