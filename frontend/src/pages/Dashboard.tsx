import React, { useEffect, useState } from 'react';
import PermitTable from '../components/PermitTable';
import CityMetrics from '../components/CityMetrics';
import { useAuth } from '../contexts/AuthContext';

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<any>(null);
  const [demoMode, setDemoMode] = useState(false);

  useEffect(() => {
    fetch('/api/user/summary').then(r => r.json()).then(setSummary).catch(() => {});
    setDemoMode(sessionStorage.getItem('vetria-demo') === 'true');
  }, []);

  let header = '';
  if (user?.role === 'inspector') {
    header = `Welcome back, ${user.firstName || user.email || 'Inspector'}`;
  } else if (user?.role === 'contractor' && summary?.recentPermit) {
    header = `Your most recent permit was approved ${summary.recentPermit.approvedDaysAgo} days ago`;
  } else if (user?.firstName) {
    header = `Welcome, ${user.firstName}`;
  }

  return (
    <div className="flex flex-col md:flex-row gap-8 w-full min-h-screen bg-gradient-to-br from-[#0a192f] to-[#1a2233] text-white font-inter animate-fade-in">
      <div className="flex-1">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">{header}</h2>
        </div>
        <PermitTable inspector={user?.role === 'inspector'} demoMode={demoMode} />
      </div>
      <div className="w-full md:w-80">
        <CityMetrics />
      </div>
    </div>
  );
} 