import React, { useState, useEffect } from 'react';
import './ExecutiveDashboard.css';

const ExecutiveDashboard = () => {
    const [dashboardData, setDashboardData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedTimeframe, setSelectedTimeframe] = useState('30days');

    useEffect(() => {
        fetchDashboardData();
        const interval = setInterval(fetchDashboardData, 30000); // Update every 30 seconds
        return () => clearInterval(interval);
    }, [selectedTimeframe]);

    const fetchDashboardData = async () => {
        try {
            const response = await fetch(`/api/dashboard/executive?timeframe=${selectedTimeframe}`);
            const data = await response.json();
            setDashboardData(data);
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch dashboard data:', error);
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="dashboard-loading">
                <div className="loading-spinner"></div>
                <p>Loading executive dashboard...</p>
            </div>
        );
    }

    return (
        <div className="executive-dashboard">
            <header className="dashboard-header">
                <h1>🏛️ NFPA Permit System - Executive Dashboard</h1>
                <div className="header-stats">
                    <div className="stat-card">
                        <h3>System Status</h3>
                        <p className="status-active">🟢 Operational</p>
                    </div>
                    <div className="stat-card">
                        <h3>Last Updated</h3>
                        <p>{new Date().toLocaleTimeString()}</p>
                    </div>
                </div>
            </header>

            <div className="timeframe-selector">
                <button 
                    className={selectedTimeframe === '7days' ? 'active' : ''}
                    onClick={() => setSelectedTimeframe('7days')}
                >
                    7 Days
                </button>
                <button 
                    className={selectedTimeframe === '30days' ? 'active' : ''}
                    onClick={() => setSelectedTimeframe('30days')}
                >
                    30 Days
                </button>
                <button 
                    className={selectedTimeframe === '90days' ? 'active' : ''}
                    onClick={() => setSelectedTimeframe('90days')}
                >
                    90 Days
                </button>
                <button 
                    className={selectedTimeframe === '1year' ? 'active' : ''}
                    onClick={() => setSelectedTimeframe('1year')}
                >
                    1 Year
                </button>
            </div>

            <div className="dashboard-grid">
                {/* Key Performance Indicators */}
                <div className="dashboard-section kpi-section">
                    <h2>📊 Key Performance Indicators</h2>
                    <div className="kpi-grid">
                        <div className="kpi-card">
                            <h3>Total Permits</h3>
                            <div className="kpi-value">{dashboardData?.permits?.total || 156}</div>
                            <div className="kpi-trend positive">+12% vs last period</div>
                        </div>
                        <div className="kpi-card">
                            <h3>Avg Processing Time</h3>
                            <div className="kpi-value">{dashboardData?.performance?.avgDays || 4.2} days</div>
                            <div className="kpi-trend positive">-8% improvement</div>
                        </div>
                        <div className="kpi-card">
                            <h3>Revenue Generated</h3>
                            <div className="kpi-value">${dashboardData?.revenue?.total || 45680}</div>
                            <div className="kpi-trend positive">+15% increase</div>
                        </div>
                        <div className="kpi-card">
                            <h3>Compliance Rate</h3>
                            <div className="kpi-value">{dashboardData?.compliance?.rate || 94}%</div>
                            <div className="kpi-trend positive">+2% improvement</div>
                        </div>
                    </div>
                </div>

                {/* Permit Status Overview */}
                <div className="dashboard-section status-section">
                    <h2>📋 Permit Status Overview</h2>
                    <div className="status-chart">
                        <div className="status-item">
                            <div className="status-color submitted"></div>
                            <span>Submitted: {dashboardData?.permits?.submitted || 23}</span>
                        </div>
                        <div className="status-item">
                            <div className="status-color under-review"></div>
                            <span>Under Review: {dashboardData?.permits?.underReview || 18}</span>
                        </div>
                        <div className="status-item">
                            <div className="status-color approved"></div>
                            <span>Approved: {dashboardData?.permits?.approved || 89}</span>
                        </div>
                        <div className="status-item">
                            <div className="status-color inspections"></div>
                            <span>Inspections: {dashboardData?.permits?.inspections || 15}</span>
                        </div>
                        <div className="status-item">
                            <div className="status-color completed"></div>
                            <span>Completed: {dashboardData?.permits?.completed || 11}</span>
                        </div>
                    </div>
                </div>

                {/* AI Insights */}
                <div className="dashboard-section ai-section">
                    <h2>🤖 AI-Powered Insights</h2>
                    <div className="ai-insights">
                        <div className="insight-card">
                            <h4>🔍 Predictive Analysis</h4>
                            <p>Expected 15% increase in permit volume next month based on seasonal trends</p>
                            <span className="confidence">85% confidence</span>
                        </div>
                        <div className="insight-card">
                            <h4>⚠️ Risk Assessment</h4>
                            <p>3 high-risk applications requiring senior inspector review</p>
                            <button className="insight-action">View Details</button>
                        </div>
                        <div className="insight-card">
                            <h4>⚡ Efficiency Opportunity</h4>
                            <p>Automate pre-screening for NFPA 25 inspections to save 2 days per permit</p>
                            <button className="insight-action">Implement</button>
                        </div>
                    </div>
                </div>

                {/* Inspector Workload */}
                <div className="dashboard-section workload-section">
                    <h2>👷 Inspector Workload</h2>
                    <div className="workload-grid">
                        <div className="inspector-card">
                            <h4>Inspector Johnson</h4>
                            <div className="workload-bar">
                                <div className="workload-fill" style={{width: '85%'}}></div>
                            </div>
                            <p>85% capacity - 12 active permits</p>
                        </div>
                        <div className="inspector-card">
                            <h4>Inspector Chen</h4>
                            <div className="workload-bar">
                                <div className="workload-fill" style={{width: '72%'}}></div>
                            </div>
                            <p>72% capacity - 9 active permits</p>
                        </div>
                        <div className="inspector-card">
                            <h4>Inspector Rodriguez</h4>
                            <div className="workload-bar">
                                <div className="workload-fill" style={{width: '94%'}}></div>
                            </div>
                            <p>94% capacity - 15 active permits</p>
                        </div>
                    </div>
                </div>

                {/* Recent Activity */}
                <div className="dashboard-section activity-section">
                    <h2>🕐 Recent Activity</h2>
                    <div className="activity-list">
                        <div className="activity-item">
                            <span className="activity-time">2 min ago</span>
                            <span className="activity-desc">NFPA-2024-156 approved by Inspector Johnson</span>
                        </div>
                        <div className="activity-item">
                            <span className="activity-time">15 min ago</span>
                            <span className="activity-desc">New NFPA 13 application submitted</span>
                        </div>
                        <div className="activity-item">
                            <span className="activity-time">1 hour ago</span>
                            <span className="activity-desc">AI flagged high-risk application for review</span>
                        </div>
                        <div className="activity-item">
                            <span className="activity-time">2 hours ago</span>
                            <span className="activity-desc">Inspection completed - NFPA-2024-142</span>
                        </div>
                    </div>
                </div>

                {/* Compliance & Audit */}
                <div className="dashboard-section compliance-section">
                    <h2>📑 Compliance & Audit Trail</h2>
                    <div className="compliance-stats">
                        <div className="compliance-item">
                            <h4>Blockchain Transactions</h4>
                            <p>1,247 immutable records</p>
                            <span className="status-ok">✅ All verified</span>
                        </div>
                        <div className="compliance-item">
                            <h4>Audit Readiness</h4>
                            <p>100% documentation complete</p>
                            <span className="status-ok">✅ Audit ready</span>
                        </div>
                        <div className="compliance-item">
                            <h4>Data Integrity</h4>
                            <p>Database sync: 99.9%</p>
                            <span className="status-ok">✅ Synchronized</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
                <h2>⚡ Quick Actions</h2>
                <div className="action-buttons">
                    <button className="action-btn primary">📊 Generate Report</button>
                    <button className="action-btn secondary">👥 Manage Inspectors</button>
                    <button className="action-btn secondary">⚙️ System Settings</button>
                    <button className="action-btn secondary">📤 Export Data</button>
                </div>
            </div>
        </div>
    );
};

export default ExecutiveDashboard;
