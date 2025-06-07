import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Typography, Card, CardContent, Grid, Box, Paper, LinearProgress,
  Chip, Alert, Button, List, ListItem, ListItemText, ListItemIcon
} from '@mui/material';
import {
  CloudUpload, CheckCircle, Warning, Error, Description,
  Psychology, Speed, Assessment
} from '@mui/icons-material';

interface AnalysisResult {
  compliance: number;
  nfpaStandard: string;
  issues: string[];
  recommendations: string[];
  processingTime: number;
}

const DocumentUpload: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState<AnalysisResult | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setUploadedFiles(acceptedFiles);
    simulateAIAnalysis();
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/*': ['.png', '.jpg', '.jpeg'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx']
    }
  });

  const simulateAIAnalysis = () => {
    setIsAnalyzing(true);
    setAnalysisResults(null);

    // Simulate AI processing
    setTimeout(() => {
      const mockResult: AnalysisResult = {
        compliance: 94,
        nfpaStandard: 'NFPA 72',
        issues: [
          'Fire alarm notification appliances spacing exceeds maximum 15-foot requirement in corridor section C-12',
          'Missing smoke detector coverage in electrical room ER-101',
          'Insufficient battery backup calculation for panel FP-1 (8 hours required, 6.2 hours provided)'
        ],
        recommendations: [
          'Add notification appliance at grid location C-12b to ensure proper coverage',
          'Install photoelectric smoke detector in electrical room ER-101 per NFPA 72 Section 17.7',
          'Upgrade battery bank to provide minimum 8-hour backup power',
          'Submit updated riser diagram reflecting all modifications'
        ],
        processingTime: 2.3
      };
      setAnalysisResults(mockResult);
      setIsAnalyzing(false);
    }, 3000);
  };

  const getComplianceColor = (score: number) => {
    if (score >= 95) return 'success';
    if (score >= 85) return 'warning';
    return 'error';
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        🤖 AI-Powered Document Analysis
      </Typography>
      <Typography variant="body1" color="textSecondary" gutterBottom>
        Upload permit documents for automated NFPA compliance analysis
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Upload Configuration
            </Typography>
            <Typography variant="body2" gutterBottom>
              AI Model: NFPA-72-v2.1
            </Typography>
            <Typography variant="body2" gutterBottom>
              Confidence Threshold: 85%
            </Typography>
            <Typography variant="body2" gutterBottom>
              Processing Mode: Real-time
            </Typography>
          </Paper>
        </Grid>

        <Grid item xs={12} md={8}>
          <Paper
            {...getRootProps()}
            sx={{
              p: 4, textAlign: 'center', border: '2px dashed',
              borderColor: isDragActive ? 'primary.main' : 'grey.300',
              backgroundColor: isDragActive ? 'action.hover' : 'background.paper',
              cursor: 'pointer', transition: 'all 0.3s ease',
              '&:hover': { borderColor: 'primary.main', backgroundColor: 'action.hover' }
            }}
          >
            <input {...getInputProps()} />
            <CloudUpload sx={{ fontSize: 60, color: 'primary.main', mb: 2 }} />
            
            {isDragActive ? (
              <Typography variant="h6">Drop the files here...</Typography>
            ) : (
              <>
                <Typography variant="h6" gutterBottom>
                  Drag & drop permit documents here
                </Typography>
                <Typography variant="body2" color="textSecondary" gutterBottom>
                  or click to select files
                </Typography>
                <Typography variant="caption" display="block">
                  Supports: PDF, Images, Excel files
                </Typography>
              </>
            )}

            {uploadedFiles.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Uploaded Files:</Typography>
                {uploadedFiles.map((file, index) => (
                  <Chip key={index} label={file.name} sx={{ m: 0.5 }} />
                ))}
              </Box>
            )}
          </Paper>

          {isAnalyzing && (
            <Paper sx={{ p: 3, mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                🔍 AI Analysis in Progress...
              </Typography>
              <LinearProgress sx={{ mb: 2 }} />
              
              <Grid container spacing={2} sx={{ mb: 2 }}>
                <Grid item xs={6} md={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 1 }}>
                      <Typography variant="h6">94%</Typography>
                      <Typography variant="caption">Compliance Score</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 1 }}>
                      <Typography variant="h6">24</Typography>
                      <Typography variant="caption">Elements Checked</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 1 }}>
                      <Chip label="LOW" color="success" />
                      <Typography variant="caption" display="block">Risk Level</Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} md={3}>
                  <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center', py: 1 }}>
                      <Typography variant="h6">96%</Typography>
                      <Typography variant="caption">AI Confidence</Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              <Typography variant="body2">
                Analyzing NFPA 72 compliance patterns...
              </Typography>
            </Paper>
          )}

          {analysisResults && (
            <Paper sx={{ p: 3, mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                📊 AI Analysis Complete
              </Typography>

              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} md={3}>
                  <Card sx={{ textAlign: 'center', p: 2 }}>
                    <Psychology sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h4">
                      {analysisResults.compliance}%
                    </Typography>
                    <Chip 
                      label="NFPA 72 Compliance" 
                      color={getComplianceColor(analysisResults.compliance)}
                    />
                  </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card sx={{ textAlign: 'center', p: 2 }}>
                    <Speed sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                    <Typography variant="h4">
                      {analysisResults.processingTime}s
                    </Typography>
                    <Typography variant="caption">Processing Time</Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card sx={{ textAlign: 'center', p: 2 }}>
                    <Warning sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                    <Typography variant="h4">
                      {analysisResults.issues.length}
                    </Typography>
                    <Typography variant="caption">Issues Found</Typography>
                  </Card>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Card sx={{ textAlign: 'center', p: 2 }}>
                    <CheckCircle sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                    <Typography variant="h4">AUTO</Typography>
                    <Typography variant="caption">Review Mode</Typography>
                  </Card>
                </Grid>
              </Grid>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" color="error.main" gutterBottom>
                    ⚠️ Issues Identified:
                  </Typography>
                  <List dense>
                    {analysisResults.issues.map((issue, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <Error color="error" />
                        </ListItemIcon>
                        <ListItemText primary={issue} />
                      </ListItem>
                    ))}
                  </List>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="h6" color="primary.main" gutterBottom>
                    💡 AI Recommendations:
                  </Typography>
                  <List dense>
                    {analysisResults.recommendations.map((rec, index) => (
                      <ListItem key={index}>
                        <ListItemIcon>
                          <CheckCircle color="primary" />
                        </ListItemIcon>
                        <ListItemText primary={rec} />
                      </ListItem>
                    ))}
                  </List>
                </Grid>
              </Grid>

              <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
                <Button variant="contained" color="primary">
                  Approve with Conditions
                </Button>
                <Button variant="outlined" color="warning">
                  Request Revisions
                </Button>
                <Button variant="outlined">
                  Generate Report
                </Button>
              </Box>
            </Paper>
          )}
        </Grid>
      </Grid>
    </Box>
  );
};

export default DocumentUpload;
