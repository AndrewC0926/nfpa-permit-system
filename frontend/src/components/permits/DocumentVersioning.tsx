import React from 'react';
import { DocumentTextIcon, ClockIcon, UserIcon } from '@heroicons/react/24/outline';
import { motion } from 'framer-motion';

interface DocumentVersion {
  id: string;
  version: number;
  uploadDate: string;
  submittedBy: string;
  changes: {
    pagesAdded?: number;
    redlinesDetected?: boolean;
    newIssues?: number;
  };
}

interface DocumentVersioningProps {
  versions: DocumentVersion[];
  onVersionSelect: (version: DocumentVersion) => void;
}

export const DocumentVersioning: React.FC<DocumentVersioningProps> = ({ versions, onVersionSelect }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Document History</h3>
      <div className="space-y-3">
        {versions.map((version, index) => (
          <motion.div
            key={version.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start space-x-4 rounded-lg border border-gray-200 p-4 hover:bg-gray-50 cursor-pointer"
            onClick={() => onVersionSelect(version)}
          >
            <div className="flex-shrink-0">
              <DocumentTextIcon className="h-6 w-6 text-blue-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900">Version {version.version}</p>
                <span className="text-xs text-gray-500">{version.uploadDate}</span>
              </div>
              <div className="mt-1 flex items-center text-sm text-gray-500">
                <UserIcon className="mr-1.5 h-4 w-4 flex-shrink-0" />
                {version.submittedBy}
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {version.changes.pagesAdded && (
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
                    +{version.changes.pagesAdded} pages
                  </span>
                )}
                {version.changes.redlinesDetected && (
                  <span className="inline-flex items-center rounded-full bg-yellow-100 px-2.5 py-0.5 text-xs font-medium text-yellow-800">
                    Redlines detected
                  </span>
                )}
                {version.changes.newIssues && (
                  <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
                    {version.changes.newIssues} new issues
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}; 