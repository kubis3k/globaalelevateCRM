// Minimal ISDOC 6.0.1 invoice builder (Czech e-invoice). Export-only; numbers
// are internally consistent (base + VAT = total). Baseline single-line export —
// good for accounting import, ověř proti konkrétnímu účetnímu SW.

function esc(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;')
}
const n2 = (n: number) => (Math.round((Number(n) || 0) * 100) / 100).toFixed(2)

export function buildIsdoc(invoice: any, company: any, customer: any): string {
  const total = Number(invoice.amount) || 0
  const vatPayer = company ? company.vat_payer !== false : false

  let base: number, vat: number, rate: number
  if (invoice.subtotal != null && invoice.vat_amount != null) {
    base = Number(invoice.subtotal); vat = Number(invoice.vat_amount)
    rate = invoice.vat_rate != null ? Number(invoice.vat_rate) : (base > 0 ? Math.round((vat / base) * 100) : 0)
  } else if (vatPayer) {
    rate = company?.default_vat_rate != null ? Number(company.default_vat_rate) : 21
    base = Math.round((total / (1 + rate / 100)) * 100) / 100
    vat = Math.round((total - base) * 100) / 100
  } else {
    rate = 0; base = total; vat = 0
  }

  const vatApplicable = rate > 0
  const uuid = globalThis.crypto?.randomUUID?.() || String(invoice.id)
  const issue = String(invoice.issue_date || '').slice(0, 10)
  const supTax = company?.dic ? `<PartyTaxScheme><CompanyID>${esc(company.dic)}</CompanyID><TaxScheme>VAT</TaxScheme></PartyTaxScheme>` : ''
  const custId = customer?.ico ? `<PartyIdentification><ID>${esc(customer.ico)}</ID></PartyIdentification>` : ''
  const custTax = customer?.dic ? `<PartyTaxScheme><CompanyID>${esc(customer.dic)}</CompanyID><TaxScheme>VAT</TaxScheme></PartyTaxScheme>` : ''

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="http://isdoc.cz/namespace/2013" version="6.0.1">
<DocumentType>1</DocumentType>
<ID>${esc(invoice.invoice_number || invoice.id)}</ID>
<UUID>${esc(uuid)}</UUID>
<IssuingSystem>Globaal Elevate CRM</IssuingSystem>
<IssueDate>${esc(issue)}</IssueDate>
<TaxPointDate>${esc(issue)}</TaxPointDate>
<VATApplicable>${vatApplicable ? 'true' : 'false'}</VATApplicable>
<LocalCurrencyCode>${esc(invoice.currency || 'CZK')}</LocalCurrencyCode>
<CurrRate>1</CurrRate>
<RefCurrRate>1</RefCurrRate>
<AccountingSupplierParty><Party>
${company?.ico ? `<PartyIdentification><ID>${esc(company.ico)}</ID></PartyIdentification>` : ''}
<PartyName><Name>${esc(company?.legal_name || 'Dodavatel')}</Name></PartyName>
<PostalAddress><StreetName>${esc(company?.street || '')}</StreetName><BuildingNumber></BuildingNumber><CityName>${esc(company?.city || '')}</CityName><PostalZone>${esc(company?.zip || '')}</PostalZone><Country><IdentificationCode>${esc(company?.country || 'CZ')}</IdentificationCode><Name></Name></Country></PostalAddress>
${supTax}
</Party></AccountingSupplierParty>
<AccountingCustomerParty><Party>
${custId}
<PartyName><Name>${esc(invoice.client_name || customer?.name || 'Odběratel')}</Name></PartyName>
<PostalAddress><StreetName>${esc(customer?.address || '')}</StreetName><BuildingNumber></BuildingNumber><CityName></CityName><PostalZone></PostalZone><Country><IdentificationCode>CZ</IdentificationCode><Name></Name></Country></PostalAddress>
${custTax}
</Party></AccountingCustomerParty>
<InvoiceLines><InvoiceLine>
<ID>1</ID>
<InvoicedQuantity unitCode="ks">1</InvoicedQuantity>
<LineExtensionAmount>${n2(base)}</LineExtensionAmount>
<LineExtensionAmountTaxInclusive>${n2(total)}</LineExtensionAmountTaxInclusive>
<LineExtensionTaxAmount>${n2(vat)}</LineExtensionTaxAmount>
<UnitPrice>${n2(base)}</UnitPrice>
<UnitPriceTaxInclusive>${n2(total)}</UnitPriceTaxInclusive>
<ClassifiedTaxCategory><Percent>${n2(rate)}</Percent><VATCalculationMethod>0</VATCalculationMethod></ClassifiedTaxCategory>
<Item><Description>${esc('Faktura ' + (invoice.invoice_number || ''))}</Description></Item>
</InvoiceLine></InvoiceLines>
<TaxTotal>
<TaxSubTotal>
<TaxableAmount>${n2(base)}</TaxableAmount>
<TaxAmount>${n2(vat)}</TaxAmount>
<TaxInclusiveAmount>${n2(total)}</TaxInclusiveAmount>
<AlreadyClaimedTaxableAmount>0.00</AlreadyClaimedTaxableAmount>
<AlreadyClaimedTaxAmount>0.00</AlreadyClaimedTaxAmount>
<AlreadyClaimedTaxInclusiveAmount>0.00</AlreadyClaimedTaxInclusiveAmount>
<DifferenceTaxableAmount>${n2(base)}</DifferenceTaxableAmount>
<DifferenceTaxAmount>${n2(vat)}</DifferenceTaxAmount>
<DifferenceTaxInclusiveAmount>${n2(total)}</DifferenceTaxInclusiveAmount>
<TaxCategory><Percent>${n2(rate)}</Percent><VATCalculationMethod>0</VATCalculationMethod></TaxCategory>
</TaxSubTotal>
<TaxAmount>${n2(vat)}</TaxAmount>
</TaxTotal>
<LegalMonetaryTotal>
<TaxExclusiveAmount>${n2(base)}</TaxExclusiveAmount>
<TaxInclusiveAmount>${n2(total)}</TaxInclusiveAmount>
<AlreadyClaimedTaxExclusiveAmount>0.00</AlreadyClaimedTaxExclusiveAmount>
<AlreadyClaimedTaxInclusiveAmount>0.00</AlreadyClaimedTaxInclusiveAmount>
<DifferenceTaxExclusiveAmount>${n2(base)}</DifferenceTaxExclusiveAmount>
<DifferenceTaxInclusiveAmount>${n2(total)}</DifferenceTaxInclusiveAmount>
<PayableRoundingAmount>0.00</PayableRoundingAmount>
<PaidDepositsAmount>0.00</PaidDepositsAmount>
<PayableAmount>${n2(total)}</PayableAmount>
</LegalMonetaryTotal>
</Invoice>`
}
