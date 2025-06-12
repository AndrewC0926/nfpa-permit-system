require('dotenv').config({ path: require('path').resolve(__dirname, '../../.env') });
const axios = require('axios');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// Debug logging
console.log('Environment variables:');
console.log('MONGO_URI:', process.env.MONGO_URI ? 'Set' : 'Not set');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'Set' : 'Not set');
console.log('API_URL:', process.env.API_URL || 'http://localhost:3000/api');

const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nfpa-permit-system';
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const HEALTHCHECK_JWT = process.env.HEALTHCHECK_JWT;

const TEST_PERMIT_ID = process.env.TEST_PERMIT_ID || 'dummyPermitId';
const TEST_DOCUMENT_ID = process.env.TEST_DOCUMENT_ID || 'dummyDocumentId';

function logResult(ok, msg) {
  if (ok) {
    console.log(`\x1b[32mPASS\x1b[0m - ${msg}`);
  } else {
    console.log(`\x1b[31mFAIL\x1b[0m - ${msg}`);
  }
}

async function checkMongo() {
  try {
    await mongoose.connect(MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
    logResult(true, 'MongoDB connection');
    await mongoose.disconnect();
    return true;
  } catch (err) {
    logResult(false, `MongoDB connection: ${err.message}`);
    return false;
  }
}

function getToken() {
  if (HEALTHCHECK_JWT) return HEALTHCHECK_JWT;
  if (!JWT_SECRET) return null;
  // Use a dummy user id for testing
  return jwt.sign({ id: 'healthcheckuser', role: 'ADMIN' }, JWT_SECRET, { expiresIn: '1h' });
}

async function checkEndpoint({ method, url, data, token, expectStatus = 200, description }) {
  try {
    const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) };
    if (method === 'post') headers['Content-Type'] = 'application/json';
    const res = await axios({ method, url, data, headers, validateStatus: () => true });
    if (res.status === expectStatus) {
      logResult(true, description);
      return true;
    } else {
      logResult(false, `${description}: HTTP ${res.status} ${JSON.stringify(res.data)}`);
      return false;
    }
  } catch (err) {
    logResult(false, `${description}: ${err.message}`);
    return false;
  }
}

async function main() {
  let allOk = true;
  console.log('--- Backend Health Check ---');

  // Check MongoDB
  if (!(await checkMongo())) allOk = false;

  // Prepare JWT
  const token = getToken();
  if (!token) {
    logResult(false, 'JWT secret not set, cannot test protected endpoints');
    allOk = false;
  }

  // API endpoint checks
  const endpoints = [
    {
      method: 'get',
      url: `${API_URL}/health`,
      description: 'GET /api/health',
      expectStatus: 200,
    },
    {
      method: 'post',
      url: `${API_URL}/permits/validate`,
      data: { permitId: TEST_PERMIT_ID },
      token,
      description: 'POST /api/permits/validate',
      expectStatus: 200,
    },
    {
      method: 'get',
      url: `${API_URL}/permits/${TEST_PERMIT_ID}`,
      token,
      description: 'GET /api/permits/:id',
      expectStatus: 200,
    },
    {
      method: 'post',
      url: `${API_URL}/documents/upload`,
      data: { documentId: TEST_DOCUMENT_ID, file: 'dummy' },
      token,
      description: 'POST /api/documents/upload',
      expectStatus: 200,
    },
    {
      method: 'get',
      url: `${API_URL}/permits/export/pdf/${TEST_PERMIT_ID}`,
      token,
      description: 'GET /api/permits/export/pdf/:id',
      expectStatus: 200,
    },
    {
      method: 'post',
      url: `${API_URL}/webhooks/ai-analysis`,
      data: { permitId: TEST_PERMIT_ID, analysis: {} },
      token,
      description: 'POST /api/webhooks/ai-analysis',
      expectStatus: 200,
    },
  ];

  for (const ep of endpoints) {
    const ok = await checkEndpoint(ep);
    if (!ok) allOk = false;
  }

  console.log('\n--- Summary ---');
  if (allOk) {
    console.log('\x1b[32mAll checks passed!\x1b[0m');
    process.exit(0);
  } else {
    console.log('\x1b[31mSome checks failed.\x1b[0m');
    process.exit(1);
  }
}

main(); 