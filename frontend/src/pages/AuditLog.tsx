import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import {
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

interface AuditLogEntry {
  id: string;
  type: 'PERMIT_CREATED' | 'PERMIT_UPDATED' | 'DOCUMENT_UPLOADED' | 'STATUS_CHANGED';
  description: string;
  timestamp: string;
  user: {
    name: string;
    role: string;
  };
  blockchainHash: string;
  verified: boolean;
  permitId: string;
  permitType: string;
}

export default function AuditLog() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);

  useEffect(() => {
    const fetchAuditLog = async () => {
      try {
        const response = await api.get('/audit-log');
        setEntries(response.data.data);
      } catch (error) {
        console.error('Failed to fetch audit log:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuditLog();
  }, []);

  const getTypeIcon = (type: AuditLogEntry['type']) => {
    switch (type) {
      case 'PERMIT_CREATED':
      case 'PERMIT_UPDATED':
        return (
          <DocumentTextIcon
            className="h-5 w-5 text-blue-500"
            aria-hidden="true"
          />
        );
      case 'STATUS_CHANGED':
        return (
          <ClockIcon className="h-5 w-5 text-yellow-500" aria-hidden="true" />
        );
      default:
        return (
          <DocumentTextIcon
            className="h-5 w-5 text-gray-500"
            aria-hidden="true"
          />
        );
    }
  };

  const getVerificationIcon = (verified: boolean) => {
    return verified ? (
      <CheckCircleIcon className="h-5 w-5 text-green-500" aria-hidden="true" />
    ) : (
      <XCircleIcon className="h-5 w-5 text-red-500" aria-hidden="true" />
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="sm:flex sm:items-center">
        <div className="sm:flex-auto">
          <h1 className="text-xl font-semibold text-gray-900">Audit Log</h1>
          <p className="mt-2 text-sm text-gray-700">
            View the complete history of all permit-related activities with
            blockchain verification.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Audit Log List */}
        <div className="lg:col-span-2">
          <div className="bg-white shadow rounded-lg">
            <ul className="divide-y divide-gray-200">
              {entries.map((entry) => (
                <li
                  key={entry.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => setSelectedEntry(entry)}
                >
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      {getTypeIcon(entry.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {entry.description}
                      </p>
                      <p className="text-sm text-gray-500">
                        {entry.user.name} ({entry.user.role})
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(entry.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <div className="flex-shrink-0">
                      {getVerificationIcon(entry.verified)}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Details Panel */}
        <div className="lg:col-span-1">
          {selectedEntry ? (
            <div className="bg-white shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Transaction Details
              </h2>
              <dl className="space-y-4">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Type</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {selectedEntry.type}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Description
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {selectedEntry.description}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">User</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {selectedEntry.user.name} ({selectedEntry.user.role})
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Timestamp
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(selectedEntry.timestamp).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Blockchain Hash
                  </dt>
                  <dd className="mt-1 text-sm font-mono text-gray-900 break-all">
                    {selectedEntry.blockchainHash}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Verification Status
                  </dt>
                  <dd className="mt-1">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        selectedEntry.verified
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {selectedEntry.verified ? 'Verified' : 'Not Verified'}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">
                    Related Permit
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {selectedEntry.permitType} ({selectedEntry.permitId})
                  </dd>
                </div>
              </dl>
            </div>
          ) : (
            <div className="bg-white shadow rounded-lg p-6">
              <p className="text-sm text-gray-500 text-center">
                Select an entry to view details
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 