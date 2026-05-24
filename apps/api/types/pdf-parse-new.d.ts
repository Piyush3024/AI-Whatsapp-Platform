declare module 'pdf-parse-new/lib/SmartPDFParser' {
  interface ParseMeta {
    method: string;
    duration: number;
  }
  interface ParseResult {
    text: string;
    numpages: number;
    info: Record<string, unknown>;
    _meta: ParseMeta;
  }
  class SmartParser {
    parse(buffer: Buffer): Promise<ParseResult>;
    getStats(): Record<string, unknown>;
  }
  export = SmartParser;
}
