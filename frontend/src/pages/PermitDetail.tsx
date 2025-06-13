import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PermitTimeline } from '../components/permits/PermitTimeline';
import { DocumentVersioning } from '../components/permits/DocumentVersioning';
import { RedlineTracker } from '../components/permits/RedlineTracker';
import { PermitSummary } from '../components/permits/PermitSummary';
import { RiskScore } from '../components/permits/RiskScore';
import { InspectorInvite } from '../components/permits/InspectorInvite';
import { useDemoMode } from '../contexts/DemoModeContext';
import { UserPlusIcon } from '@heroicons/react/24/outline';

export const PermitDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { isDemoMode, mockData } = useDemoMode();
  const [showInviteModal, setShowInviteModal] = useState(false);

  // In a real app, this would be fetched from an API
  const permit = isDemoMode
    ? mockData.permits.find((p: any) => p.id === id)
    : {
        // Add real API call here
        id,
        status: 'ai_review',
        projectName: 'Sample Project',
        submitter: 'John Doe',
        submitDate: '2024-03-15',
        riskLevel: 'medium',
        riskConfidence: 85,
        riskDetails: 'Sample risk details',
        versions: [],
        redlineIssues: [],
        blockchainInfo: {
          txHash: '0x1234...5678',
          timestamp: '2024-03-15T10:30:00Z',
        },
        statusHistory: [],
      };

  const handleInviteSubmit = async (email: string): Promise<void> => {
    // In a real app, this would call an API
    console.log('Sending invite to:', email);
    await new Promise((resolve) => setTimeout(resolve, 1000));
  };

  if (!permit) {
    return <div>Permit not found</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{permit.projectName}</h1>
            <p className="mt-1 text-sm text-gray-500">Permit ID: {permit.id}</p>
          </div>
          <div className="flex items-center space-x-4">
            <RiskScore
              level={permit.riskLevel}
              confidence={permit.riskConfidence}
              details={permit.riskDetails}
            />
            <button
              onClick={() => setShowInviteModal(true)}
              className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            >
              <UserPlusIcon className="mr-2 h-5 w-5" />
              Invite Contractor
            </button>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <PermitTimeline currentStatus={permit.status} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <DocumentVersioning
                  versions={permit.versions}
                  onVersionSelect={(version) => console.log('Selected version:', version)}
                />
              </div>
            </div>

            <div className="bg-white shadow sm:rounded-lg">
              <div className="px-4 py-5 sm:p-6">
                <RedlineTracker
                  issues={permit.redlineIssues}
                  onStatusChange={(issueId, newStatus) =>
                    console.log('Status changed:', issueId, newStatus)
                  }
                />
              </div>
            </div>
          </div>

          <div className="bg-white shadow sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <PermitSummary
                metadata={{
                  id: permit.id,
                  projectName: permit.projectName,
                  submitter: permit.submitter,
                  submitDate: permit.submitDate,
                  status: permit.status,
                }}
                aiAnalysis={{
                  confidence: permit.riskConfidence,
                  riskLevel: permit.riskLevel,
                  summary: permit.riskDetails,
                }}
                blockchainInfo={permit.blockchainInfo}
                statusHistory={permit.statusHistory}
              />
            </div>
          </div>
        </div>
      </div>

      {showInviteModal && (
        <InspectorInvite
          onClose={() => setShowInviteModal(false)}
          onSubmit={handleInviteSubmit}
        />
      )}
    </div>
  );
}; 