/// <reference types="vitest" />
import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import NewPermit from './NewPermit';
import { Permit, PermitType, PermitStatus } from '../types/permit';

// Mock the api
vi.mock('../services/api', () => ({
    permitApi: {
        createPermit: vi.fn(),
        analyzePermit: vi.fn(),
        uploadDocument: vi.fn((permitId: string, formData: FormData) => 
            Promise.resolve({
                id: 'doc123',
                name: 'test.pdf',
                type: 'application/pdf',
                hash: '0x1234567890abcdef',
                status: 'PENDING',
                url: 'https://example.com/doc123',
                uploadedAt: new Date().toISOString()
            })
        ),
        runAIComplianceCheck: vi.fn(() => 
            Promise.resolve({
                status: 'COMPLIANT',
                score: 0.95,
                findings: [
                    {
                        type: 'NFPA72',
                        description: 'Battery backup requirements met',
                        severity: 'Pass'
                    }
                ]
            })
        ),
        getComplianceRequirements: vi.fn()
    },
    __esModule: true,
}));

// Import the mocked API
import { permitApi } from '../services/api';

// Mock file data
const mockFile = new File(['test'], 'test.pdf', { type: 'application/pdf' });
const mockFloorPlans = [
    new File(['floor1'], 'floor1.pdf', { type: 'application/pdf' }),
    new File(['floor2'], 'floor2.pdf', { type: 'application/pdf' }),
];

// Mock permit data
const mockPermitData = {
    property: {
        address: '123 Test St',
        type: 'Commercial' as const,
        constructionType: 'Type I-A',
        floorsAboveGrade: 5,
        floorsBelowGrade: 1,
        squareFootage: 50000
    },
    applicant: {
        name: 'John Doe',
        company: 'Test Corp',
        license: 'PE12345',
        contact: {
            email: 'john@example.com',
            phone: '555-0123',
            address: '123 Main St'
        },
        certifications: [
            {
                type: 'NICET III',
                number: 'NICET-123',
                expiryDate: '2025-12-31'
            }
        ]
    },
    nfpaData: {
        code: 'NFPA 72',
        version: '2019',
        requirements: [],
        specifications: {
            bdaModel: 'BDA-2000',
            bdaManufacturer: 'TechCorp',
            bdaFccId: 'TECH-BDA2000',
            frequencyRanges: '700-800MHz',
            donorSiteLocation: 'Rooftop',
            donorAntennaSpecs: {
                type: 'Directional',
                gain: 14,
                height: 30
            },
            powerCalculations: '100W',
            batteryBackupTime: '24',
            groundingDetails: 'NFPA 780 compliant',
            surgeProtection: 'Type 1 SPD',
            autoDialerConfig: 'Configured'
        }
    }
} as const;

describe('NewPermit Component', () => {
    let queryClient: QueryClient;

    beforeEach(() => {
        queryClient = new QueryClient();
        vi.clearAllMocks();
    });

    const renderComponent = () => {
        return render(
            <QueryClientProvider client={queryClient}>
                <MemoryRouter>
                    <NewPermit />
                </MemoryRouter>
            </QueryClientProvider>
        );
    };

    it('should render initial form fields', () => {
        renderComponent();
        
        expect(screen.getByLabelText(/Project Name/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Site Address/i)).toBeInTheDocument();
        expect(screen.getByLabelText(/Building Description/i)).toBeInTheDocument();
    });

    it('should validate required fields', async () => {
        renderComponent();
        
        // Try to proceed without filling required fields
        await act(async () => {
            fireEvent.click(screen.getByRole('button', { name: /next/i }));
        });
        
        await waitFor(() => {
            const projectNameInput = screen.getByLabelText(/Project Name/i);
            expect(projectNameInput.getAttribute('aria-invalid')).toBe('true');
            
            const siteAddressInput = screen.getByLabelText(/Site Address/i);
            expect(siteAddressInput.getAttribute('aria-invalid')).toBe('true');
        });
    });

    it('should handle successful form submission', async () => {
        (permitApi.createPermit as ReturnType<typeof vi.fn>).mockResolvedValue({ id: '123', status: 'approved' });
        
        renderComponent();
        
        // Fill required fields
        await act(async () => {
            await userEvent.type(screen.getByLabelText(/Project Name/i), mockPermitData.property.address);
            await userEvent.type(screen.getByLabelText(/Site Address/i), mockPermitData.property.address);
            await userEvent.type(screen.getByLabelText(/Building Description/i), mockPermitData.property.type);
            await userEvent.type(screen.getByLabelText(/Floors Above Grade/i), mockPermitData.property.floorsAboveGrade.toString());
            await userEvent.type(screen.getByLabelText(/Floors Below Grade/i), mockPermitData.property.floorsBelowGrade.toString());
            
            // Select construction type
            const constructionTypeInput = screen.getByLabelText(/Construction Type/i);
            fireEvent.mouseDown(constructionTypeInput);
            
            // Wait for the select menu to open
            const menu = await screen.findByRole('listbox');
            expect(menu).toBeInTheDocument();
            
            // Find and click the option using a partial match
            const option = screen.getByRole('option', { name: /Type I-A/i });
            fireEvent.click(option);
            
            // Click next to proceed
            fireEvent.click(screen.getByRole('button', { name: /next/i }));
        });

        await waitFor(() => {
            expect(screen.getByText('Design Submittal Requirements')).toBeInTheDocument();
        }, { timeout: 10000 });
    });

    describe('Design Submittal Requirements (Step 2)', () => {
        it('should handle file uploads', async () => {
            renderComponent();
            
            // Navigate to step 2
            await act(async () => {
                await userEvent.type(screen.getByLabelText(/Project Name/i), 'Test Project');
                await userEvent.type(screen.getByLabelText(/Site Address/i), '123 Test St');
                await userEvent.type(screen.getByLabelText(/Case Number/i), 'TEST-2024-001');
                await userEvent.type(screen.getByLabelText(/Building Description/i), 'Test Building');
                await userEvent.type(screen.getByLabelText(/Floors Above Grade/i), '5');
                await userEvent.type(screen.getByLabelText(/Floors Below Grade/i), '1');
                
                // Select construction type
                const constructionTypeInput = screen.getByLabelText(/Construction Type/i);
                fireEvent.mouseDown(constructionTypeInput);
                
                // Wait for the select menu to open
                const menu = await screen.findByRole('listbox');
                expect(menu).toBeInTheDocument();
                
                // Find and click the option
                const option = screen.getByRole('option', { name: 'Type I-A' });
                fireEvent.click(option);
                
                // Click next to proceed
                fireEvent.click(screen.getByRole('button', { name: /next/i }));
            });

            await waitFor(() => {
                expect(screen.getByText('Design Submittal Requirements')).toBeInTheDocument();
            }, { timeout: 10000 });

            // Test file upload
            const fileInput = screen.getByLabelText(/Upload System Design Documents/i) as HTMLInputElement;
            await userEvent.upload(fileInput, mockFile);

            expect(fileInput.files?.[0]).toBe(mockFile);
        });
    });

    describe('Technical Specifications (Step 3)', () => {
        it('should validate technical requirements', async () => {
            renderComponent();
            
            // Navigate to step 3
            await act(async () => {
                await userEvent.type(screen.getByLabelText(/Project Name/i), 'Test Project');
                await userEvent.type(screen.getByLabelText(/Site Address/i), '123 Test St');
                await userEvent.type(screen.getByLabelText(/Case Number/i), 'TEST-2024-001');
                await userEvent.type(screen.getByLabelText(/Building Description/i), 'Test Building');
                await userEvent.type(screen.getByLabelText(/Floors Above Grade/i), '5');
                await userEvent.type(screen.getByLabelText(/Floors Below Grade/i), '1');
                
                // Select construction type
                const constructionTypeInput = screen.getByLabelText(/Construction Type/i);
                fireEvent.mouseDown(constructionTypeInput);
                
                // Wait for the select menu to open
                const menu = await screen.findByRole('listbox');
                expect(menu).toBeInTheDocument();
                
                // Find and click the option
                const option = screen.getByRole('option', { name: 'Type I-A' });
                fireEvent.click(option);
                
                // Click next twice to proceed to step 3
                fireEvent.click(screen.getByRole('button', { name: /next/i }));
                await waitFor(() => {
                    expect(screen.getByText('Design Submittal Requirements')).toBeInTheDocument();
                });
                fireEvent.click(screen.getByRole('button', { name: /next/i }));
            });

            await waitFor(() => {
                expect(screen.getByText('Technical Specifications')).toBeInTheDocument();
            }, { timeout: 10000 });

            // Test minimum antenna gain requirement
            const gainInput = screen.getByLabelText(/Donor Antenna Gain/i);
            await userEvent.type(gainInput, '10');

            await waitFor(() => {
                expect(screen.getByText(/Minimum gain must be 13dBd/i)).toBeInTheDocument();
            }, { timeout: 10000 });
        });
    });

    describe('AI Compliance Review (Step 4)', () => {
        it('should show analysis progress', async () => {
            renderComponent();
            
            // Navigate to final step
            await act(async () => {
                await userEvent.type(screen.getByLabelText(/Project Name/i), 'Test Project');
                await userEvent.type(screen.getByLabelText(/Site Address/i), '123 Test St');
                await userEvent.type(screen.getByLabelText(/Case Number/i), 'TEST-2024-001');
                await userEvent.type(screen.getByLabelText(/Building Description/i), 'Test Building');
                await userEvent.type(screen.getByLabelText(/Floors Above Grade/i), '5');
                await userEvent.type(screen.getByLabelText(/Floors Below Grade/i), '1');
                
                // Select construction type
                const constructionTypeInput = screen.getByLabelText(/Construction Type/i);
                fireEvent.mouseDown(constructionTypeInput);
                
                // Wait for the select menu to open
                const menu = await screen.findByRole('listbox');
                expect(menu).toBeInTheDocument();
                
                // Find and click the option
                const option = screen.getByRole('option', { name: 'Type I-A' });
                fireEvent.click(option);
                
                // Click next three times to proceed to final step
                fireEvent.click(screen.getByRole('button', { name: /next/i }));
                await waitFor(() => {
                    expect(screen.getByText('Design Submittal Requirements')).toBeInTheDocument();
                });
                fireEvent.click(screen.getByRole('button', { name: /next/i }));
                await waitFor(() => {
                    expect(screen.getByText('Technical Specifications')).toBeInTheDocument();
                });
                fireEvent.click(screen.getByRole('button', { name: /next/i }));
            });

            await waitFor(() => {
                expect(screen.getByText(/AI Compliance Review/i)).toBeInTheDocument();
                expect(screen.getByText(/Analyzing submission/i)).toBeInTheDocument();
            }, { timeout: 10000 });
        });

        it('should handle successful submission', async () => {
            (permitApi.createPermit as ReturnType<typeof vi.fn>).mockResolvedValue({ id: '123', status: 'approved' });
            
            renderComponent();
            
            // Navigate through all steps and submit
            await act(async () => {
                await userEvent.type(screen.getByLabelText(/Project Name/i), 'Test Project');
                await userEvent.type(screen.getByLabelText(/Site Address/i), '123 Test St');
                await userEvent.type(screen.getByLabelText(/Case Number/i), 'TEST-2024-001');
                await userEvent.type(screen.getByLabelText(/Building Description/i), 'Test Building');
                await userEvent.type(screen.getByLabelText(/Floors Above Grade/i), '5');
                await userEvent.type(screen.getByLabelText(/Floors Below Grade/i), '1');
                
                // Select construction type
                const constructionTypeInput = screen.getByLabelText(/Construction Type/i);
                fireEvent.mouseDown(constructionTypeInput);
                
                // Wait for the select menu to open
                const menu = await screen.findByRole('listbox');
                expect(menu).toBeInTheDocument();
                
                // Find and click the option
                const option = screen.getByRole('option', { name: 'Type I-A' });
                fireEvent.click(option);
                
                // Click next three times to proceed to final step
                fireEvent.click(screen.getByRole('button', { name: /next/i }));
                await waitFor(() => {
                    expect(screen.getByText('Design Submittal Requirements')).toBeInTheDocument();
                });
                fireEvent.click(screen.getByRole('button', { name: /next/i }));
                await waitFor(() => {
                    expect(screen.getByText('Technical Specifications')).toBeInTheDocument();
                });
                fireEvent.click(screen.getByRole('button', { name: /next/i }));
            });

            // Wait for analysis to complete
            await waitFor(() => {
                expect(screen.getByText(/Analysis Complete/i)).toBeInTheDocument();
            }, { timeout: 10000 });

            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /submit permit/i }));
            });

            await waitFor(() => {
                expect(permitApi.createPermit).toHaveBeenCalled();
            }, { timeout: 10000 });
        });
    });

    describe('Document Upload and Blockchain Integration', () => {
        it('should handle document upload with hash verification', async () => {
            renderComponent();
            
            // Navigate to document upload step
            await act(async () => {
                // Fill basic info
                await userEvent.type(screen.getByLabelText(/Project Name/i), mockPermitData.property.address);
                await userEvent.type(screen.getByLabelText(/Site Address/i), mockPermitData.property.address);
                await userEvent.type(screen.getByLabelText(/Building Description/i), mockPermitData.property.type);
                await userEvent.type(screen.getByLabelText(/Floors Above Grade/i), mockPermitData.property.floorsAboveGrade.toString());
                await userEvent.type(screen.getByLabelText(/Floors Below Grade/i), mockPermitData.property.floorsBelowGrade.toString());
                
                // Select construction type
                const constructionTypeInput = screen.getByLabelText(/Construction Type/i);
                fireEvent.mouseDown(constructionTypeInput);
                
                // Wait for the select menu to open and select an option
                const menu = await screen.findByRole('listbox');
                expect(menu).toBeInTheDocument();
                
                // Find and click the option using a partial match
                const option = screen.getByRole('option', { name: /Type I-A/i });
                fireEvent.click(option);
                
                // Click next to proceed
                fireEvent.click(screen.getByRole('button', { name: /next/i }));
            });

            // Wait for the document upload step to be active
            await waitFor(() => {
                expect(screen.getByText('Design Submittal Requirements')).toBeInTheDocument();
            });

            // Upload document
            const fileInput = screen.getByTestId('systemDesignDocs-input');
            await userEvent.upload(fileInput, mockFile);

            await waitFor(() => {
                expect(permitApi.uploadDocument).toHaveBeenCalledWith(expect.any(String), expect.any(FormData));
                expect(screen.getByText('0x1234567890abcdef')).toBeInTheDocument();
            });
        });

        it('should handle AI compliance validation', async () => {
            (permitApi.createPermit as ReturnType<typeof vi.fn>).mockResolvedValue({ 
                ...mockPermitData, 
                id: 'permit123',
                type: PermitType.ERRCS,
                status: PermitStatus.UNDER_REVIEW,
                documents: [],
                aiReview: {
                    status: 'COMPLIANT',
                    score: 0.95,
                    findings: [
                        {
                            type: 'NFPA72',
                            description: 'Battery backup requirements met',
                            severity: 'Pass'
                        }
                    ]
                }
            });
            
            renderComponent();
            
            // Fill all required fields and navigate to AI review
            await act(async () => {
                // Basic Info
                await userEvent.type(screen.getByLabelText(/Project Name/i), mockPermitData.property.address);
                await userEvent.type(screen.getByLabelText(/Site Address/i), mockPermitData.property.address);
                await userEvent.type(screen.getByLabelText(/Building Description/i), mockPermitData.property.type);
                await userEvent.type(screen.getByLabelText(/Floors Above Grade/i), mockPermitData.property.floorsAboveGrade.toString());
                await userEvent.type(screen.getByLabelText(/Floors Below Grade/i), mockPermitData.property.floorsBelowGrade.toString());
                
                // Select construction type
                const constructionTypeInput = screen.getByLabelText(/Construction Type/i);
                fireEvent.mouseDown(constructionTypeInput);
                
                // Wait for the select menu to open and select an option
                const menu = await screen.findByRole('listbox');
                expect(menu).toBeInTheDocument();
                
                // Find and click the option using a partial match
                const option = screen.getByRole('option', { name: /Type I-A/i });
                fireEvent.click(option);
                
                // Navigate through steps
                fireEvent.click(screen.getByRole('button', { name: /next/i }));
            });

            // Wait for the AI review step to be active
            await waitFor(() => {
                expect(screen.getByText('AI Compliance Review')).toBeInTheDocument();
            });

            // Verify AI analysis started
            await waitFor(() => {
                expect(permitApi.runAIComplianceCheck).toHaveBeenCalled();
                expect(screen.getByText(/NFPA72/)).toBeInTheDocument();
                expect(screen.getByText(/Battery backup requirements met/)).toBeInTheDocument();
            });

            // Submit permit
            await act(async () => {
                fireEvent.click(screen.getByRole('button', { name: /submit permit/i }));
            });

            // Verify submission
            await waitFor(() => {
                expect(permitApi.createPermit).toHaveBeenCalledWith(expect.objectContaining({
                    property: mockPermitData.property,
                    nfpaData: mockPermitData.nfpaData,
                    aiReview: expect.objectContaining({
                        status: 'COMPLIANT',
                        score: 0.95
                    })
                }));
            });
        });
    });
}); 