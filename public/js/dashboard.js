// NFPA Permit System Dashboard - JavaScript
class NFPADashboard {
    constructor() {
        this.currentSection = 'overview';
        this.charts = {};
        this.initializeEventListeners();
        this.initializeCharts();
        this.startRealTimeUpdates();
    }

    initializeEventListeners() {
        // Navigation buttons
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const section = e.target.getAttribute('data-section') || e.target.closest('.nav-btn').getAttribute('data-section');
                this.showSection(section);
            });
        });

        // Modal close
        window.addEventListener('click', (e) => {
            const modal = document.getElementById('demo-modal');
            if (e.target === modal) {
                this.closeModal();
            }
        });

        // Permit upload form
        const permitForm = document.getElementById('permit-upload-form');
        if (permitForm) {
            permitForm.addEventListener('submit', this.handlePermitUpload.bind(this));
        }

        // Closeout upload form
        const closeoutForm = document.getElementById('closeout-upload-form');
        if (closeoutForm) {
            closeoutForm.addEventListener('submit', this.handleCloseoutUpload.bind(this));
        }
    }

    showSection(sectionName) {
        console.log('Switching to section:', sectionName); // Debug log
        
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        // Show selected section
        const targetSection = document.getElementById(sectionName);
        if (targetSection) {
            targetSection.classList.add('active');
            console.log('Section found and activated:', sectionName);
        } else {
            console.error('Section not found:', sectionName);
        }

        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`[data-section="${sectionName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        this.currentSection = sectionName;

        // Refresh charts if needed
        if (sectionName === 'analysis' && this.charts.nfpaAnalysisChart) {
            setTimeout(() => this.charts.nfpaAnalysisChart.resize(), 100);
        }
    }

    initializeCharts() {
        this.initComplianceChart();
        this.initProcessingChart();
        this.initNFPAAnalysisChart();
    }

    initComplianceChart() {
        const ctx = document.getElementById('complianceChart').getContext('2d');
        this.charts.complianceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'],
                datasets: [{
                    label: 'NFPA 13 Compliance',
                    data: [85, 87, 89, 90, 91],
                    borderColor: '#27ae60',
                    backgroundColor: 'rgba(39, 174, 96, 0.1)',
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'NFPA 72 Compliance',
                    data: [82, 84, 86, 88, 89],
                    borderColor: '#f39c12',
                    backgroundColor: 'rgba(243, 156, 18, 0.1)',
                    fill: true,
                    tension: 0.4
                }, {
                    label: 'NFPA 101 Compliance',
                    data: [78, 80, 82, 84, 85],
                    borderColor: '#3498db',
                    backgroundColor: 'rgba(52, 152, 219, 0.1)',
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                    },
                    title: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: false,
                        min: 70,
                        max: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                }
            }
        });
    }

    initProcessingChart() {
        const ctx = document.getElementById('processingChart').getContext('2d');
        this.charts.processingChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['Commercial', 'Industrial', 'Healthcare', 'Retail', 'Technology', 'Transportation'],
                datasets: [{
                    label: 'Processing Time (Days)',
                    data: [12, 18, 15, 8, 14, 22],
                    backgroundColor: [
                        'rgba(52, 152, 219, 0.8)',
                        'rgba(231, 76, 60, 0.8)',
                        'rgba(39, 174, 96, 0.8)',
                        'rgba(243, 156, 18, 0.8)',
                        'rgba(155, 89, 182, 0.8)',
                        'rgba(52, 73, 94, 0.8)'
                    ],
                    borderColor: [
                        '#3498db',
                        '#e74c3c',
                        '#27ae60',
                        '#f39c12',
                        '#9b59b6',
                        '#34495e'
                    ],
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: false
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return value + ' days';
                            }
                        }
                    }
                }
            }
        });
    }

    initNFPAAnalysisChart() {
        const ctx = document.getElementById('nfpaAnalysisChart').getContext('2d');
        this.charts.nfpaAnalysisChart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: [
                    'NFPA 1 - Fire Code',
                    'NFPA 13 - Sprinklers',
                    'NFPA 72 - Fire Alarms',
                    'NFPA 101 - Life Safety',
                    'NFPA 30 - Flammable Liquids',
                    'NFPA 110 - Emergency Power',
                    'NFPA 96 - Commercial Cooking',
                    'NFPA 80 - Fire Doors'
                ],
                datasets: [{
                    label: 'Current Compliance %',
                    data: [42, 91, 89, 85, 95, 92, 88, 94],
                    fill: true,
                    backgroundColor: 'rgba(52, 152, 219, 0.2)',
                    borderColor: '#3498db',
                    pointBackgroundColor: '#3498db',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#3498db'
                }, {
                    label: 'Target Compliance %',
                    data: [95, 95, 95, 95, 95, 95, 95, 95],
                    fill: false,
                    backgroundColor: 'rgba(39, 174, 96, 0.2)',
                    borderColor: '#27ae60',
                    pointBackgroundColor: '#27ae60',
                    pointBorderColor: '#fff',
                    pointHoverBackgroundColor: '#fff',
                    pointHoverBorderColor: '#27ae60',
                    borderDash: [5, 5]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                elements: {
                    line: {
                        borderWidth: 3
                    }
                },
                scales: {
                    r: {
                        angleLines: {
                            display: true
                        },
                        suggestedMin: 0,
                        suggestedMax: 100,
                        ticks: {
                            callback: function(value) {
                                return value + '%';
                            }
                        }
                    }
                },
                plugins: {
                    legend: {
                        position: 'top',
                    }
                }
            }
        });
    }

    startRealTimeUpdates() {
        // Simulate real-time data updates
        setInterval(() => {
            this.updateMetrics();
            this.updateAnalysisFeed();
        }, 30000); // Update every 30 seconds

        // Animate compliance bars on page load
        setTimeout(() => {
            this.animateComplianceBars();
        }, 1000);
    }

    updateMetrics() {
        // Simulate metric updates
        const metrics = document.querySelectorAll('.metric-number');
        metrics.forEach(metric => {
            const currentValue = parseInt(metric.textContent.replace(/[^0-9]/g, ''));
            const variation = Math.floor(Math.random() * 5) - 2; // -2 to +2
            const newValue = Math.max(0, currentValue + variation);
            
            if (metric.textContent.includes(')) {
                metric.textContent = ' + newValue.toLocaleString() + 'M';
            } else if (metric.textContent.includes('%')) {
                metric.textContent = Math.min(100, newValue) + '%';
            } else {
                metric.textContent = newValue;
            }
        });
    }

    updateAnalysisFeed() {
        const feed = document.getElementById('analysis-feed-content');
        const newItems = [
            {
                icon: 'fas fa-exclamation-triangle text-warning',
                content: 'New critical issue detected in permit DEMO_007 - NFPA 13 coverage gap identified',
                time: 'Just now'
            },
            {
                icon: 'fas fa-check-circle text-success',
                content: 'Inspection completed for DEMO_001 - All NFPA 72 requirements satisfied',
                time: '3 mins ago'
            },
            {
                icon: 'fas fa-lightbulb text-info',
                content: 'AI recommendation: Batch process similar permits to improve efficiency by 25%',
                time: '5 mins ago'
            }
        ];

        // Add new item at the top
        const randomItem = newItems[Math.floor(Math.random() * newItems.length)];
        const newFeedItem = this.createFeedItem(randomItem);
        feed.insertBefore(newFeedItem, feed.firstChild);

        // Remove old items (keep only 5)
        while (feed.children.length > 5) {
            feed.removeChild(feed.lastChild);
        }
    }

    createFeedItem(item) {
        const feedItem = document.createElement('div');
        feedItem.className = 'feed-item';
        feedItem.innerHTML = `
            <div class="feed-time">${item.time}</div>
            <div class="feed-content">
                <i class="${item.icon}"></i>
                ${item.content}
            </div>
        `;
        return feedItem;
    }

    animateComplianceBars() {
        const complianceFills = document.querySelectorAll('.compliance-fill');
        complianceFills.forEach(fill => {
            const targetWidth = fill.style.width;
            fill.style.width = '0%';
            setTimeout(() => {
                fill.style.transition = 'width 1.5s ease-out';
                fill.style.width = targetWidth;
            }, 100);
        });
    }

    closeModal() {
        document.getElementById('demo-modal').style.display = 'none';
    }

    // Handle new permit upload
    async handlePermitUpload(e) {
        e.preventDefault();
        
        const formData = new FormData();
        const projectName = document.getElementById('project-name').value;
        const applicantOrg = document.getElementById('applicant-org').value;
        const projectType = document.getElementById('project-type').value;
        const projectCost = document.getElementById('project-cost').value;
        const files = document.getElementById('permit-files').files;
        
        // Get selected NFPA codes
        const nfpaCodes = Array.from(document.querySelectorAll('input[type="checkbox"]:checked'))
            .map(cb => cb.value);

        const permitData = {
            applicantInfo: {
                id: 'APP_' + Date.now(),
                name: applicantOrg,
                email: 'demo@' + applicantOrg.toLowerCase().replace(/\s+/g, '') + '.com',
                phone: '(555) 123-4567'
            },
            projectDetails: {
                name: projectName,
                type: projectType,
                cost: parseInt(projectCost),
                nfpa_codes: nfpaCodes,
                description: `${projectType} project: ${projectName}`
            }
        };

        // Add files to form data
        for (let i = 0; i < files.length; i++) {
            formData.append('documents', files[i]);
        }
        formData.append('permitData', JSON.stringify(permitData));

        try {
            const response = await fetch('/api/permits', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(permitData)
            });

            const result = await response.json();
            
            if (result.success) {
                alert(`✅ Permit application submitted successfully!\n\nPermit ID: ${result.data.id || 'DEMO_' + Date.now()}\nStatus: Under Review\n\nYou can now view it in the Active Permits tab.`);
                
                // Reset form
                document.getElementById('permit-upload-form').reset();
                
                // Refresh permits data
                this.refreshPermitsData();
            } else {
                alert('❌ Error submitting permit: ' + result.error);
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('❌ Error submitting permit application');
        }
    }

    // Handle closeout document upload
    async handleCloseoutUpload(e) {
        e.preventDefault();
        
        const permitId = document.getElementById('closeout-permit-id').value;
        const uploadedBy = document.getElementById('uploaded-by').value;
        const formData = new FormData();

        // Add files
        const acceptanceCard = document.querySelector('input[name="acceptance_card"]').files[0];
        const asBuilt = document.querySelector('input[name="as_built"]').files[0];

        if (acceptanceCard) formData.append('acceptance_card', acceptanceCard);
        if (asBuilt) formData.append('as_built', asBuilt);
        formData.append('uploadedBy', uploadedBy);

        try {
            const response = await fetch(`/api/permits/${permitId}/closeout/documents`, {
                method: 'POST',
                body: formData
            });

            const result = await response.json();
            
            if (result.success) {
                alert(`✅ Closeout documents uploaded successfully!\n\nPermit: ${permitId}\nDocuments: ${result.data.uploads.length} files processed\n\nCheck the Active Permits tab to see updated status.`);
                
                // Reset form
                document.getElementById('closeout-upload-form').reset();
                
                // Refresh permits data
                this.refreshPermitsData();
            } else {
                alert('❌ Error uploading documents: ' + result.error);
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('❌ Error uploading closeout documents');
        }
    }

    // Refresh permits data
    async refreshPermitsData() {
        try {
            const response = await fetch('/api/permits');
            const result = await response.json();
            
            if (result.success) {
                // Update permits table if on permits tab
                this.updatePermitsTable(result.data);
            }
        } catch (error) {
            console.error('Error refreshing permits:', error);
        }
    }

    // Update permits table
    updatePermitsTable(permits) {
        const tbody = document.getElementById('permits-tbody');
        if (!tbody) return;

        tbody.innerHTML = permits.map(permit => `
            <tr>
                <td><strong>${permit.id}</strong></td>
                <td>${permit.name}</td>
                <td>${permit.applicant}</td>
                <td>
                    <div class="nfpa-codes">
                        ${permit.nfpa_codes.slice(0, 3).map(code => 
                            `<span class="nfpa-badge">${code}</span>`
                        ).join('')}
                        ${permit.nfpa_codes.length > 3 ? `<span class="nfpa-badge">+${permit.nfpa_codes.length - 3} more</span>` : ''}
                    </div>
                </td>
                <td>
                    <div class="compliance-bar">
                        <div class="compliance-fill" style="width: ${permit.compliance}%"></div>
                        <span class="compliance-text">${permit.compliance}%</span>
                    </div>
                </td>
                <td><span class="status ${permit.status.toLowerCase()}">${permit.status}</span></td>
                <td>${permit.cost.toLocaleString()}</td>
                <td>
                    <button class="btn-action" onclick="viewPermitDetails('${permit.id}')">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn-action" onclick="analyzeNFPA('${permit.id}')">
                        <i class="fas fa-chart-bar"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }
}

// Global functions for button actions
async function simulateCloseoutStep(step) {
    const permitId = document.getElementById('demo-permit-select').value;
    
    try {
        const response = await fetch(`/api/demo/simulate-closeout/${permitId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ step })
        });

        const result = await response.json();
        
        if (result.success) {
            alert(`✅ ${result.data.message}\n\nPermit: ${permitId}\nStep: ${step}\nStatus: ${result.data.status || 'Updated'}`);
        } else {
            alert('❌ Simulation error: ' + result.error);
        }
    } catch (error) {
        console.error('Simulation error:', error);
        alert('❌ Error running closeout simulation');
    }
}
function runPOCDemo() {
    const modal = document.getElementById('demo-modal');
    const output = document.getElementById('demo-output');
    
    modal.style.display = 'block';
    output.textContent = 'Running comprehensive NFPA POC demonstration...\n\n';
    
    // Simulate running the Node.js demo
    const demoSteps = [
        '🚀 NFPA PERMIT SYSTEM - COMPREHENSIVE POC DEMONSTRATION',
        '================================================================================',
        '📅 Demo Date: ' + new Date().toLocaleDateString(),
        '🏛️ Simulating: Multi-jurisdictional government deployment\n',
        
        '🔧 INITIALIZING NFPA PERMIT SYSTEM',
        '--------------------------------------------------',
        '✅ Loading comprehensive NFPA code database...',
        '   📚 44 NFPA requirements loaded',
        '✅ Initializing AI analysis engine...',
        '✅ Connecting to blockchain network...',
        '✅ Setting up multi-jurisdiction support...',
        '✅ Configuring automated workflows...\n',
        
        '🎯 SYSTEM CAPABILITIES:',
        '   • Real-time NFPA code compliance analysis',
        '   • AI-powered permit recommendations',
        '   • Automated inspection scheduling',
        '   • Blockchain-based audit trails',
        '   • Multi-organization endorsement',
        '   • Predictive compliance scoring\n',
        
        '🏗️ ANALYZING PROJECT: Downtown Office Complex Fire Safety Upgrade',
        '--------------------------------------------------',
        '📍 Location: 1250 Corporate Plaza Drive, Metro City',
        '🏢 Type: commercial_renovation',
        '👤 Applicant: Metro Fire Protection Systems Inc.',
        '💰 Estimated Cost: $1,250,000',
        '⏱️ Timeline: 8 months\n',
        
        '🔍 NFPA CODE ANALYSIS:',
        '   📋 NFPA 1: 42% compliant',
        '      Requirements: 2',
        '      Issues: 1 critical, 1 warnings',
        '   📋 NFPA 13: 91% compliant',
        '      Requirements: 6',
        '      Issues: 0 critical, 1 warnings',
        '   📋 NFPA 72: 89% compliant',
        '      Requirements: 4',
        '      Issues: 0 critical, 1 warnings',
        '   📋 NFPA 101: 85% compliant',
        '      Requirements: 4',
        '      Issues: 0 critical, 1 warnings\n',
        
        '📊 OVERALL COMPLIANCE: 76.8%\n',
        
        '🎯 PERMIT RECOMMENDATION: CONDITIONAL APPROVAL',
        '💰 Permit Fee: $1,500',
        '📅 Processing Time: 10-14 business days\n',
        
        '📋 CONDITIONS:',
        '   1. Submit revised plans addressing NFPA 1 compliance gaps',
        '   2. Provide detailed egress calculations\n',
        
        '🔍 REQUIRED INSPECTIONS:',
        '   1. NFPA 13 Rough-In Inspection',
        '      Inspector: Fire Marshal Patricia Thompson',
        '   2. NFPA 72 Rough-In Inspection',
        '      Inspector: Fire Marshal Patricia Thompson',
        '   3. Final Fire Safety Inspection',
        '      Inspector: Lead Fire Marshal\n',
        
        '🤖 AI INSIGHTS:',
        '   1. ⚠️ Focus on NFPA 1 compliance - most common gap in commercial projects',
        '   2. 💡 Consider integrated fire alarm/security system for cost savings',
        '   3. 📅 Schedule pre-submission consultation to reduce revision cycles\n',
        
        '⛓️ BLOCKCHAIN VERIFICATION:',
        '🔐 MULTI-ORGANIZATION ENDORSEMENT:',
        '   ✅ City Fire Department: Approved',
        '   ✅ State Fire Marshal: Approved',
        '   ✅ Building Department: Approved',
        '   ✅ Environmental Agency: Approved\n',
        
        '📝 IMMUTABLE AUDIT TRAIL:',
        '   📄 Permit ID: PERMIT_' + Date.now(),
        '   🔗 Block Hash: 0x' + Math.random().toString(16).substr(2, 16),
        '   ⏰ Timestamp: ' + new Date().toISOString(),
        '   👤 Digital signature verified\n',
        
        '🎉 DEMONSTRATION COMPLETED SUCCESSFULLY!',
        '📊 All NFPA requirements analyzed',
        '🏛️ System ready for government deployment',
        
        '\n🏆 READY FOR PRODUCTION:',
        '   • Federal agencies (GSA, DOD, etc.)',
        '   • State fire marshal offices', 
        '   • Municipal fire departments',
        '   • Private sector contractors'
    ];
    
    let stepIndex = 0;
    const interval = setInterval(() => {
        if (stepIndex < demoSteps.length) {
            output.textContent += demoSteps[stepIndex] + '\n';
            output.scrollTop = output.scrollHeight;
            stepIndex++;
        } else {
            clearInterval(interval);
        }
    }, 150);
}

function viewPermitDetails(permitId) {
    alert(`Viewing detailed analysis for permit ${permitId}\n\nThis would open a comprehensive view showing:\n• Complete NFPA code analysis\n• Compliance scoring details\n• AI recommendations\n• Inspection history\n• Document attachments\n• Blockchain verification`);
}

function analyzeNFPA(permitId) {
    alert(`Running detailed NFPA analysis for permit ${permitId}\n\nThis would perform:\n• Real-time code compliance checking\n• Cross-reference with latest NFPA standards\n• Generate detailed compliance report\n• Identify specific non-conformities\n• Provide remediation recommendations`);
}

function closeModal() {
    document.getElementById('demo-modal').style.display = 'none';
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', function() {
    window.nfpaDashboard = new NFPADashboard();
    
    // Add some dynamic content updates
    setTimeout(() => {
        const statusIndicator = document.querySelector('.real-time-indicator');
        statusIndicator.innerHTML = '<i class="fas fa-circle pulse"></i> Live Data - Last Updated: ' + new Date().toLocaleTimeString();
    }, 2000);
    
    // Simulate permit processing updates
    setInterval(() => {
        const processingCounts = document.querySelectorAll('.metric-number');
        if (processingCounts.length > 0) {
            // Small random variations to show live updates
            processingCounts[0].textContent = Math.floor(Math.random() * 3) + 5; // 5-7 active permits
        }
    }, 45000);
});

// Add keyboard shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + number keys for quick navigation
    if ((e.ctrlKey || e.metaKey) && e.key >= '1' && e.key <= '6') {
        e.preventDefault();
        const sections = ['overview', 'permits', 'analysis', 'blockchain', 'inspections', 'ai-insights'];
        const sectionIndex = parseInt(e.key) - 1;
        if (sections[sectionIndex]) {
            window.nfpaDashboard.showSection(sections[sectionIndex]);
        }
    }
    
    // Escape key to close modal
    if (e.key === 'Escape') {
        closeModal();
    }
    
    // F5 to run demo (prevent default refresh)
    if (e.key === 'F5') {
        e.preventDefault();
        runPOCDemo();
    }
});

// Add touch/swipe support for mobile
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', function(e) {
    touchStartX = e.changedTouches[0].screenX;
});

document.addEventListener('touchend', function(e) {
    touchEndX = e.changedTouches[0].screenX;
    handleSwipe();
});

function handleSwipe() {
    const swipeThreshold = 50;
    const sections = ['overview', 'permits', 'analysis', 'blockchain', 'inspections', 'ai-insights'];
    const currentIndex = sections.indexOf(window.nfpaDashboard.currentSection);
    
    if (touchEndX < touchStartX - swipeThreshold && currentIndex < sections.length - 1) {
        // Swipe left - next section
        window.nfpaDashboard.showSection(sections[currentIndex + 1]);
    }
    
    if (touchEndX > touchStartX + swipeThreshold && currentIndex > 0) {
        // Swipe right - previous section  
        window.nfpaDashboard.showSection(sections[currentIndex - 1]);
    }
}
// Add missing global functions
window.simulateCloseoutStep = simulateCloseoutStep;
window.runPOCDemo = runPOCDemo;
window.viewPermitDetails = viewPermitDetails;
window.analyzeNFPA = analyzeNFPA;
window.closeModal = closeModal;

// Ensure DOM is loaded before initializing
document.addEventListener('DOMContentLoaded', function() {
    if (!window.nfpaDashboard) {
        window.nfpaDashboard = new NFPADashboard();
    }
});
