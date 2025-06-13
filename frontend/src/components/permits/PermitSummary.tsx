import React from 'react';
import { DocumentArrowDownIcon } from '@heroicons/react/24/outline';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

interface PermitMetadata {
  id: string;
  projectName: string;
  submitter: string;
  submitDate: string;
  status: string;
}

interface AIAnalysis {
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  summary: string;
}

interface BlockchainInfo {
  txHash: string;
  timestamp: string;
}

interface PermitSummaryProps {
  metadata: PermitMetadata;
  aiAnalysis: AIAnalysis;
  blockchainInfo: BlockchainInfo;
  statusHistory: Array<{
    status: string;
    date: string;
    notes: string;
  }>;
}

export const PermitSummary: React.FC<PermitSummaryProps> = ({
  metadata,
  aiAnalysis,
  blockchainInfo,
  statusHistory,
}) => {
  const generatePDF = () => {
    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(20);
    doc.text('Permit Summary', 20, 20);
    
    // Metadata
    doc.setFontSize(12);
    doc.text('Permit Details:', 20, 40);
    const metadataTable = [
      ['Permit ID', metadata.id],
      ['Project Name', metadata.projectName],
      ['Submitted By', metadata.submitter],
      ['Submit Date', metadata.submitDate],
      ['Current Status', metadata.status],
    ];
    (doc as any).autoTable({
      startY: 45,
      head: [['Field', 'Value']],
      body: metadataTable,
    });

    // AI Analysis
    doc.text('AI Analysis:', 20, doc.lastAutoTable.finalY + 20);
    const aiTable = [
      ['Confidence Score', `${aiAnalysis.confidence}%`],
      ['Risk Level', aiAnalysis.riskLevel.toUpperCase()],
      ['Summary', aiAnalysis.summary],
    ];
    (doc as any).autoTable({
      startY: doc.lastAutoTable.finalY + 25,
      head: [['Field', 'Value']],
      body: aiTable,
    });

    // Blockchain Info
    doc.text('Blockchain Information:', 20, doc.lastAutoTable.finalY + 20);
    const blockchainTable = [
      ['Transaction Hash', blockchainInfo.txHash],
      ['Timestamp', blockchainInfo.timestamp],
    ];
    (doc as any).autoTable({
      startY: doc.lastAutoTable.finalY + 25,
      head: [['Field', 'Value']],
      body: blockchainTable,
    });

    // Status History
    doc.text('Status History:', 20, doc.lastAutoTable.finalY + 20);
    const historyTable = statusHistory.map(item => [
      item.status,
      item.date,
      item.notes,
    ]);
    (doc as any).autoTable({
      startY: doc.lastAutoTable.finalY + 25,
      head: [['Status', 'Date', 'Notes']],
      body: historyTable,
    });

    // Save the PDF
    doc.save(`permit-summary-${metadata.id}.pdf`);
  };

  return (
    <div className="flex items-center justify-end space-x-4">
      <button
        onClick={generatePDF}
        className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        <DocumentArrowDownIcon className="mr-2 h-5 w-5" />
        Download Summary
      </button>
    </div>
  );
}; 