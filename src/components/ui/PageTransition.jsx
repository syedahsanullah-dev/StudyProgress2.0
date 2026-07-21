import { useEffect, useState, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import gsap from 'gsap';
import ScrambleText from './ScrambleText';
import TypewriterText from './TypewriterText';

export function LoadingScreen({ id, skipInitialAnimation = false }) {
  const location = useLocation();
  const [animationKey, setAnimationKey] = useState(0);
  const isFirstMount = useRef(true);

  // Reset animations exactly when the sweep-down starts
  useEffect(() => {
    const handleStart = () => setAnimationKey(prev => prev + 1);
    window.addEventListener('transition-start', handleStart);
    return () => window.removeEventListener('transition-start', handleStart);
  }, []);

  useEffect(() => {
    // Scroll to the top of the new page
    window.scrollTo(0, 0);

    const overlay = document.getElementById('page-transition-overlay');
    if (overlay) {
      if (isFirstMount.current && skipInitialAnimation) {
        gsap.set(overlay, { yPercent: -100 });
      } else {
        // Entrance Animation: Sweep the overlay OUT (upwards)
        gsap.fromTo(overlay,
          { yPercent: 0 },
          { yPercent: -100, duration: 1.2, ease: "power4.inOut", delay: 0.8 }
        );
      }
      isFirstMount.current = false;
    }
  }, [location.pathname, skipInitialAnimation]);

  return (
      <div 
        id={id}
        className={`fixed inset-0 z-[99999] bg-[#0A0F1C] pointer-events-none flex flex-col items-center justify-center overflow-hidden border-b-2 border-blue-500 shadow-[0_0_50px_rgba(59,130,246,0.3)] ${isFirstMount.current && skipInitialAnimation ? '-translate-y-full' : ''}`}
      >
        {/* Blueprint / Tech Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-20" 
          style={{ 
            backgroundImage: 'linear-gradient(rgba(59, 130, 246, 0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(59, 130, 246, 0.5) 1px, transparent 1px)', 
            backgroundSize: '40px 40px' 
          }}
        />
        
        {/* Subtle Screen Glow */}
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-900/10 to-[#0A0F1C]" />

        {/* Constellation of Tech Typography (Optimized for CPU) */}
        <div className="absolute top-[20%] left-[30%] text-indigo-400/20 font-mono text-3xl font-black rotate-[15deg] select-none tracking-tighter">&lt;/&gt;</div>
        <div className="absolute bottom-[30%] right-[20%] text-emerald-400/20 font-mono text-4xl font-black -rotate-[10deg] select-none tracking-tighter">{'{ }'}</div>
        <div className="absolute top-[15%] right-[5%] text-amber-400/20 font-mono text-2xl font-black rotate-[25deg] select-none tracking-tighter">[ ]</div>
        <div className="absolute bottom-[10%] left-[40%] text-indigo-400/20 font-mono text-xl font-black -rotate-[15deg] select-none tracking-tighter">()</div>
        <div className="absolute top-[50%] left-[10%] text-emerald-400/20 font-mono text-2xl font-black rotate-[5deg] select-none tracking-tighter">//</div>
        <div className="absolute top-[5%] left-[60%] text-rose-400/20 font-mono text-3xl font-black -rotate-[25deg] select-none tracking-tighter">=&gt;</div>
        <div className="absolute bottom-[50%] right-[5%] text-indigo-400/20 font-mono text-xl font-black rotate-[45deg] select-none tracking-tighter">===</div>
        <div className="absolute top-[30%] left-[5%] text-amber-400/20 font-mono text-2xl font-black -rotate-[5deg] select-none tracking-tighter">&amp;&amp;</div>
        <div className="absolute bottom-[20%] left-[15%] text-emerald-400/20 font-mono text-2xl font-black rotate-[10deg] select-none tracking-tighter">||</div>
        <div className="absolute top-[10%] left-[5%] text-indigo-400/20 font-mono text-4xl font-black rotate-[15deg] select-none tracking-tighter">;</div>
        <div className="absolute bottom-[15%] right-[40%] text-rose-400/20 font-mono text-xl font-black -rotate-[15deg] select-none tracking-tighter">!=</div>
        <div className="absolute top-[40%] right-[25%] text-amber-400/20 font-mono text-5xl font-black rotate-[30deg] select-none tracking-tighter">*</div>
        <div className="absolute bottom-[5%] right-[5%] text-slate-400/20 font-mono text-3xl font-black -rotate-[10deg] select-none tracking-tighter">404</div>
        <div className="absolute top-[55%] left-[35%] text-emerald-400/20 font-mono text-xl font-black rotate-[15deg] select-none tracking-tighter">NaN</div>
        <div className="absolute top-[75%] left-[60%] text-indigo-400/20 font-mono text-2xl font-black -rotate-[5deg] select-none tracking-tighter">sudo</div>

        {/* Central Code Element */}
        <div className="relative z-10 flex flex-col items-center font-mono text-blue-400">
          <div className="relative inline-block text-7xl sm:text-9xl font-extrabold tracking-tighter mb-4 animate-scale-pulse">
            &lt; _ /&gt;
          </div>
          <div className="relative inline-block text-sm sm:text-2xl mt-4 tracking-[0.3em] font-bold uppercase text-blue-300">
            <TypewriterText key={animationKey} text="> Compiling Module..." delay={1.1} speed={25} />
          </div>
        </div>
      </div>
  );
}

export default function PageTransition({ children, skipInitialAnimation = false }) {
  const isEnabled = localStorage.getItem('enablePageTransitions') !== 'false';

  if (!isEnabled) {
    return <>{children}</>;
  }

  return (
    <>
      <LoadingScreen id="page-transition-overlay" skipInitialAnimation={skipInitialAnimation} />
      {children}
    </>
  );
}
