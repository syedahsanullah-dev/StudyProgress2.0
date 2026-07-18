import { useRef } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, BookOpen, LogOut, Database, Target } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../../../firebase'; 
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import Magnetic from '../ui/Magnetic';
import { useTransitionNavigate } from '../../hooks/useTransitionNavigate';

gsap.registerPlugin(useGSAP);

export default function Sidebar() {
  const navigate = useNavigate();
  const transitionNavigate = useTransitionNavigate();
  const sidebarRef = useRef();
  
  useGSAP(() => {
    gsap.fromTo(
      ".sidebar-item", 
      { opacity: 0, x: -20 }, 
      { opacity: 1, x: 0, duration: 0.6, stagger: 0.1, ease: "power3.out", delay: 0.2 }
    );
  }, { scope: sidebarRef });
  
  const navItems = [
    { icon: <LayoutDashboard size={24} />, label: 'Dashboard', path: '/dashboard' },
    { icon: <BookOpen size={24} />, label: 'Subjects', path: '/subjects' },
    { icon: <Target size={24} />, label: 'Sandbox', path: '/calculator' },
    { icon: <Database size={24} />, label: 'Bulk Entry', path: '/bulk-entry' },
  ];

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Logout failed", error);
    }
  };

  const navIconStyle = ({ isActive }) => 
    `p-3 rounded-xl transition-all duration-200 flex items-center justify-center sidebar-item ${
      isActive 
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30' 
        : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
    }`;

  return (
    <>
      <nav ref={sidebarRef} className="fixed z-50 
        bottom-0 left-0 w-full h-16 border-t border-slate-800 bg-[#0F172A]/90 backdrop-blur-lg flex flex-row items-center justify-around px-4
        sm:top-0 sm:left-0 sm:w-20 sm:h-screen sm:border-t-0 sm:border-r sm:flex-col sm:justify-start sm:py-8 sm:gap-6
      ">
        
        <div className="hidden sm:flex items-center justify-center mb-8 sidebar-item">
          <Magnetic>
            <div className="bg-gradient-to-br from-indigo-500 to-indigo-700 w-10 h-10 rounded-xl shadow-lg flex items-center justify-center text-white font-bold text-xl cursor-pointer">
              S
            </div>
          </Magnetic>
        </div>

        <div className="flex flex-row sm:flex-col gap-2 sm:gap-4 w-full sm:w-auto justify-around sm:justify-start">
          {navItems.map((item) => (
            <Magnetic key={item.path}>
              <NavLink 
                to={item.path} 
                onClick={(e) => {
                  e.preventDefault();
                  if (window.location.pathname !== item.path) {
                    transitionNavigate(item.path);
                  }
                }}
                className={navIconStyle} 
                title={item.label}
              >
                {item.icon}
              </NavLink>
            </Magnetic>
          ))}
        </div>

        <div className="sm:mt-auto sidebar-item">
          <Magnetic>
            <button 
              onClick={handleLogout}
              title="Logout"
              className="p-3 rounded-xl text-slate-400 hover:bg-red-500/10 hover:text-red-400 transition-all duration-200 flex items-center justify-center w-full"
            >
              <LogOut size={24} />
            </button>
          </Magnetic>
        </div>
      </nav>
    </>
  );
}