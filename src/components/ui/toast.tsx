"use client"

import { useEffect, useState } from "react"
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react"
import { cn } from "@/lib/utils"

type ToastType = "success" | "error" | "info"
type ToastItem = { id: number; type: ToastType; title: string; description?: string }

// Module-level dispatcher so any client component (incl. server-action handlers)
// can fire a toast without a hook: `toast.success('Hotovo')`.
let dispatch: ((t: Omit<ToastItem, "id">) => void) | null = null

export const toast = {
  success: (title: string, description?: string) => dispatch?.({ type: "success", title, description }),
  error: (title: string, description?: string) => dispatch?.({ type: "error", title, description }),
  info: (title: string, description?: string) => dispatch?.({ type: "info", title, description }),
}

const ICONS = {
  success: CheckCircle2,
  error: AlertCircle,
  info: Info,
} as const

const ACCENT: Record<ToastType, string> = {
  success: "text-success",
  error: "text-destructive",
  info: "text-info",
}

export function Toaster() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    let counter = 0
    dispatch = (t) => {
      const id = ++counter
      setItems((prev) => [...prev, { id, ...t }])
      setTimeout(() => setItems((prev) => prev.filter((x) => x.id !== id)), 5000)
    }
    return () => {
      dispatch = null
    }
  }, [])

  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[100] flex w-[380px] max-w-[calc(100vw-2rem)] flex-col gap-2"
      role="region"
      aria-label="Oznámení"
    >
      {items.map((item) => {
        const Icon = ICONS[item.type]
        return (
          <div
            key={item.id}
            role="status"
            aria-live="polite"
            className="pointer-events-auto flex items-start gap-3 rounded-xl bg-popover p-3 text-sm text-popover-foreground shadow-lg ring-1 ring-foreground/10 animate-in slide-in-from-bottom-2 fade-in"
          >
            <Icon className={cn("mt-0.5 size-4 shrink-0", ACCENT[item.type])} />
            <div className="min-w-0 flex-1">
              <div className="font-medium">{item.title}</div>
              {item.description && (
                <div className="mt-0.5 text-xs text-muted-foreground">{item.description}</div>
              )}
            </div>
            <button
              type="button"
              aria-label="Zavřít"
              onClick={() => setItems((prev) => prev.filter((x) => x.id !== item.id))}
              className="-mr-1 -mt-0.5 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
