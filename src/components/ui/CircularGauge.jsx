import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

export default function CircularGauge({ value = 0, max = 4.0, title = "Current GPA" }) {
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  
  // THE CAP FIX: Ensure the visual value never exceeds the maximum
  const safeValue = Math.min(Math.max(value, 0), max);
  
  const percentage = max > 0 ? (safeValue / max) * 100 : 0;
  const targetDashoffset = circumference - (percentage / 100) * circumference;

  // Dynamic Color Logic based on VU GPA scale
  let colorClass = "text-emerald-400"; 
  if (safeValue < 2.0) colorClass = "text-red-400";
  else if (safeValue < 3.0) colorClass = "text-amber-400";

  const gaugeRef = useRef();
  const circleRef = useRef();
  const textRef = useRef();

  useGSAP(() => {
    // Animate circle filling
    gsap.fromTo(circleRef.current,
      { strokeDashoffset: circumference },
      { strokeDashoffset: targetDashoffset, duration: 1.5, ease: "power3.out", delay: 2.2 }
    );

    // Animate number counting up
    const counter = { val: 0 };
    gsap.to(counter, {
      val: value,
      duration: 1.5,
      ease: "power3.out",
      delay: 2.2,
      onUpdate: () => {
        if (textRef.current) {
          textRef.current.innerText = counter.val.toFixed(2);
        }
      }
    });
  }, { scope: gaugeRef, dependencies: [value, targetDashoffset] });

  return (
    <div ref={gaugeRef} className="flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center">
        {/* Background Track Circle */}
        <svg className="w-40 h-40 transform -rotate-90">
          <circle
            cx="80"
            cy="80"
            r={radius}
            className="stroke-slate-800"
            strokeWidth="12"
            fill="transparent"
          />
          {/* Active Progress Circle */}
          <circle
            ref={circleRef}
            cx="80"
            cy="80"
            r={radius}
            className={colorClass}
            strokeWidth="12"
            fill="transparent"
            strokeDasharray={circumference}
            strokeDashoffset={circumference}
            strokeLinecap="round"
            stroke="currentColor"
          />
        </svg>
        
        {/* Center Text Data */}
        <div className="absolute flex flex-col items-center justify-center">
          <span ref={textRef} className="text-4xl font-extrabold text-white tracking-tighter shadow-black drop-shadow-md">
            0.00
          </span>
          <span className="text-xs font-semibold text-slate-400 mt-1 uppercase tracking-wider">
            out of {max.toFixed(1)}
          </span>
        </div>
      </div>
      
      {title && (
        <h3 className="mt-4 text-sm font-bold text-slate-300 uppercase tracking-widest">
          {title}
        </h3>
      )}
    </div>
  );
}