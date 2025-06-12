import request from 'supertest';
import { app } from '../app'; // Adjust the import path as needed
import * as fs from 'fs';
import * as path from 'path';

describe('Document Upload Endpoint', () => {
  it('should upload a document successfully', async () => {
    const permitId = 'permit123'; // Replace with a valid permit ID
    const filePath = path.join(__dirname, 'sample.pdf'); // Replace with a valid file path

    // Ensure the file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const response = await request(app)
      .post(`/permits/${permitId}/documents`)
      .attach('document', filePath);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('url');
    expect(response.body).toHaveProperty('hash');
  });
}); 