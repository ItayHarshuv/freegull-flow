
import React, { useState } from 'react';
import { FileText, MessageSquare, Download, Copy, Check, Plus, Trash2, Edit2, X, Save, Upload, Printer } from 'lucide-react';
import { useAppStore } from '../../store';
import { WhatsAppTemplate, KnowledgeFile } from '../../types';

const KnowledgeModule: React.FC = () => {
  const { 
    currentUser, 
    whatsappTemplates, 
    knowledgeFiles, 
    addWhatsAppTemplate, 
    updateWhatsAppTemplate, 
    deleteWhatsAppTemplate,
    addKnowledgeFile,
    deleteKnowledgeFile
  } = useAppStore();

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isTemplateFormOpen, setIsTemplateFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<WhatsAppTemplate | null>(null);
  const [templateData, setTemplateData] = useState({ title: '', text: '' });

  const [isFileFormOpen, setIsFileFormOpen] = useState(false);
  const [fileData, setFileData] = useState({ name: '', type: 'PDF' });

  const isAuthorized = currentUser?.role === 'Site Editor' || currentUser?.role === 'Manager';

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownload = (file: KnowledgeFile) => {
    alert(`מוריד קובץ: ${file.name}\nסוג: ${file.type}\nגודל: ${file.size}`);
  };

  const handlePrint = (file: KnowledgeFile) => {
    alert(`שולח להדפסה: ${file.name}`);
    // In a real app, this would trigger window.print() on the file URL
  };

  const handleOpenAddTemplate = () => {
    setTemplateData({ title: '', text: '' });
    setEditingTemplate(null);
    setIsTemplateFormOpen(true);
  };

  const handleOpenEditTemplate = (template: WhatsAppTemplate) => {
    setTemplateData({ title: template.title, text: template.text });
    setEditingTemplate(template);
    setIsTemplateFormOpen(true);
  };

  const handleTemplateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!templateData.title || !templateData.text) return;

    if (editingTemplate) {
      updateWhatsAppTemplate({ ...editingTemplate, ...templateData });
    } else {
      addWhatsAppTemplate({
        id: Math.random().toString(36).substr(2, 9),
        ...templateData
      });
    }
    setIsTemplateFormOpen(false);
  };

  const handleFileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fileData.name) return;
    
    addKnowledgeFile({
      id: Math.random().toString(36).substr(2, 9),
      name: fileData.name,
      type: fileData.type,
      size: `${(Math.random() * 5).toFixed(1)} MB`
    });
    setIsFileFormOpen(false);
    setFileData({ name: '', type: 'PDF' });
  };

  return (
    <div className="space-y-12 max-w-6xl mx-auto pb-20 text-right" dir="rtl">
      <div className="flex flex-col gap-2">
        <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">חומר מקצועי ומידע</h2>
        <p className="text-slate-600 font-bold uppercase tracking-widest text-sm">נהלי בטיחות, קבצים ותבניות הודעה מהירות</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* WhatsApp Templates */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 flex-row-reverse">
            <div className="flex items-center gap-3 text-slate-900 flex-row-reverse">
              <h3 className="text-2xl font-black">תבניות הודעה</h3>
              <MessageSquare size={28} className="text-emerald-500" />
            </div>
            {isAuthorized && (
              <button 
                onClick={handleOpenAddTemplate}
                className="flex items-center gap-2 bg-emerald-50 text-emerald-600 px-5 py-3 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-emerald-100 transition-all shadow-sm"
              >
                <Plus size={18} /> הוסף תבנית
              </button>
            )}
          </div>
          
          <div className="space-y-5">
            {whatsappTemplates.map((template) => (
              <div key={template.id} className="bg-white p-7 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md transition-all flex flex-col gap-5">
                <div className="flex justify-between items-center flex-row-reverse">
                  <span className="text-lg font-black text-slate-900">{template.title}</span>
                  <div className="flex items-center gap-2">
                    {isAuthorized && (
                      <>
                        <button 
                          onClick={() => handleOpenEditTemplate(template)}
                          className="p-3 rounded-xl bg-slate-50 text-slate-400 hover:text-blue-500 hover:bg-blue-50 transition-all"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          onClick={() => { if(confirm('למחוק תבנית?')) deleteWhatsAppTemplate(template.id); }}
                          className="p-3 rounded-xl bg-slate-50 text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition-all"
                        >
                          <Trash2 size={18} />
                        </button>
                      </>
                    )}
                    <button 
                      onClick={() => handleCopy(template.text, template.id)}
                      className="p-3 rounded-xl bg-slate-900 text-white hover:bg-black transition-all shadow-md flex items-center gap-2"
                    >
                      <span className="text-xs font-black uppercase">{copiedId === template.id ? 'הועתק!' : 'העתק'}</span>
                      {copiedId === template.id ? <Check size={18} className="text-emerald-400" /> : <Copy size={18} />}
                    </button>
                  </div>
                </div>
                <p className="text-base text-slate-600 leading-relaxed bg-slate-50 p-5 rounded-2xl border border-slate-100 italic shadow-inner">"{template.text}"</p>
              </div>
            ))}
          </div>
        </section>

        {/* Professional Files */}
        <section className="space-y-6">
          <div className="flex items-center justify-between border-b border-slate-200 pb-4 flex-row-reverse">
            <div className="flex items-center gap-3 text-slate-900 flex-row-reverse">
              <h3 className="text-2xl font-black">קבצים והסמכות</h3>
              <FileText size={28} className="text-blue-500" />
            </div>
            {isAuthorized && (
              <button 
                onClick={() => setIsFileFormOpen(true)}
                className="flex items-center gap-2 bg-blue-50 text-blue-600 px-5 py-3 rounded-xl text-sm font-black uppercase tracking-widest hover:bg-blue-100 transition-all shadow-sm"
              >
                <Upload size={18} /> העלאת קובץ
              </button>
            )}
          </div>
          
          <div className="space-y-4">
            {knowledgeFiles.map((file) => (
              <div key={file.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center justify-between group hover:border-blue-500 transition-all flex-row-reverse">
                <div className="flex items-center gap-5 flex-row-reverse">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs shadow-inner">
                    {file.type}
                  </div>
                  <div className="text-right">
                    <h4 className="text-lg font-black text-slate-900 leading-tight">{file.name}</h4>
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">{file.size}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handlePrint(file)}
                    className="p-3.5 bg-slate-100 text-slate-600 hover:bg-slate-900 hover:text-white rounded-xl transition-all shadow-sm flex items-center gap-2 border border-slate-200"
                    title="הדפסה"
                  >
                    <Printer size={20} />
                  </button>
                  <button 
                    onClick={() => handleDownload(file)}
                    className="p-3.5 bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white rounded-xl transition-all shadow-sm flex items-center gap-2 border border-blue-100"
                    title="הורדה"
                  >
                    <Download size={20} />
                  </button>
                  {isAuthorized && (
                    <button 
                      onClick={() => { if(confirm('למחוק קובץ מהמערכת?')) deleteKnowledgeFile(file.id); }}
                      className="p-3.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Template Modal */}
      {isTemplateFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in" onClick={() => setIsTemplateFormOpen(false)}>
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-8 md:p-12 overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-10 flex-row-reverse">
              <div className="text-right">
                <h3 className="text-3xl font-black text-slate-900 leading-tight">{editingTemplate ? 'עריכת תבנית' : 'הוספת תבנית חדשה'}</h3>
                <p className="text-slate-600 text-xs font-bold uppercase tracking-widest mt-1">ניהול הודעות ווטסאפ</p>
              </div>
              <button onClick={() => setIsTemplateFormOpen(false)} className="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:text-slate-900"><X size={28} /></button>
            </div>
            <form onSubmit={handleTemplateSubmit} className="space-y-8 text-right">
              <div className="space-y-2">
                <label className="text-xs uppercase font-black text-slate-600 block mr-1 tracking-widest">כותרת התבנית</label>
                <input required className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-lg text-slate-800 outline-none focus:ring-2 focus:ring-slate-900 text-right shadow-inner" value={templateData.title} onChange={e => setTemplateData({...templateData, title: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase font-black text-slate-600 block mr-1 tracking-widest">תוכן ההודעה</label>
                <textarea required rows={5} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-base text-slate-800 outline-none focus:ring-2 focus:ring-slate-900 text-right shadow-inner leading-relaxed" value={templateData.text} onChange={e => setTemplateData({...templateData, text: e.target.value})} />
              </div>
              <button className="w-full bg-slate-900 text-white py-6 rounded-3xl font-black text-base uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 mt-4">
                <Save size={24} /> שמור תבנית במערכת
              </button>
            </form>
          </div>
        </div>
      )}

      {/* File Modal */}
      {isFileFormOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-fade-in" onClick={() => setIsFileFormOpen(false)}>
          <div className="bg-white w-full max-w-lg rounded-[3rem] shadow-2xl p-8 md:p-12 overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-10 flex-row-reverse">
              <div className="text-right">
                <h3 className="text-3xl font-black text-slate-900 leading-tight">העלאת קובץ מקצועי</h3>
                <p className="text-slate-600 text-xs font-bold uppercase tracking-widest mt-1">מסמכים ונהלים</p>
              </div>
              <button onClick={() => setIsFileFormOpen(false)} className="p-3 bg-slate-100 text-slate-600 rounded-2xl hover:text-slate-900"><X size={28} /></button>
            </div>
            <form onSubmit={handleFileSubmit} className="space-y-8 text-right">
              <div className="space-y-2">
                <label className="text-xs uppercase font-black text-slate-600 block mr-1 tracking-widest">שם הקובץ לתצוגה</label>
                <input required className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-lg text-slate-800 outline-none focus:ring-2 focus:ring-slate-900 text-right shadow-inner" value={fileData.name} onChange={e => setFileData({...fileData, name: e.target.value})} />
              </div>
              <div className="space-y-2">
                <label className="text-xs uppercase font-black text-slate-600 block mr-1 tracking-widest">סוג קובץ</label>
                <select className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-2xl font-bold text-lg text-slate-800 outline-none focus:ring-2 focus:ring-slate-900 text-right appearance-none shadow-inner cursor-pointer" value={fileData.type} onChange={e => setFileData({...fileData, type: e.target.value})}>
                  <option value="PDF">PDF (מומלץ)</option>
                  <option value="DOCX">Word / DOCX</option>
                  <option value="XLSX">Excel / XLSX</option>
                  <option value="IMG">Image / PNG / JPG</option>
                </select>
              </div>
              <button className="w-full bg-blue-600 text-white py-6 rounded-3xl font-black text-base uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 mt-4">
                <Upload size={24} /> העלה למערכת עכשיו
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeModule;
