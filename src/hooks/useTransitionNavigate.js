import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';

export function useTransitionNavigate() {
  const navigate = useNavigate();

  return (to) => {
    const isEnabled = localStorage.getItem('enablePageTransitions') !== 'false';
    
    if (!isEnabled) {
      navigate(to);
      return;
    }

    const overlay = document.getElementById('page-transition-overlay');
    
    // Tell the overlay to reset its typing animations immediately
    window.dispatchEvent(new Event('transition-start'));
    if (overlay) {
      // Clear any conflicting transforms from previous states
      gsap.set(overlay, { clearProps: "transform" });

      // Leave Animation: Sweep the overlay UP from the bottom
      gsap.fromTo(overlay,
        { yPercent: 100 },
        { 
          yPercent: 0, 
          duration: 1.2, 
          ease: "power4.inOut",
          onComplete: () => {
            navigate(to);
          }
        }
      );
    } else {
      // Fallback
      navigate(to);
    }
  };
}
