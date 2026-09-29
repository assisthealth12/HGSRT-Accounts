import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

interface ConfirmOptions {
  title: string
  description?: string
  confirmLabel?: string
  variant?: "default" | "destructive"
}

interface ConfirmState extends ConfirmOptions {
  open: boolean
  resolve?: (value: boolean) => void
}

const listeners: Array<(state: ConfirmState) => void> = []
let memoryState: ConfirmState = { open: false, title: "" }

function setState(state: ConfirmState) {
  memoryState = state
  listeners.forEach((l) => l(memoryState))
}

export function confirmAction(options: ConfirmOptions): Promise<boolean> {
  return new Promise((resolve) => {
    setState({ ...options, open: true, resolve })
  })
}

function resolveWith(value: boolean) {
  memoryState.resolve?.(value)
  setState({ ...memoryState, open: false, resolve: undefined })
}

// Mounted once, near the root — renders whatever confirmAction() last requested.
export function ConfirmDialogHost() {
  const [state, setLocalState] = React.useState<ConfirmState>(memoryState)

  React.useEffect(() => {
    listeners.push(setLocalState)
    return () => {
      const i = listeners.indexOf(setLocalState)
      if (i > -1) listeners.splice(i, 1)
    }
  }, []);

  return (
    <Dialog open={state.open} onOpenChange={(open) => !open && resolveWith(false)}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{state.title}</DialogTitle>
          {state.description && <DialogDescription>{state.description}</DialogDescription>}
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => resolveWith(false)}>Cancel</Button>
          <Button variant={state.variant === "destructive" ? "destructive" : "default"} onClick={() => resolveWith(true)}>
            {state.confirmLabel ?? "Confirm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
