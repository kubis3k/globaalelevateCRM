// Deklarace modulů bez dodávaných / nainstalovaných typů. Kód s nimi pracuje
// volně (výsledky se validují za běhu), takže minimální, ale bezpečné typy.
// Umožňuje `typescript.ignoreBuildErrors: false` bez instalace @types balíčků.

declare module 'xlsx' {
  export function read(data: unknown, opts?: { type?: string }): {
    SheetNames: string[]
    Sheets: Record<string, unknown>
  }
  export const utils: {
    sheet_to_json<T = unknown>(sheet: unknown, opts?: { defval?: unknown; header?: unknown }): T[]
  }
}

declare module 'mailparser' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export function simpleParser(source: unknown, opts?: unknown): Promise<any>
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type ParsedMail = any
}

declare module 'pg' {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  export type QueryResult<R = any> = { rows: R[]; rowCount: number | null }
  export class Pool {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(config?: any)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query<R = any>(text: string, params?: unknown[]): Promise<QueryResult<R>>
    end(): Promise<void>
  }
  export class Client {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(config?: any)
    connect(): Promise<void>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    query<R = any>(text: string, params?: unknown[]): Promise<QueryResult<R>>
    end(): Promise<void>
  }
}
