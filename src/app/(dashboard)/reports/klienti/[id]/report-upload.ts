'use client'

import { upload } from '@vercel/blob/client'
import { addReportAttachment } from '../actions'

// Nahraje přílohu reportu přímo do Blobu (obejde ~4.5MB limit server action) přes
// existující token endpoint /api/blob/documents, pak zaregistruje řádek.
export async function uploadReportAttachment(reportId: string, file: File): Promise<{ id?: string; error?: string }> {
  if (file.size > 25 * 1024 * 1024) return { error: 'Soubor je větší než 25 MB.' }
  const ext = file.name.includes('.') ? '.' + file.name.split('.').pop() : ''
  const pathname = `documents/${crypto.randomUUID()}${ext}`
  let path: string
  try {
    const blob = await upload(pathname, file, { access: 'private', handleUploadUrl: '/api/blob/documents', contentType: file.type || undefined })
    path = blob.pathname
  } catch (e: any) {
    return { error: e?.message || 'Nahrání do úložiště selhalo.' }
  }
  return addReportAttachment(reportId, { path, name: file.name, contentType: file.type || undefined, size: file.size })
}
