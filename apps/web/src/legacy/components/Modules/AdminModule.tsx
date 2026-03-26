
import React, { useState, useRef } from 'react';
import { useAppStore } from '../../store';
import { Role, Certification, User } from '../../types';
import { UserPlus, Edit2, X, Archive, Save, Star, Banknote, FileCheck, Upload, Download, FileText, Building2, Key } from 'lucide-react';
import { isValidOptionalPhone, normalizePhoneInput, PHONE_VALIDATION_MESSAGE } from '../../utils/phone';

const CERTS: Certification[] = [
  'גלישת גלים', 'סאפ', 'גלישת רוח', 'גלישת כנף', 'קטמרן', 'גלישת קייט', 'מפעיל סירת חילוץ'
];

const AdminModule: React.FC = () => {
  const { users, addUser, updateUser, archiveUser } = useAppStore();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({ 
    name: '', email: '', phone: '', role: 'Instructor' as Role, 
    certifications: [] as Certification[], avatar: '',
    isFullTime: false, fixedDayOff: null as number | null, canAddBonuses: false,
    bankName: '', bankBranch: '', accountNumber: '', hasForm101: false,
    form101Data: '', form101FileName: '', quickCode: ''
  });

  const handleOpenAdd = () => {
    setFormData({ 
      name: '', email: '', phone: '', role: 'Instructor', certifications: [], avatar: '', 
      isFullTime: false, fixedDayOff: null, canAddBonuses: false,
      bankName: '', bankBranch: '', accountNumber: '', hasForm101: false,
      form101Data: '', form101FileName: '', quickCode: ''
    });
    setEditingId(null);
    setIsFormOpen(true);
    setIsBankModalOpen(false);
  };

  const handleOpenEdit = (user: User) => {
    setFormData({ 
      name: user.name, email: user.email, phone: user.phone, role: user.role, 
      certifications: [...user.certifications], avatar: user.avatar || '',
      isFullTime: user.isFullTime || false, fixedDayOff: user.fixedDayOff || null,
      canAddBonuses: user.canAddBonuses || false,
      bankName: user.bankName || '', bankBranch: user.bankBranch || '', accountNumber: user.accountNumber || '',
      hasForm101: user.hasForm101 || false,
      form101Data: user.form101Data || '',
      form101FileName: user.form101FileName || '',
      quickCode: user.quickCode || ''
    });
    setEditingId(user.id);
    setIsFormOpen(true);
    setIsBankModalOpen(false);
  };

  const toggleCert = (cert: Certification) => {
    setFormData(prev => ({
      ...prev,
      certifications: prev.certifications.includes(cert) 
        ? prev.certifications.filter(c => c !== cert) 
        : [...prev.certifications, cert]
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidOptionalPhone(formData.phone)) {
      alert(PHONE_VALIDATION_MESSAGE);
      return;
    }
    const userData: User = {
      id: editingId || Math.random().toString(36).substr(2, 9),
      ...formData,
      phone: normalizePhoneInput(formData.phone),
      isArchived: false
    };
    if (editingId) updateUser(userData);
    else addUser(userData);
    setIsFormOpen(false);
  };

  const getRoleLabel = (role: string) => {
    switch(role) {
      case 'Shop Computer': return 'חשבון חנות';
      case 'Shift Manager': return 'אחמ"ש';
      case 'Manager': return 'מנהל';
      case 'Instructor': return 'מדריך';
      case 'Warehouse': return 'מחסנאי/ת';
      case 'Site Editor': return 'עורך אתר';
      default: return role;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto text-right animate-fade-in px-1" dir="rtl">
      <header className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-slate-200 pb-10">
        <div>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">ניהול צוות מלא</h2>
          <p className="text-slate-600 font-bold uppercase tracking-widest text-xs mt-2">הסמכות, שכר, בנק וטפסים</p>
        </div>
        <button onClick={handleOpenAdd} className="w-full md:w-auto bg-slate-900 text-white px-8 py-5 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-black shadow-lg flex items-center justify-center gap-3 transition-all active:scale-95">
          <UserPlus size={20} /> הוספת עובד חדש
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {users.filter(u => !u.isArchived).map(user => (
          <div key={user.id} className="bg-white rounded-[2.5rem] border-2 border-slate-100 shadow-xl overflow-hidden flex flex-col group hover:border-brand transition-all">
            <div className="p-8 flex items-start justify-between flex-row-reverse">
              <div className="flex items-center gap-4 flex-row-reverse">
                <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center font-black text-2xl shadow-lg shrink-0">
                   {user.avatar ? <img src={user.avatar} className="w-full h-full rounded-2xl object-cover" /> : user.name.charAt(0)}
                </div>
                <div className="text-right">
                   <h3 className="text-xl font-black text-slate-900 leading-none mb-1">{user.name}</h3>
                   <span className="text-[10px] font-black uppercase text-brand tracking-widest">{getRoleLabel(user.role)}</span>
                </div>
              </div>
              <div className="flex flex-col gap-2">
                 <button onClick={() => handleOpenEdit(user)} className="p-3 bg-slate-50 text-slate-400 hover:text-brand hover:bg-brand-light rounded-xl transition-all"><Edit2 size={16}/></button>
                 <button onClick={() => archiveUser(user.id)} className="p-3 bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Archive size={16}/></button>
              </div>
            </div>

            <div className="px-8 pb-8 space-y-4 flex-1">
               <div className="flex flex-wrap gap-2 justify-end">
                  {user.certifications.map(c => (
                    <span key={c} className="bg-slate-50 text-slate-600 px-3 py-1 rounded-lg text-[9px] font-black border border-slate-200">{c}</span>
                  ))}
               </div>
               
               <div className="grid grid-cols-2 gap-3 pt-4 border-t border-slate-100">
                  <div className={`flex items-center gap-2 flex-row-reverse text-[10px] font-black ${user.hasForm101 ? 'text-emerald-600' : 'text-rose-500'}`}>
                     <FileCheck size={14} /> טופס 101: {user.hasForm101 ? 'קיים' : 'חסר'}
                  </div>
                  <div className={`flex items-center gap-2 flex-row-reverse text-[10px] font-black ${user.isFullTime ? 'text-indigo-600' : 'text-slate-400'}`}>
                     <Star size={14} /> {user.isFullTime ? 'משרה מלאה' : 'משרה חלקית'}
                  </div>
                  <div className="flex items-center gap-2 flex-row-reverse text-[10px] font-black text-brand col-span-2">
                     <Key size={14} /> PIN התחברות: <span className="font-black">{user.quickCode ? 'מוגדר' : 'לא הוגדר'}</span>
                  </div>
               </div>
            </div>
          </div>
        ))}
      </div>

      {isFormOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in" onClick={() => setIsFormOpen(false)}>
          <div className="bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl p-10 md:p-14 overflow-y-auto max-h-[95vh]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-10 flex-row-reverse">
              <h3 className="text-3xl font-black text-slate-900">פרופיל עובד מלא</h3>
              <button onClick={() => setIsFormOpen(false)} className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:text-slate-900"><X size={28} /></button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-10 text-right">
              <section className="space-y-6">
                <h4 className="text-xs font-black text-brand-ocean uppercase tracking-widest border-b border-slate-100 pb-2">פרטים אישיים</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <input required className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-right shadow-inner" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="שם מלא" />
                  <input inputMode="tel" title={PHONE_VALIDATION_MESSAGE} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-right shadow-inner" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} placeholder="טלפון" />
                  <input required className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-right shadow-inner" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} placeholder="אימייל להתחברות" />
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-brand uppercase mr-2 tracking-widest">קוד גישה מהיר (PIN)</label>
                    <input className="w-full p-5 bg-brand-light border-2 border-brand/20 rounded-2xl font-black text-right shadow-inner placeholder:text-brand/40" value={formData.quickCode} onChange={e => setFormData({...formData, quickCode: e.target.value})} placeholder="לדוגמה: 1234" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase mr-2 tracking-widest">תפקיד במערכת</label>
                    <select className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-right shadow-inner" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as Role})}>
                      <option value="Instructor">מדריך</option>
                      <option value="Shift Manager">אחמ"ש</option>
                      <option value="Shop Computer">חשבון חנות (הרשאות אחמ"ש)</option>
                      <option value="Manager">מנהל</option>
                      <option value="Warehouse">מחסנאי/ת</option>
                    </select>
                  </div>
                </div>
              </section>

              <section className="space-y-6">
                <h4 className="text-xs font-black text-brand-ocean uppercase tracking-widest border-b border-slate-100 pb-2">הסמכות, שכר וטפסים</h4>
                <div className="flex flex-wrap gap-2 justify-end">
                   {CERTS.map(c => (
                     <button key={c} type="button" onClick={() => toggleCert(c)} className={`px-4 py-2 rounded-xl text-xs font-black border transition-all ${formData.certifications.includes(c) ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-slate-50 text-slate-400 border-slate-100'}`}>
                        {c}
                     </button>
                   ))}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                   <div className="flex flex-col gap-4">
                      <label className="flex items-center gap-4 justify-end flex-row-reverse cursor-pointer p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 h-full">
                          <span className="text-sm font-black text-slate-700">עובד משרה מלאה</span>
                          <input type="checkbox" checked={formData.isFullTime} onChange={e => setFormData({...formData, isFullTime: e.target.checked})} className="w-6 h-6 rounded-lg accent-brand" />
                      </label>
                   </div>
                   <div className="flex flex-col gap-4">
                      <label className="flex items-center gap-4 justify-end flex-row-reverse cursor-pointer p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 h-full">
                          <span className="text-sm font-black text-slate-700">רשאי לדווח על מכירות</span>
                          <input type="checkbox" checked={formData.canAddBonuses} onChange={e => setFormData({...formData, canAddBonuses: e.target.checked})} className="w-6 h-6 rounded-lg accent-brand" />
                      </label>
                   </div>
                   <div className="flex flex-col gap-4">
                      <label className="flex items-center gap-4 justify-end flex-row-reverse cursor-pointer p-4 bg-slate-50 rounded-2xl border-2 border-slate-100 h-full">
                          <span className="text-sm font-black text-slate-700">טופס 101 תקין</span>
                          <input type="checkbox" checked={formData.hasForm101} onChange={e => setFormData({...formData, hasForm101: e.target.checked})} className="w-6 h-6 rounded-lg accent-brand" />
                      </label>
                   </div>
                </div>

                <div className="flex justify-end pt-4">
                   <button 
                     type="button" 
                     onClick={() => setIsBankModalOpen(true)}
                     className="flex items-center gap-3 bg-indigo-50 text-indigo-700 border-2 border-indigo-100 px-6 py-4 rounded-2xl font-black text-sm hover:bg-indigo-100 transition-all shadow-sm w-full md:w-auto justify-center"
                   >
                      <Banknote size={20} /> פרטי חשבון בנק
                   </button>
                </div>
              </section>

              <button type="submit" className="w-full brand-gradient text-white py-6 rounded-[2rem] font-black text-xl uppercase tracking-widest shadow-2xl flex items-center justify-center gap-4 transition-all active:scale-95"><Save size={28} /> שמור את כל השינויים</button>
            </form>
          </div>
        </div>
      )}

      {/* Bank Details Modal */}
      {isBankModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-fade-in" onClick={() => setIsBankModalOpen(false)}>
           <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl p-8" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-8 flex-row-reverse">
                 <h3 className="text-2xl font-black text-slate-900">פרטי חשבון בנק</h3>
                 <button onClick={() => setIsBankModalOpen(false)} className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:text-slate-900"><X size={20} /></button>
              </div>
              <div className="space-y-6 text-right">
                 <div className="bg-indigo-50/50 p-4 rounded-2xl flex items-center gap-4 flex-row-reverse border border-indigo-100">
                    <Building2 size={32} className="text-indigo-600"/>
                    <div>
                       <p className="font-black text-sm text-slate-900">{formData.name}</p>
                       <p className="text-xs text-slate-500">העברת משכורת</p>
                    </div>
                 </div>
                 
                 <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-slate-400 mr-2 tracking-widest">שם הבנק</label>
                    <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-right outline-none focus:ring-2 focus:ring-brand" value={formData.bankName} onChange={e => setFormData({...formData, bankName: e.target.value})} placeholder="לדוגמה: בנק הפועלים" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-slate-400 mr-2 tracking-widest">מספר סניף</label>
                    <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-right outline-none focus:ring-2 focus:ring-brand tabular-nums" value={formData.bankBranch} onChange={e => setFormData({...formData, bankBranch: e.target.value})} placeholder="000" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-xs font-black uppercase text-slate-400 mr-2 tracking-widest">מספר חשבון</label>
                    <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-right outline-none focus:ring-2 focus:ring-brand tabular-nums" value={formData.accountNumber} onChange={e => setFormData({...formData, accountNumber: e.target.value})} placeholder="000000" />
                 </div>

                 <button onClick={() => setIsBankModalOpen(false)} className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg active:scale-95 transition-all mt-4">אשר פרטי בנק</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default AdminModule;
