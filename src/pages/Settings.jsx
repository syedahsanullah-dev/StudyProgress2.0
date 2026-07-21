import { useState, useEffect } from 'react';
import { updateProfile } from 'firebase/auth';
import { auth, db } from '../../firebase';
import { collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import Sidebar from '../components/layout/Sidebar';
import TopNav from '../components/layout/TopNav';
import { User, Monitor, AlertTriangle, Save, Loader2, Check, DownloadCloud, Database, X, RefreshCw } from 'lucide-react';
import useStore from '../store/useStore';

export default function Settings() {
  const [displayName, setDisplayName] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  const [enableTransitions, setEnableTransitions] = useState(true);
  const [enableSidebarAnimations, setEnableSidebarAnimations] = useState(true);
  const [enableParallax, setEnableParallax] = useState(true);
  const [enableProgressAnimations, setEnableProgressAnimations] = useState(true);
  const [enableTextAnimations, setEnableTextAnimations] = useState(true);
  const [enableCardAnimations, setEnableCardAnimations] = useState(true);
  
  const [isDeletingData, setIsDeletingData] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showResetModal, setShowResetModal] = useState(false);
  const [showRefreshModal, setShowRefreshModal] = useState(false);
  const [resetInput, setResetInput] = useState('');

  useEffect(() => {
    if (auth.currentUser) {
      setDisplayName(auth.currentUser.displayName || '');
    }
    const transitionPref = localStorage.getItem('enablePageTransitions');
    if (transitionPref === 'false') {
      setEnableTransitions(false);
    }
    const sidebarPref = localStorage.getItem('enableSidebarAnimations');
    if (sidebarPref === 'false') {
      setEnableSidebarAnimations(false);
    }
    if (localStorage.getItem('enableParallax') === 'false') setEnableParallax(false);
    if (localStorage.getItem('enableProgressAnimations') === 'false') setEnableProgressAnimations(false);
    if (localStorage.getItem('enableTextAnimations') === 'false') setEnableTextAnimations(false);
    if (localStorage.getItem('enableCardAnimations') === 'false') setEnableCardAnimations(false);
  }, []);

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!auth.currentUser || !displayName.trim()) return;
    
    setIsUpdatingProfile(true);
    try {
      await updateProfile(auth.currentUser, {
        displayName: displayName.trim()
      });
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (error) {
      console.error("Error updating profile:", error);
      alert("Failed to update profile.");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const promptRefresh = () => {
    setShowRefreshModal(true);
  };

  const handleToggleTransitions = () => {
    const newVal = !enableTransitions;
    setEnableTransitions(newVal);
    localStorage.setItem('enablePageTransitions', newVal.toString());
    promptRefresh();
  };

  const handleToggleSidebarAnimations = () => {
    const newVal = !enableSidebarAnimations;
    setEnableSidebarAnimations(newVal);
    localStorage.setItem('enableSidebarAnimations', newVal.toString());
    promptRefresh();
  };

  const handleToggleParallax = () => {
    const newVal = !enableParallax;
    setEnableParallax(newVal);
    localStorage.setItem('enableParallax', newVal.toString());
    promptRefresh();
  };

  const handleToggleProgressAnimations = () => {
    const newVal = !enableProgressAnimations;
    setEnableProgressAnimations(newVal);
    localStorage.setItem('enableProgressAnimations', newVal.toString());
    promptRefresh();
  };

  const handleToggleTextAnimations = () => {
    const newVal = !enableTextAnimations;
    setEnableTextAnimations(newVal);
    localStorage.setItem('enableTextAnimations', newVal.toString());
    promptRefresh();
  };

  const handleToggleCardAnimations = () => {
    const newVal = !enableCardAnimations;
    setEnableCardAnimations(newVal);
    localStorage.setItem('enableCardAnimations', newVal.toString());
    promptRefresh();
  };

  const confirmFactoryReset = async () => {
    if (!auth.currentUser || resetInput !== 'DELETE') return;

    setIsDeletingData(true);
    try {
      const uid = auth.currentUser.uid;
      const batch = writeBatch(db);

      // Fetch all subjects for this user
      const qSubjects = query(collection(db, 'subjects'), where('userId', '==', uid));
      const subjectsSnap = await getDocs(qSubjects);
      subjectsSnap.forEach(docSnap => batch.delete(docSnap.ref));

      // Fetch all assessments for this user
      const qAssessments = query(collection(db, 'assessments'), where('userId', '==', uid));
      const assessmentsSnap = await getDocs(qAssessments);
      assessmentsSnap.forEach(docSnap => batch.delete(docSnap.ref));

      await batch.commit();
      
      // Clear local store
      useStore.getState().clearStore();
      alert("All data has been successfully wiped.");
      window.location.reload();
      
    } catch (error) {
      console.error("Factory Reset Error:", error);
      alert("An error occurred while wiping data.");
      setShowResetModal(false);
      setResetInput('');
    } finally {
      setIsDeletingData(false);
    }
  };

  const confirmExportData = () => {
    const state = useStore.getState();
    const data = {
      user: auth.currentUser?.displayName || 'User',
      exportDate: new Date().toISOString(),
      subjects: state.subjects,
      assessments: state.assessments
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `study_progress_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShowExportModal(false);
  };

  return (
    <div className="min-h-screen bg-transparent flex">
      <Sidebar />

      <div className="flex-1 flex flex-col sm:ml-20 pb-20 sm:pb-0 min-h-screen">
        <TopNav title="Settings" />

        <div className="p-4 sm:p-8 max-w-4xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          
          <div>
            <h1 className="text-3xl font-extrabold text-white tracking-tight">Settings</h1>
            <p className="text-slate-400 mt-1">Manage your account preferences and app behavior.</p>
          </div>

          <div className="space-y-6">
            
            {/* Profile Settings */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-blue-500/10 text-blue-400 rounded-xl">
                  <User size={24} />
                </div>
                <h2 className="text-xl font-bold text-white">Profile</h2>
              </div>

              <form onSubmit={handleUpdateProfile} className="max-w-md">
                <label className="block text-sm font-semibold text-slate-300 mb-2">Display Name</label>
                <div className="flex flex-col sm:flex-row gap-3">
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your Name"
                    className="flex-1 bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-blue-500 transition-colors"
                  />
                  <button
                    type="submit"
                    disabled={isUpdatingProfile || !displayName.trim() || displayName === auth.currentUser?.displayName}
                    className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]"
                  >
                    {isUpdatingProfile ? (
                      <Loader2 size={18} className="animate-spin" />
                    ) : profileSuccess ? (
                      <div className="flex items-center gap-2"><Check size={18} /> Saved</div>
                    ) : (
                      <div className="flex items-center gap-2"><Save size={18} /> Save</div>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* UI Preferences */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-purple-500/10 text-purple-400 rounded-xl">
                  <Monitor size={24} />
                </div>
                <h2 className="text-xl font-bold text-white">App Preferences</h2>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-2xl border border-slate-700/30">
                  <div>
                    <h3 className="text-white font-semibold">Cinematic Page Transitions</h3>
                    <p className="text-sm text-slate-400 mt-1">Enable or disable the animated loading screen between pages.</p>
                  </div>
                  
                  <button 
                    onClick={handleToggleTransitions}
                    className={`relative w-14 h-8 rounded-full transition-colors duration-300 focus:outline-none ${enableTransitions ? 'bg-purple-500' : 'bg-slate-700'}`}
                  >
                    <div className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full transition-transform duration-300 ${enableTransitions ? 'transform translate-x-6' : ''}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-2xl border border-slate-700/30">
                  <div>
                    <h3 className="text-white font-semibold">Sidebar Animations</h3>
                    <p className="text-sm text-slate-400 mt-1">Enable or disable the slide-in and magnetic hover effects on the sidebar menu.</p>
                  </div>
                  
                  <button 
                    onClick={handleToggleSidebarAnimations}
                    className={`relative w-14 h-8 rounded-full transition-colors duration-300 focus:outline-none ${enableSidebarAnimations ? 'bg-purple-500' : 'bg-slate-700'}`}
                  >
                    <div className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full transition-transform duration-300 ${enableSidebarAnimations ? 'transform translate-x-6' : ''}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-2xl border border-slate-700/30">
                  <div>
                    <h3 className="text-white font-semibold">Interactive Background (Parallax)</h3>
                    <p className="text-sm text-slate-400 mt-1">Enable the starry tech grid background that moves with your mouse. High performance cost.</p>
                  </div>
                  <button 
                    onClick={handleToggleParallax}
                    className={`relative w-14 h-8 rounded-full transition-colors duration-300 focus:outline-none ${enableParallax ? 'bg-purple-500' : 'bg-slate-700'}`}
                  >
                    <div className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full transition-transform duration-300 ${enableParallax ? 'transform translate-x-6' : ''}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-2xl border border-slate-700/30">
                  <div>
                    <h3 className="text-white font-semibold">Progress Bar Animations</h3>
                    <p className="text-sm text-slate-400 mt-1">Animate circular progress rings when they load.</p>
                  </div>
                  <button 
                    onClick={handleToggleProgressAnimations}
                    className={`relative w-14 h-8 rounded-full transition-colors duration-300 focus:outline-none ${enableProgressAnimations ? 'bg-purple-500' : 'bg-slate-700'}`}
                  >
                    <div className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full transition-transform duration-300 ${enableProgressAnimations ? 'transform translate-x-6' : ''}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-2xl border border-slate-700/30">
                  <div>
                    <h3 className="text-white font-semibold">Text Effects (Scramble/Typewriter)</h3>
                    <p className="text-sm text-slate-400 mt-1">Enable the scrambling decoding effect on titles and typewriter effects.</p>
                  </div>
                  <button 
                    onClick={handleToggleTextAnimations}
                    className={`relative w-14 h-8 rounded-full transition-colors duration-300 focus:outline-none ${enableTextAnimations ? 'bg-purple-500' : 'bg-slate-700'}`}
                  >
                    <div className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full transition-transform duration-300 ${enableTextAnimations ? 'transform translate-x-6' : ''}`} />
                  </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-2xl border border-slate-700/30">
                  <div>
                    <h3 className="text-white font-semibold">Card Hover Animations</h3>
                    <p className="text-sm text-slate-400 mt-1">Enable 3D tilt and pop-out effects on subject cards.</p>
                  </div>
                  <button 
                    onClick={handleToggleCardAnimations}
                    className={`relative w-14 h-8 rounded-full transition-colors duration-300 focus:outline-none ${enableCardAnimations ? 'bg-purple-500' : 'bg-slate-700'}`}
                  >
                    <div className={`absolute top-1 left-1 bg-white w-6 h-6 rounded-full transition-transform duration-300 ${enableCardAnimations ? 'transform translate-x-6' : ''}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Data Management */}
            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-emerald-500/10 text-emerald-400 rounded-xl">
                  <Database size={24} />
                </div>
                <h2 className="text-xl font-bold text-white">Data Management</h2>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-800/30 rounded-2xl border border-slate-700/30 gap-4">
                <div>
                  <h3 className="text-white font-semibold">Export Your Data</h3>
                  <p className="text-sm text-slate-400 mt-1">Download a complete JSON backup of all your subjects, notes, and grades.</p>
                </div>
                
                <button
                  onClick={() => setShowExportModal(true)}
                  className="px-6 py-2.5 bg-emerald-600/20 hover:bg-emerald-600/40 text-emerald-400 border border-emerald-500/30 font-semibold rounded-xl transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <DownloadCloud size={18} />
                  Export to JSON
                </button>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-500/5 border border-red-500/20 rounded-3xl p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-red-500/10 text-red-400 rounded-xl">
                  <AlertTriangle size={24} />
                </div>
                <h2 className="text-xl font-bold text-red-400">Danger Zone</h2>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-red-500/5 rounded-2xl border border-red-500/10 gap-4">
                <div>
                  <h3 className="text-red-200 font-semibold">Factory Reset</h3>
                  <p className="text-sm text-red-400/80 mt-1">Permanently delete all your subjects, assessments, and notes. This cannot be undone.</p>
                </div>
                
                <button
                  onClick={() => {
                    setResetInput('');
                    setShowResetModal(true);
                  }}
                  disabled={isDeletingData}
                  className="px-6 py-2.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 border border-red-500/30 font-semibold rounded-xl transition-all disabled:opacity-50 flex items-center justify-center whitespace-nowrap"
                >
                  {isDeletingData ? <Loader2 size={18} className="animate-spin" /> : "Delete All Data"}
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* Export Confirmation Modal */}
      {showExportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0F172A] border border-slate-700/50 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <Database className="text-emerald-400" size={24} />
                Export Data
              </h3>
              <button 
                onClick={() => setShowExportModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-slate-300 text-sm mb-6">
              You are about to download a complete backup of all your subjects, notes, and grading data. This file will be saved in JSON format.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowExportModal(false)}
                className="px-4 py-2 text-slate-300 hover:text-white font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmExportData}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-all flex items-center gap-2"
              >
                <DownloadCloud size={18} />
                Download JSON
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Factory Reset Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0F172A] border border-red-500/30 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-red-500 flex items-center gap-2">
                <AlertTriangle size={24} />
                Factory Reset
              </h3>
              <button 
                onClick={() => {
                  setShowResetModal(false);
                  setResetInput('');
                }}
                className="text-slate-400 hover:text-white transition-colors"
                disabled={isDeletingData}
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-slate-300 text-sm mb-4">
              This will <strong className="text-red-400">permanently delete ALL your data</strong>, including subjects, grades, and notes. This action cannot be undone.
            </p>
            <div className="mb-6">
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                Type 'DELETE' to confirm
              </label>
              <input
                type="text"
                value={resetInput}
                onChange={(e) => setResetInput(e.target.value)}
                placeholder="DELETE"
                className="w-full bg-slate-900/50 border border-slate-700/50 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-red-500 transition-colors"
                disabled={isDeletingData}
              />
            </div>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowResetModal(false);
                  setResetInput('');
                }}
                disabled={isDeletingData}
                className="px-4 py-2 text-slate-300 hover:text-white font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmFactoryReset}
                disabled={resetInput !== 'DELETE' || isDeletingData}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-medium rounded-xl transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeletingData ? <Loader2 size={18} className="animate-spin" /> : 'Confirm Deletion'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Refresh Required Modal */}
      {showRefreshModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-[#0F172A] border border-blue-500/30 w-full max-w-md rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-4">
              <h3 className="text-xl font-bold text-blue-400 flex items-center gap-2">
                <RefreshCw size={24} />
                Refresh Required
              </h3>
              <button 
                onClick={() => setShowRefreshModal(false)}
                className="text-slate-400 hover:text-white transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <p className="text-slate-300 text-sm mb-6">
              You changed an animation preference. This setting requires a page refresh to fully take effect. Would you like to refresh now?
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowRefreshModal(false)}
                className="px-4 py-2 text-slate-300 hover:text-white font-medium transition-colors"
              >
                Later
              </button>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-all flex items-center gap-2"
              >
                <RefreshCw size={18} />
                Refresh Now
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
