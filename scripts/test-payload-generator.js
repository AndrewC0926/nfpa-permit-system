const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { faker } = require('@faker-js/faker');

// Configuration
const config = {
  outputDir: path.join(__dirname, '..', 'test', 'payloads'),
  numPermits: 100,
  numUsers: 50,
  numDocuments: 200
};

// Utility functions
const generateId = () => crypto.randomBytes(16).toString('hex');
const generateDate = (start, end) => faker.date.between({ from: start, to: end });
const generateAddress = () => ({
  street: faker.location.streetAddress(),
  city: faker.location.city(),
  state: faker.location.state(),
  zipCode: faker.location.zipCode(),
  country: 'USA'
});

// Generate test data
const generateUserPayload = () => ({
  id: generateId(),
  email: faker.internet.email(),
  password: faker.internet.password(),
  firstName: faker.person.firstName(),
  lastName: faker.person.lastName(),
  role: faker.helpers.arrayElement(['applicant', 'reviewer', 'admin']),
  department: faker.helpers.arrayElement(['Fire', 'Building', 'Planning']),
  phone: faker.phone.number(),
  address: generateAddress(),
  createdAt: generateDate('2023-01-01', '2024-01-01'),
  updatedAt: generateDate('2024-01-01', new Date())
});

const generatePermitPayload = () => {
  const startDate = generateDate('2024-01-01', '2024-12-31');
  return {
    id: generateId(),
    type: faker.helpers.arrayElement(['Building', 'Fire', 'Electrical', 'Plumbing']),
    status: faker.helpers.arrayElement(['pending', 'approved', 'rejected', 'in_review']),
    applicantId: generateId(),
    reviewerId: faker.helpers.maybe(() => generateId(), { probability: 0.7 }),
    projectName: faker.company.name(),
    description: faker.lorem.paragraph(),
    location: generateAddress(),
    startDate,
    endDate: faker.helpers.maybe(() => generateDate(startDate, '2025-12-31'), { probability: 0.8 }),
    cost: faker.number.float({ min: 1000, max: 1000000, precision: 2 }),
    documents: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => generateId()),
    requirements: Array.from({ length: faker.number.int({ min: 1, max: 10 }) }, () => ({
      id: generateId(),
      name: faker.lorem.words(3),
      status: faker.helpers.arrayElement(['pending', 'completed', 'waived']),
      dueDate: generateDate(startDate, '2025-12-31')
    })),
    inspections: Array.from({ length: faker.number.int({ min: 0, max: 3 }) }, () => ({
      id: generateId(),
      type: faker.helpers.arrayElement(['initial', 'progress', 'final']),
      status: faker.helpers.arrayElement(['scheduled', 'completed', 'failed']),
      date: generateDate(startDate, '2025-12-31'),
      inspectorId: generateId(),
      notes: faker.lorem.paragraph()
    })),
    createdAt: generateDate('2023-01-01', startDate),
    updatedAt: generateDate(startDate, new Date())
  };
};

const generateDocumentPayload = () => ({
  id: generateId(),
  type: faker.helpers.arrayElement(['plan', 'certificate', 'inspection', 'photo', 'report']),
  name: faker.system.fileName(),
  description: faker.lorem.sentence(),
  size: faker.number.int({ min: 1024, max: 10485760 }), // 1KB to 10MB
  mimeType: faker.helpers.arrayElement([
    'application/pdf',
    'image/jpeg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  ]),
  permitId: generateId(),
  uploadedBy: generateId(),
  uploadedAt: generateDate('2023-01-01', new Date()),
  status: faker.helpers.arrayElement(['pending', 'approved', 'rejected']),
  metadata: {
    version: faker.system.semver(),
    author: faker.person.fullName(),
    lastModified: generateDate('2023-01-01', new Date()),
    tags: Array.from({ length: faker.number.int({ min: 1, max: 5 }) }, () => faker.word.sample())
  }
});

const generateBlockchainPayload = () => ({
  id: generateId(),
  type: faker.helpers.arrayElement(['permit', 'document', 'inspection']),
  action: faker.helpers.arrayElement(['create', 'update', 'delete']),
  timestamp: new Date().toISOString(),
  data: {
    permitId: generateId(),
    userId: generateId(),
    changes: {
      status: faker.helpers.arrayElement(['pending', 'approved', 'rejected']),
      notes: faker.lorem.paragraph()
    }
  },
  signature: crypto.randomBytes(64).toString('hex'),
  previousHash: crypto.randomBytes(32).toString('hex'),
  hash: crypto.randomBytes(32).toString('hex')
});

// Generate test payloads
const generateTestPayloads = async () => {
  console.log('Generating test payloads...');

  // Create output directory if it doesn't exist
  await fs.mkdir(config.outputDir, { recursive: true });

  // Generate users
  const users = Array.from({ length: config.numUsers }, generateUserPayload);
  await fs.writeFile(
    path.join(config.outputDir, 'users.json'),
    JSON.stringify(users, null, 2)
  );

  // Generate permits
  const permits = Array.from({ length: config.numPermits }, generatePermitPayload);
  await fs.writeFile(
    path.join(config.outputDir, 'permits.json'),
    JSON.stringify(permits, null, 2)
  );

  // Generate documents
  const documents = Array.from({ length: config.numDocuments }, generateDocumentPayload);
  await fs.writeFile(
    path.join(config.outputDir, 'documents.json'),
    JSON.stringify(documents, null, 2)
  );

  // Generate blockchain transactions
  const blockchain = Array.from({ length: config.numPermits * 2 }, generateBlockchainPayload);
  await fs.writeFile(
    path.join(config.outputDir, 'blockchain.json'),
    JSON.stringify(blockchain, null, 2)
  );

  // Generate API test cases
  const apiTests = {
    auth: {
      register: users[0],
      login: {
        email: users[0].email,
        password: users[0].password
      }
    },
    permits: {
      create: permits[0],
      update: {
        id: permits[0].id,
        status: 'approved',
        notes: 'All requirements met'
      },
      list: {
        page: 1,
        limit: 10,
        status: 'pending'
      }
    },
    documents: {
      upload: documents[0],
      update: {
        id: documents[0].id,
        status: 'approved',
        notes: 'Document verified'
      },
      list: {
        permitId: permits[0].id,
        page: 1,
        limit: 10
      }
    },
    blockchain: {
      query: {
        permitId: permits[0].id,
        startDate: '2024-01-01',
        endDate: '2024-12-31'
      },
      verify: {
        id: blockchain[0].id,
        hash: blockchain[0].hash
      }
    }
  };

  await fs.writeFile(
    path.join(config.outputDir, 'api-tests.json'),
    JSON.stringify(apiTests, null, 2)
  );

  console.log('Test payloads generated successfully!');
  console.log(`Generated ${users.length} users`);
  console.log(`Generated ${permits.length} permits`);
  console.log(`Generated ${documents.length} documents`);
  console.log(`Generated ${blockchain.length} blockchain transactions`);
};

// Run generator if called directly
if (require.main === module) {
  generateTestPayloads()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Failed to generate test payloads:', error);
      process.exit(1);
    });
}

module.exports = {
  generateUserPayload,
  generatePermitPayload,
  generateDocumentPayload,
  generateBlockchainPayload,
  generateTestPayloads
}; 