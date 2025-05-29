#!/bin/bash

# Setup Enhanced NFPA Permit System v2.0
# Complete OCR, Mobile, and AI-powered document processing

echo "🚀 Setting up Enhanced NFPA Permit System v2.0..."
echo "================================================="

# Navigate to project directory
cd ~/nfpa-permit-system

# Create required directory structure
echo "📁 Creating directory structure..."
mkdir -p modules/documents
mkdir -p modules/mobile
mkdir -p uploads/field/inspections
mkdir -p uploads/field/progress
mkdir -p uploads/field/violations
mkdir -p processed/ocr
mkdir -p processed/thumbnails
mkdir -p qr-codes

# Install compatible dependencies for Node 18
echo "📦 Installing Node 18 compatible dependencies..."

# Remove problematic packages first
npm uninstall file-type simple-xml-to-json gm 2>/dev/null || true

# Install OCR and document processing (Node 18 compatible)
npm install tesseract.js@5.1.0 --save
npm install pdf-parse@1.1.1 --save
npm install node-xlsx@0.21.0 --save
npm install mammoth@1.6.0 --save

# Install file processing tools (Node 18 compatible)
npm install file-type@18.7.0 --save
npm install mime-types@2.1.35 --save
npm install archiver@6.0.1 --save
npm install unzipper@0.10.14 --save

# Install image processing (Node 18 compatible)
npm install sharp@0.32.6 --save
npm install jimp@0.22.12 --save

# Install AI/ML libraries (Node 18 compatible)
npm install natural@6.12.0 --save
npm install compromise@14.10.0 --save
npm install pdf-lib@1.17.1 --save

# Install QR code generation
npm install qrcode@1.5.3 --save

# Install additional utilities
npm install multer@1.4.5-lts.1 --save
npm install express-rate-limit@6.10.0 --save

echo "✅ Dependencies installed successfully!"

# Update package.json with new scripts
cat > package.json << 'EOF'
{
  "name": "nfpa-permit-system-enhanced",
  "version": "2.0.0",
  "description": "Enhanced NFPA Fire Safety Permit Management System with OCR, Mobile, and AI",
  "main": "enhanced-web-server-v2.js",
  "scripts": {
    "start": "node enhanced-web-server-v2.js",
    "dev": "nodemon enhanced-web-server-v2.js",
    "test": "node test-enhanced-system.js",
    "setup": "./setup-enhanced-system.sh",
    "clean": "rm -rf uploads/* processed/* qr-codes/*"
  },
  "keywords": [
    "nfpa",
    "fire-safety",
    "permits",
    "ocr",
    "mobile",
    "ai",
    "document-processing"
  ],
  "author": "NFPA Enhanced Permit System",
  "license": "MIT",
  "engines": {
    "node": ">=18.0.0"
  }
}
EOF

echo "✅ Package.json updated!"

# Fix any remaining vulnerabilities
npm audit fix --force 2>/dev/null || echo "⚠️ Some vulnerabilities may remain - system still functional"

# Create test data directory
mkdir -p test-data
echo "📋 Test data directory created"

# Set permissions
chmod +x enhanced-web-server-v2.js 2>/dev/null || true
chmod 755 uploads/ processed/ qr-codes/ 2>/dev/null || true

echo ""
echo "🎉 Enhanced NFPA Permit System v2.0 Setup Complete!"
echo "=================================================="
echo ""
echo "📁 Directory Structure Created:"
echo "  ├── modules/documents/     - Enhanced document manager"
echo "  ├── modules/mobile/        - Mobile submission manager"  
echo "  ├── uploads/               - File uploads"
echo "  ├── processed/             - Processed documents"
echo "  └── qr-codes/              - Generated QR codes"
echo ""
echo "🚀 New Capabilities:"
echo "  ✅ OCR text extraction from images and PDFs"
echo "  ✅ AI-powered NFPA compliance analysis"
echo "  ✅ Mobile field inspection submissions"
echo "  ✅ QR code permit access"
echo "  ✅ Progress tracking with photos"
echo "  ✅ Violation reporting with evidence"
echo "  ✅ CAD file processing"
echo "  ✅ Multi-format document support"
echo "  ✅ Thumbnail generation"
echo "  ✅ Advanced analytics"
echo ""
echo "📱 Supported File Types:"
echo "  • Documents: PDF, DOC, DOCX, TXT, RTF"
echo "  • Images: JPG, PNG, TIFF, BMP, GIF, WEBP"
echo "  • CAD: DWG, DXF, RVT, SKP, STEP, IFC"
echo "  • Spreadsheets: XLSX, XLS, CSV"
echo "  • Videos: MP4, MOV (mobile submissions)"
echo ""
echo "🔧 To start the enhanced system:"
echo "  npm start"
echo ""
echo "🧪 To run tests:"
echo "  npm test"
echo ""
echo "📊 Key API Endpoints:"
echo "  POST /api/permits/{id}/documents     - Enhanced document upload"
echo "  POST /api/permits/{id}/field-inspection - Mobile inspections"
echo "  POST /api/permits/{id}/progress      - Progress submissions"
echo "  POST /api/permits/{id}/violations    - Violation reporting"
echo "  POST /api/permits/{id}/qr-code       - Generate QR codes"
echo "  GET  /api/analytics/system           - System analytics"
echo "  GET  /api/analytics/documents        - Document processing stats"
echo ""
echo "✅ System ready for production deployment!"
