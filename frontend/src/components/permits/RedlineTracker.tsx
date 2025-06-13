import React from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, SparklesIcon } from '@heroicons/react/24/solid';
import { motion } from 'framer-motion';

export type RedlineStatus = 'resolved' | 'still_present' | 'new_flag';

interface RedlineIssue {
  id: string;
  page: number;
  description: string;
  status: RedlineStatus;
  previousVersion?: string;
  currentVersion?: string;
}

interface RedlineTrackerProps {
  issues: RedlineIssue[];
  onStatusChange: (issueId: string, newStatus: RedlineStatus) => void;
}

const statusConfig = {
  resolved: {
    icon: CheckCircleIcon,
    color: 'text-green-500',
    bgColor: 'bg-green-50',
    label: 'Resolved',
  },
  still_present: {
    icon: ExclamationTriangleIcon,
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-50',
    label: 'Still Present',
  },
  new_flag: {
    icon: SparklesIcon,
    color: 'text-blue-500',
    bgColor: 'bg-blue-50',
    label: 'New Flag',
  },
};

export const RedlineTracker: React.FC<RedlineTrackerProps> = ({ issues, onStatusChange }) => {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Redline Issues</h3>
      <div className="space-y-4">
        {issues.map((issue, index) => {
          const config = statusConfig[issue.status];
          const Icon = config.icon;

          return (
            <motion.div
              key={issue.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`rounded-lg border border-gray-200 p-4 ${config.bgColor}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-3">
                  <Icon className={`h-5 w-5 ${config.color}`} />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Page {issue.page}: {issue.description}
                    </p>
                    <div className="mt-2 flex items-center space-x-2">
                      <select
                        value={issue.status}
                        onChange={(e) => onStatusChange(issue.id, e.target.value as RedlineStatus)}
                        className="rounded-md border-gray-300 text-sm focus:border-blue-500 focus:ring-blue-500"
                      >
                        <option value="resolved">✅ Resolved</option>
                        <option value="still_present">⚠️ Still Present</option>
                        <option value="new_flag">🧠 New Flag</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>
              {(issue.previousVersion || issue.currentVersion) && (
                <div className="mt-4 grid grid-cols-2 gap-4">
                  {issue.previousVersion && (
                    <div className="rounded-md bg-gray-50 p-3">
                      <p className="text-xs font-medium text-gray-500">Previous Version</p>
                      <p className="mt-1 text-sm text-gray-900">{issue.previousVersion}</p>
                    </div>
                  )}
                  {issue.currentVersion && (
                    <div className="rounded-md bg-gray-50 p-3">
                      <p className="text-xs font-medium text-gray-500">Current Version</p>
                      <p className="mt-1 text-sm text-gray-900">{issue.currentVersion}</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}; 