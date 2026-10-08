import React from "react"
import { cn } from "@/lib/utils"

interface StatusBadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  status: 'verified' | 'fire_detected' | 'inconclusive' | 'pending' | 'received' | 'not_received' | 'rejected' | 'approved' | 'declined' | 'whatsapp'
  label: string
}

export function StatusBadge({ status, label, className, ...props }: StatusBadgeProps) {
  const statusStyles = {
    verified: "bg-state-success-dim text-state-success",
    fire_detected: "bg-state-error-dim text-state-error",
    inconclusive: "bg-state-warning-dim text-state-warning",
    pending: "bg-subtle text-copy-muted",
    received: "bg-state-success-dim text-state-success",
    not_received: "bg-state-error-dim text-state-error",
    rejected: "bg-state-error-dim text-state-error",
    approved: "bg-state-success-dim text-state-success",
    declined: "bg-subtle text-copy-muted",
    whatsapp: "bg-subtle text-copy-secondary",
  }

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
        statusStyles[status],
        className
      )}
      {...props}
    >
      {label}
    </div>
  )
}
