const mongoose = require('mongoose');
const { User } = require('../src/models/User');
const { AuthUtils } = require('../src/utils/auth');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/errcs-permits';

async function seed() {
  await mongoose.connect(MONGODB_URI);

  const users = [
    {
      email: 'contractor@test.com',
      password: await AuthUtils.hashPassword('password123A!'),
      firstName: 'Test',
      lastName: 'Contractor',
      role: 'CONTRACTOR',
      organization: 'TestOrg',
      isActive: true
    },
    {
      email: 'inspector@test.com',
      password: await AuthUtils.hashPassword('password123A!'),
      firstName: 'Test',
      lastName: 'Inspector',
      role: 'INSPECTOR',
      organization: 'TestOrg',
      isActive: true
    }
  ];

  for (const user of users) {
    await User.findOneAndUpdate(
      { email: user.email },
      user,
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    console.log(`Upserted user: ${user.email}`);
  }

  await mongoose.disconnect();
  console.log('Seeding complete.');
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
}); 