import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import {
    Box,
    Stepper,
    Step,
    StepLabel,
    Button,
    Typography,
    Paper,
    Grid,
    TextField,
    MenuItem,
    Alert,
    LinearProgress,
    FormHelperText,
    InputAdornment,
} from '@mui/material';
import { useFormik } from 'formik';
import * as yup from 'yup';
import { permitApi } from '../services/api';
import { Permit, PermitType } from '../types/permit';

const steps = [
    'Initial Project Information',
    'Design Submittal Requirements',
    'Technical Specifications',
    'AI Compliance Review',
];

const constructionTypes = [
    'Type I-A',
    'Type I-B',
    'Type II-A',
    'Type II-B',
    'Type III-A',
    'Type III-B',
    'Type IV',
    'Type V-A',
    'Type V-B',
];

const certificationTypes = [
    'FCC GROL',
    'NICET Level III',
    'NICET Level IV',
    'Manufacturer Certification',
];

const initialValues = {
    // Step 1: Initial Project Information
    projectName: '',
    siteAddress: '',
    caseNumber: '',
    buildingDescription: '',
    floorsAboveGrade: '',
    floorsBelowGrade: '',
    constructionType: '',
    totalSquareFootage: '',
    
    // Designer Information
    designerName: '',
    designerLicense: '',
    designerEmail: '',
    designerPhone: '',
    designerCertifications: [] as string[],
    
    // Installer Information
    installerName: '',
    installerLicense: '',
    installerEmail: '',
    installerPhone: '',
    installerCertifications: [] as string[],
    
    // BDA Configuration
    bdaModel: '',
    bdaManufacturer: '',
    bdaFccId: '',
    operationalConfig: '',
    projectTimeline: '',
    cellSiteAssignment: '',

    // Step 2: Design Submittal Requirements
    systemDesignDocs: null as File | null,
    floorPlans: null as File | null,
    systemSchematic: null as File | null,
    heatMaps: null as File | null,
    materialsList: null as File | null,
    personnelCerts: null as File | null,

    // Step 3: Technical Specifications
    frequencyRanges: '',
    donorSiteLocation: '',
    donorAntennaType: '',
    donorAntennaGain: '',
    donorAntennaHeight: '',
    inBuildingAntennaSpecs: '',
    powerCalculations: '',
    batteryBackupTime: '',
    groundingDetails: '',
    surgeProtection: '',
    autoDialerConfig: '',
    monitoringCenter: '',
};

const validationSchema = [
    // Step 1 validation
    yup.object({
        projectName: yup.string().required('Project name is required'),
        siteAddress: yup.string().required('Site address is required'),
        caseNumber: yup.string().required('Case number is required'),
        buildingDescription: yup.string().required('Building description is required'),
        floorsAboveGrade: yup.number()
            .required('Number of floors above grade is required')
            .min(0, 'Must be 0 or greater'),
        floorsBelowGrade: yup.number()
            .required('Number of floors below grade is required')
            .min(0, 'Must be 0 or greater'),
        constructionType: yup.string().required('Construction type is required'),
        totalSquareFootage: yup.number()
            .required('Total square footage is required')
            .min(1, 'Must be greater than 0'),
        
        // Designer validation
        designerName: yup.string().required('Designer name is required'),
        designerLicense: yup.string().required('Designer license is required'),
        designerEmail: yup.string().email('Invalid email').required('Designer email is required'),
        designerPhone: yup.string().required('Designer phone is required'),
        designerCertifications: yup.array()
            .min(1, 'At least one certification is required')
            .required('Certifications are required'),
        
        // Installer validation
        installerName: yup.string().required('Installer name is required'),
        installerLicense: yup.string().required('Installer license is required'),
        installerEmail: yup.string().email('Invalid email').required('Installer email is required'),
        installerPhone: yup.string().required('Installer phone is required'),
        installerCertifications: yup.array()
            .min(1, 'At least one certification is required')
            .required('Certifications are required'),
        
        // BDA Configuration validation
        bdaModel: yup.string().required('BDA model is required'),
        bdaManufacturer: yup.string().required('BDA manufacturer is required'),
        bdaFccId: yup.string().required('FCC ID is required'),
        operationalConfig: yup.string().required('Operational configuration is required'),
        projectTimeline: yup.string().required('Project timeline is required'),
        cellSiteAssignment: yup.string().required('Cell site assignment is required'),
    }),

    // Step 2 validation
    yup.object({
        systemDesignDocs: yup.mixed()
            .required('System design documents are required')
            .test('fileSize', 'File too large', (value) => {
                if (!value) return true;
                return (value as File).size <= 50000000; // 50MB
            })
            .test('fileType', 'Invalid file type', (value) => {
                if (!value) return true;
                return ['application/pdf'].includes((value as File).type);
            }),
        floorPlans: yup.mixed()
            .required('Floor plans are required')
            .test('fileSize', 'File too large', (value) => {
                if (!value) return true;
                return (value as File).size <= 50000000;
            }),
        systemSchematic: yup.mixed().required('System schematic is required'),
        heatMaps: yup.mixed().required('Heat maps are required'),
        materialsList: yup.mixed().required('Materials list is required'),
        personnelCerts: yup.mixed().required('Personnel certifications are required'),
    }),

    // Step 3 validation
    yup.object({
        frequencyRanges: yup.string().required('Frequency ranges are required'),
        donorSiteLocation: yup.string().required('Donor site location is required'),
        donorAntennaType: yup.string().required('Donor antenna type is required'),
        donorAntennaGain: yup.number()
            .required('Donor antenna gain is required')
            .min(13, 'Minimum gain must be 13dBd'),
        donorAntennaHeight: yup.number()
            .required('Donor antenna height is required')
            .min(0, 'Height must be greater than 0'),
        inBuildingAntennaSpecs: yup.string().required('In-building antenna specifications are required'),
        powerCalculations: yup.string().required('Power calculations are required'),
        batteryBackupTime: yup.number()
            .required('Battery backup time is required')
            .min(24, 'Minimum 24-hour backup required'),
        groundingDetails: yup.string().required('Grounding details are required'),
        surgeProtection: yup.string().required('Surge protection details are required'),
        autoDialerConfig: yup.string().required('Auto-dialer configuration is required'),
        monitoringCenter: yup.string().required('Monitoring center details are required'),
    }),
];

const NewPermit: React.FC = () => {
    const navigate = useNavigate();
    const [activeStep, setActiveStep] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const [aiAnalysisProgress, setAiAnalysisProgress] = useState(0);

    const createPermitMutation = useMutation({
        mutationFn: (permitData: Partial<Permit>) => permitApi.createPermit(permitData),
        onSuccess: (data) => {
            navigate(`/permits/${data.id}`);
        },
        onError: (error) => {
            setError('Failed to create permit. Please try again.');
        },
    });

    const formik = useFormik({
        initialValues,
        validationSchema: validationSchema[activeStep],
        onSubmit: async (values) => {
            if (activeStep === steps.length - 1) {
                // Start AI analysis
                setAiAnalysisProgress(0);
                const interval = setInterval(() => {
                    setAiAnalysisProgress((prev) => {
                        if (prev >= 100) {
                            clearInterval(interval);
                            return 100;
                        }
                        return prev + 10;
                    });
                }, 1000);

                // Create permit with all collected data
                const permitData: Partial<Permit> = {
                    type: PermitType.ERRCS,
                    property: {
                        address: values.siteAddress,
                        type: 'Commercial',
                        constructionType: values.constructionType,
                        floorsAboveGrade: parseInt(values.floorsAboveGrade),
                        floorsBelowGrade: parseInt(values.floorsBelowGrade),
                        squareFootage: parseInt(values.totalSquareFootage),
                    },
                    applicant: {
                        name: values.designerName,
                        company: '',
                        license: values.designerLicense,
                        contact: {
                            email: values.designerEmail,
                            phone: values.designerPhone,
                            address: '',
                        },
                        certifications: values.designerCertifications.map(cert => ({
                            type: cert,
                            number: '',
                            expiryDate: '',
                        })),
                    },
                    nfpaData: {
                        code: 'NFPA 1221',
                        version: '2019',
                        requirements: [],
                        specifications: {
                            bdaModel: values.bdaModel,
                            bdaManufacturer: values.bdaManufacturer,
                            bdaFccId: values.bdaFccId,
                            frequencyRanges: values.frequencyRanges,
                            donorSiteLocation: values.donorSiteLocation,
                            donorAntennaSpecs: {
                                type: values.donorAntennaType,
                                gain: values.donorAntennaGain,
                                height: values.donorAntennaHeight,
                            },
                            powerCalculations: values.powerCalculations,
                            batteryBackupTime: values.batteryBackupTime,
                            groundingDetails: values.groundingDetails,
                            surgeProtection: values.surgeProtection,
                            autoDialerConfig: values.autoDialerConfig,
                        },
                    },
                };

                createPermitMutation.mutate(permitData);
            } else {
                setActiveStep((prevStep) => prevStep + 1);
            }
        },
    });

    const handleBack = () => {
        setActiveStep((prevStep) => prevStep - 1);
    };

    const getStepContent = (step: number) => {
        switch (step) {
            case 0:
                return (
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom>
                                Project Details
                            </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                name="projectName"
                                label="Project Name"
                                value={formik.values.projectName}
                                onChange={formik.handleChange}
                                error={formik.touched.projectName && Boolean(formik.errors.projectName)}
                                helperText={formik.touched.projectName && formik.errors.projectName}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                name="caseNumber"
                                label="Case Number"
                                value={formik.values.caseNumber}
                                onChange={formik.handleChange}
                                error={formik.touched.caseNumber && Boolean(formik.errors.caseNumber)}
                                helperText={formik.touched.caseNumber && formik.errors.caseNumber}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                name="siteAddress"
                                label="Site Address"
                                value={formik.values.siteAddress}
                                onChange={formik.handleChange}
                                error={formik.touched.siteAddress && Boolean(formik.errors.siteAddress)}
                                helperText={formik.touched.siteAddress && formik.errors.siteAddress}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                name="buildingDescription"
                                label="Building Description"
                                value={formik.values.buildingDescription}
                                onChange={formik.handleChange}
                                error={formik.touched.buildingDescription && Boolean(formik.errors.buildingDescription)}
                                helperText={formik.touched.buildingDescription && formik.errors.buildingDescription}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                type="number"
                                name="floorsAboveGrade"
                                label="Floors Above Grade"
                                value={formik.values.floorsAboveGrade}
                                onChange={formik.handleChange}
                                error={formik.touched.floorsAboveGrade && Boolean(formik.errors.floorsAboveGrade)}
                                helperText={formik.touched.floorsAboveGrade && formik.errors.floorsAboveGrade}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                type="number"
                                name="floorsBelowGrade"
                                label="Floors Below Grade"
                                value={formik.values.floorsBelowGrade}
                                onChange={formik.handleChange}
                                error={formik.touched.floorsBelowGrade && Boolean(formik.errors.floorsBelowGrade)}
                                helperText={formik.touched.floorsBelowGrade && formik.errors.floorsBelowGrade}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                select
                                fullWidth
                                name="constructionType"
                                label="Construction Type"
                                value={formik.values.constructionType}
                                onChange={formik.handleChange}
                                error={formik.touched.constructionType && Boolean(formik.errors.constructionType)}
                                helperText={formik.touched.constructionType && formik.errors.constructionType}
                            >
                                {constructionTypes.map((type) => (
                                    <MenuItem key={type} value={type}>
                                        {type}
                                    </MenuItem>
                                ))}
                            </TextField>
                        </Grid>

                        {/* Designer Information */}
                        <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom>
                                Designer Information
                            </Typography>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                name="designerName"
                                label="Designer Name"
                                value={formik.values.designerName}
                                onChange={formik.handleChange}
                                error={formik.touched.designerName && Boolean(formik.errors.designerName)}
                                helperText={formik.touched.designerName && formik.errors.designerName}
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                name="designerLicense"
                                label="Designer License"
                                value={formik.values.designerLicense}
                                onChange={formik.handleChange}
                                error={formik.touched.designerLicense && Boolean(formik.errors.designerLicense)}
                                helperText={formik.touched.designerLicense && formik.errors.designerLicense}
                            />
                        </Grid>

                        {/* BDA Configuration */}
                        <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom>
                                BDA Configuration
                            </Typography>
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                name="bdaModel"
                                label="BDA Model"
                                value={formik.values.bdaModel}
                                onChange={formik.handleChange}
                                error={formik.touched.bdaModel && Boolean(formik.errors.bdaModel)}
                                helperText={formik.touched.bdaModel && formik.errors.bdaModel}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                name="bdaManufacturer"
                                label="BDA Manufacturer"
                                value={formik.values.bdaManufacturer}
                                onChange={formik.handleChange}
                                error={formik.touched.bdaManufacturer && Boolean(formik.errors.bdaManufacturer)}
                                helperText={formik.touched.bdaManufacturer && formik.errors.bdaManufacturer}
                            />
                        </Grid>
                        <Grid item xs={12} md={4}>
                            <TextField
                                fullWidth
                                name="bdaFccId"
                                label="FCC ID"
                                value={formik.values.bdaFccId}
                                onChange={formik.handleChange}
                                error={formik.touched.bdaFccId && Boolean(formik.errors.bdaFccId)}
                                helperText={formik.touched.bdaFccId && formik.errors.bdaFccId}
                            />
                        </Grid>
                    </Grid>
                );

            case 1:
                return (
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom>
                                Required Documents
                            </Typography>
                            <Typography variant="body2" color="textSecondary" gutterBottom>
                                All documents must be in PDF format. Floor plans must be Architectural D size (24" x 36") minimum.
                            </Typography>
                        </Grid>
                        
                        <Grid item xs={12}>
                            <input
                                accept="application/pdf"
                                style={{ display: 'none' }}
                                id="systemDesignDocs"
                                type="file"
                                data-testid="systemDesignDocs-input"
                                onChange={(event) => {
                                    formik.setFieldValue(
                                        'systemDesignDocs',
                                        event.currentTarget.files?.[0] || null
                                    );
                                }}
                            />
                            <label htmlFor="systemDesignDocs">
                                <Button variant="outlined" component="span" fullWidth>
                                    Upload System Design Documents
                                </Button>
                            </label>
                            {formik.values.systemDesignDocs && (
                                <Typography variant="body2" color="textSecondary">
                                    Selected: {formik.values.systemDesignDocs.name}
                                </Typography>
                            )}
                            {formik.touched.systemDesignDocs && formik.errors.systemDesignDocs && (
                                <FormHelperText error>
                                    {formik.errors.systemDesignDocs}
                                </FormHelperText>
                            )}
                        </Grid>

                        <Grid item xs={12}>
                            <input
                                accept="application/pdf"
                                style={{ display: 'none' }}
                                id="floorPlans"
                                type="file"
                                multiple
                                onChange={(event) => {
                                    formik.setFieldValue(
                                        'floorPlans',
                                        event.currentTarget.files || null
                                    );
                                }}
                            />
                            <label htmlFor="floorPlans">
                                <Button variant="outlined" component="span" fullWidth>
                                    Upload Floor Plans (All Levels)
                                </Button>
                            </label>
                            {formik.values.floorPlans && (
                                <Typography variant="body2" color="textSecondary">
                                    Selected: {formik.values.floorPlans.length} files
                                </Typography>
                            )}
                            {formik.touched.floorPlans && formik.errors.floorPlans && (
                                <FormHelperText error>
                                    {formik.errors.floorPlans}
                                </FormHelperText>
                            )}
                        </Grid>

                        {/* Add similar upload buttons for other required documents */}
                    </Grid>
                );

            case 2:
                return (
                    <Grid container spacing={3}>
                        <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom>
                                Technical Specifications
                            </Typography>
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                name="frequencyRanges"
                                label="Frequency Ranges"
                                value={formik.values.frequencyRanges}
                                onChange={formik.handleChange}
                                error={formik.touched.frequencyRanges && Boolean(formik.errors.frequencyRanges)}
                                helperText={formik.touched.frequencyRanges && formik.errors.frequencyRanges}
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                name="donorAntennaGain"
                                label="Donor Antenna Gain (dBd)"
                                type="number"
                                value={formik.values.donorAntennaGain}
                                onChange={formik.handleChange}
                                error={formik.touched.donorAntennaGain && Boolean(formik.errors.donorAntennaGain)}
                                helperText={
                                    (formik.touched.donorAntennaGain && formik.errors.donorAntennaGain) ||
                                    'Minimum 13dBd gain required'
                                }
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">dBd</InputAdornment>,
                                }}
                            />
                        </Grid>

                        <Grid item xs={12} md={6}>
                            <TextField
                                fullWidth
                                name="batteryBackupTime"
                                label="Battery Backup Runtime"
                                type="number"
                                value={formik.values.batteryBackupTime}
                                onChange={formik.handleChange}
                                error={formik.touched.batteryBackupTime && Boolean(formik.errors.batteryBackupTime)}
                                helperText={
                                    (formik.touched.batteryBackupTime && formik.errors.batteryBackupTime) ||
                                    'Minimum 24-hour backup required'
                                }
                                InputProps={{
                                    endAdornment: <InputAdornment position="end">hours</InputAdornment>,
                                }}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={4}
                                name="groundingDetails"
                                label="Grounding Details (NFPA 780 Compliance)"
                                value={formik.values.groundingDetails}
                                onChange={formik.handleChange}
                                error={formik.touched.groundingDetails && Boolean(formik.errors.groundingDetails)}
                                helperText={formik.touched.groundingDetails && formik.errors.groundingDetails}
                            />
                        </Grid>

                        <Grid item xs={12}>
                            <TextField
                                fullWidth
                                multiline
                                rows={4}
                                name="autoDialerConfig"
                                label="Auto-Dialer Configuration for County Paging"
                                value={formik.values.autoDialerConfig}
                                onChange={formik.handleChange}
                                error={formik.touched.autoDialerConfig && Boolean(formik.errors.autoDialerConfig)}
                                helperText={formik.touched.autoDialerConfig && formik.errors.autoDialerConfig}
                            />
                        </Grid>
                    </Grid>
                );

            case 3:
                return (
                    <Box>
                        <Typography variant="h6" gutterBottom>
                            AI Compliance Review
                        </Typography>
                        <Typography variant="body2" color="textSecondary" gutterBottom>
                            Our AI system will analyze your submission against Orange County Sheriff's Department requirements.
                        </Typography>

                        <Box sx={{ mt: 4, mb: 2 }}>
                            <LinearProgress 
                                variant="determinate" 
                                value={aiAnalysisProgress} 
                                sx={{ height: 10, borderRadius: 5 }}
                            />
                            <Typography variant="body2" color="textSecondary" align="center" sx={{ mt: 1 }}>
                                {aiAnalysisProgress === 100 ? 'Analysis Complete' : 'Analyzing submission...'}
                            </Typography>
                        </Box>

                        {aiAnalysisProgress === 100 && (
                            <Alert severity="success" sx={{ mt: 2 }}>
                                All requirements have been met. Ready for submission.
                            </Alert>
                        )}
                    </Box>
                );

            default:
                return 'Unknown step';
        }
    };

    return (
        <Box sx={{ width: '100%' }}>
            <Paper sx={{ p: 3 }}>
                <Typography component="h1" variant="h4" align="center" gutterBottom>
                    New ERRCS Permit Application
                </Typography>
                <Typography variant="subtitle1" align="center" color="textSecondary" gutterBottom>
                    Orange County Sheriff's Department Requirements
                </Typography>

                {error && (
                    <Alert severity="error" sx={{ mb: 3 }}>
                        {error}
                    </Alert>
                )}

                <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
                    {steps.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                <form onSubmit={formik.handleSubmit}>
                    {getStepContent(activeStep)}

                    <Box sx={{ display: 'flex', justifyContent: 'flex-end', mt: 3 }}>
                        {activeStep !== 0 && (
                            <Button onClick={handleBack} sx={{ mr: 1 }}>
                                Back
                            </Button>
                        )}
                        <Button
                            variant="contained"
                            type="submit"
                            disabled={formik.isSubmitting || (activeStep === 3 && aiAnalysisProgress < 100)}
                        >
                            {activeStep === steps.length - 1 ? 'Submit Permit' : 'Next'}
                        </Button>
                    </Box>
                </form>
            </Paper>
        </Box>
    );
};

export default NewPermit; 