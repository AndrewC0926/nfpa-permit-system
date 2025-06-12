import mongoose from 'mongoose';
import { User, UserRole } from '../src/models/User';
import { AuthUtils } from '../src/utils/auth';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/errcs-permits';

async function seed() {
  await mongoose.connect(MONGODB_URI);

  const users = [
    {
      email: 'contractor@test.com',
      password: await AuthUtils.hashPassword('password123'),
      firstName: 'Test',
      lastName: 'Contractor',
      role: UserRole.CONTRACTOR,
      organization: 'TestOrg',
      isActive: true
    },
    {
      email: 'inspector@test.com',
      password: await AuthUtils.hashPassword('password123'),
      firstName: 'Test',
      lastName: 'Inspector',
      role: UserRole.INSPECTOR,
      organization: 'TestOrg',
      isActive: true
    }
  ];

  for (const user of users) {
    const exists = await User.findOne({ email: user.email });
    if (!exists) {
      await User.create(user);
      console.log(`Seeded user: ${user.email}`);
    } else {
      console.log(`User already exists: ${user.email}`);
    }
  }

  await mongoose.disconnect();
  console.log('Seeding complete.');
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
}); 