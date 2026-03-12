
import React, { useState, useMemo } from 'react';
import { useAppStore } from '../../store';
import { Task, TaskType } from '../../types';
import { CheckCircle, Circle, Plus, Search, Mail, Package, Check, UserPlus, Archive, Layers, User, Phone, Briefcase, DollarSign, Filter, ShoppingBag } from 'lucide-react';
import { isValidOptionalPhone, normalizePhoneInput, PHONE_VALIDATION_MESSAGE } from '../../utils/phone';

const TasksModule: React.FC = () => {
  const { tasks, users, currentUser, addTask, updateTaskStatus } = useAppStore();
  const [activeTab, setActiveTab] = useState<'open' | 'archive'>('open');
  const [isFormOpen, setIsFormOpen] = useState(false);
  
  // New Task Form State
  const [newTask, setNewTask] = useState<{
    title: string;
    type: TaskType;
    clientName: string;
    clientPhone: string;
    assignedTo: string[];
    priority: Task['priority'];
  }>({ 
    title: '', 
    type: 'General', 
    clientName: '',
    clientPhone: '',
    assignedTo: [], 
    priority: 'Normal' 
  });

  // Filters
  const [filterType, setFilterType] = useState<TaskType | 'All'>('All');
  const [filterPriority, setFilterPriority] = useState<Task['priority'] | 'All'>('All');
  const [filterAssignee, setFilterAssignee] = useState<string>('All');
  const [notification, setNotification] = useState<string | null>(null);

  const isManager = currentUser?.role === 'Site Editor' || currentUser?.role === 'Manager' || currentUser?.role === 'Shift Manager' || currentUser?.role === 'Shop Computer';
  const isWarehouse = currentUser?.role === 'Warehouse';

  const sortedUsers = useMemo(() => {
    return [...users].filter(u => !u.isArchived).sort((a, b) => a.name.localeCompare(b.name, 'he'));
  }, [users]);

  const filteredTasks = tasks.filter(t => {
    // 1. Tab Filter (Open vs Done)
    if (activeTab === 'open' && t.status === 'Done') return false;
    if (activeTab === 'archive' && t.status !== 'Done') return false;

    // 2. Dropdown Filters
    if (filterType !== 'All' && t.type !== filterType) return false;
    if (filterPriority !== 'All' && t.priority !== filterPriority) return false;
    if (filterAssignee !== 'All' && !t.assignedTo.includes(filterAssignee)) return false;

    return true;
  }).sort((a, b) => {
    // Sort high priority first, then by date
    if (a.priority === 'High' && b.priority !== 'High') return -1;
    if (a.priority !== 'High' && b.priority === 'High') return 1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTask.title) return;
    if (!isValidOptionalPhone(newTask.clientPhone)) {
      alert(PHONE_VALIDATION_MESSAGE);
      return;
    }
    const task: Task = {
        id: Math.random().toString(36).substr(2, 9),
        title: newTask.title,
        type: newTask.type,
        clientName: newTask.clientName,
        clientPhone: normalizePhoneInput(newTask.clientPhone) || undefined,
        assignedTo: newTask.assignedTo,
        priority: newTask.priority,
        status: 'Pending',
        createdBy: currentUser?.id || '',
        createdAt: new Date().toISOString()
    };
    addTask(task);
    
    setNotification(`המשימה "${task.title}" נוצרה בהצלחה.`);
    setTimeout(() => setNotification(null), 3500);

    setNewTask({ title: '', type: 'General', clientName: '', clientPhone: '', assignedTo: [], priority: 'Normal' });
    setIsFormOpen(false);
  };

  const canUpdateStatus = (task: Task) => {
    // Managers/Warehouse can close tasks, or the assignee themselves
    if (isManager || isWarehouse) return true;
    if (task.assignedTo.includes(currentUser?.id || '')) return true;
    return false;
  };

  const toggleAssignee = (id: string) => {
    setNewTask(prev => ({
      ...prev,
      assignedTo: prev.assignedTo.includes(id) ? prev.assignedTo.filter(aid => aid !== id) : [...prev.assignedTo, id]
    }));
  };

  const sendEmailNotification = (task: Task) => {
    setNotification(`נשלח מייל תזכורת גוגל לצוות המבוקש.`);
    setTimeout(() => setNotification(null), 3500);
  };

  const getTaskIcon = (type: TaskType) => {
    switch(type) {
      case 'Inventory': return <Package size={14} className="text-indigo-600" />;
      case 'Price Quote': return <DollarSign size={14} className="text-emerald-600" />;
      case 'Return to Client': return <Phone size={14} className="text-blue-600" />;
      case 'Order': return <ShoppingBag size={14} className="text-orange-500" />;
      default: return <Layers size={14} className="text-slate-500" />;
    }
  };

  const getTaskTypeLabel = (type: TaskType) => {
    switch(type) {
      case 'Inventory': return 'חוסרים';
      case 'Price Quote': return 'הצעת מחיר';
      case 'Return to Client': return 'חזרה ללקוח';
      case 'Order': return 'הזמנות';
      default: return 'כללי';
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 pb-24 max-w-6xl mx-auto text-right px-2" dir="rtl">
       
       {/* Notification Toast */}
       {notification && (
         <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[150] bg-slate-900/95 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-4 animate-fade-in border border-white/10 backdrop-blur-md">
            <CheckCircle size={24} className="text-emerald-400" />
            <span className="font-bold text-sm tracking-tight">{notification}</span>
         </div>
       )}

       <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 md:gap-6 border-b border-slate-200 pb-6">
          <div>
            <h2 className="text-3xl md:text-5xl font-black text-slate-900 tracking-tight leading-none">משימות שוטפות</h2>
            <p className="text-slate-600 font-bold uppercase tracking-widest text-[10px] md:text-xs mt-2">מעקב וביצוע משימות צוות</p>
          </div>
          <button 
            onClick={() => setIsFormOpen(!isFormOpen)}
            className={`w-full md:w-auto flex items-center justify-center gap-2 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg transition-all active:scale-95 ${isFormOpen ? 'bg-slate-100 text-slate-500' : 'bg-brand text-white hover:bg-brand-dark'}`}
          >
             {isFormOpen ? 'ביטול הוספה' : 'פתיחת משימה חדשה'} <Plus size={18} className={isFormOpen ? 'rotate-45 transition-transform' : ''} />
          </button>
       </header>

       {/* Add Task Form */}
       {isFormOpen && (
         <div className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-2xl border border-slate-200 animate-fade-in mx-1">
            <form onSubmit={handleAdd} className="space-y-6 md:space-y-8">
               <div className="flex flex-col md:flex-row gap-6">
                  <div className="flex-1 space-y-2">
                     <label className="text-[10px] font-black uppercase text-slate-400 mr-2 tracking-widest">תיאור המשימה</label>
                     <input 
                        required
                        placeholder="מה צריך לבצע?" 
                        className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-800 outline-none focus:ring-2 focus:ring-slate-900 text-right shadow-inner" 
                        value={newTask.title} 
                        onChange={e => setNewTask({...newTask, title: e.target.value})} 
                     />
                  </div>
                  <div className="w-full md:w-64 space-y-2">
                     <label className="text-[10px] font-black uppercase text-slate-400 mr-2 tracking-widest">סוג משימה</label>
                     <div className="relative">
                        <select 
                           className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-800 outline-none cursor-pointer appearance-none text-right"
                           value={newTask.type}
                           onChange={e => setNewTask({...newTask, type: e.target.value as TaskType})}
                        >
                           <option value="General">כללי</option>
                           <option value="Return to Client">חזרה ללקוח</option>
                           <option value="Inventory">חוסרים במלאי</option>
                           <option value="Price Quote">הצעת מחיר</option>
                           <option value="Order">הזמנות רכש</option>
                        </select>
                        <Layers size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                     </div>
                  </div>
               </div>

               {/* Client Details Section (Conditional) */}
               {(newTask.type === 'Return to Client' || newTask.type === 'Price Quote' || newTask.type === 'Order' || newTask.clientName) && (
                 <div className="bg-blue-50/50 p-6 rounded-3xl border border-blue-100 space-y-4 animate-fade-in">
                    <h4 className="font-black text-blue-800 text-sm flex items-center gap-2"><User size={16}/> פרטי לקוח (אופציונלי)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                       <input 
                          placeholder="שם הלקוח" 
                          className="p-3 bg-white border border-blue-200 rounded-xl font-bold text-sm outline-none focus:border-blue-500 text-right" 
                          value={newTask.clientName} 
                          onChange={e => setNewTask({...newTask, clientName: e.target.value})} 
                       />
                       <input 
                          placeholder="טלפון ליצירת קשר" 
                          className="p-3 bg-white border border-blue-200 rounded-xl font-bold text-sm outline-none focus:border-blue-500 text-right tabular-nums" 
                          inputMode="tel"
                          title={PHONE_VALIDATION_MESSAGE}
                          value={newTask.clientPhone} 
                          onChange={e => setNewTask({...newTask, clientPhone: e.target.value})} 
                       />
                    </div>
                 </div>
               )}

               <div className="space-y-4">
                  <div className="flex flex-col md:flex-row justify-between md:items-end gap-3 md:gap-0">
                     <label className="text-[10px] font-black uppercase text-slate-400 mr-2 tracking-widest">שיוך לעובדים ודחיפות</label>
                     <div className="flex gap-2">
                        {['Normal', 'Medium', 'High'].map((p) => (
                           <button 
                             key={p}
                             type="button"
                             onClick={() => setNewTask({...newTask, priority: p as any})}
                             className={`px-3 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest border transition-all flex-1 md:flex-none ${newTask.priority === p ? (p === 'High' ? 'bg-rose-500 text-white border-rose-600' : p === 'Medium' ? 'bg-amber-500 text-white border-amber-600' : 'bg-blue-500 text-white border-blue-600') : 'bg-white border-slate-200 text-slate-400'}`}
                           >
                             {p === 'High' ? 'דחוף' : p === 'Medium' ? 'בינוני' : 'רגיל'}
                           </button>
                        ))}
                     </div>
                  </div>
                  <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto custom-scrollbar p-1">
                     {sortedUsers.map(u => (
                        <button 
                           key={u.id} 
                           type="button"
                           onClick={() => toggleAssignee(u.id)} 
                           className={`px-4 py-2 rounded-xl text-xs font-black border transition-all flex items-center gap-2 ${newTask.assignedTo.includes(u.id) ? 'bg-slate-800 border-slate-900 text-white shadow-md' : 'bg-slate-50 border-slate-100 text-slate-500 hover:bg-slate-100'}`}
                        >
                           {u.name} {newTask.assignedTo.includes(u.id) && <Check size={12} />}
                        </button>
                     ))}
                  </div>
               </div>

               <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black text-base uppercase tracking-widest shadow-xl hover:bg-black transition-all active:scale-95">שמור משימה</button>
            </form>
         </div>
       )}

       {/* Toolbar & Filter */}
       <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4 bg-white p-3 rounded-[2rem] border border-slate-100 shadow-sm mx-1">
          <div className="bg-slate-100 p-1.5 rounded-2xl flex w-full md:w-auto">
             <button 
               onClick={() => setActiveTab('open')} 
               className={`flex-1 md:flex-none px-6 py-3 md:py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'open' ? 'bg-white shadow-sm text-brand-ocean' : 'text-slate-400 hover:text-slate-600'}`}
             >
                משימות פתוחות
             </button>
             <button 
               onClick={() => setActiveTab('archive')} 
               className={`flex-1 md:flex-none px-6 py-3 md:py-2.5 rounded-xl text-xs font-black transition-all ${activeTab === 'archive' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
             >
                ארכיון ובוצע
             </button>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scroll-hint">
             <Filter size={14} className="text-slate-400 shrink-0" />
             <select className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold py-3 px-3 rounded-xl outline-none" value={filterType} onChange={e => setFilterType(e.target.value as any)}>
               <option value="All">כל הסוגים</option>
               <option value="General">כללי</option>
               <option value="Return to Client">חזרה ללקוח</option>
               <option value="Inventory">חוסרים</option>
               <option value="Price Quote">הצעת מחיר</option>
               <option value="Order">הזמנות</option>
             </select>
             <select className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold py-3 px-3 rounded-xl outline-none" value={filterPriority} onChange={e => setFilterPriority(e.target.value as any)}>
               <option value="All">כל הדחיפויות</option>
               <option value="High">דחוף</option>
               <option value="Medium">בינוני</option>
               <option value="Normal">רגיל</option>
             </select>
             <select className="bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold py-3 px-3 rounded-xl outline-none min-w-[100px]" value={filterAssignee} onChange={e => setFilterAssignee(e.target.value)}>
               <option value="All">כל העובדים</option>
               {sortedUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
             </select>
          </div>
       </div>

       {/* Task List */}
       <div className="space-y-4 px-1">
          {filteredTasks.length === 0 ? (
            <div className="text-center py-20 bg-slate-50 border border-dashed border-slate-200 rounded-[2rem]">
               <Archive size={40} className="mx-auto text-slate-300 mb-4" />
               <p className="text-slate-400 font-black text-lg">לא נמצאו משימות {activeTab === 'open' ? 'פתוחות' : 'בארכיון'}</p>
            </div>
          ) : (
            filteredTasks.map(task => {
               const canEdit = canUpdateStatus(task);
               const creatorName = users.find(user => user.id === task.createdBy)?.name || task.createdBy;
               return (
                 <div key={task.id} className={`bg-white p-4 md:p-8 rounded-[2rem] border transition-all flex flex-col md:flex-row gap-6 hover:shadow-lg ${task.status === 'Done' ? 'border-slate-100 opacity-80' : 'border-slate-200 shadow-sm'}`}>
                    
                    {/* Checkbox / Status */}
                    <div className="flex items-center justify-between md:flex-col md:justify-center gap-4 md:w-20 shrink-0 border-b md:border-b-0 md:border-l border-slate-100 pb-4 md:pb-0 md:pl-6 w-full md:w-auto">
                       <div className="flex items-center gap-3 md:hidden">
                          <div className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${task.priority === 'High' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                             {task.priority === 'High' ? 'דחוף' : task.priority === 'Medium' ? 'בינוני' : 'רגיל'}
                          </div>
                       </div>
                       
                       <button 
                         disabled={!canEdit}
                         onClick={() => updateTaskStatus(task.id, task.status === 'Done' ? 'Pending' : 'Done')}
                         className={`transition-all ${canEdit ? 'hover:scale-110 active:scale-90' : 'cursor-not-allowed opacity-50'}`}
                       >
                          {task.status === 'Done' ? 
                            <CheckCircle size={32} className="text-emerald-500" strokeWidth={1.5} /> : 
                            <Circle size={32} className={task.priority === 'High' ? "text-rose-500" : "text-slate-300"} strokeWidth={1.5} />
                          }
                       </button>
                       
                       <div className={`hidden md:block text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${task.priority === 'High' ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'}`}>
                          {task.priority === 'High' ? 'דחוף' : task.priority === 'Medium' ? 'בינוני' : 'רגיל'}
                       </div>
                    </div>

                    {/* Task Info */}
                    <div className="flex-1 space-y-3 min-w-0">
                       <div className="flex flex-wrap items-center gap-2 md:gap-3">
                          <span className={`px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center gap-2 border ${
                             task.type === 'Inventory' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 
                             task.type === 'Return to Client' ? 'bg-blue-50 text-blue-700 border-blue-100' :
                             task.type === 'Order' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                             task.type === 'Price Quote' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' :
                             'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                             {getTaskIcon(task.type)}
                             {getTaskTypeLabel(task.type)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-bold tabular-nums">
                             {new Date(task.createdAt).toLocaleDateString('he-IL')}
                          </span>
                       </div>
                       
                       <h3 className={`text-xl md:text-2xl font-black text-slate-900 leading-tight break-words ${task.status === 'Done' ? 'line-through text-slate-400' : ''}`}>
                          {task.title}
                       </h3>
                       
                       {(task.clientName || task.clientPhone) && (
                          <div className="bg-slate-50 p-3 rounded-xl inline-block border border-slate-100 w-full md:w-auto max-w-full">
                             <div className="flex flex-wrap items-center gap-4 text-xs font-bold text-slate-600">
                                {task.clientName && <span className="flex items-center gap-1.5 min-w-0"><User size={14} className="shrink-0"/> <span className="truncate">{task.clientName}</span></span>}
                                {task.clientPhone && <a href={`tel:${task.clientPhone}`} className="flex items-center gap-1.5 hover:text-blue-600 min-w-0"><Phone size={14} className="shrink-0"/> <span className="truncate">{task.clientPhone}</span></a>}
                             </div>
                          </div>
                       )}

                       <div className="flex flex-wrap items-center gap-3 pt-2">
                          <div className="flex -space-x-2 space-x-reverse overflow-hidden">
                             {task.assignedTo.length > 0 ? task.assignedTo.map(uid => {
                                const u = users.find(user => user.id === uid);
                                if (!u) return null;
                                return (
                                   <div key={uid} title={u.name} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 flex items-center justify-center text-[10px] font-black text-slate-600">
                                      {u.avatar ? <img src={u.avatar} className="w-full h-full rounded-full object-cover" alt={u.name}/> : u.name.charAt(0)}
                                   </div>
                                )
                             }) : <span className="text-xs text-slate-400 italic">לא שויך</span>}
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold">נוצר ע"י {creatorName}</span>
                       </div>
                    </div>

                    {/* Actions */}
                    {activeTab === 'open' && isManager && task.assignedTo.length > 0 && (
                      <div className="flex items-center md:flex-col justify-end gap-2 border-t md:border-t-0 md:border-r border-slate-100 pt-4 md:pt-0 md:pr-6">
                         <button onClick={() => sendEmailNotification(task)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-50 text-slate-400 hover:bg-blue-50 hover:text-blue-600 transition-all shadow-sm border border-slate-200" title="שלח תזכורת במייל">
                            <Mail size={18} />
                         </button>
                      </div>
                    )}
                 </div>
               );
            })
          )}
       </div>
    </div>
  );
};

export default TasksModule;
