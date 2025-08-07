declare module 'csv-parser' {
  import { Transform } from 'stream';

  interface CSVParserOptions {
    separator?: string;
    newline?: string;
    quote?: string;
    escape?: string;
    headers?: string[] | boolean;
    skipEmptyLines?: boolean;
    skipLinesWithError?: boolean;
    maxRowBytes?: number;
    strict?: boolean;
  }

  function csvParser(options?: CSVParserOptions): Transform;
  export = csvParser;
}