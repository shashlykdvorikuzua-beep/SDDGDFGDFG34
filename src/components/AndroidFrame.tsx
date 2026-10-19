import React from 'react';

interface AndroidFrameProps {
  children: React.ReactNode;
}

export const AndroidFrame: React.FC<AndroidFrameProps> = ({ children }) => {
  return (
    <div className="min-h-screen w-full bg-[#040609] flex justify-center text-slate-100 antialiased selection:bg-blue-600 selection:text-white">
      {/* Pure Mobile Application Layout (full width on mobile, max-w-md on desktop) */}
      <div className="w-full max-w-md min-h-screen bg-[#07090E] flex flex-col relative border-x border-white/[0.05] shadow-2xl">
        {children}
      </div>
    </div>
  );
};

