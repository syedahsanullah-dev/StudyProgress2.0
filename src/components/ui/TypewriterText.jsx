import React, { useState, useEffect } from 'react';

export default function TypewriterText({ text, delay = 0, speed = 50, className = "" }) {
  const [displayedText, setDisplayedText] = useState('');
  const [started, setStarted] = useState(false);

  useEffect(() => {
    let timeout;
    if (!started) {
      timeout = setTimeout(() => {
        setStarted(true);
      }, delay * 1000);
      return () => clearTimeout(timeout);
    }

    let index = 0;
    const interval = setInterval(() => {
      setDisplayedText(text.substring(0, index + 1));
      index++;
      if (index >= text.length) clearInterval(interval);
    }, speed);

    return () => clearInterval(interval);
  }, [text, delay, speed, started]);

  const isEnabled = localStorage.getItem('enableTextAnimations') !== 'false';
  
  if (!isEnabled) {
    return (
      <span className={`inline-block ${className}`}>
        {text}
      </span>
    );
  }

  return (
    <span className={`inline-block ${className}`}>
      {displayedText}
      <span className="animate-pulse">_</span>
    </span>
  );
}
