#!/bin/bash
set -e

# Step 1: Set up Python virtual environment
python3 -m venv venv
source venv/bin/activate

# Step 2: Install dependencies
pip install --upgrade pip
pip install fastapi uvicorn pdfplumber pytesseract pillow ezdxf python-docx openpyxl pdf2image
sudo apt-get update && sudo apt-get install -y tesseract-ocr poppler-utils

# Step 3: Run the FastAPI server (in background)
nohup uvicorn app:app --host 0.0.0.0 --port 8000 &
sleep 5

# Step 4: Test the /checklist-validate endpoint with a sample PDF
# (Replace sample.pdf with your actual test file)
SAMPLE_FILE="sample.pdf"
if [ ! -f "$SAMPLE_FILE" ]; then
  echo "Please place a sample PDF named 'sample.pdf' in the ai/ directory to run this test."
  exit 1
fi

curl -F "permitId=TEST123" -F "currentFile=@$SAMPLE_FILE" http://localhost:8000/checklist-validate

echo "AI backend test complete. Check output above." 