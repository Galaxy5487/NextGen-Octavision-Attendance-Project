import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Sparkles, X, Send, Minimize2, Maximize2, Trash2, ChevronRight, HelpCircle, ArrowUpRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface ChatMessage {
  id: string;
  sender: 'delta' | 'user';
  text: string;
  timestamp: string;
  links?: { label: string; url: string }[];
}

const QUICK_QUESTIONS = [
  { label: '📊 Attendance Score', query: 'How does the attendance score work?' },
  { label: '✈️ Leave Requests', query: 'How do I request a permission leave?' },
  { label: '⚠️ Warning Emails', query: 'What happens when someone gets a warning email?' },
  { label: '👑 Roles & Head', query: 'What is the difference between Team Head and Employee?' },
  { label: '🕒 Work Timings', query: 'What are the working hours and check-in times?' },
  { label: '💬 Chat Options', query: 'How to clear chat or remove a contact?' },
];

const DELTA_KNOWLEDGE: { keywords: string[]; answer: string; links?: { label: string; url: string }[] }[] = [
  {
    keywords: ['score', 'percentage', 'deduct', 'penalty', 'calculate', '70%'],
    answer: `📊 **Attendance Score System**:
• Every employee starts at **100%**.
• **Absence**: -15% deduction per unexcused absence.
• **Permitted Leave**: Does not deduct score! Counts toward attendance safety.
• **Sunday Working**: Earn bonus coverage and maintain high score.
• **Warning Threshold**: Falling below **70%** triggers automatic Warning Email notifications & chat alerts to Team Head and employee.`,
    links: [{ label: 'View Your Score', url: '/app/scores' }],
  },
  {
    keywords: ['leave', 'permission', 'apply', 'holiday', 'day off', 'sick'],
    answer: `✈️ **Permission Leave Requests**:
• Go to the **Leave Requests** page from sidebar.
• Click **"Request Leave"** button, choose From/To dates, and write your reason.
• **Team Head Review**: Team Head will review and click **Permit** or **Deny**.
• **Score Protection**: Approved "Permitted" leaves keep your attendance score protected!`,
    links: [{ label: 'Open Leave Requests', url: '/app/leaves' }],
  },
  {
    keywords: ['warning', 'email', 'absent', 'mail', 'alert', 'notice'],
    answer: `⚠️ **Warning Emails System**:
• When an employee is marked **Absent**, an automated official warning email is sent to their inbox.
• **Email Content**: Includes full name, current score snapshot, date of absence, and custom notes from Team Head.
• **Chat Alert**: A notification is also automatically posted to the employee's Attendance Alerts chat thread.
• You can review all logs or delete past warning logs on the Warning Emails page.`,
    links: [{ label: 'Open Warning Emails', url: '/app/warnings' }],
  },
  {
    keywords: ['timing', 'hours', 'time', 'check in', 'check out', 'schedule', 'late', '10', '7'],
    answer: `🕒 **Official Work Timings**:
• **Check-In**: 10:00 AM sharp.
• **Check-Out**: 7:00 PM.
• **Working Days**: Monday through Saturday (Sundays are off unless marked as Working Sunday by Team Head).
• **Marking Attendance**: Team Head can mark attendance daily from the **Mark Attendance** portal.`,
    links: [
      { label: 'Attendance Sheet', url: '/app/sheet' },
      { label: 'Calendar & Schedule', url: '/app/calendar' },
    ],
  },
  {
    keywords: ['head', 'role', 'employee', 'permission', 'admin', 'leader', 'boss'],
    answer: `👑 **Roles & Permissions**:
• **Team Head (👑)**: Full control to mark attendance, issue warning emails, create announcements, assign tasks, approve/deny leaves, and manage team members.
• **Employee (👤)**: Can view personal attendance scores, view/complete assigned tasks, request permission leaves, chat with team, and receive announcements.`,
    links: [{ label: 'View Team Members', url: '/app/team' }],
  },
  {
    keywords: ['chat', 'delete', 'clear', 'message', 'remove', 'contact', 'whatsapp', 'gmail'],
    answer: `💬 **Chat & Message Controls**:
• **Delete Message**: Hover over any chat message bubble and click the **Trash** icon.
• **Clear Chat**: Click **"Clear Chat"** at the top of a conversation header to clear messages.
• **Remove Contact / Conversation**: Hover over any contact thread in the sidebar and click the **Trash** icon, or use **"Remove Contact"** in the top header!`,
    links: [{ label: 'Open Team Chat', url: '/app/chat' }],
  },
  {
    keywords: ['announcement', 'notice', 'broadcast', 'news', 'hide', 'dismiss'],
    answer: `📢 **Announcements Feature**:
• Team Head broadcasts important notices to the entire team.
• Employees can read and **Hide/Dismiss** (` + '`EyeOff`' + ` icon) announcements from their feed.
• Team Head can permanently **Delete** announcements for everyone.`,
    links: [{ label: 'View Announcements', url: '/app/announcements' }],
  },
  {
    keywords: ['calendar', 'birthday', 'event', 'celebration', 'sunday', 'holiday'],
    answer: `📅 **Calendar & Events**:
• Displays working days, Sundays, and Working Sunday events.
• Real celebrations! Shows employee **Birthdays** 🎂 and **Work Anniversaries** 🎉 automatically.`,
    links: [{ label: 'Open Calendar', url: '/app/calendar' }],
  },
  {
    keywords: ['task', 'assign', 'due', 'todo', 'work', 'project'],
    answer: `📌 **Tasks & Work Assignments**:
• Team Head assigns tasks with priority levels & due dates.
• Employees view their active tasks on the **Tasks** page and mark them as Completed once done.`,
    links: [{ label: 'View Tasks', url: '/app/tasks' }],
  },
  {
    keywords: ['logo', 'dp', 'avatar', 'profile', 'theme', 'dark', 'light', 'setting'],
    answer: `⚙️ **Profile & Customization**:
• Update your display name, phone number, bio, avatar/DP, and account security.
• Toggle between Dark / Light theme options in **Profile Settings**.`,
    links: [{ label: 'Profile Settings', url: '/app/settings' }],
  },
];

export default function DeltaChatBot() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'delta',
      text: `Hello! 👋 I'm **Delta**, your AI assistant for **NextGen Octavision**.

I know everything about attendance rules, scores, leaves, warnings, chat features, and team settings. How can I help you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen, isTyping]);

  const handleSend = (userText: string) => {
    const text = userText.trim();
    if (!text) return;

    const userMsg: ChatMessage = {
      id: String(Date.now()),
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      const lower = text.toLowerCase();
      let match = DELTA_KNOWLEDGE.find((k) => k.keywords.some((kw) => lower.includes(kw)));

      let responseText = '';
      let links: { label: string; url: string }[] | undefined = undefined;

      if (match) {
        responseText = match.answer;
        links = match.links;
      } else if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
        responseText = `Hi there! 😊 I'm **Delta**. Ask me any question about NextGen Octavision attendance, score rules, permission leaves, warning emails, or chat options!`;
      } else if (lower.includes('who are you') || lower.includes('name')) {
        responseText = `I am **Delta** 🤖, the official AI Chatbot for **NextGen Octavision Attendance System**. I can guide you through every feature of the website!`;
      } else if (lower.includes('help') || lower.includes('what can you do')) {
        responseText = `I can help you with:
• **Attendance & Scores** (How score is computed & penalties)
• **Permission Leaves** (How to apply & head approval)
• **Warning Emails** (Absence alerts & email snapshots)
• **Team Chat** (Deleting messages, clearing chats & removing contacts)
• **Calendar & Tasks** (Events, birthdays & task tracking)
• **Profile Settings** (Theme, avatar & credentials)`;
      } else {
        responseText = `I understand you are asking about: "${text}".

Here are quick actions you can take in **NextGen Octavision**:
• View **Attendance Sheet** to check daily records.
• Check your **Attendance Score** dashboard.
• Apply for **Permission Leave** if you need time off.
• Use **Team Chat** to message your Team Head or colleagues.

Feel free to pick one of the quick questions below or rephrase your question!`;
        links = [
          { label: 'Go to Dashboard', url: '/app' },
          { label: 'View Attendance Sheet', url: '/app/sheet' },
        ];
      }

      const deltaMsg: ChatMessage = {
        id: String(Date.now() + 1),
        sender: 'delta',
        text: responseText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        links,
      };

      setMessages((prev) => [...prev, deltaMsg]);
      setIsTyping(false);
    }, 600);
  };

  const clearHistory = () => {
    setMessages([
      {
        id: 'welcome_reset',
        sender: 'delta',
        text: `Chat cleared! 🧹 Ask me anything about **NextGen Octavision** attendance, leaves, scores, or website features!`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  };

  return (
    <div className="fixed bottom-16 sm:bottom-6 right-4 sm:right-6 z-50 flex flex-col items-end">
      {/* Floating Launcher Button */}
      {!isOpen && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => setIsOpen(true)}
          className="relative group flex items-center gap-2.5 bg-zinc-950 text-white rounded-full p-3.5 sm:px-5 sm:py-3.5 shadow-2xl border border-zinc-800 ring-2 ring-zinc-900/40 hover:ring-zinc-700 transition-all"
        >
          <div className="relative flex items-center justify-center">
            <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-zinc-950 animate-pulse" />
            <Sparkles size={20} className="text-amber-400" />
          </div>
          <span className="font-display font-bold text-sm tracking-wide hidden sm:inline-block">Delta AI</span>
          <span className="text-[10px] bg-white/15 px-2 py-0.5 rounded-full font-bold text-amber-300 hidden sm:inline-block">Help</span>
        </motion.button>
      )}

      {/* Mini Chatbot Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={`bg-white rounded-3xl border border-zinc-200 shadow-2xl flex flex-col overflow-hidden transition-all duration-300 ${
              isExpanded
                ? 'fixed inset-3 sm:inset-6 z-50 w-auto h-auto max-w-4xl mx-auto'
                : 'w-[92vw] sm:w-[380px] h-[520px] max-h-[82vh]'
            }`}
          >
            {/* Header */}
            <div className="bg-zinc-950 text-white px-4 py-3.5 flex items-center justify-between relative overflow-hidden border-b border-zinc-800">
              <div className="absolute inset-0 bg-gradient-to-r from-violet-900/30 via-transparent to-amber-900/20" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="relative h-9 w-9 rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-amber-400 shadow-inner">
                  <Sparkles size={18} />
                  <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-zinc-950" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p className="font-display font-extrabold text-sm tracking-tight">Delta Assistant</p>
                    <span className="text-[9px] font-extrabold px-1.5 py-0.2 rounded bg-amber-400 text-amber-950">AI</span>
                  </div>
                  <p className="text-[10px] text-zinc-400 font-medium">NextGen Octavision Guide</p>
                </div>
              </div>

              <div className="flex items-center gap-1 relative z-10">
                <button
                  onClick={clearHistory}
                  title="Clear chat history"
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition"
                >
                  <Trash2 size={15} />
                </button>
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  title={isExpanded ? 'Minimize size' : 'Expand full size'}
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition hidden sm:block"
                >
                  {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  title="Close Delta Bot"
                  className="p-1.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition"
                >
                  <X size={17} />
                </button>
              </div>
            </div>

            {/* Messages Body */}
            <div className="flex-1 overflow-y-auto scroll-thin p-4 space-y-3.5 bg-zinc-50/70">
              {messages.map((m) => {
                const isDelta = m.sender === 'delta';
                return (
                  <div key={m.id} className={`flex items-start gap-2.5 ${isDelta ? 'justify-start' : 'justify-end'}`}>
                    {isDelta && (
                      <div className="h-7 w-7 rounded-xl bg-zinc-950 text-amber-400 flex items-center justify-center shrink-0 mt-1 shadow-sm text-xs font-bold">
                        Δ
                      </div>
                    )}
                    <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                      isDelta
                        ? 'bg-white text-zinc-800 border border-zinc-200/80 shadow-sm rounded-tl-sm'
                        : 'bg-zinc-900 text-white rounded-tr-sm shadow-sm'
                    }`}>
                      <div className="whitespace-pre-wrap font-sans">{m.text}</div>
                      
                      {/* Action Links */}
                      {m.links && m.links.length > 0 && (
                        <div className="mt-2.5 pt-2 border-t border-zinc-100 flex flex-wrap gap-1.5">
                          {m.links.map((link) => (
                            <button
                              key={link.url}
                              onClick={() => {
                                setIsOpen(false);
                                navigate(link.url);
                              }}
                              className="flex items-center gap-1 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 text-[11px] font-bold px-2.5 py-1 rounded-lg transition"
                            >
                              {link.label} <ArrowUpRight size={12} />
                            </button>
                          ))}
                        </div>
                      )}
                      
                      <p className={`text-[9px] mt-1.5 text-right ${isDelta ? 'text-zinc-400' : 'text-zinc-400'}`}>{m.timestamp}</p>
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex items-center gap-2 text-zinc-400 text-xs pl-2 py-1">
                  <div className="h-6 w-6 rounded-xl bg-zinc-900 text-amber-400 flex items-center justify-center text-xs">Δ</div>
                  <span className="flex gap-1 items-center bg-white px-3 py-2 rounded-xl border border-zinc-200">
                    <span className="h-1.5 w-1.5 bg-zinc-400 rounded-full animate-bounce" />
                    <span className="h-1.5 w-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                    <span className="h-1.5 w-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0.4s]" />
                  </span>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Suggestion Chips */}
            <div className="px-3 py-2 bg-white border-t border-zinc-100 overflow-x-auto scroll-thin flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
                <HelpCircle size={11} /> Quick:
              </span>
              {QUICK_QUESTIONS.map((q) => (
                <button
                  key={q.label}
                  onClick={() => handleSend(q.query)}
                  className="whitespace-nowrap text-[11px] font-bold bg-zinc-100 hover:bg-zinc-900 hover:text-white text-zinc-700 px-2.5 py-1 rounded-full border border-zinc-200/60 transition"
                >
                  {q.label}
                </button>
              ))}
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend(input);
              }}
              className="p-3 bg-white border-t border-zinc-100 flex items-center gap-2"
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask Delta about attendance, leaves, rules..."
                className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3.5 py-2.5 text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:bg-white"
              />
              <button
                disabled={!input.trim() || isTyping}
                className="rounded-xl bg-zinc-950 text-white p-2.5 hover:bg-zinc-800 disabled:opacity-40 transition shrink-0"
              >
                <Send size={15} />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
