import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
    Box,
    Paper,
    Typography,
    Grid,
    Chip,
    Button,
    CircularProgress,
    Alert,
    Divider,
    List,
    ListItem,
    ListItemText,
    Card,
    CardContent,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import {
    Description as DescriptionIcon,
    CloudUpload as CloudUploadIcon,
    Assessment as AssessmentIcon,
    Download as DownloadIcon,
} from '@mui/icons-material';
import { permitApi } from '../services/api';
import { Permit, PermitStatus, Document, AIReview } from '../types/permit';

const PermitDetails: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [aiReviewDialogOpen, setAiReviewDialogOpen] = React.useState(false);

    const {
        data: permit,
        isLoading,
        error,
        refetch,
    } = useQuery<Permit>({
        queryKey: ['permit', id],
        queryFn: () => permitApi.getPermit(id!),
        enabled: !!id,
    });

    const runAiReviewMutation = useMutation({
        mutationFn: () => permitApi.runAIComplianceCheck(id!),
        onSuccess: () => {
            refetch();
            setAiReviewDialogOpen(true);
        },
    });

    const uploadDocumentMutation = useMutation({
        mutationFn: (formData: FormData) => permitApi.uploadDocument(id!, formData),
        onSuccess: () => refetch(),
    });

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const formData = new FormData();
            formData.append('file', file);
            uploadDocumentMutation.mutate(formData);
        }
    };

    const getStatusColor = (status: PermitStatus) => {
        switch (status) {
            case PermitStatus.APPROVED:
                return 'success';
            case PermitStatus.REJECTED:
                return 'error';
            case PermitStatus.UNDER_REVIEW:
            case PermitStatus.AI_REVIEW:
                return 'warning';
            default:
                return 'default';
        }
    };

    if (isLoading) {
        return (
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    height: '100vh',
                }}
            >
                <CircularProgress />
            </Box>
        );
    }

    if (error || !permit) {
        return (
            <Alert severity="error">
                Error loading permit details. Please try again later.
            </Alert>
        );
    }

    return (
        <Box sx={{ width: '100%' }}>
            <Paper sx={{ p: 3, mb: 3 }}>
                <Grid container spacing={3}>
                    <Grid item xs={12} display="flex" justifyContent="space-between" alignItems="center">
                        <Typography variant="h4">
                            Permit Details
                        </Typography>
                        <Chip
                            label={permit.status}
                            color={getStatusColor(permit.status)}
                        />
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Property Information
                                </Typography>
                                <Typography>
                                    Address: {permit.property.address}
                                </Typography>
                                <Typography>
                                    Type: {permit.property.type}
                                </Typography>
                                <Typography>
                                    Construction Type: {permit.property.constructionType}
                                </Typography>
                                <Typography>
                                    Floors Above Grade: {permit.property.floorsAboveGrade}
                                </Typography>
                                <Typography>
                                    Floors Below Grade: {permit.property.floorsBelowGrade}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Applicant Information
                                </Typography>
                                <Typography>
                                    Name: {permit.applicant.name}
                                </Typography>
                                <Typography>
                                    Company: {permit.applicant.company}
                                </Typography>
                                <Typography>
                                    License: {permit.applicant.license}
                                </Typography>
                                <Typography>
                                    Email: {permit.applicant.contact.email}
                                </Typography>
                                <Typography>
                                    Phone: {permit.applicant.contact.phone}
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Box display="flex" justifyContent="space-between" alignItems="center">
                                    <Typography variant="h6">
                                        Documents
                                    </Typography>
                                    <input
                                        accept="application/pdf"
                                        style={{ display: 'none' }}
                                        id="document-upload"
                                        type="file"
                                        onChange={handleFileUpload}
                                    />
                                    <label htmlFor="document-upload">
                                        <Button
                                            component="span"
                                            variant="contained"
                                            startIcon={<CloudUploadIcon />}
                                        >
                                            Upload Document
                                        </Button>
                                    </label>
                                </Box>
                                <List>
                                    {permit.documents.map((doc: Document) => (
                                        <ListItem
                                            key={doc.id}
                                            secondaryAction={
                                                <IconButton
                                                    edge="end"
                                                    onClick={() => window.open(doc.url)}
                                                >
                                                    <DownloadIcon />
                                                </IconButton>
                                            }
                                        >
                                            <ListItemText
                                                primary={doc.name}
                                                secondary={`Uploaded: ${new Date(
                                                    doc.uploadedAt
                                                ).toLocaleDateString()}`}
                                            />
                                            <Chip
                                                label={doc.status}
                                                color={getStatusColor(
                                                    doc.status as PermitStatus
                                                )}
                                                size="small"
                                                sx={{ mr: 2 }}
                                            />
                                        </ListItem>
                                    ))}
                                </List>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12}>
                        <Button
                            variant="contained"
                            color="primary"
                            startIcon={<AssessmentIcon />}
                            onClick={() => runAiReviewMutation.mutate()}
                            disabled={runAiReviewMutation.isLoading}
                        >
                            {runAiReviewMutation.isLoading
                                ? 'Running AI Review...'
                                : 'Run AI Review'}
                        </Button>
                    </Grid>
                </Grid>
            </Paper>

            {/* AI Review Results Dialog */}
            <Dialog
                open={aiReviewDialogOpen}
                onClose={() => setAiReviewDialogOpen(false)}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>AI Review Results</DialogTitle>
                <DialogContent>
                    {permit.aiReview && (
                        <Box>
                            <Typography variant="h6" gutterBottom>
                                Compliance Score: {permit.aiReview.score}%
                            </Typography>
                            <Divider sx={{ my: 2 }} />
                            <Typography variant="subtitle1" gutterBottom>
                                Findings:
                            </Typography>
                            <List>
                                {permit.aiReview.findings.map((finding, index) => (
                                    <ListItem key={index}>
                                        <ListItemText
                                            primary={finding.description}
                                            secondary={
                                                finding.recommendation
                                                    ? `Recommendation: ${finding.recommendation}`
                                                    : undefined
                                            }
                                        />
                                        <Chip
                                            label={finding.severity}
                                            color={
                                                finding.severity === 'Critical'
                                                    ? 'error'
                                                    : finding.severity === 'Warning'
                                                    ? 'warning'
                                                    : 'success'
                                            }
                                            size="small"
                                        />
                                    </ListItem>
                                ))}
                            </List>
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAiReviewDialogOpen(false)}>
                        Close
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default PermitDetails; 