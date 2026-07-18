import { useState } from 'react';
import { X, Link as LinkIcon, Video, Code, FileText, Loader2 } from 'lucide-react';
import { db } from '../../../firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

export default function AddLinkModal({ isOpen, onClose, subjectId, onLinkAdded }) {
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState('doc');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Hide the modal completely if isOpen is false
  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // 1. Point to the specific subject in Firestore
      const subjectRef = doc(db, 'subjects', subjectId);

      // 2. Create the new link object
      const newLink = {
        id: Date.now().toString(), // Quick unique ID
        title,
        url,
        type
      };

      // 3. Push the new link into the 'links' array in Firestore
      await updateDoc(subjectRef, {
        links: arrayUnion(newLink)
      });

      // 4. Reset form, notify parent to refresh UI, and close modal
      setTitle('');
      setUrl('');
      setType('doc');
      if (onLinkAdded) onLinkAdded();
      onClose();
      
    } catch (err) {
      console.error(err);
      setError('Failed to save link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Dark Blur Backdrop */}
      <div 
        className="absolute inset-0 bg-[#0F172A]/80 backdrop-blur-sm" 
        onClick={onClose}
      ></div>

      {/* Modal Content Card */}
      <div className="relative bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 shadow-2xl z-10 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <LinkIcon size={20} className="text-indigo-400" /> Add Resource
          </h3>
          <button 
            onClick={onClose}
            className="p-2 text-slate-400 hover:bg-slate-800 hover:text-white rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Title Input */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5 ml-1">Link Title</label>
            <input
              type="text"
              placeholder="e.g., Chapter 4 Lecture"
              className="w-full bg-slate-800/50 border border-slate-700 text-slate-100 rounded-xl py-3 px-4 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>

          {/* URL Input */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5 ml-1">URL</label>
            <input
              type="url"
              placeholder="https://"
              className="w-full bg-slate-800/50 border border-slate-700 text-slate-100 rounded-xl py-3 px-4 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-600"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              required
            />
          </div>

          {/* Type Selection Grid */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1.5 ml-1">Resource Type</label>
            <div className="grid grid-cols-3 gap-3">
              
              {/* Doc Option */}
              <button
                type="button"
                onClick={() => setType('doc')}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                  type === 'doc' ? 'bg-blue-500/20 border-blue-500/50 text-blue-400' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <FileText size={24} />
                <span className="text-xs font-semibold">Doc/Drive</span>
              </button>

              {/* Video Option */}
              <button
                type="button"
                onClick={() => setType('youtube')}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                  type === 'youtube' ? 'bg-red-500/20 border-red-500/50 text-red-400' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Video size={24} />
                <span className="text-xs font-semibold">Video</span>
              </button>

              {/* Code Option */}
              <button
                type="button"
                onClick={() => setType('github')}
                className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                  type === 'github' ? 'bg-slate-200/20 border-slate-200/50 text-slate-200' : 'bg-slate-800/50 border-slate-700 text-slate-400 hover:bg-slate-800'
                }`}
              >
                <Code size={24} />
                <span className="text-xs font-semibold">Code/Repo</span>
              </button>

            </div>
          </div>

          {/* Error Message */}
          {error && <p className="text-red-400 text-sm text-center font-medium mt-2">{error}</p>}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-indigo-600/20"
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              'Save Resource'
            )}
          </button>

        </form>
      </div>
    </div>
  );
}