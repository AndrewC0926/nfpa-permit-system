import React from 'react';
// import { Doughnut } from 'react-chartjs-2'; // Uncomment if Chart.js is set up

export default function CityMetrics() {
  // Dummy data for now
  const stats = {
    today: 12,
    week: 54,
    autoApproval: 82,
    avgReview: '2.3h',
  };
  // const chartData = { ... } // Add chart data if Chart.js is set up
  return (
    <aside className="bg-[#181f2a] rounded-xl shadow-lg p-6 mb-8 animate-fade-in-up">
      <h3 className="text-cyan-400 font-semibold mb-4">City Metrics</h3>
      <div className="space-y-2">
        <div className="flex justify-between text-slate-300"><span>Permits Today</span><span>{stats.today}</span></div>
        <div className="flex justify-between text-slate-300"><span>This Week</span><span>{stats.week}</span></div>
        <div className="flex justify-between text-slate-300"><span>AI Auto-Approval</span><span>{stats.autoApproval}%</span></div>
        <div className="flex justify-between text-slate-300"><span>Avg. Review Time</span><span>{stats.avgReview}</span></div>
      </div>
      {/* <Doughnut data={chartData} /> */}
    </aside>
  );
} 