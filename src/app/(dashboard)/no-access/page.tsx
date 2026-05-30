import { AlertCircle } from 'lucide-react'

export default function NoAccessPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center">
      <div className="h-16 w-16 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 flex items-center justify-center shadow-sm mb-6">
        <AlertCircle className="h-8 w-8 text-amber-600 dark:text-amber-500" />
      </div>
      <h3 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Žádný přístup k modulům</h3>
      <p className="text-slate-500 dark:text-slate-400 max-w-md mt-2 text-sm">
        Vaše role nemá povolený žádný modul. Kontaktujte prosím administrátora, aby vám přiřadil odpovídající oprávnění.
      </p>
    </div>
  )
}
