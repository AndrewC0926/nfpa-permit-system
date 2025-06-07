import React from 'react';
import {
  Typography, Card, CardContent, Grid, Box, Paper, LinearProgress
} from '@mui/material';
import {
  Description, HourglassEmpty, CheckCircle, Cancel, Schedule, AttachMoney
} from '@mui/icons-material';

interface DashboardProps {
  permits: any[];
}

const Dashboard: React.FC<DashboardProps> = ({ permits }) => {
  const stats = {
    totalPermits: 156,
    pendingReview: 23,
    approved: 98,
    rejected: 12,
    inspectionsDue: 18,
    revenue: 45000,
    aiProcessingTime: 2.3,
    complianceRate: 94
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        🏛️ AI-Powered Permit Review Dashboard
      </Typography>
      <Typography variant="body1" color="textSecondary" gutterBottom>
        Real-time analytics for automated NFPA compliance review system
      </Typography>

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Description sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">{stats.totalPermits}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Total Permits
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <HourglassEmpty sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">{stats.pendingReview}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    AI Processing
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <CheckCircle sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">{stats.approved}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Auto-Approved
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Cancel sx={{ fontSize: 40, color: 'error.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">{stats.rejected}</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Flagged for Review
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Schedule sx={{ fontSize: 40, color: 'info.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">{stats.aiProcessingTime}s</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Avg AI Review Time
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={2}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <AttachMoney sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                <Box>
                  <Typography variant="h4">${stats.revenue / 1000}K</Typography>
                  <Typography variant="body2" color="textSecondary">
                    Revenue (YTD)
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" gutterBottom>
          🤖 AI Performance Metrics
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={3}>
            <Typography variant="body2">Processing Speed</Typography>
            <LinearProgress variant="determinate" value={95} sx={{ mt: 1 }} />
            <Typography variant="caption">95% faster than manual</Typography>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="body2">Accuracy Rate</Typography>
            <LinearProgress variant="determinate" value={94} color="success" sx={{ mt: 1 }} />
            <Typography variant="caption">94% detection accuracy</Typography>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="body2">Cost Reduction</Typography>
            <LinearProgress variant="determinate" value={78} color="warning" sx={{ mt: 1 }} />
            <Typography variant="caption">78% cost savings</Typography>
          </Grid>
          <Grid item xs={12} md={3}>
            <Typography variant="body2">Time Savings</Typography>
            <LinearProgress variant="determinate" value={85} color="info" sx={{ mt: 1 }} />
            <Typography variant="caption">85% time reduction</Typography>
          </Grid>
        </Grid>
      </Paper>
    </Box>
  );
};

export default Dashboard;
