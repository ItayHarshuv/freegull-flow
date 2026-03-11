
import React, { useState } from 'react';
import { useAppStore } from '../store';
import { Waves, Mail, AlertCircle, LogIn, Lock } from 'lucide-react';

const LoginScreen: React.FC = () => {
  const { login } = useAppStore();
  const [identifier, setIdentifier] = useState('');
  const [error, setError] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = identifier.trim().toLowerCase();
    if (!cleanId) return;

    const success = await login(identifier.trim());
    if (!success) {
      setError('פרטי הכניסה לא זוהו. נסה קוד PIN אישי תקין.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f0f7f8] p-4 relative overflow-hidden text-right" dir="rtl">
      <div className="absolute top-0 right-0 w-full h-1/2 brand-gradient -skew-y-6 transform translate-y-[-20%] opacity-5" />
      <div className="absolute bottom-0 left-0 w-full h-1/2 brand-gradient skew-y-6 transform translate-y-[20%] opacity-5" />
      
      <div className="bg-white border border-slate-200 p-8 md:p-10 w-full max-w-md rounded-[2.5rem] shadow-2xl relative z-10 animate-fade-in">
        
        <div className="text-center mb-10">
          <div className="w-16 h-16 brand-gradient rounded-2xl flex items-center justify-center text-white mx-auto shadow-xl mb-4">
            <Waves size={32} strokeWidth={2.5} />
          </div>
          <h1 className="text-2xl font-black text-brand-ocean tracking-tighter leading-none uppercase">FREEGULL FLOW</h1>
          <p className="text-brand font-bold uppercase tracking-[0.3em] text-[9px] mt-2">SEA SPORTS MANAGEMENT</p>
        </div>

        <form onSubmit={handleLoginSubmit} className="space-y-6 animate-fade-in">
          <div className="space-y-4">
            <div className="relative">
               <label className="block text-[10px] uppercase font-black text-slate-500 mb-2 mr-1 tracking-widest text-right">התחברות עובד</label>
               <div className="relative">
                  <Mail className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                     required
                     type="text"
                     autoFocus
                     className="w-full p-4 pr-12 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none focus:ring-2 focus:ring-brand transition-all font-black text-slate-800 text-right shadow-inner text-base"
                     value={identifier}
                     onChange={e => { setIdentifier(e.target.value); setError(''); }}
                     placeholder="אימייל או קוד PIN אישי"
                  />
               </div>
               {error && (
                  <div className="flex items-center gap-2 text-rose-600 text-[10px] font-black mt-3 mr-1 animate-fade-in flex-row-reverse">
                     <AlertCircle size={14} />
                     <span>{error}</span>
                  </div>
               )}
            </div>
          </div>

          <div className="pt-2">
             <button type="submit" className="w-full brand-gradient text-white py-4.5 rounded-2xl font-black text-sm uppercase tracking-[0.2em] hover:opacity-95 transition-all shadow-xl flex items-center justify-center gap-4 active:scale-95 group">
                התחברות למערכת
                <LogIn size={20} className="group-hover:translate-x-[-4px] transition-transform" />
             </button>
          </div>
          
          <div className="bg-slate-50 p-6 rounded-2xl text-center border border-slate-100 shadow-inner mt-8">
             <div className="flex justify-center mb-3">
               <Lock size={16} className="text-slate-300" />
             </div>
             <p className="text-[9px] font-bold text-slate-400 leading-relaxed uppercase tracking-tight">
               הגישה מיועדת לצוות המורשה של המועדון בלבד. <br/>
               ההתחברות מתבצעת באמצעות אימייל או PIN אישי מהשרת.
             </p>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginScreen;
