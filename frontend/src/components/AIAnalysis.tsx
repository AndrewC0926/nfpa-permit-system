import React from 'react';
import {
  Typography, Card, CardContent, Grid, Box, Paper, LinearProgress,
  Chip, List, ListItem, ListItemText
} from '@mui/material';
import {
  Psychology, Speed, Assessment, TrendingUp
} from '@mui/icons-material';

const AIAnalysis: React.FC = () => {
  const aiMetrics = [
    { label: 'Model Accuracy', value: 94, color: 'primary' },
    { label: 'Processing Speed', value: 98, color: 'info' },
    { label: 'Code Coverage', value: 87, color: 'success' },
    { label: 'Learning Rate', value: 92, color: 'warning' },
  ];

  const analysisHistory = [
    {
      permitId: 'PERMIT_2024_001',
      type: 'NFPA 72 Commercial',
      score: 94,
      status: 'APPROVED',
      processingTime: 2.3,
      issues: ['Minor spacing issue in corridor C-12'],
      compliantItems: ['Proper smoke detector placement', 'Adequate notification coverage']
    },
    {
      permitId: 'PERMIT_2024_002',
      type: 'NFPA 13 Sprinkler',
      score: 78,
      status: 'REQUIRES_REVIEW',
      processingTime: 3.1,
      issues: ['Insufficient water pressure calculation'],
      compliantItems: ['Proper sprinkler spacing', 'Correct pipe sizing']
    }
  ];

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'success';
    if (score >= 80) return 'warning';
    return 'error';
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        🤖 AI Analysis Engine
      </Typography>
      <Typography variant="body1" color="textSecondary" gutterBottom>
        Advanced machine learning for automated NFPA code compliance review
      </Typography>

      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Psychology sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
              <Typography variant="h4">94%</Typography>
              <Typography variant="body2" color="textSecondary">
                AI Accuracy Rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Speed sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
              <Typography variant="h4">2.3s</Typography>
              <Typography variant="body2" color="textSecondary">
                Avg Processing Time
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Assessment sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
              <Typography variant="h4">1,247</Typography>
              <Typography variant="body2" color="textSecondary">
                Documents Analyzed
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <TrendingUp sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
              <Typography variant="h4">85%</Typography>
              <Typography variant="body2" color="textSecondary">
                Time Reduction
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              🎯 AI Performance Metrics
            </Typography>
            {aiMetrics.map((metric, index) => (
              <Box key={index} sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2">{metric.label}</Typography>
                  <Typography variant="body2">{metric.value}%</Typography>
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={metric.value} 
                  color={metric.color as any}
                />
              </Box>
            ))}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              🔍 Recent AI Analyses
            </Typography>
            {analysisHistory.map((analysis, index) => (
              <Card key={index} sx={{ mb: 2 }}>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle1">{analysis.permitId}</Typography>
                    <Chip
                      label={`${analysis.score}%`}
                      color={getScoreColor(analysis.score)}
                      size="small"
                    />
                  </Box>
                  <Typography variant="body2" color="textSecondary">
                    {analysis.type} • {analysis.processingTime}s processing
                  </Typography>
                  <Typography variant="caption" color="success.main">
                    ✅ {analysis.compliantItems.length} compliant items
                  </Typography>
                  <br />
                  <Typography variant="caption" color="warning.main">
                    ⚠️ {analysis.issues.length} issues found
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
};

export default AIAnalysis;
