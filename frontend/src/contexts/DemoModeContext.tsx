import React, { createContext, useContext, useState, useEffect } from 'react';

interface DemoModeContextType {
  isDemoMode: boolean;
  toggleDemoMode: () => void;
  mockData: any;
}

const DemoModeContext = createContext<DemoModeContextType | undefined>(undefined);

// Mock data for demo mode
const mockPermitData = {
  permits: [
    {
      id: 'PERM-001',
      projectName: 'Downtown Office Complex',
      status: 'ai_review',
      submitDate: '2024-03-15',
      submitter: 'John Smith',
      riskLevel: 'medium',
      riskConfidence: 85,
      riskDetails: 'Flagged by AI for critical survivability gap on page 3',
      versions: [
        {
          id: 'v1',
          version: 1,
          uploadDate: '2024-03-15',
          submittedBy: 'John Smith',
          changes: {
            pagesAdded: 2,
            redlinesDetected: true,
            newIssues: 3,
          },
        },
      ],
      redlineIssues: [
        {
          id: 'RL-001',
          page: 3,
          description: 'Critical survivability gap in fire escape route',
          status: 'new_flag',
          previousVersion: 'Original route through main lobby',
          currentVersion: 'Alternative route through service corridor',
        },
      ],
      blockchainInfo: {
        txHash: '0x1234...5678',
        timestamp: '2024-03-15T10:30:00Z',
      },
      statusHistory: [
        {
          status: 'submitted',
          date: '2024-03-15T09:00:00Z',
          notes: 'Initial submission',
        },
        {
          status: 'ai_review',
          date: '2024-03-15T10:00:00Z',
          notes: 'AI analysis in progress',
        },
      ],
    },
    // Add more mock permits as needed
  ],
};

export const DemoModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [mockData, setMockData] = useState(mockPermitData);

  // Check for demo mode in URL parameters
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const demoParam = params.get('demo');
    if (demoParam === 'true') {
      setIsDemoMode(true);
    }
  }, []);

  const toggleDemoMode = () => {
    setIsDemoMode(!isDemoMode);
    // Update URL parameter
    const url = new URL(window.location.href);
    if (!isDemoMode) {
      url.searchParams.set('demo', 'true');
    } else {
      url.searchParams.delete('demo');
    }
    window.history.pushState({}, '', url.toString());
  };

  return (
    <DemoModeContext.Provider value={{ isDemoMode, toggleDemoMode, mockData }}>
      {children}
    </DemoModeContext.Provider>
  );
};

export const useDemoMode = () => {
  const context = useContext(DemoModeContext);
  if (context === undefined) {
    throw new Error('useDemoMode must be used within a DemoModeProvider');
  }
  return context;
}; 