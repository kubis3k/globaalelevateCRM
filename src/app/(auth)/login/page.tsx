import { login } from './actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Activity, AlertCircle } from 'lucide-react'

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function LoginPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const error = resolvedSearchParams.error === 'InvalidCredentials' 
    ? 'Nesprávné uživatelské jméno nebo heslo' 
    : null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4 dark:bg-zinc-950">
      <Card className="w-full max-w-md border-zinc-200 shadow-xl dark:border-zinc-800">
        <CardHeader className="space-y-3 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-600 shadow-lg shadow-indigo-500/30">
            <Activity className="h-7 w-7 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Global Elevate</CardTitle>
          <CardDescription>Zadejte své údaje pro přístup do systému</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={login} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/50 dark:text-red-400">
                <AlertCircle className="h-4 w-4" />
                <p>{error}</p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="username">Uživatelské jméno</Label>
              <Input
                id="username"
                name="username"
                placeholder="např. jan.novak"
                required
                className="bg-white dark:bg-zinc-900 focus-visible:ring-indigo-600"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Heslo</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="bg-white dark:bg-zinc-900 focus-visible:ring-indigo-600"
              />
            </div>
            <Button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 shadow-md">
              Přihlásit se
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex justify-center text-sm text-zinc-500">
          Systém je přístupný pouze pro interní zaměstnance.
        </CardFooter>
      </Card>
    </div>
  )
}
