import React from 'react';

export default function AboutSection() {
  return (
    <aside className="hidden md:flex flex-col justify-center items-start w-80 min-h-[60vh] px-8 py-12 bg-gradient-to-b from-[#101828] to-[#181f2a] border-r border-slate-800 animate-fade-in-left">
      <h2 className="text-lg font-semibold text-cyan-400 mb-4 tracking-wide">Our Mission</h2>
      <p className="text-base text-slate-300 leading-relaxed">
        Vetria streamlines public safety compliance through AI and blockchain, enabling faster, smarter permitting and safer communities.
      </p>
    </aside>
  );
} 