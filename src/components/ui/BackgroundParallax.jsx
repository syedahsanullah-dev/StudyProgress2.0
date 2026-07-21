import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export default function BackgroundParallax() {
  const isEnabled = localStorage.getItem('enableParallax') !== 'false';
  if (!isEnabled) return null;

  return (
    <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden bg-[#0F172A]">
      {/* Constellation of Glitching Tech Typography */}
      
      <div className="bg-shape-3 absolute top-[20%] left-[30%] text-indigo-400/10 font-mono text-3xl font-black rotate-[15deg] select-none tracking-tighter">&lt;/&gt;</div>
      <div className="bg-shape-1 absolute bottom-[30%] right-[20%] text-emerald-400/10 font-mono text-4xl font-black -rotate-[10deg] select-none tracking-tighter">{'{ }'}</div>
      <div className="bg-shape-2 absolute top-[15%] right-[5%] text-amber-400/10 font-mono text-2xl font-black rotate-[25deg] select-none tracking-tighter">[ ]</div>
      <div className="bg-shape-1 absolute bottom-[10%] left-[40%] text-indigo-400/10 font-mono text-xl font-black -rotate-[15deg] select-none tracking-tighter">()</div>
      <div className="bg-shape-3 absolute top-[50%] left-[10%] text-emerald-400/10 font-mono text-2xl font-black rotate-[5deg] select-none tracking-tighter">//</div>
      <div className="bg-shape-2 absolute top-[5%] left-[60%] text-rose-400/10 font-mono text-3xl font-black -rotate-[25deg] select-none tracking-tighter">=&gt;</div>
      <div className="bg-shape-1 absolute bottom-[50%] right-[5%] text-indigo-400/10 font-mono text-xl font-black rotate-[45deg] select-none tracking-tighter">===</div>
      <div className="bg-shape-3 absolute top-[30%] left-[5%] text-amber-400/10 font-mono text-2xl font-black -rotate-[5deg] select-none tracking-tighter">&amp;&amp;</div>
      <div className="bg-shape-2 absolute bottom-[20%] left-[15%] text-emerald-400/10 font-mono text-2xl font-black rotate-[10deg] select-none tracking-tighter">||</div>
      <div className="bg-shape-1 absolute top-[10%] left-[5%] text-indigo-400/10 font-mono text-4xl font-black rotate-[15deg] select-none tracking-tighter">;</div>
      <div className="bg-shape-3 absolute bottom-[15%] right-[40%] text-rose-400/10 font-mono text-xl font-black -rotate-[15deg] select-none tracking-tighter">!=</div>
      <div className="bg-shape-2 absolute top-[40%] right-[25%] text-amber-400/10 font-mono text-5xl font-black rotate-[30deg] select-none tracking-tighter">*</div>
      <div className="bg-shape-1 absolute bottom-[5%] right-[5%] text-slate-400/10 font-mono text-3xl font-black -rotate-[10deg] select-none tracking-tighter">404</div>
      <div className="bg-shape-3 absolute top-[55%] left-[35%] text-emerald-400/10 font-mono text-xl font-black rotate-[15deg] select-none tracking-tighter">NaN</div>
      <div className="bg-shape-2 absolute top-[75%] left-[60%] text-indigo-400/10 font-mono text-2xl font-black -rotate-[5deg] select-none tracking-tighter">sudo</div>
    </div>
  );
}
