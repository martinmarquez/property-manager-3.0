declare module 'exceljs' {
  export class Workbook {
    addWorksheet(name: string): Worksheet;
    readonly xlsx: {
      writeBuffer(): Promise<ArrayBuffer>;
    };
  }

  export interface Worksheet {
    addRow(values: unknown[]): void;
    columns: Column[];
  }

  interface Column {
    width?: number;
    eachCell?(opts: { includeEmpty: boolean }, cb: (cell: Cell) => void): void;
  }

  interface Cell {
    value: unknown;
  }
}
