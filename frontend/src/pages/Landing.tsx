import React, { useState, useEffect } from 'react';
import NavBar from '../components/NavBar';
import Chatbot from '../components/Chatbot';
import AboutSection from '../components/AboutSection';
import FoundersCallout from '../components/FoundersCallout';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Landing() {
  const [demoMode, setDemoMode] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('demo') === 'true') {
      setDemoMode(true);
      sessionStorage.setItem('vetria-demo', 'true');
    } else if (sessionStorage.getItem('vetria-demo') === 'true') {
      setDemoMode(true);
    }
  }, [location.search]);

  const handleDemoToggle = () => {
    setDemoMode((prev) => {
      const next = !prev;
      if (next) {
        sessionStorage.setItem('vetria-demo', 'true');
        navigate('?demo=true', { replace: true });
      } else {
        sessionStorage.removeItem('vetria-demo');
        navigate('/', { replace: true });
      }
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0a192f] to-[#1a2233] text-white font-inter relative overflow-x-hidden">
      <NavBar />
      <div className="flex flex-col md:flex-row w-full h-full">
        <AboutSection />
        <main className="flex-1 flex flex-col items-center justify-center px-4 py-24 animate-fade-in">
          <h1 className="text-5xl md:text-7xl font-bold mb-6 text-center drop-shadow-lg tracking-tight">Vetria</h1>
          <p className="text-xl md:text-2xl text-slate-300 mb-10 text-center max-w-2xl animate-fade-in-delay">Streamlining public safety compliance through AI and blockchain.</p>
          <button
            className={`mt-6 px-6 py-3 rounded-full font-semibold transition shadow-lg ${demoMode ? 'bg-cyan-600 text-white' : 'bg-slate-700 text-cyan-300 hover:bg-cyan-700 hover:text-white'}`}
            onClick={handleDemoToggle}
          >
            {demoMode ? 'Demo Mode: ON' : 'Enable Demo Mode'}
          </button>
          {demoMode && (
            <span className="mt-2 text-xs text-cyan-400 animate-pulse">Demo mode enabled — sample permits will be shown in dashboard.</span>
          )}
        </main>
      </div>
      <FoundersCallout />
      <Chatbot />
    </div>
  );
} 