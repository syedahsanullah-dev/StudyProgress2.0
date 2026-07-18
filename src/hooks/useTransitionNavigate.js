import { useNavigate } from 'react-router-dom';
import gsap from 'gsap';

export function useTransitionNavigate() {
  const navigate = useNavigate();

  return (to) => {
    const overlay = document.getElementById('page-transition-overlay');
    
    if (overlay) {
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
