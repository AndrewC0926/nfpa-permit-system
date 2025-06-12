import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Document } from '../types/permit';
import { createHash } from 'crypto';
import { UploadedFile } from 'express-fileupload';

// Fail fast if run as root or with sudo
if (typeof process.getuid === 'function' && process.getuid() === 0) {
  // eslint-disable-next-line no-console
  console.error('❌ Do not run the backend as root or with sudo. Exiting.');
  process.exit(1);
}
if (process.env.SUDO_USER) {
  // eslint-disable-next-line no-console
  console.error('❌ Do not run the backend with sudo. Exiting.');
  process.exit(1);
}

export class StorageService {
    private s3Client: S3Client;
    private bucket: string;
    private region: string;

    constructor(region: string, bucket: string, accessKeyId: string, secretAccessKey: string) {
        this.bucket = bucket;
        this.region = region;
        this.s3Client = new S3Client({
            region,
            credentials: {
                accessKeyId,
                secretAccessKey
            }
        });
    }

    async uploadFile(document: Document): Promise<string> {
        try {
            const key = `permits/${document.id}/${document.name}`;
            
            // In a real implementation, you'd get the actual file content here
            const buffer = Buffer.from('Mock file content');

            const command = new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: buffer,
                ContentType: document.type,
                Metadata: {
                    'document-id': document.id,
                    'content-hash': document.hash
                }
            });

            await this.s3Client.send(command);

            // Return the S3 URL
            return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${key}`;
        } catch (error) {
            console.error('Error uploading file to S3:', error);
            throw new Error('Failed to upload file');
        }
    }

    async deleteFile(document: Document): Promise<void> {
        // Implement file deletion logic
        throw new Error('Not implemented');
    }

    async getFileUrl(document: Document): Promise<string> {
        return `https://${this.bucket}.s3.${this.region}.amazonaws.com/permits/${document.id}/${document.name}`;
    }

    async uploadDocument(permitId: string, file: UploadedFile, fileName: string): Promise<{ url: string, hash: string }> {
        try {
            const key = `permits/${permitId}/${fileName}`;
            // Generate SHA-256 hash of the file
            const hash = createHash('sha256').update(file.data).digest('hex');

            await this.s3Client.send(new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: file.data,
                ContentType: file.mimetype,
                Metadata: {
                    'content-hash': hash
                }
            }));

            return {
                url: `https://${this.bucket}.s3.amazonaws.com/${key}`,
                hash
            };
        } catch (error) {
            console.error('Error uploading document to S3:', error);
            throw new Error('Failed to upload document to storage');
        }
    }
} 