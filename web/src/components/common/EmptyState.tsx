import React from "react"
import { cn } from "@/lib/utils"

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode
  message: string
  action?: React.ReactNode
}

export function EmptyState({ icon, message, action, className, ...props }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center p-8 text-center", className)} {...props}>
      {icon && <div className="mb-4 text-copy-muted [&>svg]:w-8 [&>svg]:h-8">{icon}</div>}
      <p className="text-copy-secondary mb-4">{message}</p>
      {action && <div>{action}</div>}
    </div>
  )
}
