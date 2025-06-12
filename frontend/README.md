# NFPA Permit System Frontend

A modern React application for managing NFPA permits with AI-powered compliance checking.

## Features

- Multi-step ERRCS permit submission form
- Real-time AI compliance checking
- Document management with version control
- Interactive dashboard with permit statistics
- Role-based access control
- Mobile-responsive design

## Technology Stack

- React 18 with TypeScript
- Material-UI v5 for UI components
- React Query for server state management
- Formik & Yup for form handling and validation
- Vite for fast development and building
- JWT for authentication
- Axios for API communication

## Getting Started

### Prerequisites

- Node.js >= 18
- npm >= 8

### Installation

1. Clone the repository
2. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Create a `.env` file in the root directory with the following content:
   ```
   VITE_API_BASE_URL=http://localhost:4000/api
   VITE_APP_TITLE=NFPA Permit System
   ```

### Development

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:3000`.

### Building for Production

Build the application:

```bash
npm run build
```

The built files will be in the `dist` directory.

### Running Tests

```bash
npm run test
```

## Project Structure

```
src/
├── components/     # Reusable UI components
├── contexts/       # React contexts (auth, theme, etc.)
├── pages/         # Page components
├── services/      # API services
├── types/         # TypeScript type definitions
├── utils/         # Utility functions
└── App.tsx        # Main application component
```

## Environment Variables

- `VITE_API_BASE_URL`: Backend API URL
- `VITE_APP_TITLE`: Application title

## Contributing

1. Create a feature branch
2. Make your changes
3. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Rootless, CI/CD-Safe Usage

- All build and test scripts are designed to run as a normal user only.
- No root or sudo required for any operation.
- All scripts and builds are safe to run in Vercel, Docker, or GitHub Actions runners.
- No password prompts or interactive sudo required at any stage. 