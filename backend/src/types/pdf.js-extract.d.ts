declare module 'pdf.js-extract' {
  export interface PDFExtractPage {
    content: Array<{
      str: string;
      x: number;
      y: number;
      w: number;
      h: number;
      fontName: string;
    }>;
    pageInfo: {
      width: number;
      height: number;
      pageNumber: number;
    };
  }

  export interface PDFExtractResult {
    pages: PDFExtractPage[];
    meta: {
      info: any;
      metadata: any;
      version: string;
    };
  }

  export class PDFExtract {
    extract(filePath: string, options?: any): Promise<PDFExtractResult>;
  }
} 