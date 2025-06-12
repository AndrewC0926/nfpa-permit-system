import express from 'express';
import { UploadedFile } from 'express-fileupload';
import { PermitService } from '../services/permitService';
import { Permit, PermitStatus } from '../types/permit';

export function createPermitRoutes(permitService: PermitService) {
    const router = express.Router();

    // Create new permit
    router.post('/', async (req, res) => {
        try {
            const permit = await permitService.createPermit(req.body);
            res.status(201).json(permit);
        } catch (error) {
            res.status(500).json({ error: 'Failed to create permit' });
        }
    });

    // Upload document
    router.post('/:permitId/documents', async (req, res) => {
        try {
            if (!req.files?.document) {
                return res.status(400).json({ error: 'No document provided' });
            }

            const uploadedFile = req.files.document as UploadedFile;
            const document = await permitService.uploadDocument(
                req.params.permitId,
                {
                    id: '',
                    name: uploadedFile.name,
                    type: uploadedFile.mimetype,
                    hash: '',
                    status: 'PENDING',
                    url: '',
                    uploadedAt: new Date().toISOString(),
                    file: uploadedFile
                }
            );

            res.status(201).json(document);
        } catch (error) {
            res.status(500).json({ error: 'Failed to upload document' });
        }
    });

    // Run AI compliance check
    router.post('/:permitId/analyze', async (req, res) => {
        try {
            const permit = await permitService.getPermit(req.params.permitId);
            if (!permit) {
                return res.status(404).json({ error: 'Permit not found' });
            }

            const aiReview = await permitService.runAIComplianceCheck(
                req.params.permitId,
                permit.documents
            );

            res.json(aiReview);
        } catch (error) {
            res.status(500).json({ error: 'Failed to run AI analysis' });
        }
    });

    // Get permit by ID
    router.get('/:permitId', async (req, res) => {
        try {
            const permit = await permitService.getPermit(req.params.permitId);
            if (!permit) {
                return res.status(404).json({ error: 'Permit not found' });
            }
            res.json(permit);
        } catch (error) {
            res.status(500).json({ error: 'Failed to get permit' });
        }
    });

    // Update permit status
    router.patch('/:permitId/status', async (req, res) => {
        try {
            const { status } = req.body;
            if (!status || !Object.values(PermitStatus).includes(status)) {
                return res.status(400).json({ error: 'Invalid status' });
            }

            await permitService.updatePermitStatus(req.params.permitId, status);
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: 'Failed to update permit status' });
        }
    });

    // Get permit history
    router.get('/:permitId/history', async (req, res) => {
        try {
            const history = await permitService.getPermitHistory(req.params.permitId);
            res.json(history);
        } catch (error) {
            res.status(500).json({ error: 'Failed to get permit history' });
        }
    });

    return router;
} 