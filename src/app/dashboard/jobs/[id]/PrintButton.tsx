'use client'

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="px-6 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors print:hidden"
    >
      Print Job Ticket
    </button>
  )
}
