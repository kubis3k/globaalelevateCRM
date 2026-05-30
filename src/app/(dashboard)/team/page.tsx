import { requireTenant } from '@/lib/supabase/tenant'
import { NoTenantView } from '@/components/ui/no-tenant-view'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { UserPlus, Trash } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { AddMemberForm } from './add-member-form'
import { removeTeamMember } from './actions'

export default async function TeamPage() {
  const { supabase, user, tenantId, role } = await requireTenant()
  
  if (!tenantId) {
    return <NoTenantView />
  }

  const isAdmin = role === 'admin'

  // Načtení všech členů týmu ve stejném tenantu včetně propojení na tabulku profilů
  const { data: teamMembers } = await supabase
    .from('tenant_users')
    .select(`
      user_id,
      role,
      created_at,
      profiles (
        username,
        full_name
      )
    `)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: true })

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Tým a oprávnění</h2>
          <p className="text-zinc-500">Spravujte přístupy a role členů vaší firmy.</p>
        </div>
        {isAdmin && (
          <Dialog>
            <DialogTrigger asChild>
              <Button className="bg-indigo-600 hover:bg-indigo-700 shadow-sm">
                <UserPlus className="mr-2 h-4 w-4" />
                Přidat člena
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Přidat nového člena týmu</DialogTitle>
                <DialogDescription>
                  Vytvořte účet pro nového kolegu a přiřaďte mu roli v systému.
                </DialogDescription>
              </DialogHeader>
              <AddMemberForm />
            </DialogContent>
          </Dialog>
        )}
      </div>

      <Card className="shadow-sm border-zinc-200 dark:border-zinc-800">
        <CardHeader>
          <CardTitle>Členové firmy</CardTitle>
          <CardDescription>Seznam všech uživatelů s přístupem do tohoto ERP rozhraní.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-md">
            <Table>
              <TableHeader className="bg-zinc-50 dark:bg-zinc-900/50">
                <TableRow>
                  <TableHead>Jméno</TableHead>
                  <TableHead>Uživatelské jméno</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Přidán</TableHead>
                  {isAdmin && <TableHead className="text-right">Akce</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {teamMembers?.map((member: any) => (
                  <TableRow key={member.user_id}>
                    <TableCell className="font-medium flex items-center gap-2">
                      {member.profiles?.full_name || '-'}
                      {member.user_id === user?.id && <span className="text-xs text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full font-semibold">Vy</span>}
                    </TableCell>
                    <TableCell className="text-zinc-500">{member.profiles?.username}</TableCell>
                    <TableCell>
                      <RoleBadge role={member.role} />
                    </TableCell>
                    <TableCell className="text-zinc-500 text-sm">
                      {new Date(member.created_at).toLocaleDateString('cs-CZ')}
                    </TableCell>
                    {isAdmin && (
                      <TableCell className="text-right">
                        {member.user_id !== user?.id && (
                          <form action={removeTeamMember.bind(null, member.user_id)}>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30">
                              <Trash className="h-4 w-4" />
                            </Button>
                          </form>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
                {!teamMembers || teamMembers.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={isAdmin ? 5 : 4} className="h-24 text-center text-zinc-500">
                      Žádní členové nebyli nalezeni.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    admin: "bg-red-100 text-red-700 hover:bg-red-100/80 dark:bg-red-900/30 dark:text-red-400",
    manager: "bg-amber-100 text-amber-700 hover:bg-amber-100/80 dark:bg-amber-900/30 dark:text-amber-400",
    employee: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100/80 dark:bg-emerald-900/30 dark:text-emerald-400",
    external: "bg-zinc-100 text-zinc-700 hover:bg-zinc-100/80 dark:bg-zinc-800 dark:text-zinc-300",
  }
  
  const labels: Record<string, string> = {
    admin: "Administrátor",
    manager: "Manažer",
    employee: "Zaměstnanec",
    external: "Externista",
  }

  return (
    <Badge className={styles[role] || styles.employee} variant="secondary">
      {labels[role] || role}
    </Badge>
  )
}
