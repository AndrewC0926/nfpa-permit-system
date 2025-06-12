// generate-token.js
const jwt = require('jsonwebtoken');

// Make sure this matches your JWT_SECRET in .env
const secret = 'supersecuresecretkey';

const payload = {
  id: 'user123',
  email: 'test@example.com',
  role: 'admin'
};

const token = jwt.sign(payload, secret, { expiresIn: '1h' });

console.log('\n✅ JWT Token:\n');
console.log(token);
