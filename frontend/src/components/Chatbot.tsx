import React, { useState } from 'react';
import { PaperAirplaneIcon } from '@heroicons/react/24/solid';

export default function Chatbot() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([
    { from: 'bot', text: "Hi! I'm Vetria. Ask me anything about permit timelines or compliance." },
  ]);

  const sendMessage = () => {
    if (!input.trim()) return;
    setMessages([...messages, { from: 'user', text: input }]);
    setInput('');
    // Here you would call your backend/chat API and append the response
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 animate-fade-in">
      {open ? (
        <div className="w-80 bg-[#181f2a] rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-700">
          <div className="flex items-center justify-between px-4 py-2 bg-[#101828]">
            <span className="font-semibold text-cyan-400">Vetria Chatbot</span>
            <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-cyan-400">✕</button>
          </div>
          <div className="flex-1 px-4 py-2 space-y-2 overflow-y-auto max-h-60">
            {messages.map((msg, i) => (
              <div key={i} className={`text-sm ${msg.from === 'bot' ? 'text-cyan-300' : 'text-white text-right'}`}>{msg.text}</div>
            ))}
          </div>
          <div className="flex items-center px-4 py-3 bg-[#101828]">
            <input
              className="flex-1 rounded-full px-4 py-2 bg-[#232b3a] text-white focus:outline-none focus:ring-2 focus:ring-cyan-400 animate-pulse"
              placeholder="Type your question..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
            />
            <button onClick={sendMessage} className="ml-2 p-2 rounded-full bg-cyan-500 hover:bg-cyan-600 transition">
              <PaperAirplaneIcon className="h-5 w-5 text-white" />
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setOpen(true)}
          className="bg-cyan-500 hover:bg-cyan-600 text-white rounded-full p-4 shadow-lg animate-pulse"
          aria-label="Open chatbot"
        >
          <svg className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10" /></svg>
        </button>
      )}
    </div>
  );
} 