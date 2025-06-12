import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  TextField,
  MenuItem,
  Grid,
  Typography,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Visibility as VisibilityIcon,
  Assessment as AssessmentIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { permitApi } from '../services/api';
import { Permit, PermitStatus } from '../types';

const statusColors: Record<PermitStatus, string> = {
  PENDING: 'warning',
  UNDER_REVIEW: 'info',
  APPROVED: 'success',
  REJECTED: 'error',
  NEEDS_REVISION: 'warning',
};

const PermitList: React.FC = () => {
  const navigate = useNavigate();
  const [permits, setPermits] = useState<Permit[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [filters, setFilters] = useState({
    status: '',
    type: '',
    startDate: '',
    endDate: '',
  });

  useEffect(() => {
    fetchPermits();
  }, [filters]);

  const fetchPermits = async () => {
    try {
      setLoading(true);
      const data = await permitApi.listPermits(filters);
      setPermits(data);
    } catch (error) {
      console.error('Failed to fetch permits:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePage = (event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFilterChange = (field: string) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFilters((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
    setPage(0);
  };

  const handleViewPermit = (permitId: string) => {
    navigate(`/permits/${permitId}`);
  };

  const handleViewAIReview = (permitId: string) => {
    navigate(`/permits/${permitId}/review`);
  };

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
      <Typography variant="h4" gutterBottom>
        Permit Applications
      </Typography>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={3}>
            <TextField
              select
              fullWidth
              label="Status"
              value={filters.status}
              onChange={handleFilterChange('status')}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="PENDING">Pending</MenuItem>
              <MenuItem value="UNDER_REVIEW">Under Review</MenuItem>
              <MenuItem value="APPROVED">Approved</MenuItem>
              <MenuItem value="REJECTED">Rejected</MenuItem>
              <MenuItem value="NEEDS_REVISION">Needs Revision</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              select
              fullWidth
              label="Type"
              value={filters.type}
              onChange={handleFilterChange('type')}
            >
              <MenuItem value="">All</MenuItem>
              <MenuItem value="FIRE_ALARM">Fire Alarm</MenuItem>
              <MenuItem value="SPRINKLER">Sprinkler</MenuItem>
              <MenuItem value="EMERGENCY_LIGHTING">Emergency Lighting</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              type="date"
              fullWidth
              label="Start Date"
              value={filters.startDate}
              onChange={handleFilterChange('startDate')}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={3}>
            <TextField
              type="date"
              fullWidth
              label="End Date"
              value={filters.endDate}
              onChange={handleFilterChange('endDate')}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
        </Grid>
      </Paper>

      {/* Permits Table */}
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>ID</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Project Name</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Submission Date</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {permits
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((permit) => (
                <TableRow key={permit.id}>
                  <TableCell>{permit.id}</TableCell>
                  <TableCell>{permit.type}</TableCell>
                  <TableCell>{permit.metadata.projectName}</TableCell>
                  <TableCell>
                    <Chip
                      label={permit.status}
                      color={statusColors[permit.status] as any}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {new Date(permit.timestamp).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <Tooltip title="View Details">
                      <IconButton
                        size="small"
                        onClick={() => handleViewPermit(permit.id)}
                      >
                        <VisibilityIcon />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="View AI Review">
                      <IconButton
                        size="small"
                        onClick={() => handleViewAIReview(permit.id)}
                      >
                        <AssessmentIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 25]}
          component="div"
          count={permits.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
    </Container>
  );
};

export default PermitList;
