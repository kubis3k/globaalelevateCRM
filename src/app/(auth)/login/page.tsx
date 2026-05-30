import { login } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { AlertCircle } from 'lucide-react'
import Image from 'next/image'

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
      {/* Left panel - branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[oklch(0.12_0.025_254)] flex-col items-center justify-center p-12 relative overflow-hidden">
        {/* Decorative background circles */}
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 rounded-full bg-indigo-600/10 blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-indigo-700/5 blur-3xl" />

        <div className="relative z-10 text-center max-w-sm">
          <div className="flex justify-center mb-8">
            <Image
              src="/logo.png"
              alt="Global Elevate"
              width={180}
              height={60}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
            Váš firemní<br />
            <span className="text-indigo-400">ERP systém</span>
          </h1>
          <p className="text-slate-400 text-base leading-relaxed">
            Spravujte faktury, finance, tým a kalendář na jednom místě. Rychle, bezpečně a přehledně.
          </p>

          <div className="mt-12 grid grid-cols-3 gap-6 text-center">
            {[
              { label: 'Moduly', value: '5' },
              { label: 'Zabezpečení', value: 'RLS' },
              { label: 'Dostupnost', value: '99%' },
            ].map((stat) => (
              <div key={stat.label} className="bg-white/5 rounded-xl p-4 backdrop-blur-sm border border-white/8">
                <div className="text-2xl font-bold text-indigo-400">{stat.value}</div>
                <div className="text-xs text-slate-500 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel - login form */}
      <div className="flex-1 flex flex-col items-center justify-center bg-[oklch(0.98_0.002_247)] p-8">
        {/* Mobile logo */}
        <div className="lg:hidden mb-8">
          <Image
            src="/logo.png"
            alt="Global Elevate"
            width={140}
            height={48}
            className="object-contain"
            priority
          />
        </div>

        <div className="w-full max-w-md">
          <div className="mb-10">
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Přihlášení</h2>
            <p className="text-slate-500 mt-2 text-sm">Přihlaste se do firemního systému</p>
          </div>

          <form action={login} className="space-y-5">
            {error && (
              <div className="flex items-center gap-3 rounded-xl bg-red-50 border border-red-100 px-4 py-3 text-sm text-red-600">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium text-slate-700">
                Uživatelské jméno
              </Label>
              <Input
                id="username"
                name="username"
                placeholder="např. jan.novak"
                required
                className="h-11 bg-white border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 rounded-xl shadow-sm"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                Heslo
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="h-11 bg-white border-slate-200 text-slate-900 focus-visible:ring-indigo-500 focus-visible:border-indigo-500 rounded-xl shadow-sm"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md shadow-indigo-500/25 transition-all duration-200 hover:shadow-indigo-500/40 hover:scale-[1.01] mt-2"
            >
              Přihlásit se
            </Button>
          </form>

          <p className="text-center text-xs text-slate-400 mt-8">
            Systém je přístupný pouze pro interní zaměstnance.
            <br />© 2025 Global Elevate. Všechna práva vyhrazena.
          </p>
        </div>
      </div>
    </div>
  )
}
