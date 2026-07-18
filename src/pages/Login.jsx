import { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../firebase';
import { User, Lock, ArrowRight, Loader2, Mail } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const navigate = useNavigate();

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError(isLogin ? 'Invalid Email or Password' : err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0F172A] bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-800 to-[#0F172A]">
      
      <div className="bg-white/10 backdrop-blur-md p-6 sm:p-8 rounded-3xl shadow-2xl w-full max-w-sm border border-white/20 mx-4">
        
        <div className="flex justify-center mb-6">
          <div className="bg-indigo-500/20 p-4 rounded-2xl border border-indigo-500/30">
            <User size={36} className="text-indigo-400" />
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-center text-white mb-6">
          {isLogin ? 'Welcome Back' : 'Create Account'}
        </h2>

        <form onSubmit={handleAuth} className="space-y-5">
          {/* Email Input */}
          <div className="relative">
            <Mail className="absolute left-4 top-3.5 text-slate-400" size={20} />
            <input
              type="email"
              placeholder="Email Address"
              className="w-full bg-slate-900/50 border border-slate-700 text-slate-100 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password Input */}
          <div className="relative">
            <Lock className="absolute left-4 top-3.5 text-slate-400" size={20} />
            <input
              type="password"
              placeholder="Password"
              className="w-full bg-slate-900/50 border border-slate-700 text-slate-100 rounded-xl py-3 pl-12 pr-4 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all placeholder:text-slate-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-center">
              <p className="text-red-400 text-sm font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-indigo-600/20 mt-2"
          >
            {isLoading ? (
              <Loader2 size={20} className="animate-spin" />
            ) : (
              <>{isLogin ? 'Sign In' : 'Sign Up'} <ArrowRight size={22} /></>
            )}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <button 
            onClick={() => { setIsLogin(!isLogin); setError(''); }}
            className="text-slate-400 hover:text-indigo-400 text-sm font-medium transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}