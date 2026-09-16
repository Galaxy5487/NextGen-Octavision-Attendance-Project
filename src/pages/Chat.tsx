import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Send, Users, User, Plus, AlertTriangle, X, Trash2, Pencil } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../lib/api';
import type { Thread, Message, Profile } from '../lib/types';
import UserAvatar from '../components/UserAvatar';

function Avatar({ p, size = 'h-10 w-10 text-xs' }: { p?: Profile; size?: string }) {
  return <UserAvatar p={p} size={size} />;
}

export default function Chat() {
  const { user } = useAuth();
  const isHead = user?.role === 'head';
  const [threads, setThreads] = useState<Thread[]>([]);
  const [people, setPeople] = useState<Profile[]>([]);
  const [active, setActive] = useState<number | null>(null);
  const [msgs, setMsgs] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);
  const [mode, setMode] = useState<'dm' | 'group'>('group');
  const [gName, setGName] = useState('');
  const [picked, setPicked] = useState<number[]>([]);
  const [busy, setBusy] = useState(false);
  const [mobileList, setMobileList] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadThreads = async () => {
    try {
      const [t, p] = await Promise.all([
        api<Thread[]>(`/api/threads?user_id=${user!.id}`),
        api<Profile[]>('/api/employees'),
      ]);
      setThreads(t); setPeople(p.filter((x) => x.active));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };
  useEffect(() => { loadThreads(); const t = setInterval(loadThreads, 12000); return () => clearInterval(t); }, []);

  const loadMsgs = async (tid: number) => {
    try { setMsgs(await api<Message[]>(`/api/messages?thread_id=${tid}`)); } catch {}
  };
  useEffect(() => {
    if (!active) return;
    loadMsgs(active);
    const t = setInterval(() => loadMsgs(active), 4000);
    return () => clearInterval(t);
  }, [active]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [msgs.length]);

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!active || !text.trim()) return;
    const body = text.trim();
    setText('');
    try {
      await api('/api/messages', { method: 'POST', body: { thread_id: active, sender_id: user!.id, body } });
      await loadMsgs(active);
      loadThreads();
    } catch (err) { console.error(err); }
  };

  const createThread = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!picked.length) return;
    setBusy(true);
    try {
      if (mode === 'dm') {
        const other = people.find((p) => p.id === picked[0])!;
        const t = await api<Thread>('/api/threads', { method: 'POST', body: { type: 'dm', name: `${user!.full_name} × ${other.full_name}`, member_ids: [user!.id, other.id], created_by: user!.id } });
        setActive(t.id);
      } else {
        if (!gName.trim()) { setBusy(false); return; }
        const t = await api<Thread>('/api/threads', { method: 'POST', body: { type: 'group', name: gName.trim(), member_ids: [...new Set([user!.id, ...picked])], created_by: user!.id } });
        setActive(t.id);
      }
      setShowNew(false); setPicked([]); setGName('');
      await loadThreads();
      setMobileList(false);
    } catch (err: any) { alert(err.message); }
    finally { setBusy(false); }
  };

  const deleteThread = async (id: number) => {
    if (!confirm('Delete this conversation and all its messages?')) return;
    await api('/api/threads', { method: 'DELETE', body: { id } });
    if (active === id) { setActive(null); setMsgs([]); }
    loadThreads();
  };

  const byId = (id: number | null) => people.find((p) => p.id === id);
  const threadLabel = (t: Thread) => {
    if (t.type !== 'dm') return t.name;
    const other = t.member_ids.map(byId).find((p) => p && p.id !== user!.id);
    return other ? other.full_name : t.name;
  };
  const threadIcon = (t: Thread) => {
    if (t.type === 'system') return <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center shrink-0"><AlertTriangle size={18} className="text-red-600" /></div>;
    if (t.type === 'group') return <div className="h-10 w-10 rounded-full bg-zinc-900 flex items-center justify-center shrink-0"><Users size={18} className="text-white" /></div>;
    const other = t.member_ids.map(byId).find((p) => p && p.id !== user!.id);
    return <Avatar p={other} />;
  };

  const activeThread = threads.find((t) => t.id === active);
  const others = people.filter((p) => p.id !== user!.id);

  if (loading) return <div className="flex justify-center py-24"><div className="animate-spin h-10 w-10 rounded-full border-4 border-zinc-200 border-t-zinc-900" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-xl sm:text-2xl font-extrabold tracking-tight">Team Chat</h1>
          <p className="text-xs sm:text-sm text-zinc-500">{isHead ? 'Chat with employees, create groups, warnings land here too.' : 'Chat with your team head and groups. Absence warnings appear here.'}</p>
        </div>
        <button onClick={() => setShowNew(true)} className="ml-auto flex items-center justify-center gap-2 rounded-xl bg-zinc-900 text-white text-sm font-bold px-3 sm:px-4 py-2.5 hover:bg-zinc-700 shrink-0 min-h-[44px]">
          <Plus size={16} /> <span className="hidden sm:inline">{isHead ? 'New Chat / Group' : 'New Chat'}</span><span className="sm:hidden">New</span>
        </button>
      </div>

      <div className="grid lg:grid-cols-[320px_1fr] gap-4 h-[calc(100dvh-280px)] min-h-[420px] lg:h-[calc(100vh-220px)] lg:min-h-[480px]">
        {/* Thread list */}
        <div className={`bg-white rounded-2xl border border-zinc-200 overflow-hidden flex-col ${mobileList ? 'flex' : 'hidden lg:flex'}`}>
          <div className="px-4 py-3 border-b border-zinc-100 text-xs font-bold text-zinc-500 uppercase tracking-wider">Conversations ({threads.length})</div>
          <div className="flex-1 overflow-y-auto scroll-thin">
            {threads.length === 0 && <p className="text-sm text-zinc-500 text-center py-10 px-4">No conversations yet. Start one!</p>}
            {threads.map((t) => (
              <button key={t.id} onClick={() => { setActive(t.id); setMobileList(false); }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 border-b border-zinc-50 text-left transition ${active === t.id ? 'bg-zinc-900 text-white' : 'hover:bg-zinc-50'}`}>
                {threadIcon(t)}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold truncate">{threadLabel(t)}</p>
                  <p className={`text-xs truncate ${active === t.id ? 'text-zinc-300' : 'text-zinc-500'}`}>{t.last_message?.body || 'No messages yet'}</p>
                </div>
                {t.type === 'system' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500 text-white shrink-0">ALERTS</span>}
                {t.type === 'group' && <Users size={14} className={`shrink-0 ${active === t.id ? 'text-zinc-300' : 'text-zinc-400'}`} />}
              </button>
            ))}
          </div>
        </div>

        {/* Messages */}
        <div className={`bg-white rounded-2xl border border-zinc-200 overflow-hidden flex-col ${mobileList ? 'hidden lg:flex' : 'flex'}`}>
          {!activeThread ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <img src="/logo.png" alt="" className="h-16 w-16 rounded-2xl object-cover ring-1 ring-zinc-200 opacity-80" />
              <p className="mt-4 font-bold">Select a conversation</p>
              <p className="text-sm text-zinc-500">or start a new chat / group</p>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3 px-4 sm:px-5 py-3.5 border-b border-zinc-100 bg-zinc-50/60">
                <button onClick={() => setMobileList(true)} className="lg:hidden text-sm font-bold text-zinc-600">← Back</button>
                {threadIcon(activeThread)}
                <div className="min-w-0 flex-1">
                  <p className="font-bold truncate">{threadLabel(activeThread)}</p>
                  <p className="text-[11px] text-zinc-500">{activeThread.type === 'group' ? `${activeThread.member_ids.length} members` : activeThread.type === 'system' ? 'Automatic attendance alerts' : 'Direct message'}</p>
                </div>
                {(isHead || activeThread.created_by === user!.id) && activeThread.type === 'group' && (
                  <button onClick={() => deleteThread(activeThread.id)} title="Delete group" className="p-2 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50"><Trash2 size={16} /></button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto scroll-thin p-4 sm:p-5 space-y-3 bg-[#fafafa]">
                {msgs.map((m) => {
                  const mine = m.sender_id === user!.id;
                  const sender = byId(m.sender_id);
                  if (m.kind === 'warning') {
                    return (
                      <motion.div key={m.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border-2 border-red-200 bg-red-50 p-4">
                        <p className="text-xs font-extrabold text-red-600 flex items-center gap-1.5"><AlertTriangle size={14} /> ATTENDANCE WARNING</p>
                        <p className="text-sm text-red-900 mt-1.5 leading-relaxed">{m.body}</p>
                        <p className="text-[11px] text-red-400 mt-1.5">{new Date(m.created_at).toLocaleString()}</p>
                      </motion.div>
                    );
                  }
                  return (
                    <div key={m.id} className={`flex gap-2 ${mine ? 'justify-end' : 'justify-start'}`}>
                      {!mine && <Avatar p={sender} size="h-8 w-8 text-[10px]" />}
                      <div className={`max-w-[85%] sm:max-w-[75%] rounded-2xl px-3.5 sm:px-4 py-2.5 ${mine ? 'bg-zinc-900 text-white rounded-br-md' : 'bg-white border border-zinc-200 rounded-bl-md'}`}>
                        {!mine && <p className="text-[11px] font-bold text-zinc-500 mb-0.5">{sender?.full_name || 'Unknown'}</p>}
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.body}</p>
                        <p className={`text-[10px] mt-1 ${mine ? 'text-zinc-400' : 'text-zinc-400'}`}>{new Date(m.created_at).toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <form onSubmit={send} className="p-3 sm:p-4 border-t border-zinc-100 flex gap-2">
                <input value={text} onChange={(e) => setText(e.target.value)} placeholder={`Message ${activeThread.type === 'group' ? 'group' : ''}…`} className="flex-1 rounded-xl border border-zinc-300 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
                <button className="rounded-xl bg-zinc-900 text-white px-5 hover:bg-zinc-700 transition"><Send size={17} /></button>
              </form>
            </>
          )}
        </div>
      </div>

      {showNew && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={() => setShowNew(false)}>
          <form onSubmit={createThread} onClick={(e) => e.stopPropagation()} className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl max-h-[85vh] overflow-y-auto scroll-thin">
            <div className="flex items-center justify-between">
              <h3 className="font-display font-extrabold text-lg">{isHead ? 'New Chat / Group' : 'New Chat'}</h3>
              <button type="button" onClick={() => setShowNew(false)}><X size={20} /></button>
            </div>
            {isHead && (
              <div className="grid grid-cols-2 gap-2 mt-4">
                <button type="button" onClick={() => { setMode('dm'); setPicked([]); }} className={`rounded-xl border p-3 text-left ${mode === 'dm' ? 'border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900' : 'border-zinc-200'}`}>
                  <User size={17} /><p className="text-sm font-bold mt-1">Direct Chat</p>
                </button>
                <button type="button" onClick={() => { setMode('group'); setPicked([]); }} className={`rounded-xl border p-3 text-left ${mode === 'group' ? 'border-zinc-900 bg-zinc-50 ring-1 ring-zinc-900' : 'border-zinc-200'}`}>
                  <Users size={17} /><p className="text-sm font-bold mt-1">Group</p>
                </button>
              </div>
            )}
            {mode === 'group' && isHead && (
              <input value={gName} onChange={(e) => setGName(e.target.value)} placeholder="Group name (e.g. Design Team)" className="mt-3 w-full rounded-xl border border-zinc-300 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-900" />
            )}
            <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mt-4 mb-2">{mode === 'dm' ? 'Pick a person' : 'Pick members'}</p>
            <div className="space-y-1.5">
              {others.map((p) => {
                const on = picked.includes(p.id);
                return (
                  <button type="button" key={p.id} onClick={() => setPicked(mode === 'dm' ? [p.id] : on ? picked.filter((x) => x !== p.id) : [...picked, p.id])}
                    className={`w-full flex items-center gap-3 rounded-xl border p-2.5 transition ${on ? 'border-zinc-900 bg-zinc-50' : 'border-zinc-200 hover:border-zinc-400'}`}>
                    <Avatar p={p} size="h-8 w-8 text-[10px]" />
                    <div className="text-left">
                      <p className="text-sm font-bold">{p.full_name}</p>
                      <p className="text-[11px] text-zinc-500">{p.role === 'head' ? 'Team Head' : p.designation}</p>
                    </div>
                    {on && <span className="ml-auto text-zinc-900 font-bold">✓</span>}
                  </button>
                );
              })}
            </div>
            <button disabled={busy || !picked.length} className="mt-4 w-full rounded-xl bg-zinc-900 text-white font-bold py-3 text-sm hover:bg-zinc-700 disabled:opacity-50 flex items-center justify-center gap-2">
              <Pencil size={15} /> {busy ? 'Creating…' : mode === 'dm' ? 'Start Chat' : 'Create Group'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
