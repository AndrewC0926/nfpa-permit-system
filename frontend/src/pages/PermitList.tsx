import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
    Box,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    TablePagination,
    Typography,
    Chip,
    IconButton,
    TextField,
    MenuItem,
    Grid,
    Button,
    CircularProgress,
} from '@mui/material';
import {
    Visibility as VisibilityIcon,
    Add as AddIcon,
} from '@mui/icons-material';
import { permitApi } from '../services/api';
import { Permit, PermitStatus, PermitType } from '../types/permit';

const PermitList: React.FC = () => {
    const navigate = useNavigate();
    const [page, setPage] = useState(0);
    const [rowsPerPage, setRowsPerPage] = useState(10);
    const [statusFilter, setStatusFilter] = useState<string>('');
    const [typeFilter, setTypeFilter] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');

    const { data: permits = [], isLoading } = useQuery<Permit[]>({
        queryKey: ['permits', statusFilter, typeFilter],
        queryFn: () =>
            permitApi.listPermits({
                status: statusFilter || undefined,
                type: typeFilter || undefined,
            }),
    });

    const filteredPermits = permits.filter((permit: Permit) => {
        const matchesSearch =
            !searchQuery ||
            permit.property.address
                .toLowerCase()
                .includes(searchQuery.toLowerCase()) ||
            permit.applicant.name
                .toLowerCase()
                .includes(searchQuery.toLowerCase());

        return matchesSearch;
    });

    const handleChangePage = (event: unknown, newPage: number) => {
        setPage(newPage);
    };

    const handleChangeRowsPerPage = (
        event: React.ChangeEvent<HTMLInputElement>
    ) => {
        setRowsPerPage(parseInt(event.target.value, 10));
        setPage(0);
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

    return (
        <Box sx={{ width: '100%' }}>
            <Box
                sx={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    mb: 3,
                }}
            >
                <Typography variant="h4">Permits</Typography>
                <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => navigate('/permits/new')}
                >
                    New Permit
                </Button>
            </Box>

            <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={12} sm={4}>
                    <TextField
                        fullWidth
                        label="Search"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        size="small"
                    />
                </Grid>
                <Grid item xs={12} sm={4}>
                    <TextField
                        select
                        fullWidth
                        label="Status"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        size="small"
                    >
                        <MenuItem value="">All</MenuItem>
                        {Object.values(PermitStatus).map((status) => (
                            <MenuItem key={status} value={status}>
                                {status}
                            </MenuItem>
                        ))}
                    </TextField>
                </Grid>
                <Grid item xs={12} sm={4}>
                    <TextField
                        select
                        fullWidth
                        label="Type"
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        size="small"
                    >
                        <MenuItem value="">All</MenuItem>
                        {Object.values(PermitType).map((type) => (
                            <MenuItem key={type} value={type}>
                                {type}
                            </MenuItem>
                        ))}
                    </TextField>
                </Grid>
            </Grid>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Address</TableCell>
                            <TableCell>Applicant</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Updated</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {(rowsPerPage > 0
                            ? filteredPermits.slice(
                                  page * rowsPerPage,
                                  page * rowsPerPage + rowsPerPage
                              )
                            : filteredPermits
                        ).map((permit: Permit) => (
                            <TableRow key={permit.id}>
                                <TableCell>{permit.id}</TableCell>
                                <TableCell>{permit.type}</TableCell>
                                <TableCell>
                                    {permit.property.address}
                                </TableCell>
                                <TableCell>{permit.applicant.name}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={permit.status}
                                        color={getStatusColor(permit.status)}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>
                                    {new Date(
                                        permit.updatedAt
                                    ).toLocaleDateString()}
                                </TableCell>
                                <TableCell align="right">
                                    <IconButton
                                        onClick={() =>
                                            navigate(`/permits/${permit.id}`)
                                        }
                                    >
                                        <VisibilityIcon />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
                <TablePagination
                    rowsPerPageOptions={[5, 10, 25]}
                    component="div"
                    count={filteredPermits.length}
                    rowsPerPage={rowsPerPage}
                    page={page}
                    onPageChange={handleChangePage}
                    onRowsPerPageChange={handleChangeRowsPerPage}
                />
            </TableContainer>
        </Box>
    );
};

export default PermitList; 