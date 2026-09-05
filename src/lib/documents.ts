// Client-safe constants for the document library. The server-only write path
// lives in documents-store.ts so this file can be imported from client
// components (category labels in the UI) without pulling in 'server-only'.

export const DOC_CATEGORIES: Record<string, string> = {
  contract: 'Smlouvy',
  invoice: 'Faktury',
  offer: 'Nabídky',
  report: 'Reporty',
  email: 'E-mailové přílohy',
  other: 'Ostatní',
}

export const MAX_DOCUMENT_BYTES = 25 * 1024 * 1024 // 25 MB
