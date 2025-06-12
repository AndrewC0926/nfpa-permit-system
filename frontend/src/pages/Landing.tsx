import React from 'react';
import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-blue-100">
      <h1 className="text-4xl font-bold mb-4">Welcome to Vetria Permitting</h1>
      <p className="mb-8 text-lg text-gray-700">AI-powered, blockchain-secured NFPA permit management for cities and contractors.</p>
      <Link to="/login">
        <button className="px-6 py-3 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 transition">Start Demo</button>
      </Link>
    </div>
  );
} 