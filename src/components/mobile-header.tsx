'use client'

import { useState, useEffect } from 'react'
import { PrinterIcon, Menu, X, LogOut } from 'lucide-react'
import { NavSidebar } from './nav-sidebar'
import { ThemeToggle } from './theme-toggle'

export function MobileHeader({
  role,
  displayName,
  initials,
  signOut,
}: {
  role: string
  displayName: string
  initials: string
  signOut: () => Promise<void>
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <>
      {/* Mobile top bar */}
      <div className="lg:hidden flex items-center justify-between px-4 h-14 bg-sidebar border-b border-sidebar-border shrink-0">
        <button
          onClick={() => setOpen(true)}
          className="p-1.5 text-sidebar-foreground hover:text-sidebar-accent-foreground active:scale-95 transition-[color,transform] duration-150"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded bg-sidebar-primary">
            <PrinterIcon className="h-3.5 w-3.5 text-sidebar-primary-foreground" />
          </div>
          <p className="text-sm font-heading font-bold text-sidebar-accent-foreground tracking-tight">
            Print Boss
          </p>
        </div>
        <div className="w-8" />
      </div>

      {/* Backdrop */}
      <div
        className={`lg:hidden fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setOpen(false)}
      />

      {/* Drawer */}
      <div
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-[216px] bg-sidebar flex flex-col transform transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-4 h-14 border-b border-sidebar-border">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded bg-sidebar-primary">
              <PrinterIcon className="h-3.5 w-3.5 text-sidebar-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-heading font-bold text-sidebar-accent-foreground leading-tight tracking-tight">
                Print Boss
              </p>
              <p className="text-[9px] text-sidebar-foreground leading-tight uppercase tracking-[0.12em]">
                CRM
              </p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1 text-sidebar-foreground hover:text-sidebar-accent-foreground transition-colors"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <div className="flex-1 px-2 py-4 overflow-y-auto" onClick={() => setOpen(false)}>
          <NavSidebar role={role} />
        </div>

        {/* User footer */}
        <div className="px-2 pb-3 pt-2 border-t border-sidebar-border space-y-0.5">
          <div className="flex items-center gap-2 px-2 py-2 rounded">
            <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-[9px] font-bold text-sidebar-primary-foreground">
              {initials}
            </div>
            <p className="text-[11px] font-medium text-sidebar-accent-foreground truncate flex-1">
              {displayName}
            </p>
            <ThemeToggle />
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="flex items-center gap-2 w-full px-2 py-1.5 rounded text-[11px] font-medium text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            >
              <LogOut className="h-3 w-3 shrink-0" />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
