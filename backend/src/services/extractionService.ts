import { UploadedFile } from 'express-fileupload';
import pdfParse from 'pdf-parse';

export interface ExtractedNFPAData {
  fireAlarms?: string[];
  powerSystems?: string[];
  communications?: string[];
  rawText?: string;
  // Add more fields as needed
}

export class ExtractionService {
  async extractData(file: UploadedFile): Promise<ExtractedNFPAData> {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!ext) throw new Error('File extension not found');

    switch (ext) {
      case 'pdf':
        return this.extractFromPDF(file);
      case 'ifc':
        return this.extractFromBIM(file);
      case 'dwg':
      case 'dxf':
        return this.extractFromCAD(file);
      default:
        throw new Error('Unsupported file type for extraction');
    }
  }

  async extractFromPDF(file: UploadedFile): Promise<ExtractedNFPAData> {
    const data = await pdfParse(file.data);
    // Simple keyword-based extraction for demo; replace with robust logic as needed
    const fireAlarms = data.text.match(/fire alarm.*$/gim) || [];
    const powerSystems = data.text.match(/power.*$/gim) || [];
    const communications = data.text.match(/comm(uni)?cat.*$/gim) || [];
    return {
      fireAlarms,
      powerSystems,
      communications,
      rawText: data.text
    };
  }

  async extractFromBIM(file: UploadedFile): Promise<ExtractedNFPAData> {
    // TODO: Implement IFC/BIM extraction
    return { rawText: 'BIM extraction not yet implemented' };
  }

  async extractFromCAD(file: UploadedFile): Promise<ExtractedNFPAData> {
    // TODO: Implement DWG/DXF extraction
    return { rawText: 'CAD extraction not yet implemented' };
  }
} 