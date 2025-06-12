import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { StorageService } from '../storageService';
import { Document } from '../../types/permit';
import { UploadedFile } from 'express-fileupload';

// Mock the S3 client
jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({
    send: jest.fn()
  })),
  PutObjectCommand: jest.fn()
}));

describe('StorageService', () => {
  let storageService: StorageService;
  const mockConfig = {
    region: 'us-east-1',
    bucket: 'test-bucket',
    accessKeyId: 'test-key',
    secretAccessKey: 'test-secret'
  };

  beforeEach(() => {
    storageService = new StorageService(
      mockConfig.region,
      mockConfig.bucket,
      mockConfig.accessKeyId,
      mockConfig.secretAccessKey
    );
    jest.clearAllMocks();
  });

  describe('uploadFile', () => {
    const mockDocument: Document = {
      id: 'doc123',
      name: 'test.pdf',
      type: 'application/pdf',
      hash: 'abc123',
      status: 'PENDING',
      url: '',
      uploadedAt: new Date().toISOString()
    };

    it('should successfully upload a file to S3', async () => {
      const mockS3Client = new S3Client({});
      (mockS3Client.send as jest.Mock).mockResolvedValueOnce({});

      const result = await storageService.uploadFile(mockDocument);

      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: mockConfig.bucket,
        Key: `permits/${mockDocument.id}/${mockDocument.name}`,
        Body: expect.any(Buffer),
        ContentType: mockDocument.type,
        Metadata: {
          'document-id': mockDocument.id,
          'content-hash': mockDocument.hash
        }
      });

      expect(result).toBe(`https://${mockConfig.bucket}.s3.${mockConfig.region}.amazonaws.com/permits/${mockDocument.id}/${mockDocument.name}`);
    });

    it('should throw an error when upload fails', async () => {
      const mockS3Client = new S3Client({});
      (mockS3Client.send as jest.Mock).mockRejectedValueOnce(new Error('S3 error'));

      await expect(storageService.uploadFile(mockDocument)).rejects.toThrow('Failed to upload file');
    });
  });

  describe('getFileUrl', () => {
    const mockDocument: Document = {
      id: 'doc123',
      name: 'test.pdf',
      type: 'application/pdf',
      hash: 'abc123',
      status: 'PENDING',
      url: '',
      uploadedAt: new Date().toISOString()
    };

    it('should return the correct S3 URL', async () => {
      const url = await storageService.getFileUrl(mockDocument);
      expect(url).toBe(`https://${mockConfig.bucket}.s3.${mockConfig.region}.amazonaws.com/permits/${mockDocument.id}/${mockDocument.name}`);
    });
  });

  describe('uploadDocument', () => {
    const mockFile: Partial<UploadedFile> = {
      data: Buffer.from('test data'),
      mimetype: 'application/pdf'
    };

    it('should successfully upload a document', async () => {
      const mockS3Client = new S3Client({});
      (mockS3Client.send as jest.Mock).mockResolvedValueOnce({});

      const result = await storageService.uploadDocument('permit123', mockFile as UploadedFile, 'test.pdf');

      expect(PutObjectCommand).toHaveBeenCalledWith({
        Bucket: mockConfig.bucket,
        Key: 'permits/permit123/test.pdf',
        Body: mockFile.data,
        ContentType: mockFile.mimetype
      });

      expect(result).toBe(`https://${mockConfig.bucket}.s3.amazonaws.com/permits/permit123/test.pdf`);
    });

    it('should throw an error when document upload fails', async () => {
      const mockS3Client = new S3Client({});
      (mockS3Client.send as jest.Mock).mockRejectedValueOnce(new Error('S3 error'));

      await expect(storageService.uploadDocument('permit123', mockFile as UploadedFile, 'test.pdf'))
        .rejects.toThrow('Failed to upload document to storage');
    });
  });

  describe('deleteFile', () => {
    const mockDocument: Document = {
      id: 'doc123',
      name: 'test.pdf',
      type: 'application/pdf',
      hash: 'abc123',
      status: 'PENDING',
      url: '',
      uploadedAt: new Date().toISOString()
    };

    it('should throw not implemented error', async () => {
      await expect(storageService.deleteFile(mockDocument)).rejects.toThrow('Not implemented');
    });
  });
}); 