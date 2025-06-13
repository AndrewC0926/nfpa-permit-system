import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { HomeIcon, InformationCircleIcon, PlusCircleIcon } from '@heroicons/react/24/outline';

const nav = [
  { name: 'Home', href: '/', icon: HomeIcon },
  { name: 'About', href: '#about', icon: InformationCircleIcon },
  { name: 'New Permit', href: '/permits/new', icon: PlusCircleIcon },
];

export default function NavBar() {
  const location = useLocation();
  return (
    <nav className="w-full flex items-center justify-between px-6 py-4 bg-[#101828] bg-opacity-90 shadow-lg z-50 fixed top-0 left-0 animate-fade-in">
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold tracking-tight text-white">Vetria</span>
      </div>
      <ul className="flex gap-6 items-center">
        {nav.map((item) => (
          <li key={item.name}>
            <Link
              to={item.href}
              className={`flex items-center gap-1 px-3 py-2 rounded-lg font-medium transition hover:bg-[#1a2233] hover:text-cyan-400 ${location.pathname === item.href ? 'text-cyan-400' : 'text-white'}`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
} 