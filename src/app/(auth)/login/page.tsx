import { login } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle } from 'lucide-react'
import Image from 'next/image'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { PasswordInput } from './password-input'

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function LoginPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams
  const error = resolvedSearchParams.error === 'InvalidCredentials'
    ? 'Nesprávné uživatelské jméno nebo heslo'
    : null

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center bg-background px-4 py-12">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-sm">
        <div className="mb-5 flex justify-center">
          <Image
            src="/logo.png"
            alt="Globaal Elevate"
            width={176}
            height={56}
            className="logo-smart object-contain"
            priority
          />
        </div>

        <div className="mb-7 text-center">
          <h1 className="text-base font-semibold tracking-tight text-foreground">
            Globaal Elevate Production s.r.o.
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Interní přihlášení do systému
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
          <form action={login} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2.5 rounded-lg border border-destructive/20 bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
                <AlertCircle className="size-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="username">Uživatelské jméno</Label>
              <Input
                id="username"
                name="username"
                placeholder="např. jan.novak"
                required
                autoComplete="username"
                className="h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Heslo</Label>
              <PasswordInput id="password" name="password" required autoComplete="current-password" />
            </div>

            <Button type="submit" size="lg" className="mt-1 w-full">
              Přihlásit se
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          © 2025 Globaal Elevate Production s.r.o.
        </p>
      </div>
    </div>
  )
}
