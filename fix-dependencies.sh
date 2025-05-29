# Clean up and install compatible versions for Node 18
cd ~/nfpa-permit-system

# Remove problematic packages and reinstall with compatible versions
npm uninstall file-type simple-xml-to-json gm

# Install Node 18 compatible versions
npm install tesseract.js@5.1.0 pdf-parse@1.1.1 node-xlsx@0.21.0 mammoth@1.6.0

# Install compatible file processing tools  
npm install file-type@18.7.0 mime-types@2.1.35 archiver@6.0.1 unzipper@0.10.14

# Install AI/ML libraries compatible with Node 18
npm install natural@6.12.0 compromise@14.10.0 pdf-lib@1.17.1 canvas@2.11.2

# Install additional image processing (Node 18 compatible)
npm install sharp@0.32.6 jimp@0.22.12

# Fix vulnerabilities with compatible versions
npm audit fix

echo "✅ Dependencies installed with Node 18 compatibility"
