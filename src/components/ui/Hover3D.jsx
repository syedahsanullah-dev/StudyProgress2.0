import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';

export default function Hover3D({ children, intensity = 10 }) {
  const containerRef = useRef();
  const innerRef = useRef();
  
  const xTo = useRef(null);
  const yTo = useRef(null);

  useGSAP(() => {
    // quickTo is highly performant for tracking mouse movements
    xTo.current = gsap.quickTo(innerRef.current, "rotationY", { ease: "power3", duration: 0.5 });
    yTo.current = gsap.quickTo(innerRef.current, "rotationX", { ease: "power3", duration: 0.5 });
  }, { scope: containerRef });

  const handleMouseMove = (e) => {
    if (!innerRef.current) return;
    
    const rect = innerRef.current.getBoundingClientRect();
    
    // Calculate mouse position relative to the center (-1 to 1)
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    // Apply rotation
    xTo.current(x * intensity * 2);
    yTo.current(-y * intensity * 2);
  };

  const handleMouseLeave = () => {
    // Snap back to 0 with a nice elastic bounce
    gsap.to(innerRef.current, {
      rotationX: 0,
      rotationY: 0,
      ease: "elastic.out(1, 0.5)",
      duration: 1
    });
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full"
      style={{ perspective: "1000px" }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div 
        ref={innerRef} 
        className="w-full h-full transform-gpu"
        style={{ transformStyle: 'preserve-3d' }}
      >
        {children}
      </div>
    </div>
  );
}
