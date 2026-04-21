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
      <div className="lg:hidden flex items-center justify-between px-4 h-14 bg-slate-900 border-b border-slate-800 shrink-0">
        <button
          onClick={() => setOpen(true)}
          className="p-1.5 text-slate-400 hover:text-white active:scale-95 transition-[color,transform] duration-150"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-indigo-600">
            <PrinterIcon className="h-3.5 w-3.5 text-white" />
          </div>
          <p className="text-sm font-semibold text-white">PrintShop CRM</p>
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
        className={`lg:hidden fixed inset-y-0 left-0 z-50 w-72 bg-slate-900 flex flex-col transform transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
              <PrinterIcon className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-tight">PrintShop CRM</p>
              <p className="text-[10px] text-slate-500 leading-tight capitalize">{role}</p>
            </div>
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1 text-slate-400 hover:text-white transition-colors"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <div className="flex-1 px-3 py-5 overflow-y-auto" onClick={() => setOpen(false)}>
          <NavSidebar role={role} />
        </div>

        {/* User footer */}
        <div className="px-3 py-4 border-t border-slate-800 space-y-2">
          <div className="flex items-center gap-3 px-2 py-1 rounded-md">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
              {initials}
            </div>
            <p className="text-xs font-medium text-slate-200 truncate flex-1">{displayName}</p>
            <ThemeToggle />
          </div>
          <form action={signOut} className="px-2">
            <button
              type="submit"
              className="flex items-center gap-2 w-full px-3 py-1.5 rounded-md text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5 shrink-0" />
              Sign out
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
