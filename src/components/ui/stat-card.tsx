import { cn } from "@/lib/utils"

export function StatCard({
  title,
  value,
  hint,
  icon,
  tone = "neutral",
  className,
}: {
  title: string
  value: string
  hint?: string
  icon?: React.ReactNode
  tone?: "neutral" | "positive" | "negative"
  className?: string
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-xl bg-card p-4 shadow-xs ring-1 ring-foreground/10",
        className
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        {icon && (
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground">
            {icon}
          </span>
        )}
      </div>
      <div
        className={cn(
          "text-2xl font-semibold tracking-tight tabular-nums",
          tone === "positive" && "text-success",
          tone === "negative" && "text-destructive"
        )}
      >
        {value}
      </div>
      {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
    </div>
  )
}
