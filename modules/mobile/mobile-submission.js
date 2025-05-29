// modules/mobile/mobile-submission.js
const multer = require('multer');
const sharp = require('sharp');
const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs').promises;

class MobileSubmissionManager {
    constructor() {
        this.fieldUploadDir = './uploads/field';
        this.qrCodeDir = './qr-codes';
        this.initDirectories();
        
        this.upload = multer({
            storage: multer.memoryStorage(),
            limits: {
                fileSize: 50 * 1024 * 1024,
                files: 20
            },
            fileFilter: this.mobileFileFilter
        });
    }

    async initDirectories() {
        try {
            await fs.mkdir(this.fieldUploadDir, { recursive: true });
            await fs.mkdir(this.qrCodeDir, { recursive: true });
            await fs.mkdir(`${this.fieldUploadDir}/inspections`, { recursive: true });
            await fs.mkdir(`${this.fieldUploadDir}/progress`, { recursive: true });
            await fs.mkdir(`${this.fieldUploadDir}/violations`, { recursive: true });
            console.log('✅ Mobile directories initialized');
        } catch (error) {
            console.error('❌ Error creating mobile directories:', error);
        }
    }

    mobileFileFilter(req, file, cb) {
        const allowedTypes = [
            'image/jpeg', 'image/png', 'image/webp',
            'application/pdf', 'video/mp4'
        ];
        
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error(`File type ${file.mimetype} not allowed`), false);
        }
    }

    async generatePermitQRCode(permitId, permitInfo) {
        try {
            const qrData = {
                type: 'permit',
                permitId: permitId,
                url: `${process.env.BASE_URL || 'http://localhost:3001'}/permit/${permitId}`,
                generated: new Date().toISOString(),
                info: permitInfo
            };
            
            const qrCodePath = path.join(this.qrCodeDir, `permit_${permitId}.png`);
            
            await QRCode.toFile(qrCodePath, JSON.stringify(qrData), {
                width: 300,
                margin: 2
            });
            
            return {
                qrCodePath: qrCodePath,
                qrData: qrData,
                success: true
            };
            
        } catch (error) {
            console.error('❌ QR code generation failed:', error);
            return { success: false, error: error.message };
        }
    }

    async processFieldInspection(permitId, inspectionData, files) {
        try {
            const inspection = {
                id: `FIELD_INSP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                permitId: permitId,
                inspectorId: inspectionData.inspectorId,
                inspectorName: inspectionData.inspectorName,
                timestamp: new Date().toISOString(),
                location: inspectionData.location,
                inspectionType: inspectionData.type || 'progress',
                findings: inspectionData.findings || [],
                status: inspectionData.status || 'in_progress',
                photos: [],
                geoLocation: inspectionData.geoLocation,
                notes: inspectionData.notes || ''
            };
            
            if (files && files.length > 0) {
                for (const file of files) {
                    const processedPhoto = await this.processFieldPhoto(file, inspection.id, permitId);
                    inspection.photos.push(processedPhoto);
                }
            }
            
            const inspectionPath = path.join(
                this.fieldUploadDir, 
                'inspections', 
                `${inspection.id}.json`
            );
            await fs.writeFile(inspectionPath, JSON.stringify(inspection, null, 2));
            
            return inspection;
            
        } catch (error) {
            console.error('❌ Field inspection processing failed:', error);
            throw error;
        }
    }

    async processFieldPhoto(file, inspectionId, permitId) {
        try {
            const timestamp = Date.now();
            const filename = `${permitId}_${inspectionId}_${timestamp}_${file.originalname}`;
            const originalPath = path.join(this.fieldUploadDir, 'inspections', filename);
            
            await fs.writeFile(originalPath, file.buffer);
            
            const thumbnailFilename = `thumb_${filename}`;
            const thumbnailPath = path.join(this.fieldUploadDir, 'inspections', thumbnailFilename);
            
            try {
                await sharp(file.buffer)
                    .resize(300, 300, { fit: 'cover' })
                    .jpeg({ quality: 80 })
                    .toFile(thumbnailPath);
            } catch (sharpError) {
                console.warn('Thumbnail generation failed, continuing without thumbnail');
            }
            
            return {
                id: `PHOTO_${timestamp}`,
                originalName: file.originalname,
                filename: filename,
                originalPath: originalPath,
                thumbnailPath: thumbnailPath,
                size: file.size,
                uploadTime: new Date().toISOString()
            };
            
        } catch (error) {
            console.error('❌ Field photo processing failed:', error);
            throw error;
        }
    }

    async processProgressSubmission(permitId, progressData, files) {
        try {
            console.log(`🏗️ Processing progress submission for permit ${permitId}`);
            
            const submission = {
                id: `PROGRESS_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                permitId: permitId,
                contractorId: progressData.contractorId,
                contractorName: progressData.contractorName,
                submissionDate: new Date().toISOString(),
                workType: progressData.workType,
                percentComplete: progressData.percentComplete || 0,
                milestone: progressData.milestone,
                description: progressData.description,
                photos: [],
                nextSteps: progressData.nextSteps || [],
                requestInspection: progressData.requestInspection || false,
                estimatedCompletion: progressData.estimatedCompletion
            };
            
            // Process progress photos
            if (files && files.length > 0) {
                for (const file of files) {
                    const processedPhoto = await this.processProgressPhoto(file, submission.id, permitId);
                    submission.photos.push(processedPhoto);
                }
            }
            
            // Auto-analyze progress based on photos and description
            submission.analysis = await this.analyzeProgress(submission);
            
            // Save submission
            const submissionPath = path.join(
                this.fieldUploadDir, 
                'progress', 
                `${submission.id}.json`
            );
            await fs.writeFile(submissionPath, JSON.stringify(submission, null, 2));
            
            console.log(`✅ Progress submission processed: ${submission.id}`);
            return submission;
            
        } catch (error) {
            console.error('❌ Progress submission processing failed:', error);
            throw new Error(`Progress submission failed: ${error.message}`);
        }
    }

    async processProgressPhoto(file, submissionId, permitId) {
        try {
            const timestamp = Date.now();
            const filename = `progress_${permitId}_${submissionId}_${timestamp}.jpg`;
            const fullPath = path.join(this.fieldUploadDir, 'progress', filename);
            
            // Optimize image for web viewing
            try {
                await sharp(file.buffer)
                    .resize(1920, 1080, { 
                        fit: 'inside', 
                        withoutEnlargement: true 
                    })
                    .jpeg({ quality: 90 })
                    .toFile(fullPath);
            } catch (sharpError) {
                // Fallback: save original file
                await fs.writeFile(fullPath, file.buffer);
            }
            
            // Create thumbnail
            const thumbFilename = `thumb_${filename}`;
            const thumbPath = path.join(this.fieldUploadDir, 'progress', thumbFilename);
            
            try {
                await sharp(file.buffer)
                    .resize(400, 300, { fit: 'cover' })
                    .jpeg({ quality: 80 })
                    .toFile(thumbPath);
            } catch (sharpError) {
                console.warn('Thumbnail generation failed for progress photo');
            }
            
            return {
                id: `PROGRESS_PHOTO_${timestamp}`,
                filename: filename,
                path: fullPath,
                thumbnailPath: thumbPath,
                uploadTime: new Date().toISOString(),
                size: file.size
            };
            
        } catch (error) {
            console.error('❌ Progress photo processing failed:', error);
            throw error;
        }
    }

    async analyzeProgress(submission) {
        try {
            const analysis = {
                qualityScore: 0,
                completionAssessment: 'unknown',
                recommendations: [],
                flaggedIssues: []
            };
            
            // Basic analysis based on description and completion percentage
            if (submission.description && submission.description.length > 50) {
                analysis.qualityScore += 25;
            }
            
            if (submission.photos && submission.photos.length >= 3) {
                analysis.qualityScore += 25;
            }
            
            if (submission.percentComplete > 0) {
                analysis.qualityScore += 25;
            }
            
            if (submission.nextSteps && submission.nextSteps.length > 0) {
                analysis.qualityScore += 25;
            }
            
            // Assess completion status
            if (submission.percentComplete >= 90) {
                analysis.completionAssessment = 'near_completion';
                analysis.recommendations.push('Schedule final inspection');
            } else if (submission.percentComplete >= 50) {
                analysis.completionAssessment = 'substantial_progress';
                analysis.recommendations.push('Continue monitoring progress');
            } else {
                analysis.completionAssessment = 'early_stage';
                analysis.recommendations.push('Verify adherence to approved plans');
            }
            
            return analysis;
            
        } catch (error) {
            console.error('❌ Progress analysis failed:', error);
            return { qualityScore: 0, error: error.message };
        }
    }

    async processViolationReport(permitId, violationData, files) {
        try {
            console.log(`⚠️ Processing violation report for permit ${permitId}`);
            
            const violation = {
                id: `VIOLATION_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                permitId: permitId,
                reportedBy: violationData.reportedBy,
                reportDate: new Date().toISOString(),
                violationType: violationData.type,
                severity: violationData.severity || 'medium',
                description: violationData.description,
                location: violationData.location,
                codeReferences: violationData.codeReferences || [],
                photos: [],
                status: 'open',
                actionRequired: violationData.actionRequired || true,
                deadline: violationData.deadline
            };
            
            // Process violation photos
            if (files && files.length > 0) {
                for (const file of files) {
                    const processedPhoto = await this.processViolationPhoto(file, violation.id, permitId);
                    violation.photos.push(processedPhoto);
                }
            }
            
            // Auto-categorize violation severity
            violation.autoAnalysis = this.analyzeViolationSeverity(violation);
            
            // Save violation report
            const violationPath = path.join(
                this.fieldUploadDir, 
                'violations', 
                `${violation.id}.json`
            );
            await fs.writeFile(violationPath, JSON.stringify(violation, null, 2));
            
            console.log(`✅ Violation report processed: ${violation.id}`);
            return violation;
            
        } catch (error) {
            console.error('❌ Violation report processing failed:', error);
            throw new Error(`Violation report failed: ${error.message}`);
        }
    }

    async processViolationPhoto(file, violationId, permitId) {
        try {
            const timestamp = Date.now();
            const filename = `violation_${permitId}_${violationId}_${timestamp}.jpg`;
            const fullPath = path.join(this.fieldUploadDir, 'violations', filename);
            
            // High quality for violation evidence
            try {
                await sharp(file.buffer)
                    .jpeg({ quality: 95 })
                    .toFile(fullPath);
            } catch (sharpError) {
                // Fallback: save original file
                await fs.writeFile(fullPath, file.buffer);
            }
            
            // Create thumbnail
            const thumbFilename = `thumb_${filename}`;
            const thumbPath = path.join(this.fieldUploadDir, 'violations', thumbFilename);
            
            try {
                await sharp(file.buffer)
                    .resize(300, 300, { fit: 'cover' })
                    .jpeg({ quality: 80 })
                    .toFile(thumbPath);
            } catch (sharpError) {
                console.warn('Thumbnail generation failed for violation photo');
            }
            
            return {
                id: `VIOLATION_PHOTO_${timestamp}`,
                filename: filename,
                path: fullPath,
                thumbnailPath: thumbPath,
                uploadTime: new Date().toISOString(),
                evidenceType: 'photo'
            };
            
        } catch (error) {
            console.error('❌ Violation photo processing failed:', error);
            throw error;
        }
    }

    analyzeViolationSeverity(violation) {
        const analysis = {
            computedSeverity: violation.severity,
            riskFactors: [],
            urgency: 'normal'
        };
        
        // Check for high-risk keywords
        const criticalKeywords = [
            'fire exit blocked', 'sprinkler disabled', 'alarm disconnected',
            'emergency', 'life safety', 'immediate danger'
        ];
        
        const description = violation.description.toLowerCase();
        criticalKeywords.forEach(keyword => {
            if (description.includes(keyword)) {
                analysis.riskFactors.push(keyword);
                analysis.computedSeverity = 'high';
                analysis.urgency = 'immediate';
            }
        });
        
        // Check NFPA code references
        if (violation.codeReferences.some(ref => ['101', '72', '13'].includes(ref))) {
            analysis.riskFactors.push('life_safety_codes');
        }
        
        return analysis;
    }

    async getMobileSubmissionStats(permitId) {
        try {
            const stats = {
                inspections: 0,
                progressSubmissions: 0,
                violations: 0,
                totalPhotos: 0,
                lastSubmission: null
            };
            
            try {
                const inspectionFiles = await fs.readdir(path.join(this.fieldUploadDir, 'inspections'));
                const inspectionJsonFiles = inspectionFiles.filter(f => f.endsWith('.json') && f.includes(permitId));
                stats.inspections = inspectionJsonFiles.length;
            } catch (e) { /* Directory might not exist */ }
            
            try {
                const progressFiles = await fs.readdir(path.join(this.fieldUploadDir, 'progress'));
                const progressJsonFiles = progressFiles.filter(f => f.endsWith('.json') && f.includes(permitId));
                stats.progressSubmissions = progressJsonFiles.length;
            } catch (e) { /* Directory might not exist */ }
            
            try {
                const violationFiles = await fs.readdir(path.join(this.fieldUploadDir, 'violations'));
                const violationJsonFiles = violationFiles.filter(f => f.endsWith('.json') && f.includes(permitId));
                stats.violations = violationJsonFiles.length;
            } catch (e) { /* Directory might not exist */ }
            
            return stats;
            
        } catch (error) {
            console.error('❌ Error getting mobile submission stats:', error);
            return { error: error.message };
        }
    }
}

module.exports = MobileSubmissionManager;
