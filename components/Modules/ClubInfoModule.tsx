
import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { Phone, Smartphone, MapPin, CreditCard, Copy, Check, ExternalLink, X, Building2, Edit2, Save, Undo2, MessageCircle, Share2 } from 'lucide-react';
import { ClubSettings } from '../../types';

const ClubInfoModule: React.FC = () => {
  const { clubSettings, updateClubSettings, currentUser } = useAppStore();
  const [copiedType, setCopiedType] = useState<string | null>(null);
  const [isBankModalOpen, setIsBankModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<ClubSettings>({ ...clubSettings });

  const isManager = currentUser?.role === 'Manager' || currentUser?.role === 'Site Editor';

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  const handleSave = () => {
    updateClubSettings(editForm);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditForm({ ...clubSettings });
    setIsEditing(false);
  };

  const shareViaWhatsApp = () => {
    const text = `*פרטי מועדון גלישה FreeGull* 🌊

📞 *טלפונים:*
חנות: ${clubSettings.landline}
נייד/WhatsApp: ${clubSettings.mobile}

📍 *מיקום:*
${clubSettings.locationText}
ניווט: ${clubSettings.mapsUrl}

🏦 *פרטי חשבון להעברה:*
מוטב: ${clubSettings.bankAccountName}
בנק: ${clubSettings.bankName}
סניף: ${clubSettings.bankBranch}
מספר חשבון: ${clubSettings.bankAccountNumber}`;

    const encodedText = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encodedText}`, '_blank');
  };

  return (
    <div className="space-y-10 max-w-4xl mx-auto text-right animate-fade-in px-1" dir="rtl">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 border-b border-slate-200 pb-10">
        <div className="text-right">
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">מידע על המועדון</h2>
          <p className="text-slate-600 font-bold uppercase tracking-widest text-xs mt-3">פרטי קשר, מיקום ותשלומים לשימוש המשרד והחנות</p>
        </div>
        
        <div className="flex flex-wrap gap-3 w-full md:w-auto">
          {isEditing ? (
            <>
              <button onClick={handleCancel} className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all bg-white text-slate-500 border border-slate-200 hover:bg-slate-50">
                <Undo2 size={18} /> ביטול
              </button>
              <button onClick={handleSave} className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all brand-gradient text-white shadow-xl hover:scale-105">
                <Save size={18} /> שמור שינויים
              </button>
            </>
          ) : (
            <>
              <button onClick={shareViaWhatsApp} className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 shadow-md">
                <MessageCircle size={18} /> שיתוף בוואטסאפ
              </button>
              {isManager && (
                <button onClick={() => setIsEditing(true)} className="flex-1 md:flex-none flex items-center justify-center gap-3 px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all bg-indigo-50 text-indigo-700 border border-indigo-200 hover:bg-indigo-100 shadow-md">
                  <Edit2 size={18} /> עריכת פרטים
                </button>
              )}
            </>
          )}
        </div>
      </header>

      {isEditing ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
           {/* Edit Phones */}
           <section className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 space-y-6">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 flex-row-reverse border-b border-slate-50 pb-4">
                 <Phone className="text-brand" /> מספרי טלפון
              </h3>
              <div className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">טלפון נייח</label>
                    <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-right outline-none focus:border-brand tabular-nums" value={editForm.landline} onChange={e => setEditForm({...editForm, landline: e.target.value})} />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">טלפון נייד / וואטסאפ</label>
                    <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-right outline-none focus:border-brand tabular-nums" value={editForm.mobile} onChange={e => setEditForm({...editForm, mobile: e.target.value})} />
                 </div>
              </div>
           </section>

           {/* Edit Location */}
           <section className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 space-y-6">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 flex-row-reverse border-b border-slate-50 pb-4">
                 <MapPin className="text-indigo-500" /> מיקום המועדון
              </h3>
              <div className="space-y-4">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">כתובת טקסט חופשי</label>
                    <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-right outline-none focus:border-brand" value={editForm.locationText} onChange={e => setEditForm({...editForm, locationText: e.target.value})} />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">לינק ל-Maps / Waze</label>
                    <input dir="ltr" className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-left outline-none focus:border-brand" value={editForm.mapsUrl} onChange={e => setEditForm({...editForm, mapsUrl: e.target.value})} />
                 </div>
              </div>
           </section>

           {/* Edit Bank Info */}
           <section className="md:col-span-2 bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 space-y-6">
              <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 flex-row-reverse border-b border-slate-50 pb-4">
                 <CreditCard className="text-emerald-500" /> פרטי חשבון בנק
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">שם המוטב (Account Name)</label>
                    <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-right outline-none focus:border-brand" value={editForm.bankAccountName} onChange={e => setEditForm({...editForm, bankAccountName: e.target.value})} />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">שם הבנק</label>
                    <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-right outline-none focus:border-brand" value={editForm.bankName} onChange={e => setEditForm({...editForm, bankName: e.target.value})} />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">מספר סניף</label>
                    <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-right outline-none focus:border-brand tabular-nums" value={editForm.bankBranch} onChange={e => setEditForm({...editForm, bankBranch: e.target.value})} />
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mr-2">מספר חשבון</label>
                    <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-right outline-none focus:border-brand tabular-nums" value={editForm.bankAccountNumber} onChange={e => setEditForm({...editForm, bankAccountNumber: e.target.value})} />
                 </div>
              </div>
           </section>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Phones View */}
          <section className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 flex flex-col gap-6">
             <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 flex-row-reverse border-b border-slate-50 pb-4">
                <Phone className="text-brand" /> טלפונים בחנות
             </h3>
             
             <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                   <div className="flex items-center gap-4 flex-row-reverse">
                      <div className="w-10 h-10 bg-brand-light text-brand rounded-xl flex items-center justify-center shadow-sm">
                         <Phone size={20} />
                      </div>
                      <div className="text-right">
                         <p className="text-[10px] font-black text-slate-400 uppercase">חנות נייח</p>
                         <a href={`tel:${clubSettings.landline}`} className="text-lg font-black text-slate-800 tabular-nums hover:text-brand transition-colors">{clubSettings.landline}</a>
                      </div>
                   </div>
                   <button onClick={() => handleCopy(clubSettings.landline, 'landline')} className="p-2 text-slate-400 hover:text-brand transition-all">
                      {copiedType === 'landline' ? <Check size={20} className="text-emerald-500" /> : <Copy size={20} />}
                   </button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                   <div className="flex items-center gap-4 flex-row-reverse">
                      <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center shadow-sm">
                         <Smartphone size={20} />
                      </div>
                      <div className="text-right">
                         <p className="text-[10px] font-black text-slate-400 uppercase">חנות נייד / WhatsApp</p>
                         <a href={`tel:${clubSettings.mobile}`} className="text-lg font-black text-slate-800 tabular-nums hover:text-indigo-600 transition-colors">{clubSettings.mobile}</a>
                      </div>
                   </div>
                   <button onClick={() => handleCopy(clubSettings.mobile, 'mobile')} className="p-2 text-slate-400 hover:text-brand transition-all">
                      {copiedType === 'mobile' ? <Check size={20} className="text-emerald-500" /> : <Copy size={20} />}
                   </button>
                </div>
             </div>
          </section>

          {/* Location View */}
          <section className="bg-white p-8 rounded-[3rem] shadow-xl border border-slate-100 flex flex-col gap-6">
             <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 flex-row-reverse border-b border-slate-50 pb-4">
                <MapPin className="text-indigo-500" /> מיקום המועדון
             </h3>
             
             <div className="flex flex-col gap-4 flex-1">
                <div className="bg-indigo-50/50 p-6 rounded-2xl border border-indigo-100 text-right">
                   <p className="font-black text-indigo-900 text-lg leading-tight">{clubSettings.locationText}</p>
                   <p className="text-xs text-indigo-400 mt-2 font-bold uppercase tracking-wider">מיקום מדויק לשליחה ללקוחות</p>
                </div>
                
                <div className="grid grid-cols-2 gap-3 mt-auto">
                   <button 
                     onClick={() => handleCopy(clubSettings.locationText, 'location')} 
                     className="flex items-center justify-center gap-2 bg-slate-900 text-white py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black transition-all shadow-md active:scale-95"
                   >
                      {copiedType === 'location' ? <Check size={16} /> : <Copy size={16} />}
                      העתק כתובת
                   </button>
                   <a 
                     href={clubSettings.mapsUrl} 
                     target="_blank" 
                     rel="noopener noreferrer"
                     className="flex items-center justify-center gap-2 bg-white text-indigo-600 border-2 border-indigo-600 py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-md active:scale-95"
                   >
                      <ExternalLink size={16} />
                      ניווט ב-Maps
                   </a>
                </div>
             </div>
          </section>

          {/* Bank Transfer View */}
          <section 
            onClick={() => setIsBankModalOpen(true)}
            className="md:col-span-2 bg-brand-ocean text-white p-10 rounded-[3.5rem] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-8 cursor-pointer hover:scale-[1.01] transition-all relative overflow-hidden group"
          >
             <div className="absolute top-0 left-0 w-full h-full brand-gradient opacity-0 group-hover:opacity-20 transition-opacity" />
             <div className="relative z-10 flex items-center gap-8 flex-row-reverse text-right">
                <div className="w-20 h-20 bg-white/10 rounded-3xl flex items-center justify-center backdrop-blur-md border border-white/20 shadow-xl">
                   <CreditCard size={40} className="text-brand" />
                </div>
                <div>
                   <h3 className="text-3xl font-black mb-2">פרטי העברה בנקאית</h3>
                   <p className="text-white/60 font-bold uppercase tracking-[0.2em] text-xs">לחץ להצגת פרטי החשבון המלאים עבור הלקוח</p>
                </div>
             </div>
             <div className="relative z-10 bg-white/10 px-8 py-4 rounded-2xl border border-white/20 font-black uppercase text-sm tracking-widest group-hover:bg-white group-hover:text-brand-ocean transition-all">
                הצג פרטים
             </div>
          </section>
        </div>
      )}

      {/* Bank Details Modal */}
      {isBankModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-fade-in" onClick={() => setIsBankModalOpen(false)}>
           <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 md:p-12" onClick={e => e.stopPropagation()}>
              <div className="flex justify-between items-center mb-10 flex-row-reverse">
                 <div className="text-right">
                    <h3 className="text-2xl font-black text-slate-900">חשבון להעברה</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">FreeGull Surfing Club</p>
                 </div>
                 <button onClick={() => setIsBankModalOpen(false)} className="p-2 bg-slate-100 text-slate-600 rounded-xl hover:text-indigo-600 transition-all"><X size={24} /></button>
              </div>

              <div className="space-y-6 text-right">
                 <div className="bg-emerald-50/50 p-6 rounded-3xl flex items-center gap-6 flex-row-reverse border border-emerald-100 shadow-inner">
                    <Building2 size={48} className="text-emerald-600" />
                    <div>
                       <p className="text-[10px] font-black text-emerald-400 uppercase mb-1">שם המוטב</p>
                       <p className="text-xl font-black text-slate-900 leading-tight">{clubSettings.bankAccountName}</p>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 gap-4">
                    {[
                      { label: 'שם הבנק', value: clubSettings.bankName, id: 'bank' },
                      { label: 'מספר סניף', value: clubSettings.bankBranch, id: 'branch' },
                      { label: 'מספר חשבון', value: clubSettings.bankAccountNumber, id: 'acc' }
                    ].map(item => (
                       <div key={item.id} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100 group">
                          <div className="text-right">
                             <p className="text-[10px] font-black text-slate-400 uppercase">{item.label}</p>
                             <p className="text-lg font-black text-slate-900 tabular-nums">{item.value}</p>
                          </div>
                          <button onClick={() => handleCopy(item.value, item.id)} className="p-2 text-slate-300 hover:text-emerald-600 transition-all">
                             {copiedType === item.id ? <Check size={20} className="text-emerald-500" /> : <Copy size={20} />}
                          </button>
                       </div>
                    ))}
                 </div>

                 <button onClick={() => setIsBankModalOpen(false)} className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all mt-6">סגור חלונית</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default ClubInfoModule;
