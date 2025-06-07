import React from 'react';
import {
  Typography, Card, CardContent, IconButton, Chip, Box
} from '@mui/material';
import { DataGrid, GridColDef } from '@mui/x-data-grid';
import { Visibility } from '@mui/icons-material';

interface Permit {
  id: string;
  applicantInfo: {
    name: string;
    email: string;
    phone: string;
  };
  projectDetails: {
    type: string;
    address: string;
    description: string;
  };
  status: string;
  submissionDate: string;
  fee: number;
}

interface PermitListProps {
  permits: Permit[];
  onViewDetails: (permit: Permit) => void;
}

const getStatusColor = (status: string): "default" | "primary" | "secondary" | "error" | "info" | "success" | "warning" => {
  switch (status) {
    case 'APPROVED': return 'success';
    case 'REJECTED': return 'error';
    case 'UNDER_REVIEW': return 'warning';
    case 'SUBMITTED': return 'info';
    default: return 'default';
  }
};

const PermitList: React.FC<PermitListProps> = ({ permits, onViewDetails }) => {
  const columns: GridColDef[] = [
    {
      field: 'id',
      headerName: 'Permit ID',
      width: 150,
      renderCell: (params) => (
        <Typography variant="body2" fontFamily="monospace">
          {params.value}
        </Typography>
      )
    },
    {
      field: 'applicantName',
      headerName: 'Applicant',
      width: 200,
      valueGetter: (value: any, row: Permit) => row.applicantInfo?.name || 'N/A'
    },
    {
      field: 'projectType',
      headerName: 'Type',
      width: 150,
      valueGetter: (value: any, row: Permit) => row.projectDetails?.type || 'N/A'
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 130,
      renderCell: (params) => (
        <Chip
          label={params.value}
          color={getStatusColor(params.value)}
          size="small"
        />
      )
    },
    {
      field: 'submissionDate',
      headerName: 'Submitted',
      width: 120,
      valueFormatter: (value: string) => new Date(value).toLocaleDateString()
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 120,
      sortable: false,
      renderCell: (params) => (
        <IconButton
          onClick={() => onViewDetails(params.row)}
          size="small"
          color="primary"
        >
          <Visibility />
        </IconButton>
      )
    }
  ];

  // AI-powered permit demo data
  const mockPermits = permits.length > 0 ? permits : [
    {
      id: 'AI_PERMIT_001',
      applicantInfo: { name: 'AI Fire Safety Corp', email: 'ai@cityfire.com', phone: '555-0100' },
      projectDetails: { type: 'NFPA72_COMMERCIAL', address: '500 AI Plaza', description: 'AI-analyzed fire alarm system with 94% compliance score' },
      status: 'APPROVED',
      submissionDate: '2024-06-07T10:00:00Z',
      fee: 750
    },
    {
      id: 'AI_PERMIT_002',
      applicantInfo: { name: 'Blockchain Safety Systems', email: 'blockchain@industrial.com', phone: '555-0200' },
      projectDetails: { type: 'NFPA13_SPRINKLER', address: '1000 Blockchain Drive', description: 'Blockchain-verified sprinkler system with automated compliance' },
      status: 'UNDER_REVIEW',
      submissionDate: '2024-06-07T08:30:00Z',
      fee: 1200
    },
    {
      id: 'AI_PERMIT_003',
      applicantInfo: { name: 'Smart Residential Protection', email: 'smart@resfire.com', phone: '555-0300' },
      projectDetails: { type: 'NFPA72_RESIDENTIAL', address: '456 Innovation Street', description: 'AI-compliant residential detection with real-time monitoring' },
      status: 'APPROVED',
      submissionDate: '2024-06-07T11:15:00Z',
      fee: 125
    },
    {
      id: 'AI_PERMIT_004',
      applicantInfo: { name: 'Automated Fire Inspection Co', email: 'auto@inspection.com', phone: '555-0400' },
      projectDetails: { type: 'NFPA25_INSPECTION', address: '789 Future Center', description: 'Automated compliance inspection with AI verification' },
      status: 'SUBMITTED',
      submissionDate: '2024-06-07T09:00:00Z',
      fee: 200
    }
  ];

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          🤖 AI-Powered Permit Management
        </Typography>
        <Typography variant="body2" color="textSecondary" gutterBottom>
          Blockchain-secured permits with automated AI compliance review - Processing time reduced from weeks to seconds
        </Typography>
        <Box sx={{ height: 600, width: '100%', mt: 2 }}>
          <DataGrid
            rows={mockPermits}
            columns={columns}
            initialState={{
              pagination: {
                paginationModel: { pageSize: 10 }
              }
            }}
            pageSizeOptions={[5, 10, 20]}
            disableRowSelectionOnClick
            autoHeight
            sx={{
              '& .MuiDataGrid-cell': {
                borderColor: 'rgba(224, 224, 224, 1)',
              },
              '& .MuiDataGrid-columnHeaders': {
                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                borderBottom: '1px solid rgba(224, 224, 224, 1)',
              }
            }}
          />
        </Box>
      </CardContent>
    </Card>
  );
};

export default PermitList;
