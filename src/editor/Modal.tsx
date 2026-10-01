'use client'
import { useEffect, useRef, type ReactNode } from 'react'

// `locked` keeps the dialog open (no close button, Esc ignored) while work is in progress.
export function Modal({
  title,
  onClose,
  locked = false,
  wide = false,
  children,
}: {
  title: string
  onClose: () => void
  locked?: boolean
  wide?: boolean
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    ref.current?.showModal()
  }, [])
  return (
    <dialog
      ref={ref}
      className={`dos-dialog${wide ? ' dos-dialog--wide' : ''}`}
      onClose={onClose}
      onCancel={(e) => locked && e.preventDefault()}
      aria-labelledby="dos-dialog-title"
    >
      <div className="dos-dialog-head">
        <h2 id="dos-dialog-title">{title}</h2>
        {!locked && (
          <button type="button" className="dos-icon-button" onClick={onClose} aria-label="Close">
            ×
          </button>
        )}
      </div>
      {children}
    </dialog>
  )
}
