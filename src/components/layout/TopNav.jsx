import { useRef } from 'react';
import { Bell, UserCircle } from 'lucide-react';
import { auth } from '../../../firebase';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import Magnetic from '../ui/Magnetic';

import ScrambleText from '../ui/ScrambleText';

gsap.registerPlugin(useGSAP);

export default function TopNav({ title = "Dashboard" }) {
  const headerRef = useRef();

  useGSAP(() => {
    gsap.from(headerRef.current, {
      y: -30,
      opacity: 0,
      duration: 0.6,
      ease: "power3.out",
      delay: 0.1
    });
  });

  return (
    <header ref={headerRef} className="sticky top-0 z-40 bg-[#0F172A]/80 backdrop-blur-md border-b border-slate-800 px-6 py-4 flex items-center justify-between">
      
      {/* Page Title & Term Info */}
      <div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          <ScrambleText text={title} delay={1.2} />
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 font-medium mt-0.5">Fall 2026 Term</p>
      </div>

      {/* Right Side Icons */}
      <div className="flex items-center gap-3 sm:gap-4">
        
        {/* Alerts/Notifications (e.g., upcoming midterm) */}
        <Magnetic>
          <button className="relative p-2 text-slate-400 hover:text-white transition-colors rounded-full hover:bg-slate-800">
            <Bell size={22} />
            {/* Unread indicator dot */}
            <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-indigo-500 rounded-full border-2 border-[#0F172A]"></span>
          </button>
        </Magnetic>
        
        {/* User Mini Profile */}
        <Magnetic>
          <div className="hidden sm:flex items-center gap-2 p-1 pl-2 pr-3 bg-slate-800/50 border border-slate-700 rounded-full cursor-pointer hover:bg-slate-700 transition-colors">
            <UserCircle size={24} className="text-indigo-400" />
            <span className="text-sm font-medium text-slate-200">{auth.currentUser?.email?.split('@')[0] || 'Student'}</span>
          </div>
        </Magnetic>
        
      </div>
    </header>
  );
}