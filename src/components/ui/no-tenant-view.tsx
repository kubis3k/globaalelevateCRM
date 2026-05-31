import { Building2 } from "lucide-react"
import { EmptyState } from "./empty-state"

export function NoTenantView() {
  return (
    <EmptyState
      icon={Building2}
      title="Organizace nenalezena"
      description="Váš účet zatím není přiřazen k žádné firmě v systému. Kontaktujte prosím administrátora, aby vás do firmy přidal."
    />
  )
}
