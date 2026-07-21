import React, { useState, useEffect } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

export default function InitialLoader({ onComplete }) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Initializing Core Systems...");
  
  useGSAP(() => {
    // Prevent scrolling while loading
    document.body.style.overflow = 'hidden';

    const tl = gsap.timeline({
      onComplete: () => {
        document.body.style.overflow = 'auto';
        
        // Sweep out animation
        gsap.to('.initial-loader-overlay', {
          yPercent: -100,
          duration: 1.2,
          ease: "power4.inOut",
          onComplete: () => {
            sessionStorage.setItem('hasSeenInitialLoader', 'true');
            onComplete();
          }
        });
      }
    });

    // Simulate progress
    const dummy = { val: 0 };
    tl.to(dummy, {
      val: 100,
      duration: 2.5,
      ease: "power2.out",
      onUpdate: () => {
        const val = Math.floor(dummy.val);
        setProgress(val);
        
        if (val === 25) setStatus("Loading Student Modules...");
        if (val === 60) setStatus("Syncing Firestore Data...");
        if (val === 85) setStatus("Compiling Interface...");
        if (val === 98) setStatus("System Ready.");
      }
    });

    // Glitch text effect on the main logo
    gsap.to('.loader-glitch', {
      x: () => Math.random() * 10 - 5,
      y: () => Math.random() * 10 - 5,
      duration: 0.1,
      repeat: 10,
      yoyo: true,
      ease: "none",
      delay: 0.5
    });

  }, []);

  return (
    <div className="initial-loader-overlay fixed inset-0 z-[999999] bg-[#0A0F1C] flex flex-col items-center justify-center overflow-hidden border-b-2 border-blue-500 shadow-[0_0_50px_rgba(59,130,246,0.3)]">
      
      {/* Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-20" 
        style={{ 
          backgroundImage: 'linear-gradient(rgba(59, 130, 246, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.5) 1px, transparent 1px)', 
          backgroundSize: '40px 40px' 
        }}
      />
      
      {/* Glow */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-900/10 to-[#0A0F1C]" />

      <div className="relative z-10 flex flex-col items-center max-w-md w-full px-8">
        
        {/* Logo */}
        <div className="loader-glitch text-6xl sm:text-8xl font-black text-blue-500 font-mono tracking-tighter mb-12 select-none">
          &lt; _ /&gt;
        </div>

        {/* Progress Bar Container */}
        <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden mb-4 relative">
          <div 
            className="h-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)] rounded-full transition-all duration-75"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Status Text & Percentage */}
        <div className="w-full flex justify-between items-center font-mono text-xs tracking-widest text-blue-400 uppercase">
          <span className="animate-pulse">{status}</span>
          <span>{progress}%</span>
        </div>
        
      </div>
    </div>
  );
}
