import React from "react"
import { cn } from "@/lib/utils"

interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  subtitle?: string
}

export function PageHeader({ title, subtitle, className, ...props }: PageHeaderProps) {
  return (
    <div className={cn("space-y-1 pb-6", className)} {...props}>
      <h1 className="text-4xl font-display text-copy-primary">{title}</h1>
      {subtitle && <p className="text-copy-secondary">{subtitle}</p>}
    </div>
  )
}
