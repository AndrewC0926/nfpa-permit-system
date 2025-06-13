import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { MagnifyingGlassIcon, CheckCircleIcon, XCircleIcon, ExclamationCircleIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

const statusColors = {
  Pending: 'bg-yellow-500',
  'In Review': 'bg-blue-500',
  Redlined: 'bg-red-500',
  Approved: 'bg-green-500',
  Rejected: 'bg-gray-500',
};

export default function PermitTable({ inspector, demoMode }: { inspector?: boolean, demoMode?: boolean }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  // Demo data
  const mockData = [
    {
      id: 'P-1001', projectName: 'City Hall Fire Alarm', submittedBy: 'Alice Smith', submissionDate: new Date().toISOString(), aiValidation: 'pass', status: 'Approved', blockchainTx: '0xabc12345',
    },
    {
      id: 'P-1002', projectName: 'Sunset Apartments Sprinkler', submittedBy: 'Bob Lee', submissionDate: new Date(Date.now() - 86400000).toISOString(), aiValidation: 'flagged', status: 'Redlined', blockchainTx: '0xdef67890',
    },
    {
      id: 'P-1003', projectName: 'Central Library Inspection', submittedBy: 'Carol Danvers', submissionDate: new Date(Date.now() - 2*86400000).toISOString(), aiValidation: 'fail', status: 'Pending', blockchainTx: '',
    },
  ];

  const { data, isLoading } = useQuery({
    queryKey: ['permits', search, status, demoMode],
    queryFn: async () => {
      if (demoMode) return mockData;
      const params = new URLSearchParams();
      if (search) params.append('q', search);
      if (status) params.append('status', status);
      const res = await fetch(`/api/permits?${params.toString()}`);
      return res.json();
    },
    refetchInterval: 15000,
  });

  return (
    <div className="bg-[#181f2a] rounded-xl shadow-lg p-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
        <div className="flex-1 flex items-center gap-2 bg-[#232b3a] rounded-full px-3 py-2">
          <MagnifyingGlassIcon className="h-5 w-5 text-cyan-400" />
          <input
            className="bg-transparent outline-none text-white flex-1"
            placeholder="Search by permit ID, submitter, or address..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <select
          className="bg-[#232b3a] text-white rounded-full px-4 py-2 outline-none border border-slate-700"
          value={status}
          onChange={e => setStatus(e.target.value)}
        >
          <option value="">All Statuses</option>
          <option>Pending</option>
          <option>In Review</option>
          <option>Redlined</option>
          <option>Approved</option>
          <option>Rejected</option>
        </select>
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="text-cyan-300 border-b border-slate-700">
              <th className="py-2 px-3">Permit ID</th>
              <th className="py-2 px-3">Project Name</th>
              <th className="py-2 px-3">Submitted By</th>
              <th className="py-2 px-3">Submission Date</th>
              <th className="py-2 px-3">AI Validation</th>
              <th className="py-2 px-3">Status</th>
              <th className="py-2 px-3">Blockchain TX</th>
              {inspector && <th className="py-2 px-3">Actions</th>}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={8} className="text-center py-8 text-slate-400">Loading...</td></tr>
            ) : data?.length ? (
              data.map((permit: any) => (
                <tr key={permit.id} className="border-b border-slate-800 hover:bg-[#232b3a] transition">
                  <td className="py-2 px-3 font-mono">{permit.id}</td>
                  <td className="py-2 px-3">{permit.projectName}</td>
                  <td className="py-2 px-3">{permit.submittedBy}</td>
                  <td className="py-2 px-3">{new Date(permit.submissionDate).toLocaleDateString()}</td>
                  <td className="py-2 px-3">
                    {permit.aiValidation === 'pass' && <CheckCircleIcon className="h-5 w-5 text-green-400 inline" />}
                    {permit.aiValidation === 'fail' && <XCircleIcon className="h-5 w-5 text-red-400 inline" />}
                    {permit.aiValidation === 'flagged' && <ExclamationCircleIcon className="h-5 w-5 text-yellow-400 inline" />}
                  </td>
                  <td className="py-2 px-3">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[permit.status as keyof typeof statusColors] || 'bg-slate-600'}`}>
                      {permit.status}
                      {permit.status === 'Approved' && permit.blockchainTx && (
                        <a
                          href={`/audit?tx=${permit.blockchainTx}`}
                          className="inline-flex items-center ml-2 text-green-400 hover:text-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 rounded-full p-1 transition"
                          title="Verified on Blockchain"
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ touchAction: 'manipulation' }}
                        >
                          <ShieldCheckIcon className="h-5 w-5" />
                        </a>
                      )}
                    </span>
                  </td>
                  <td className="py-2 px-3">
                    <a href={`/audit?tx=${permit.blockchainTx}`} className="text-cyan-400 underline font-mono" target="_blank" rel="noopener noreferrer">{permit.blockchainTx?.slice(0, 8)}...</a>
                  </td>
                  {inspector && (
                    <td className="py-2 px-3 flex gap-2">
                      {permit.status === 'Pending' && <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-full text-xs">Approve</button>}
                      {permit.status === 'Pending' && <button className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded-full text-xs">Request Changes</button>}
                    </td>
                  )}
                </tr>
              ))
            ) : (
              <tr><td colSpan={8} className="text-center py-8 text-slate-400">No permits found.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
} 