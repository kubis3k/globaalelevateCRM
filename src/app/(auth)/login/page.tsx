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
    <div className="flex min-h-screen">
      {/* Left panel – dark branded */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#0d1117] flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Subtle glow */}
        <div className="absolute top-[-20%] left-[-20%] w-[500px] h-[500px] rounded-full bg-indigo-600/8 blur-3xl pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-20%] w-[400px] h-[400px] rounded-full bg-indigo-800/8 blur-3xl pointer-events-none" />

        <div className="relative z-10 text-center max-w-xs">
          {/* Logo – mix-blend-mode:screen removes white bg on dark panel */}
          <div className="flex justify-center mb-10">
            <Image
              src="/logo.png"
              alt="Globaal Elevate"
              width={200}
              height={70}
              className="object-contain"
              style={{ mixBlendMode: 'screen' }}
              priority
            />
          </div>

          <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
            Globaal Elevate Production s.r.o.
          </h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            Interní firemní systém pro správu financí, faktur, týmu a kalendáře.
          </p>

          {/* Divider */}
          <div className="mt-10 border-t border-white/8 pt-8">
            <p className="text-xs text-slate-600">
              Přihlášením souhlasíte s interní bezpečnostní politikou.
            </p>
          </div>
        </div>
      </div>

      {/* Right panel – login form */}
      <div className="flex-1 flex flex-col bg-background">
        {/* Top bar */}
        <div className="flex items-center justify-between px-8 py-4 border-b border-border">
          {/* Mobile logo */}
          <div className="lg:hidden">
            <Image
              src="/logo.png"
              alt="Globaal Elevate"
              width={120}
              height={40}
              className="object-contain dark:mix-blend-screen"
              priority
            />
          </div>
          <div className="hidden lg:block text-sm font-medium text-muted-foreground">
            Přihlášení do systému
          </div>
          <ThemeToggle />
        </div>

        {/* Form area */}
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-sm">
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">Přihlášení</h1>
              <p className="text-muted-foreground mt-1 text-sm">
                Zadejte přihlašovací údaje pro přístup do systému
              </p>
            </div>

            <form action={login} className="space-y-4">
              {error && (
                <div className="flex items-center gap-3 rounded-xl bg-destructive/8 border border-destructive/20 px-4 py-3 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="username" className="text-sm font-medium text-foreground">
                  Uživatelské jméno
                </Label>
                <Input
                  id="username"
                  name="username"
                  placeholder="např. jan.novak"
                  required
                  autoComplete="username"
                  className="h-10 rounded-lg border-border bg-background focus-visible:ring-indigo-500 focus-visible:border-indigo-500 placeholder:text-muted-foreground/60"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-sm font-medium text-foreground">
                  Heslo
                </Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  className="h-10 rounded-lg border-border bg-background focus-visible:ring-indigo-500 focus-visible:border-indigo-500"
                />
              </div>

              <Button
                type="submit"
                className="w-full h-10 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm shadow-indigo-500/20 transition-all duration-200 hover:shadow-indigo-500/30 mt-1"
              >
                Přihlásit se
              </Button>
            </form>

            <p className="text-center text-xs text-muted-foreground/60 mt-8">
              © 2025 Globaal Elevate Production s.r.o. Všechna práva vyhrazena.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
