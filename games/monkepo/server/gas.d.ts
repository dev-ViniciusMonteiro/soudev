// Tipos mínimos dos serviços do Google Apps Script usados pelo servidor.

interface GasRange {
  getValues(): unknown[][];
  setValues(values: unknown[][]): GasRange;
  setNumberFormat(format: string): GasRange;
}
interface GasSheet {
  getName(): string;
  getLastRow(): number;
  getRange(row: number, col: number, numRows?: number, numCols?: number): GasRange;
  getMaxRows(): number;
  appendRow(values: unknown[]): GasSheet;
  setFrozenRows(rows: number): void;
  deleteRows(start: number, howMany: number): void;
}
interface GasSpreadsheet {
  getSheetByName(name: string): GasSheet | null;
  insertSheet(name: string): GasSheet;
}
interface GasCache {
  get(key: string): string | null;
  put(key: string, value: string, seconds: number): void;
  remove(key: string): void;
}
interface GasLock {
  waitLock(ms: number): void;
  releaseLock(): void;
}
interface GasProperties {
  getProperty(key: string): string | null;
  setProperty(key: string, value: string): void;
}
interface GasTextOutput {
  setMimeType(type: unknown): GasTextOutput;
}

declare const SpreadsheetApp: { getActiveSpreadsheet(): GasSpreadsheet };
declare const CacheService: { getScriptCache(): GasCache };
declare const LockService: { getScriptLock(): GasLock };
declare const PropertiesService: { getScriptProperties(): GasProperties };
declare const ContentService: { createTextOutput(text: string): GasTextOutput; MimeType: { JSON: unknown } };
declare const Utilities: {
  computeDigest(algorithm: unknown, value: string): number[];
  computeHmacSha256Signature(value: string, key: string): number[];
  base64EncodeWebSafe(data: number[] | string): string;
  base64DecodeWebSafe(data: string): number[];
  newBlob(data: number[]): { getDataAsString(): string };
  getUuid(): string;
  DigestAlgorithm: { SHA_256: unknown };
};

interface GasPostEvent {
  postData?: { contents: string; type: string };
}
