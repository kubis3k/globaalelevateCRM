import { Lock } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

export default function NoAccessPage() {
  return (
    <EmptyState
      icon={Lock}
      title="Žádný přístup k modulům"
      description="Vaše role nemá povolený žádný modul. Kontaktujte prosím administrátora, aby vám přiřadil odpovídající oprávnění."
    />
  )
}
