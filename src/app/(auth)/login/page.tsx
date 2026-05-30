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
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-[#0d1117] px-4 py-12">

      {/* Theme toggle – top right */}
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>

      {/* Card */}
      <div className="w-full max-w-sm">

        {/* Logo – centered, no white box */}
        <div className="flex justify-center mb-6">
          <Image
            src="/logo.png"
            alt="Globaal Elevate"
            width={180}
            height={60}
            className="object-contain"
            style={{ mixBlendMode: 'screen' }}
            priority
          />
        </div>

        {/* Company name */}
        <div className="text-center mb-8">
          <h1 className="text-lg font-bold text-white tracking-tight">
            Globaal Elevate Production s.r.o.
          </h1>
          <p className="text-slate-500 text-sm mt-1">Interní přihlášení do systému</p>
        </div>

        {/* Form box */}
        <div className="rounded-2xl border border-white/8 bg-white/4 backdrop-blur-sm p-6 shadow-xl shadow-black/40 dark:bg-white/3">

          <form action={login} className="space-y-4">
            {error && (
              <div className="flex items-center gap-3 rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="username" className="text-sm font-medium text-slate-300">
                Uživatelské jméno
              </Label>
              <Input
                id="username"
                name="username"
                placeholder="např. jan.novak"
                required
                autoComplete="username"
                className="h-10 rounded-lg border-white/10 bg-white/6 text-white placeholder:text-slate-600 focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-sm font-medium text-slate-300">
                Heslo
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                className="h-10 rounded-lg border-white/10 bg-white/6 text-white focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-10 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg shadow-sm shadow-indigo-600/30 transition-all duration-200 mt-1"
            >
              Přihlásit se
            </Button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-700 mt-6">
          © 2025 Globaal Elevate Production s.r.o.
        </p>
      </div>
    </div>
  )
}
