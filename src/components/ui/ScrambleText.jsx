import React, { useRef, useEffect, useState } from 'react';

const CHARS = '!<>-_\\\\/[]{}—=+*^?#________';

export default function ScrambleText({ text, delay = 0, className = "" }) {
  const textRef = useRef();

  // Generate a frozen random string for the initial render so the real text is hidden
  const [initialScramble] = useState(() => 
    Array.from({ length: text.length })
      .map(() => CHARS[Math.floor(Math.random() * CHARS.length)])
      .join('')
  );

  useEffect(() => {
    if (!textRef.current) return;

    let frame = 0;
    const queue = [];
    // Build the queue of characters to animate
    for (let i = 0; i < text.length; i++) {
      // Use the exact initial character we generated so there's no jump
      const from = initialScramble[i];
      const start = Math.floor(Math.random() * 40);
      const end = start + Math.floor(Math.random() * 40);
      queue.push({ from, to: text[i], start, end, char: '' });
    }

    let rafId;

    const update = () => {
      let output = '';
      let complete = 0;
      
      for (let i = 0, n = queue.length; i < n; i++) {
        let { from, to, start, end, char } = queue[i];
        
        if (frame >= end) {
          complete++;
          output += to;
        } else if (frame >= start) {
          if (!char || Math.random() < 0.28) {
            char = Math.random() < 0.5 ? CHARS[Math.floor(Math.random() * CHARS.length)] : to;
            queue[i].char = char;
          }
          // Wrap the active scramble character in a styled span
          output += `<span class="text-indigo-400 opacity-80">${char}</span>`;
        } else {
          output += `<span class="opacity-50">${from}</span>`; // Keep the frozen initial character dimmed
        }
      }
      
      if (textRef.current) {
        textRef.current.innerHTML = output;
      }
      
      if (complete === queue.length) {
        if (textRef.current) textRef.current.innerHTML = text; // Ensure final text is perfectly clean
        cancelAnimationFrame(rafId);
      } else {
        rafId = requestAnimationFrame(update);
        frame++;
      }
    };

    // Wait for the delay (in seconds)
    const timeout = setTimeout(() => {
      rafId = requestAnimationFrame(update);
    }, delay * 1000);

    return () => {
      clearTimeout(timeout);
      cancelAnimationFrame(rafId);
    };
  }, [text, delay, initialScramble]);

  return <span ref={textRef} className={`inline-block ${className}`}>{initialScramble}</span>;
}
