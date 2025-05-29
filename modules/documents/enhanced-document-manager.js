const fs = require('fs').promises;
const path = require('path');
const pdfParse = require('pdf-parse');
const xlsx = require('node-xlsx');
const mammoth = require('mammoth');
const sharp = require('sharp');
const natural = require('natural');
const compromise = require('compromise');

class EnhancedDocumentManager {
    constructor() {
        this.supportedTypes = {
            'permit_application': ['.pdf', '.doc', '.docx', '.xlsx', '.xls'],
            'cad_drawings': ['.dwg', '.dxf', '.rvt', '.skp', '.step', '.ifc'],
            'images': ['.jpg', '.jpeg', '.png', '.tiff', '.bmp', '.gif', '.webp'],
            'calculations': ['.pdf', '.xlsx', '.xls', '.csv'],
            'specifications': ['.pdf', '.doc', '.docx', '.txt', '.rtf'],
            'reports': ['.pdf', '.doc', '.docx'],
            'certificates': ['.pdf', '.jpg', '.png', '.tiff']
        };

        this.nfpaKeywords = [
            'NFPA 13', 'NFPA 72', 'NFPA 25', 'NFPA 101', 'NFPA 70',
            'fire alarm', 'sprinkler', 'suppression', 'detection',
            'smoke detector', 'heat detector', 'pull station'
        ];

        this.uploadDir = './uploads';
        this.processedDir = './processed';
        this.initDirectories();
    }

    async initDirectories() {
        try {
            await fs.mkdir(this.uploadDir, { recursive: true });
            await fs.mkdir(this.processedDir, { recursive: true });
            await fs.mkdir(`${this.processedDir}/ocr`, { recursive: true });
            await fs.mkdir(`${this.processedDir}/thumbnails`, { recursive: true });
            console.log('✅ Document directories initialized');
        } catch (error) {
            console.error('❌ Error creating directories:', error);
        }
    }

    async processUpload(file, permitId, category = 'general') {
        try {
            console.log(`📄 Processing upload: ${file.originalname} for permit ${permitId}`);
            
            const timestamp = Date.now();
            const filename = `${permitId}_${timestamp}_${file.originalname}`;
            const filepath = path.join(this.uploadDir, filename);
            
            await fs.writeFile(filepath, file.buffer);
            
            const processing = await this.intelligentFileProcessing(filepath, file.originalname);
            
            const documentRecord = {
                id: `DOC_${timestamp}_${Math.random().toString(36).substr(2, 9)}`,
                permitId: permitId,
                originalName: file.originalname,
                filename: filename,
                filepath: filepath,
                category: category,
                fileType: file.mimetype,
                fileExtension: path.extname(file.originalname).toLowerCase(),
                size: file.size,
                uploadDate: new Date().toISOString(),
                processing: processing,
                status: 'processed'
            };
            
            console.log(`✅ Document processed: ${documentRecord.id}`);
            return documentRecord;
            
        } catch (error) {
            console.error('❌ Error processing upload:', error);
            throw new Error(`Upload processing failed: ${error.message}`);
        }
    }

    async intelligentFileProcessing(filepath, originalName) {
        const processing = {
            text: null,
            nfpaReferences: [],
            compliance: null,
            thumbnail: null
        };

        try {
            const extension = path.extname(originalName).toLowerCase();
            
            // Text extraction
            if (extension === '.pdf') {
                const pdfBuffer = await fs.readFile(filepath);
                const pdfData = await pdfParse(pdfBuffer);
                processing.text = pdfData.text;
            } else if (extension === '.docx') {
                const docxResult = await mammoth.extractRawText({ path: filepath });
                processing.text = docxResult.value;
            } else if (extension === '.txt') {
                processing.text = await fs.readFile(filepath, 'utf8');
            }

            // NFPA analysis
            if (processing.text) {
                processing.nfpaReferences = this.extractNFPAReferences(processing.text);
                processing.compliance = await this.analyzeCompliance(processing.text);
            }

            // Thumbnail generation for images
            if (this.isImageFile(extension)) {
                processing.thumbnail = await this.generateThumbnail(filepath, extension);
            }

            return processing;

        } catch (error) {
            console.error('❌ Error in processing:', error);
            return processing;
        }
    }

    extractNFPAReferences(text) {
        if (!text) return [];
        
        const references = [];
        const nfpaPattern = /NFPA\s*(\d+)[A-Z]?/gi;
        const matches = text.match(nfpaPattern);
        
        if (matches) {
            matches.forEach(match => {
                const codeNumber = match.match(/\d+/)[0];
                const codeInfo = this.getNFPACodeInfo(codeNumber);
                references.push({
                    code: match.trim(),
                    number: codeNumber,
                    title: codeInfo.title,
                    category: codeInfo.category
                });
            });
        }
        
        return [...new Set(references.map(r => JSON.stringify(r)))].map(r => JSON.parse(r));
    }

    async analyzeCompliance(text) {
        if (!text) return null;
        
        try {
            const analysis = {
                nfpaCompliant: false,
                confidence: 0,
                recommendations: []
            };
            
            const complianceKeywords = [
                'complies with', 'in accordance with', 'per NFPA',
                'meets requirements', 'approved', 'listed'
            ];
            
            let score = 0;
            complianceKeywords.forEach(keyword => {
                if (text.toLowerCase().includes(keyword.toLowerCase())) {
                    score += 15;
                }
            });
            
            analysis.confidence = Math.min(score, 100);
            analysis.nfpaCompliant = score >= 45;
            
            if (!analysis.nfpaCompliant) {
                analysis.recommendations.push(
                    'Document should reference applicable NFPA codes',
                    'Include compliance statements'
                );
            }
            
            return analysis;
            
        } catch (error) {
            console.error('❌ Compliance analysis failed:', error);
            return null;
        }
    }

    async generateThumbnail(filepath, extension) {
        try {
            const thumbnailPath = path.join(
                this.processedDir, 
                'thumbnails', 
                `thumb_${path.basename(filepath, extension)}.jpg`
            );
            
            await sharp(filepath)
                .resize(300, 400, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 80 })
                .toFile(thumbnailPath);
            
            return thumbnailPath;
            
        } catch (error) {
            console.error('❌ Thumbnail generation failed:', error);
            return null;
        }
    }

    isImageFile(ext) {
        return ['.jpg', '.jpeg', '.png', '.tiff', '.bmp', '.gif', '.webp'].includes(ext.toLowerCase());
    }

    getNFPACodeInfo(codeNumber) {
        const codes = {
            '13': { title: 'Installation of Sprinkler Systems', category: 'suppression' },
            '72': { title: 'Fire Alarm and Signaling Code', category: 'detection' },
            '25': { title: 'Inspection, Testing, and Maintenance', category: 'maintenance' },
            '101': { title: 'Life Safety Code', category: 'egress' },
            '70': { title: 'National Electrical Code', category: 'electrical' }
        };
        
        return codes[codeNumber] || { title: 'Unknown NFPA Code', category: 'general' };
    }
}

module.exports = EnhancedDocumentManager;
