import React, { useCallback, useEffect, useState } from 'react';
import { useAppStore } from '../../store';
import { Availability, ChangeRequestSnapshot, ConfirmedShift, ShiftChangeRequest, ShiftChangeRequestStatus } from '../../types';
import {
  approveShiftChangeRequest,
  fetchManagerShiftChangeRequests,
  rejectShiftChangeRequest,
} from '../../utils/shiftApprovalApi';
import { CheckCircle2, Clock, XCircle, User, CalendarDays } from 'lucide-react';

const statusLabels: Record<ShiftChangeRequestStatus, string> = {
  pending: 'ממתין',
  approved: 'אושר',
  rejected: 'נדחה',
  cancelled: 'בוטל',
};

const statusColors: Record<ShiftChangeRequestStatus, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-100',
  approved: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  rejected: 'bg-rose-50 text-rose-700 border-rose-100',
  cancelled: 'bg-slate-50 text-slate-500 border-slate-100',
};

const requestTypeLabels = {
  remove: 'הסרה ממשמרת',
  time_change: 'שינוי שעות',
  availability_change: 'שינוי זמינות',
};

const isAvailabilitySnapshot = (
  snapshot: ChangeRequestSnapshot | null
): snapshot is Availability => Boolean(snapshot && 'isAvailable' in snapshot);

const formatAvailabilitySummary = (entry: Availability) => {
  if (!entry.isAvailable) return 'לא פנוי';
  if (entry.isAllDay) return 'זמין כל היום';
  return `${entry.startTime} - ${entry.endTime}`;
};

const ApprovalsModule: React.FC = () => {
  const { clubId, applyRemoteState } = useAppStore();
  const [requests, setRequests] = useState<ShiftChangeRequest[]>([]);
  const [filter, setFilter] = useState<ShiftChangeRequestStatus | 'all'>('pending');
  const [loading, setLoading] = useState(true);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchManagerShiftChangeRequests(
        clubId,
        filter === 'all' ? undefined : filter
      );
      setRequests(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בטעינה');
    } finally {
      setLoading(false);
    }
  }, [clubId, filter]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleApprove = async (requestId: string) => {
    setActionId(requestId);
    setError(null);
    try {
      const result = await approveShiftChangeRequest({ clubId, requestId });
      if (result.state) {
        applyRemoteState(result.state, result.serverVersion);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה באישור');
    } finally {
      setActionId(null);
    }
  };

  const handleReject = async (requestId: string) => {
    const reviewNote = window.prompt('סיבת דחייה (אופציונלי):') || undefined;
    setActionId(requestId);
    setError(null);
    try {
      await rejectShiftChangeRequest({ clubId, requestId, reviewNote });
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'שגיאה בדחייה');
    } finally {
      setActionId(null);
    }
  };

  const filters: Array<{ id: ShiftChangeRequestStatus | 'all'; label: string }> = [
    { id: 'pending', label: 'ממתינים' },
    { id: 'approved', label: 'אושרו' },
    { id: 'rejected', label: 'נדחו' },
    { id: 'all', label: 'הכל' },
  ];

  return (
    <div className="max-w-5xl mx-auto pb-20 space-y-8 text-right" dir="rtl">
      <header className="border-b border-slate-200 pb-8">
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">אישורי שינויים</h2>
        <p className="text-slate-500 mt-2 font-bold">בקשות עובדים לשינוי זמינות או משמרת בתקופת האישור של השבוע הבא</p>
      </header>

      <div className="bg-slate-100 p-1 rounded-2xl flex flex-wrap gap-1">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex-1 min-w-[100px] px-4 py-2.5 rounded-xl text-xs font-black transition-all ${
              filter === f.id ? 'bg-white shadow-md text-slate-900' : 'text-slate-400'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-100 text-rose-700 px-4 py-3 rounded-2xl font-bold text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="text-center text-slate-400 font-bold py-16">טוען בקשות...</div>
      ) : requests.length === 0 ? (
        <div className="text-center border-2 border-dashed border-slate-200 rounded-3xl py-16 text-slate-400 font-bold">
          אין בקשות {filter === 'pending' ? 'ממתינות' : 'להצגה'}
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((req) => (
            <div
              key={req.id}
              className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-row-reverse justify-end">
                    <span className={`text-[10px] font-black uppercase px-3 py-1 rounded-full border ${statusColors[req.status]}`}>
                      {statusLabels[req.status]}
                    </span>
                    <span className="text-[10px] font-black uppercase px-3 py-1 rounded-full border bg-indigo-50 text-indigo-700 border-indigo-100">
                      {requestTypeLabels[req.requestType]}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-900 font-black text-lg flex-row-reverse justify-end">
                    <User size={18} className="text-slate-400" />
                    {req.originalShift.userName}
                  </div>
                  <div className="flex items-center gap-2 text-slate-600 font-bold flex-row-reverse justify-end">
                    <CalendarDays size={16} className="text-slate-400" />
                    {req.requestType === 'availability_change' && isAvailabilitySnapshot(req.originalShift)
                      ? `${req.originalShift.date} • ${formatAvailabilitySummary(req.originalShift)}`
                      : `${req.originalShift.date} • ${(req.originalShift as ConfirmedShift).startTime}-${(req.originalShift as ConfirmedShift).endTime}`}
                  </div>
                </div>
                <div className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                  <Clock size={12} />
                  {new Date(req.createdAt).toLocaleString('he-IL')}
                </div>
              </div>

              {req.requestType === 'time_change' && req.proposedShift && !isAvailabilitySnapshot(req.proposedShift) && (
                <div className="bg-slate-50 rounded-2xl p-4 text-sm font-bold text-slate-700">
                  שעות מבוקשות: {req.proposedShift.startTime} - {req.proposedShift.endTime}
                </div>
              )}

              {req.requestType === 'availability_change' && isAvailabilitySnapshot(req.proposedShift) && (
                <div className="bg-slate-50 rounded-2xl p-4 text-sm font-bold text-slate-700">
                  זמינות מבוקשת: {formatAvailabilitySummary(req.proposedShift)}
                  {req.proposedShift.notes ? ` • ${req.proposedShift.notes}` : ''}
                </div>
              )}

              {req.reviewNote && (
                <div className="text-sm text-slate-500 font-bold">הערת מנהל: {req.reviewNote}</div>
              )}

              {req.status === 'pending' && (
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    onClick={() => void handleApprove(req.id)}
                    disabled={actionId === req.id}
                    className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-2xl font-black text-sm disabled:opacity-50"
                  >
                    <CheckCircle2 size={16} />
                    אשר
                  </button>
                  <button
                    onClick={() => void handleReject(req.id)}
                    disabled={actionId === req.id}
                    className="flex items-center gap-2 bg-white border border-rose-200 text-rose-600 px-5 py-3 rounded-2xl font-black text-sm disabled:opacity-50"
                  >
                    <XCircle size={16} />
                    דחה
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ApprovalsModule;
