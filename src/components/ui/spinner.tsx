import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const spinnerVariants = cva(
  "inline-block animate-spin rounded-full border-solid border-current border-r-transparent motion-reduce:animate-[spin_1.5s_linear_infinite]",
  {
    variants: {
      size: {
        sm: "h-4 w-4 border-2",
        default: "h-6 w-6 border-2",
        lg: "h-8 w-8 border-3",
        xl: "h-12 w-12 border-4",
      },
      variant: {
        default: "text-gray-400",
        primary: "text-indigo-600",
        gradient: "border-transparent",
        white: "text-white",
      },
    },
    defaultVariants: {
      size: "default",
      variant: "default",
    },
  }
)

export interface SpinnerProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof spinnerVariants> {
  label?: string
}

const Spinner = React.forwardRef<HTMLDivElement, SpinnerProps>(
  ({ className, size, variant, label, ...props }, ref) => {
    const isGradient = variant === "gradient"
    
    return (
      <div
        ref={ref}
        role="status"
        aria-label={label || "Loading"}
        className={cn("inline-flex items-center justify-center", className)}
        {...props}
      >
        {isGradient ? (
          <div className={cn(
            "relative inline-block",
            size === "sm" && "h-4 w-4",
            size === "default" && "h-6 w-6",
            size === "lg" && "h-8 w-8",
            size === "xl" && "h-12 w-12"
          )}>
            <svg
              className="animate-spin"
              viewBox="0 0 50 50"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                <linearGradient id="spinner-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" style={{ stopColor: "#4f46e5", stopOpacity: 1 }} />
                  <stop offset="100%" style={{ stopColor: "#9333ea", stopOpacity: 1 }} />
                </linearGradient>
              </defs>
              <circle
                className="opacity-25"
                cx="25"
                cy="25"
                r="20"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
              />
              <circle
                cx="25"
                cy="25"
                r="20"
                fill="none"
                stroke="url(#spinner-gradient)"
                strokeWidth="4"
                strokeDasharray="80, 200"
                strokeDashoffset="0"
                strokeLinecap="round"
              />
            </svg>
          </div>
        ) : (
          <div className={cn(spinnerVariants({ size, variant }))} />
        )}
        <span className="sr-only">{label || "Loading..."}</span>
      </div>
    )
  }
)

Spinner.displayName = "Spinner"

// Convenience component for full-page loading states
export interface LoadingSpinnerProps extends SpinnerProps {
  message?: string
  fullscreen?: boolean
}

const LoadingSpinner = React.forwardRef<HTMLDivElement, LoadingSpinnerProps>(
  ({ message, fullscreen = true, size = "xl", variant = "gradient", className, ...props }, ref) => {
    if (fullscreen) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4">
            <Spinner ref={ref} size={size} variant={variant} {...props} />
            {message && (
              <p className="text-sm font-medium text-gray-600 animate-pulse">
                {message}
              </p>
            )}
          </div>
        </div>
      )
    }

    return (
      <div className={cn("flex flex-col items-center justify-center gap-4 p-8", className)}>
        <Spinner ref={ref} size={size} variant={variant} {...props} />
        {message && (
          <p className="text-sm font-medium text-gray-600 animate-pulse">
            {message}
          </p>
        )}
      </div>
    )
  }
)

LoadingSpinner.displayName = "LoadingSpinner"

export { Spinner, LoadingSpinner, spinnerVariants }

