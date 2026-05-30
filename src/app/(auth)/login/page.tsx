import { login } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle } from 'lucide-react'
import Image from 'next/image'
import { ThemeToggle } from '@/components/ui/theme-toggle'

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function LoginPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams
  const error = resolvedSearchParams.error === 'InvalidCredentials'
    ? 'Nesprávné uživatelské jméno nebo heslo'
    : null

  return (
    /*
     * bg-slate-50  → light mode (bílá/světle šedá)
     * dark:bg-[#0d1117] → dark mode (hluboká navy)
     */
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-[#0d1117] px-4 py-12 transition-colors duration-300">

      {/* Theme toggle – top right */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">

        {/* Logo – .logo-smart handles both themes via CSS */}
        <div className="flex justify-center mb-5">
          <Image
            src="/logo.png"
            alt="Globaal Elevate"
            width={180}
            height={60}
            className="logo-smart object-contain"
            priority
          />
        </div>

        {/* Company name */}
        <div className="text-center mb-7">
          <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight">
            Globaal Elevate Production s.r.o.
          </h1>
          <p className="text-slate-500 dark:text-slate-500 text-sm mt-0.5">
            Interní přihlášení do systému
          </p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl border border-slate-200 dark:border-white/8 bg-white dark:bg-white/4 backdrop-blur-sm p-6 shadow-md dark:shadow-black/40">

          <form action={login} className="space-y-4">
            {error && (
              <div className="flex items-center gap-3 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 px-4 py-3 text-sm text-red-600 dark:text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label
                htmlFor="username"
                className="text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Uživatelské jméno
              </Label>
              <Input
                id="username"
                name="username"
                placeholder="např. jan.novak"
                required
                autoComplete="username"
                className="h-10 rounded-lg
                  border-slate-200 bg-white text-slate-900 placeholder:text-slate-400
                  dark:border-white/10 dark:bg-white/6 dark:text-white dark:placeholder:text-slate-600
                  focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-sm font-medium text-slate-700 dark:text-slate-300"
              >
                Heslo
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="h-10 rounded-lg
                  border-slate-200 bg-white text-slate-900
                  dark:border-white/10 dark:bg-white/6 dark:text-white
                  focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-10 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-sm shadow-indigo-600/20 transition-all duration-200 mt-1"
            >
              Přihlásit se
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-slate-400 dark:text-slate-700 mt-6">
          © 2025 Globaal Elevate Production s.r.o.
        </p>
      </div>
    </div>
  )
}
