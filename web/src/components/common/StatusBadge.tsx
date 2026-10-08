import React from "react"
import { cn } from "@/lib/utils"
import { CheckCircle2, AlertTriangle, HelpCircle, Clock, CheckCircle, XCircle, XOctagon, Check, X, MessageCircle } from "lucide-react"

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

  const icons = {
    verified: <CheckCircle2 className="mr-1 h-3 w-3" />,
    fire_detected: <AlertTriangle className="mr-1 h-3 w-3" />,
    inconclusive: <HelpCircle className="mr-1 h-3 w-3" />,
    pending: <Clock className="mr-1 h-3 w-3" />,
    received: <CheckCircle className="mr-1 h-3 w-3" />,
    not_received: <XCircle className="mr-1 h-3 w-3" />,
    rejected: <XOctagon className="mr-1 h-3 w-3" />,
    approved: <Check className="mr-1 h-3 w-3" />,
    declined: <X className="mr-1 h-3 w-3" />,
    whatsapp: <MessageCircle className="mr-1 h-3 w-3" />,
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
      {icons[status]}
      {label}
    </div>
  )
}
