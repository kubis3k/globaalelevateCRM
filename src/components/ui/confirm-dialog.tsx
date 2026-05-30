"use client"

import { useEffect, useRef, useState } from "react"
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "./alert-dialog"
import { Button } from "./button"

type ConfirmOptions = {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
}

// Module-level so any client component can `await confirmDialog({...})`.
let dispatch: ((opts: ConfirmOptions) => Promise<boolean>) | null = null

export function confirmDialog(opts: ConfirmOptions): Promise<boolean> {
  return dispatch ? dispatch(opts) : Promise.resolve(false)
}

export function ConfirmDialogHost() {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null)
  const [open, setOpen] = useState(false)
  const resolver = useRef<(value: boolean) => void>(() => {})

  useEffect(() => {
    dispatch = (o) =>
      new Promise<boolean>((resolve) => {
        resolver.current = resolve
        setOpts(o)
        setOpen(true)
      })
    return () => {
      dispatch = null
    }
  }, [])

  function settle(value: boolean) {
    setOpen(false)
    resolver.current(value)
  }

  return (
    <AlertDialog open={open} onOpenChange={(next) => { if (!next) settle(false) }}>
      {opts && (
        <AlertDialogContent>
          <AlertDialogTitle>{opts.title}</AlertDialogTitle>
          {opts.description && (
            <AlertDialogDescription>{opts.description}</AlertDialogDescription>
          )}
          <AlertDialogFooter>
            <Button variant="outline" size="lg" onClick={() => settle(false)}>
              {opts.cancelLabel ?? "Zrušit"}
            </Button>
            <Button
              variant={opts.destructive ? "destructive" : "default"}
              size="lg"
              onClick={() => settle(true)}
            >
              {opts.confirmLabel ?? "Potvrdit"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      )}
    </AlertDialog>
  )
}
