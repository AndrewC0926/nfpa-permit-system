# NFPA Permit System - Proof of Concept Demo Guide

## What This System Does

The NFPA Permit System is a blockchain-based, AI-enhanced permitting platform designed to streamline and secure the process of submitting, reviewing, and approving ERRCS (Emergency Responder Radio Coverage System) permits. The system provides:

1. **Secure Document Management**
   - Upload and store permit documents
   - Version control for document revisions
   - Secure access control based on user roles

2. **AI-Powered Compliance Checking**
   - Automatic analysis of submitted documents
   - NFPA 72 compliance verification
   - Redline suggestions for non-compliant items

3. **Blockchain-Based Audit Trail**
   - Immutable record of all permit actions
   - Transparent status tracking
   - Tamper-proof history of changes

4. **Streamlined Workflow**
   - Role-based access control
   - Automated notifications
   - Mobile-responsive interface

## System Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Frontend  │     │   Backend   │     │  Blockchain │
│  (Vercel)   │◄───►│   (AWS)     │◄───►│   (AWS)     │
└─────────────┘     └─────────────┘     └─────────────┘
                           ▲
                           │
                    ┌─────────────┐
                    │    AI/ML    │
                    │   (AWS)     │
                    └─────────────┘
```

## How to Demo the System

### Prerequisites

1. Docker and Docker Compose installed
2. Node.js 18+ installed
3. AWS CLI configured (for production deployment)
4. Vercel CLI installed (for frontend deployment)

### Local Demo Setup

1. **Clone the Repository**
   ```bash
   git clone https://github.com/your-org/nfpa-permit-system.git
   cd nfpa-permit-system
   ```

2. **Set Up Environment Variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

3. **Start the Demo Environment**
   ```bash
   ./scripts/demo-reset.sh
   ```

4. **Access the System**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3000
   - Blockchain Explorer: http://localhost:8080
   - Monitoring Dashboard: http://localhost:3000

### Demo User Accounts

1. **Inspector Account**
   - Email: inspector@city.gov
   - Password: Test@123
   - Role: INSPECTOR

2. **Contractor Account**
   - Email: contractor@example.com
   - Password: Test@123
   - Role: CONTRACTOR

### Demo Flow

1. **Submit a New Permit**
   - Log in as contractor
   - Click "New Permit"
   - Fill in permit details
   - Upload required documents
   - Submit for review

2. **Review and Analysis**
   - Log in as inspector
   - View submitted permit
   - Check AI analysis results
   - Review compliance issues

3. **Revision and Resubmission**
   - Log in as contractor
   - View inspector feedback
   - Upload revised documents
   - Resubmit for review

4. **Final Approval**
   - Log in as inspector
   - Review revised submission
   - Approve permit
   - View blockchain confirmation

5. **Audit Trail**
   - Export permit history
   - View blockchain transactions
   - Check document versions

### Production Deployment

1. **Frontend Deployment (Vercel)**
   ```bash
   cd frontend
   vercel deploy
   ```

2. **Backend Deployment (AWS)**
   ```bash
   cd backend
   ./scripts/deploy.sh
   ```

3. **Blockchain Network Setup**
   ```bash
   cd blockchain
   ./scripts/deploy-network.sh
   ```

## Security Features

1. **Authentication**
   - JWT-based authentication
   - Role-based access control
   - Rate limiting
   - 2FA support

2. **Data Protection**
   - End-to-end encryption
   - Secure document storage
   - Blockchain immutability
   - Regular backups

3. **Compliance**
   - NFPA 72 standards
   - City building codes
   - Data privacy regulations
   - Audit requirements

## Monitoring and Maintenance

1. **System Health**
   - Prometheus metrics
   - Grafana dashboards
   - Health check endpoints
   - Automated alerts

2. **Logging**
   - Centralized logging
   - Audit trail
   - Error tracking
   - Performance monitoring

3. **Backup and Recovery**
   - Daily backups
   - 30-day retention
   - Automated recovery
   - Disaster recovery plan

## Support and Contact

For technical support or questions:
- Email: support@nfpa-permit-system.com
- Phone: (555) 123-4567
- Documentation: https://docs.nfpa-permit-system.com

## Next Steps

1. **Evaluation Period**
   - 30-day trial period
   - Technical support included
   - Training sessions available

2. **Integration Planning**
   - City systems integration
   - Data migration
   - User training
   - Go-live support

3. **Customization**
   - City-specific workflows
   - Custom reporting
   - Additional features
   - API integrations 