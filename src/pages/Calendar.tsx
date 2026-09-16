import { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, Megaphone, Briefcase, Palmtree, Trash2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import { monthStrOf, shiftMonth, monthLabel, pad, type CalendarOverride } from '../lib/types';

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Calendar() {
  const { user } = useAuth();
  const isHead = user?.role === 'head';
  const [month, setMonth] = useState(monthStrOf());
  const [ovs, setOvs] = useState<CalendarOverride[]>([]);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState<string | null>(null);
  const [kind, setKind] = useState<'sunday_working' | 'leave_day'>('leave_day');
  const [label, setLabel] = useState('');
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = async (m: string) => {
    setLoading(true);
    try { setOvs(await api<CalendarOverride[]>(`/api/calendar?month=${m}`)); } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { load(month); }, [month]);

  const [y, m] = month.split('-').map(Number);
  const dim = new Date(y, m, 0).getDate();
  const lead = new Date(y, m - 1, 1).getDay();
  const ovMap: Record<string, CalendarOverride> = {};
  ovs.forEach((o) => { ovMap[o.date] = o; });
  const today = `${new Date().getFullYear()}-${pad(new Date().getMonth() + 1)}-${pad(new Date().getDate())}`;

  const openFor = (date: string) => {
    const [yy, mm, dd] = date.split('-').map(Number);
    setKind(new Date(yy, mm - 1, dd).getDay() === 0 ? 'sunday_working' : 'leave_day');
    setLabel('');
    setShow(date);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!show) return;
    setBusy(true); setMsg(null);
    try {
      await api('/api/calendar', { method: 'POST', body: { date: show, kind, label: label.trim() || null, created_by: user!.id, announce: true } });
      setMsg(kind === 'leave_day' ? `🏖️ ${show} announced as leave — attendance updated for everyone.` : `💼 ${show} announced as working Sunday — attendance will count.`);
      setShow(null);
      await load(month);
    } catch (e: any) { setMsg('Failed: ' + e.message); }
    finally { setBusy(false); }
  };

  const remove = async (o: CalendarOverride) => {
    if (!confirm(`Remove override for ${o.date}?`)) return;
    await api('/api/calendar', { method: 'DELETE', body: { id: o.id } });
    await load(month);
  };

  const cells: (string | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= dim; d++) cells.push(`${month}-${pad(d)}`);

  return (
    <div className="space-y-5 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div>
          <h1 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight">Agency Calendar</h1>
          <p className="text-sm text-zinc-500">Auto-updates daily · Sundays are leave by default{isHead ? ' · click a day to announce a change' : ''}.</p>
        </div>
        <div className="sm:ml-auto flex items-center rounded-xl border border-zinc-200 bg-white overflow-hidden w-full sm:w-auto">
          <button onClick={() => setMonth(shiftMonth(month, -1))} className="p-2.5 hover:bg-zinc-100 min-w-[44px] min-h-[44px] flex items-center justify-center"><ChevronLeft size={18} /></button>
          <span className="px-2 text-sm font-bold flex-1 sm:flex-none sm:min-w-[150px] text-center">{monthLabel(month)}</span>
          <button onClick={() => setMonth(shiftMonth(month, 1))} className="p-2.5 hover:bg-zinc-100 min-w-[44px] min-h-[44px] flex items-center justify-center"><ChevronRight size={18} /></button>
        </div>
      </div>

      {msg && <div className="rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm font-semibold px-4 py-3 flex items-center gap-2"><CheckCircle2 size={16} />{msg}</div>}

      <div className="flex flex-wrap gap-2 text-xs font-bold">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-zinc-200 px-3 py-1.5">⬜ Working day</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-zinc-200 px-3 py-1.5">⛱️ Sunday leave</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-zinc-200 px-3 py-1.5">💼 Working Sunday</span>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-white border border-zinc-200 px-3 py-1.5">🏖️ Announced leave</span>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
        <div className="grid grid-cols-7 bg-zinc-900 text-white text-center text-[10px] sm:text-xs font-bold">
          {DOW.map((d) => <div key={d} className="py-2.5 sm:py-3">{d}</div>)}
        </div>
        {loading ? (
          <div className="flex justify-center py-16"><div className="animate-spin h-8 w-8 rounded-full border-4 border-zinc-200 border-t-zinc-900" /></div>
        ) : (
          <div className="grid grid-cols-7 gap-px bg-zinc-100">
            {cells.map((ds, i) => {
              if (!ds) return <div key={'e' + i} className="bg-zinc-50/50 min-h-[64px] sm:min-h-[96px]" />;
              const [yy, mm, dd] = ds.split('-').map(Number);
              const dow = new Date(yy, mm - 1, dd).getDay();
              const ov = ovMap[ds];
              const isLeave = ov?.kind === 'leave_day';
              const isWorkSun = ov?.kind === 'sunday_working';
              const sundayOff = dow === 0 && !isWorkSun;
              return (
                <div key={ds} onClick={() => isHead && openFor(ds)}
                  className={`relative bg-white min-h-[64px] sm:min-h-[96px] p-1 sm:p-2 transition ${isHead ? 'cursor-pointer hover:bg-yellow-50' : ''} ${ds === today ? 'ring-2 ring-inset ring-zinc-900' : ''} ${isLeave ? 'bg-violet-50' : sundayOff ? 'bg-zinc-50' : isWorkSun ? 'bg-amber-50' : ''}`}>
                  <div className="flex items-center justify-between">
                    <span className={`text-xs sm:text-sm font-extrabold w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center ${ds === today ? 'bg-zinc-900 text-white' : dow === 0 ? 'text-red-500' : ''}`}>{dd}</span>
                    {isHead && <Plus size={13} className="text-zinc-300" />}
                  </div>
                  <div className="mt-1 space-y-1">
                    {isLeave && <p className="text-[10px] sm:text-[11px] font-bold text-violet-700 leading-tight">🏖️ {ov.label || 'Office leave'}</p>}
                    {isWorkSun && <p className="text-[10px] sm:text-[11px] font-bold text-amber-700 leading-tight">💼 {ov.label || 'Working Sunday'}</p>}
                    {sundayOff && !ov && <p className="text-[10px] sm:text-[11px] font-bold text-zinc-400">⛱️ Leave</p>}
                    {ov && isHead && (
                      <button onClick={(e) => { e.stopPropagation(); remove(ov); }} className="text-zinc-400 hover:text-red-600"><Trash2 size={13} /></button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShow(null)}>
          <form onSubmit={submit} onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl">
            <h3 className="font-display font-extrabold text-lg flex items-center gap-2"><Megaphone size={19} /> Announce for {show}</h3>
            <p className="text-xs text-zinc-500 mt-1">This posts an announcement, notifies everyone, and updates attendance.</p>
            <div className="grid grid-cols-2 gap-2 mt-4">
              <button type="button" onClick={() => setKind('leave_day')} className={`rounded-xl border p-3 text-left transition ${kind === 'leave_day' ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-300' : 'border-zinc-200 hover:border-zinc-400'}`}>
                <Palmtree size={18} className="text-violet-600" />
                <p className="text-sm font-bold mt-1">Office Leave</p>
                <p className="text-[11px] text-zinc-500">Day off · auto-marked</p>
              </button>
              <button type="button" onClick={() => setKind('sunday_working')} className={`rounded-xl border p-3 text-left transition ${kind === 'sunday_working' ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-300' : 'border-zinc-200 hover:border-zinc-400'}`}>
                <Briefcase size={18} className="text-amber-600" />
                <p className="text-sm font-bold mt-1">Working Sunday</p>
                <p className="text-[11px] text-zinc-500">Sunday counts</p>
              </button>
            </div>
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder={kind === 'leave_day' ? 'e.g. Eid Holiday — office closed' : 'e.g. Product launch — full team needed'} className="mt-3 w-full rounded-xl border border-zinc-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={() => setShow(null)} className="flex-1 rounded-xl border border-zinc-300 font-bold py-3 text-sm hover:bg-zinc-100">Cancel</button>
              <button disabled={busy} className="flex-1 rounded-xl bg-zinc-900 text-white font-bold py-3 text-sm hover:bg-zinc-700 disabled:opacity-60">{busy ? 'Announcing…' : 'Announce & Update'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
