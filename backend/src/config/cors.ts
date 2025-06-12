import cors from 'cors';

export const corsOptions = {
  origin: [
    'https://vetria.ai',
    'http://localhost:3000',
    'http://localhost:5173',
    'http://localhost:3005',
  ],
  credentials: true,
};

export default cors(corsOptions); 