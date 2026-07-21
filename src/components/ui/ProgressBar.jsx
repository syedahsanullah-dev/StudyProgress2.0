import { useRef } from 'react';
import { Minus, Plus } from 'lucide-react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

gsap.registerPlugin(useGSAP);

export default function ProgressBar({ 
  current = 0, 
  total = 100, 
  label, 
  showFraction = true,
  onIncrement,
  onDecrement,
  isUpdating = false
}) {
  // Prevent division by zero and cap at 100%
  const safeTotal = total > 0 ? total : 1;
  const percentage = Math.min(Math.round((current / safeTotal) * 100), 100);
  
  // Is it fully complete?
  const isComplete = percentage === 100;

  const barRef = useRef();
  const textRef = useRef();

  useGSAP(() => {
    const isEnabled = localStorage.getItem('enableProgressAnimations') !== 'false';

    if (!isEnabled) {
      gsap.set(barRef.current, { width: `${percentage}%` });
      if (textRef.current) textRef.current.innerText = `${current} / ${total}`;
      return;
    }

    // Animate the bar width
    gsap.to(barRef.current, {
      width: `${percentage}%`,
      duration: 1.5,
      delay: 2.2,
      ease: "power3.out"
    });

    // Animate the number counting
    const counter = { val: parseFloat(textRef.current?.innerText?.split(' ')[0]) || 0 };
    gsap.to(counter, {
      val: current,
      duration: 1.5,
      delay: 2.2,
      ease: "power3.out",
      onUpdate: () => {
        if (textRef.current) {
          textRef.current.innerText = `${Math.round(counter.val)} / ${total}`;
        }
      }
    });

  }, { dependencies: [percentage, current, total] });

  return (
    <div className="w-full">
      {/* Label, Buttons & Fraction Row */}
      <div className="flex justify-between items-end mb-1.5 px-0.5">
        {label && (
          <span className="text-sm font-medium text-slate-300">
            {label}
          </span>
        )}
        
        <div className="flex items-center gap-3">
          {/* Decrement Button */}
          {onDecrement && (
            <button 
              onClick={onDecrement} 
              disabled={current <= 0 || isUpdating}
              className="p-1.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-400 hover:text-white rounded-md disabled:opacity-50 transition-colors"
            >
              <Minus size={16} />
            </button>
          )}

          {/* Fraction text */}
          {showFraction && (
            <span 
              ref={textRef}
              className={`text-sm w-12 text-center font-bold ${isComplete ? 'text-emerald-400' : 'text-slate-400'}`}
            >
              {current} / {total}
            </span>
          )}

          {/* Increment Button */}
          {onIncrement && (
            <button 
              onClick={onIncrement} 
              disabled={current >= total || isUpdating}
              className="p-1.5 bg-slate-800 border border-slate-700 hover:bg-slate-700 text-slate-400 hover:text-white rounded-md disabled:opacity-50 transition-colors"
            >
              <Plus size={16} />
            </button>
          )}
        </div>
      </div>

      {/* The Bar Background */}
      <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
        
        {/* The Animated Fill */}
        <div 
          ref={barRef}
          className={`h-full rounded-full ${
            isComplete 
              ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' 
              : 'bg-indigo-500'
          }`}
          style={{ width: '0%' }} // Initial width for GSAP to animate from
        />
      </div>
    </div>
  );
}