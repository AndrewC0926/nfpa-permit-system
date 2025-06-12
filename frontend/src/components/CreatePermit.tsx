import React, { useState } from 'react';
import {
  Box,
  Container,
  Paper,
  Stepper,
  Step,
  StepLabel,
  Button,
  Typography,
  TextField,
  Grid,
  MenuItem,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
} from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { permitApi, PermitSubmission } from '../services/api';

const steps = ['Basic Information', 'Project Details', 'Document Upload', 'Review'];

const CreatePermit: React.FC = () => {
  const navigate = useNavigate();
  const [activeStep, setActiveStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<PermitSubmission>({
    type: 'FIRE_ALARM',
    projectName: '',
    location: '',
    buildingType: '',
    floorArea: 0,
    occupancyType: '',
    files: [],
  });

  const handleNext = () => {
    if (activeStep === steps.length - 1) {
      handleSubmit();
    } else {
      setActiveStep((prevStep) => prevStep + 1);
    }
  };

  const handleBack = () => {
    setActiveStep((prevStep) => prevStep - 1);
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await permitApi.submitPermit(formData);
      navigate(`/permits/${response.permitId}`);
    } catch (err) {
      setError('Failed to submit permit application. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof PermitSubmission) => (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]: event.target.value,
    }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      setFormData((prev) => ({
        ...prev,
        files: Array.from(event.target.files || []),
      }));
    }
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <FormControl component="fieldset">
                <FormLabel component="legend">Permit Type</FormLabel>
                <RadioGroup
                  row
                  value={formData.type}
                  onChange={handleInputChange('type')}
                >
                  <FormControlLabel
                    value="FIRE_ALARM"
                    control={<Radio />}
                    label="Fire Alarm System"
                  />
                  <FormControlLabel
                    value="SPRINKLER"
                    control={<Radio />}
                    label="Sprinkler System"
                  />
                  <FormControlLabel
                    value="EMERGENCY_LIGHTING"
                    control={<Radio />}
                    label="Emergency Lighting"
                  />
                </RadioGroup>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Project Name"
                value={formData.projectName}
                onChange={handleInputChange('projectName')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                label="Project Location"
                value={formData.location}
                onChange={handleInputChange('location')}
              />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <TextField
                select
                required
                fullWidth
                label="Building Type"
                value={formData.buildingType}
                onChange={handleInputChange('buildingType')}
              >
                <MenuItem value="COMMERCIAL">Commercial</MenuItem>
                <MenuItem value="RESIDENTIAL">Residential</MenuItem>
                <MenuItem value="INDUSTRIAL">Industrial</MenuItem>
                <MenuItem value="INSTITUTIONAL">Institutional</MenuItem>
              </TextField>
            </Grid>
            <Grid item xs={12}>
              <TextField
                required
                fullWidth
                type="number"
                label="Floor Area (sq ft)"
                value={formData.floorArea}
                onChange={handleInputChange('floorArea')}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                select
                required
                fullWidth
                label="Occupancy Type"
                value={formData.occupancyType}
                onChange={handleInputChange('occupancyType')}
              >
                <MenuItem value="BUSINESS">Business</MenuItem>
                <MenuItem value="ASSEMBLY">Assembly</MenuItem>
                <MenuItem value="EDUCATIONAL">Educational</MenuItem>
                <MenuItem value="FACTORY">Factory/Industrial</MenuItem>
                <MenuItem value="INSTITUTIONAL">Institutional</MenuItem>
                <MenuItem value="MERCANTILE">Mercantile</MenuItem>
                <MenuItem value="RESIDENTIAL">Residential</MenuItem>
                <MenuItem value="STORAGE">Storage</MenuItem>
              </TextField>
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="subtitle1" gutterBottom>
                Upload Required Documents
              </Typography>
              <Typography variant="body2" color="textSecondary" paragraph>
                Please upload the following documents in PDF format:
                {formData.type === 'FIRE_ALARM' && (
                  <ul>
                    <li>Fire alarm system plans and specifications</li>
                    <li>Device locations and wiring diagrams</li>
                    <li>Battery calculations</li>
                    <li>Manufacturer's cut sheets</li>
                  </ul>
                )}
                {formData.type === 'SPRINKLER' && (
                  <ul>
                    <li>Sprinkler system plans and specifications</li>
                    <li>Hydraulic calculations</li>
                    <li>Water supply information</li>
                    <li>Equipment specifications</li>
                  </ul>
                )}
                {formData.type === 'EMERGENCY_LIGHTING' && (
                  <ul>
                    <li>Emergency lighting layout plans</li>
                    <li>Photometric calculations</li>
                    <li>Battery system specifications</li>
                    <li>Equipment details</li>
                  </ul>
                )}
              </Typography>
              <input
                accept="application/pdf"
                style={{ display: 'none' }}
                id="file-upload"
                multiple
                type="file"
                onChange={handleFileChange}
              />
              <label htmlFor="file-upload">
                <Button variant="contained" component="span">
                  Upload Files
                </Button>
              </label>
              {formData.files.length > 0 && (
                <Box mt={2}>
                  <Typography variant="subtitle2">
                    Selected Files ({formData.files.length}):
                  </Typography>
                  <ul>
                    {Array.from(formData.files).map((file, index) => (
                      <li key={index}>{file.name}</li>
                    ))}
                  </ul>
                </Box>
              )}
            </Grid>
          </Grid>
        );

      case 3:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Typography variant="h6" gutterBottom>
                Review Submission
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2">Permit Type:</Typography>
                <Typography variant="body1" gutterBottom>
                  {formData.type}
                </Typography>

                <Typography variant="subtitle2">Project Name:</Typography>
                <Typography variant="body1" gutterBottom>
                  {formData.projectName}
                </Typography>

                <Typography variant="subtitle2">Location:</Typography>
                <Typography variant="body1" gutterBottom>
                  {formData.location}
                </Typography>

                <Typography variant="subtitle2">Building Type:</Typography>
                <Typography variant="body1" gutterBottom>
                  {formData.buildingType}
                </Typography>

                <Typography variant="subtitle2">Floor Area:</Typography>
                <Typography variant="body1" gutterBottom>
                  {formData.floorArea} sq ft
                </Typography>

                <Typography variant="subtitle2">Occupancy Type:</Typography>
                <Typography variant="body1" gutterBottom>
                  {formData.occupancyType}
                </Typography>

                <Typography variant="subtitle2">
                  Uploaded Documents ({formData.files.length}):
                </Typography>
                <ul>
                  {Array.from(formData.files).map((file, index) => (
                    <li key={index}>{file.name}</li>
                  ))}
                </ul>
              </Box>
            </Grid>
          </Grid>
        );

      default:
        return 'Unknown step';
    }
  };

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h4" gutterBottom align="center">
          New Permit Application
        </Typography>

        <Stepper activeStep={activeStep} sx={{ pt: 3, pb: 5 }}>
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {getStepContent(activeStep)}

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
          {activeStep !== 0 && (
            <Button onClick={handleBack} sx={{ mr: 1 }}>
              Back
            </Button>
          )}
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={loading}
          >
            {activeStep === steps.length - 1 ? 'Submit' : 'Next'}
          </Button>
        </Box>
      </Paper>
    </Container>
  );
};

export default CreatePermit; 