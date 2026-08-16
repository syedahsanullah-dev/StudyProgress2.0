import { useState, useRef } from 'react';
import { DownloadCloud, UserCircle, Loader2, Check } from 'lucide-react';
import { auth } from '../../../firebase';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import Magnetic from '../ui/Magnetic';
import ScrambleText from '../ui/ScrambleText';
import SemesterSelector from './SemesterSelector';
import useStore from '../../store/useStore';

gsap.registerPlugin(useGSAP);

export default function TopNav({ title = "Dashboard" }) {
  const headerRef = useRef();
  const { downloadAllData } = useStore();
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  useGSAP(() => {
    gsap.from(headerRef.current, {
      y: -30,
      opacity: 0,
      duration: 0.6,
      ease: "power3.out",
      delay: 0.1
    });
  });

  const handleQuickDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    const success = await downloadAllData();
    setIsDownloading(false);
    if (success) {
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 2500);
    }
  };

  return (
    <header ref={headerRef} className="sticky top-0 z-40 bg-[#0F172A]/80 backdrop-blur-md border-b border-slate-800 px-4 sm:px-8 py-3.5 flex items-center justify-between gap-4">
      
      {/* Page Title & Semester Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 min-w-0">
        <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight shrink-0">
          <ScrambleText text={title} delay={1.2} />
        </h1>
        <div className="flex items-center">
          <SemesterSelector />
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-2 sm:gap-3 shrink-0">
        
        {/* Quick Backup/Download Firestore Data */}
        <Magnetic>
          <button 
            onClick={handleQuickDownload}
            disabled={isDownloading}
            className={`p-2.5 rounded-xl border transition-all flex items-center gap-1.5 text-xs font-semibold ${
              downloadSuccess
                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                : 'bg-slate-800/60 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-700/60 hover:border-slate-600'
            }`}
            title="Download complete Firestore JSON backup"
          >
            {isDownloading ? (
              <Loader2 size={18} className="animate-spin text-indigo-400" />
            ) : downloadSuccess ? (
              <>
                <Check size={18} className="text-emerald-400" />
                <span className="hidden md:inline">Backed Up</span>
              </>
            ) : (
              <>
                <DownloadCloud size={18} className="text-indigo-400" />
                <span className="hidden md:inline">Backup Data</span>
              </>
            )}
          </button>
        </Magnetic>
        
        {/* User Mini Profile */}
        <Magnetic>
          <div className="hidden sm:flex items-center gap-2 p-1 pl-2 pr-3 bg-slate-800/50 border border-slate-700 rounded-full cursor-pointer hover:bg-slate-700 transition-colors">
            <UserCircle size={22} className="text-indigo-400" />
            <span className="text-xs sm:text-sm font-medium text-slate-200 truncate max-w-[120px]">
              {auth.currentUser?.displayName || auth.currentUser?.email?.split('@')[0] || 'Student'}
            </span>
          </div>
        </Magnetic>
        
      </div>
    </header>
  );
}