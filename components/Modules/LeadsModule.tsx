
import React, { useState } from 'react';
import { useAppStore } from '../../store';
import { Lead, LeadStatus, LeadSource } from '../../types';
import { MessageCircle, Mail, Plus, Trash2, Edit2, Phone, User, Globe, Users, Save, X, ExternalLink, Filter } from 'lucide-react';
import { isValidPhone, normalizePhoneInput, PHONE_VALIDATION_MESSAGE } from '../../utils/phone';

const LeadsModule: React.FC = () => {
  const { leads, addLead, updateLead, deleteLead } = useAppStore();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeStatus, setActiveStatus] = useState<LeadStatus | 'All'>('All');

  const [formData, setFormData] = useState<{
    name: string;
    phone: string;
    email: string;
    source: LeadSource;
    status: LeadStatus;
    notes: string;
  }>({
    name: '', phone: '', email: '', source: 'WhatsApp', status: 'New', notes: ''
  });

  const filteredLeads = leads.filter(l => activeStatus === 'All' || l.status === activeStatus)
    .sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const handleOpenAdd = () => {
    setFormData({ name: '', phone: '', email: '', source: 'WhatsApp', status: 'New', notes: '' });
    setEditingId(null);
    setIsFormOpen(true);
  };

  const handleEdit = (lead: Lead) => {
    setFormData({
       name: lead.name,
       phone: lead.phone,
       email: lead.email || '',
       source: lead.source,
       status: lead.status,
       notes: lead.notes
    });
    setEditingId(lead.id);
    setIsFormOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    if (!isValidPhone(formData.phone)) {
      alert(PHONE_VALIDATION_MESSAGE);
      return;
    }

    const normalizedPhone = normalizePhoneInput(formData.phone);

    if (editingId) {
      updateLead({
        id: editingId,
        ...formData,
        phone: normalizedPhone,
        createdAt: leads.find(l => l.id === editingId)?.createdAt || new Date().toISOString()
      });
    } else {
      addLead({
        id: Math.random().toString(36).substr(2, 9),
        ...formData,
        phone: normalizedPhone,
        createdAt: new Date().toISOString()
      });
    }
    setIsFormOpen(false);
  };

  const statusColors: Record<LeadStatus, string> = {
    'New': 'bg-blue-500 text-white',
    'In Progress': 'bg-amber-500 text-white',
    'Converted': 'bg-emerald-500 text-white',
    'Lost': 'bg-slate-300 text-slate-600'
  };

  const statusLabels: Record<LeadStatus, string> = {
    'New': 'חדש',
    'In Progress': 'בטיפול',
    'Converted': 'נסגר עסקה',
    'Lost': 'לא רלוונטי'
  };

  return (
    <div className="space-y-8 md:space-y-10 max-w-7xl mx-auto pb-24 text-right px-2" dir="rtl">
       <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6 border-b border-slate-200 pb-8">
          <div>
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">ניהול לידים</h2>
            <p className="text-slate-600 font-bold uppercase tracking-widest text-[10px] md:text-xs mt-2">מעקב פניות ומתעניינים חדשים</p>
          </div>
          <button onClick={handleOpenAdd} className="w-full md:w-auto bg-brand text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-lg hover:bg-brand-dark transition-all flex items-center justify-center gap-3 active:scale-95">
             <Plus size={20} /> הוספת ליד ידנית
          </button>
       </header>

       {/* Quick Action Cards */}
       <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
          <a href="https://web.whatsapp.com/" target="_blank" rel="noopener noreferrer" className="bg-[#25D366] text-white p-6 md:p-8 rounded-[2rem] shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 flex items-center justify-between group overflow-hidden relative">
             <div className="relative z-10">
                <h3 className="text-2xl font-black mb-1">WhatsApp Web</h3>
                <p className="text-xs font-bold opacity-90 uppercase tracking-widest">פתיחת ממשק הודעות</p>
             </div>
             <MessageCircle size={40} className="text-white relative z-10" />
             <div className="absolute -right-6 -bottom-6 bg-white/20 w-32 h-32 rounded-full group-hover:scale-150 transition-transform duration-500" />
          </a>
          
          <a href="https://mail.google.com/" target="_blank" rel="noopener noreferrer" className="bg-white border border-slate-200 text-slate-900 p-6 md:p-8 rounded-[2rem] shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1 flex items-center justify-between group overflow-hidden relative">
             <div className="relative z-10">
                <h3 className="text-2xl font-black mb-1">Gmail / Email</h3>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">בדיקת פניות במייל</p>
             </div>
             <Mail size={40} className="text-slate-300 group-hover:text-rose-500 transition-colors relative z-10" />
          </a>
       </div>

       {/* Filters */}
       <div className="bg-white p-2 rounded-2xl shadow-sm border border-slate-200 flex w-full overflow-x-auto scroll-hint">
          {(['All', 'New', 'In Progress', 'Converted', 'Lost'] as const).map(status => (
             <button
                key={status}
                onClick={() => setActiveStatus(status)}
                className={`px-6 py-3 rounded-xl text-xs font-black transition-all whitespace-nowrap shrink-0 ${activeStatus === status ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:bg-slate-50'}`}
             >
                {status === 'All' ? 'כל הלידים' : statusLabels[status]}
             </button>
          ))}
       </div>

       {/* Mobile View: Cards */}
       <div className="block md:hidden space-y-4">
          {filteredLeads.map(lead => (
             <div key={lead.id} className="bg-white p-4 rounded-[2rem] border border-slate-200 shadow-sm relative overflow-hidden">
                <div className={`absolute top-0 right-0 w-2 h-full ${statusColors[lead.status].split(' ')[0]}`} />
                
                <div className="flex justify-between items-start mb-4 gap-3 pl-2">
                   <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center border border-slate-100 shrink-0">
                         <User size={20} />
                      </div>
                      <div className="min-w-0 flex-1">
                         <h3 className="text-lg font-black text-slate-900 leading-tight truncate">{lead.name}</h3>
                         <div className="flex items-center gap-2 mt-1">
                            <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold uppercase shrink-0">{lead.source}</span>
                            <span className="text-[10px] text-slate-400 font-bold truncate">{new Date(lead.createdAt).toLocaleDateString('he-IL')}</span>
                         </div>
                      </div>
                   </div>
                   <button onClick={() => handleEdit(lead)} className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-slate-900 shrink-0"><Edit2 size={16} /></button>
                </div>

                <div className="space-y-3 mb-4">
                   <div className="flex flex-wrap gap-2">
                       <a href={`tel:${lead.phone}`} className="flex items-center gap-2 font-bold text-slate-700 hover:text-blue-600 text-sm bg-slate-50 p-2 rounded-xl border border-slate-100 max-w-full">
                          <Phone size={14} className="text-slate-400 shrink-0"/> <span className="truncate">{lead.phone}</span>
                       </a>
                       {lead.email && (
                          <div className="flex items-center gap-2 font-bold text-slate-500 text-xs bg-slate-50 p-2 rounded-xl border border-slate-100 max-w-full">
                             <Mail size={14} className="text-slate-400 shrink-0"/> <span className="truncate">{lead.email}</span>
                          </div>
                       )}
                   </div>
                   {lead.notes && (
                      <p className="text-sm text-slate-500 italic bg-amber-50/50 p-3 rounded-xl border border-amber-100/50 leading-relaxed break-words">"{lead.notes}"</p>
                   )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                   <span className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest ${statusColors[lead.status]}`}>
                      {statusLabels[lead.status]}
                   </span>
                   <button onClick={() => { if(confirm('למחוק את הליד?')) deleteLead(lead.id) }} className="p-2 text-rose-300 hover:text-rose-500 transition-colors"><Trash2 size={18} /></button>
                </div>
             </div>
          ))}
          {filteredLeads.length === 0 && (
             <div className="text-center py-20 text-slate-300 italic font-black bg-slate-50 rounded-[2rem] border border-dashed border-slate-200">לא נמצאו לידים.</div>
          )}
       </div>

       {/* Desktop View: Table */}
       <div className="hidden md:block bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden scroll-hint">
          <div className="overflow-x-auto">
             <table className="w-full text-right min-w-[800px]">
                <thead className="bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest">
                   <tr>
                      <th className="p-6">שם מלא</th>
                      <th className="p-6">פרטי קשר</th>
                      <th className="p-6">מקור הגעה</th>
                      <th className="p-6">סטטוס</th>
                      <th className="p-6 w-1/3">הערות</th>
                      <th className="p-6 text-left">פעולות</th>
                   </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                   {filteredLeads.map(lead => (
                      <tr key={lead.id} className="hover:bg-slate-50/80 transition-colors">
                         <td className="p-6 font-black text-slate-900 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                               <User size={16} />
                            </div>
                            {lead.name}
                         </td>
                         <td className="p-6">
                            <div className="flex flex-col gap-1">
                               <a href={`tel:${lead.phone}`} className="font-bold hover:text-blue-600 flex items-center gap-1.5 tabular-nums"><Phone size={12}/> {lead.phone}</a>
                               {lead.email && <span className="text-slate-400 text-xs flex items-center gap-1.5"><Mail size={12}/> {lead.email}</span>}
                            </div>
                         </td>
                         <td className="p-6">
                            <span className="bg-slate-100 text-slate-600 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider">{lead.source}</span>
                         </td>
                         <td className="p-6">
                            <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-sm ${statusColors[lead.status]}`}>
                               {statusLabels[lead.status]}
                            </span>
                         </td>
                         <td className="p-6 text-slate-500 text-xs leading-relaxed max-w-xs truncate" title={lead.notes}>
                            {lead.notes || '—'}
                         </td>
                         <td className="p-6 text-left">
                            <div className="flex items-center justify-end gap-2">
                               <button onClick={() => handleEdit(lead)} className="p-2.5 bg-slate-100 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"><Edit2 size={16} /></button>
                               <button onClick={() => { if(confirm('למחוק את הליד?')) deleteLead(lead.id) }} className="p-2.5 bg-slate-100 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"><Trash2 size={16} /></button>
                            </div>
                         </td>
                      </tr>
                   ))}
                   {filteredLeads.length === 0 && (
                      <tr>
                         <td colSpan={6} className="p-20 text-center text-slate-300 italic font-black text-xl">לא נמצאו לידים בסינון זה.</td>
                      </tr>
                   )}
                </tbody>
             </table>
          </div>
       </div>

       {isFormOpen && (
         <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in" onClick={() => setIsFormOpen(false)}>
            <div className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl p-8 md:p-12 overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
               <div className="flex justify-between items-start mb-8 flex-row-reverse">
                  <div className="text-right">
                     <h3 className="text-2xl font-black text-slate-900">{editingId ? 'עריכת ליד' : 'ליד חדש'}</h3>
                     <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-1">פרטי לקוח פוטנציאלי</p>
                  </div>
                  <button onClick={() => setIsFormOpen(false)} className="p-2 bg-slate-100 text-slate-400 rounded-xl hover:text-slate-900"><X size={24} /></button>
               </div>

               <form onSubmit={handleSubmit} className="space-y-6 text-right">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase text-slate-400 mr-2 tracking-widest">שם מלא</label>
                     <input required className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-right outline-none focus:ring-2 focus:ring-brand" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 mr-2 tracking-widest">טלפון</label>
                        <input required inputMode="tel" title={PHONE_VALIDATION_MESSAGE} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-right outline-none focus:ring-2 focus:ring-brand tabular-nums" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 mr-2 tracking-widest">אימייל</label>
                        <input className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-right outline-none focus:ring-2 focus:ring-brand" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                     </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 mr-2 tracking-widest">מקור הגעה</label>
                        <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-right outline-none focus:ring-2 focus:ring-brand appearance-none" value={formData.source} onChange={e => setFormData({...formData, source: e.target.value as LeadSource})}>
                           <option value="WhatsApp">WhatsApp</option>
                           <option value="Email">Email</option>
                           <option value="Phone">Phone</option>
                           <option value="Frontal">פרונטלי</option>
                           <option value="Website">אתר</option>
                           <option value="Social">רשתות חברתיות</option>
                        </select>
                     </div>
                     <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-slate-400 mr-2 tracking-widest">סטטוס טיפול</label>
                        <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-right outline-none focus:ring-2 focus:ring-brand appearance-none" value={formData.status} onChange={e => setFormData({...formData, status: e.target.value as LeadStatus})}>
                           <option value="New">חדש</option>
                           <option value="In Progress">בטיפול</option>
                           <option value="Converted">נסגר עסקה</option>
                           <option value="Lost">לא רלוונטי</option>
                        </select>
                     </div>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black uppercase text-slate-400 mr-2 tracking-widest">הערות נוספות</label>
                     <textarea className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-right outline-none focus:ring-2 focus:ring-brand h-24" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} />
                  </div>
                  
                  <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-base uppercase tracking-widest shadow-xl hover:bg-black transition-all active:scale-95 mt-4">
                     {editingId ? 'עדכן ליד' : 'שמור ליד חדש'}
                  </button>
               </form>
            </div>
         </div>
       )}
    </div>
  );
};

export default LeadsModule;
