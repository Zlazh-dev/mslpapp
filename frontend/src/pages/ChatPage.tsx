import { useEffect, useRef, useState, useCallback } from 'react';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { Search, Send, ArrowLeft, Star, Archive, BellRing, BellOff, Filter, Download, MessageSquare } from 'lucide-react';

interface Contact {
    id: string;
    name: string;
    role: string;
    lastMessage?: { content: string; senderId: string; createdAt: string } | null;
    unreadCount: number;
}

interface Message {
    id: string;
    senderId: string;
    receiverId: string;
    content: string;
    isRead: boolean;
    isImportant: boolean;
    isArchived: boolean;
    createdAt: string;
}

const ROLE_LABELS: Record<string, string> = {
    ADMIN: 'Administrator',
    STAF_PENDATAAN: 'Staf Pendataan',
    STAF_MADRASAH: 'Staf Madrasah',
    PEMBIMBING_KAMAR: 'Pembimbing Kamar',
    WALI_KELAS: 'Wali Kelas',
};

function fmtTime(date: string) {
    const d = new Date(date);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

function fmtFullTime(date: string) {
    return new Date(date).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(date: string) {
    const d = new Date(date);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return 'Hari ini';
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    if (d.toDateString() === yesterday.toDateString()) return 'Kemarin';
    return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' });
}

function Avatar({ name, size = 'md' }: { name: string; size?: 'sm' | 'md' | 'lg' }) {
    const colors = ['from-emerald-400 to-teal-500', 'from-blue-400 to-indigo-500', 'from-violet-400 to-purple-500', 'from-rose-400 to-pink-500', 'from-amber-400 to-orange-500'];
    const color = colors[name.charCodeAt(0) % colors.length];
    const sz = size === 'sm' ? 'w-8 h-8 text-[11px]' : size === 'lg' ? 'w-11 h-11 text-base' : 'w-10 h-10 text-sm';
    return (
        <div className={`${sz} rounded-full bg-gradient-to-br ${color} flex items-center justify-center shrink-0 shadow-sm border border-white/20`}>
            <span className="text-white font-bold">{name.charAt(0).toUpperCase()}</span>
        </div>
    );
}

export default function ChatPage() {
    const { user } = useAuthStore();
    const [contacts, setContacts] = useState<Contact[]>([]);
    const [searchContact, setSearchContact] = useState('');
    const [activeContact, setActiveContact] = useState<Contact | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);
    
    // UI States
    const [loadingContacts, setLoadingContacts] = useState(true);
    const [loadingThread, setLoadingThread] = useState(false);
    const [mobileShowThread, setMobileShowThread] = useState(false);
    const [threadFilter, setThreadFilter] = useState<'ALL'|'IMPORTANT'|'ARCHIVED'>('ALL');
    
    // Notifications State
    const [pushStatus, setPushStatus] = useState<NotificationPermission>('default');
    const [toastMessage, setToastMessage] = useState<{title: string, body: string} | null>(null);

    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const pollRef = useRef<ReturnType<typeof setInterval>>();
    const msgCountRef = useRef(0);

    // -- INIT SW & Push --
    useEffect(() => {
        if ('Notification' in window) {
            setPushStatus(Notification.permission);
        }
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW Reg Fail:', err));
        }
    }, []);

    const requestPushRaw = () => {
        if (!('Notification' in window)) return;
        Notification.requestPermission().then(p => setPushStatus(p));
    };

    const triggerNotification = (title: string, body: string) => {
        // In-app Toast fallback
        setToastMessage({ title, body });
        setTimeout(() => setToastMessage(null), 3500);

        // System Push
        if (Notification.permission === 'granted') {
            if ('serviceWorker' in navigator && navigator.serviceWorker.ready) {
                navigator.serviceWorker.ready.then(reg => {
                    reg.showNotification(title, { body, icon: '/logo.png', badge: '/logo.png' });
                });
            } else {
                new Notification(title, { body });
            }
        }
    };

    // -- DATA FETCHING --
    const fetchContacts = useCallback(() => {
        api.get('/chat/contacts').then(r => setContacts(r.data.data ?? [])).finally(() => setLoadingContacts(false));
    }, []);

    const fetchThread = useCallback((contactId: string, background = false) => {
        api.get(`/chat/thread/${contactId}`).then(r => {
            const data: Message[] = r.data.data ?? [];
            setMessages(prev => {
                // If this is a background poll and we have new incoming msgs, trigger notify
                if (background && data.length > prev.length) {
                    const newMsgs = data.slice(prev.length);
                    const incomingArr = newMsgs.filter(m => m.receiverId === user?.id);
                    if (incomingArr.length > 0) {
                        const latest = incomingArr[incomingArr.length - 1];
                        triggerNotification('Pesan Baru', latest.content);
                    }
                }
                return data;
            });
            fetchContacts();
        });
    }, [fetchContacts, user?.id]);

    useEffect(() => {
        fetchContacts();
    }, [fetchContacts]);

    useEffect(() => {
        clearInterval(pollRef.current);
        if (activeContact) {
            setLoadingThread(true);
            fetchThread(activeContact.id, false);
            setLoadingThread(false);
            pollRef.current = setInterval(() => {
                fetchThread(activeContact.id, true);
                fetchContacts();
            }, 3000);
        } else {
            // Poll contacts only to see unread badge if no thread active
            pollRef.current = setInterval(() => { fetchContacts() }, 5000);
        }
        return () => clearInterval(pollRef.current);
    }, [activeContact?.id, fetchThread, fetchContacts]);

    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // -- ACTIONS --
    const handleSelectContact = (contact: Contact) => {
        setActiveContact(contact);
        setMobileShowThread(true);
        inputRef.current?.focus();
    };

    const handleSend = async () => {
        if (!draft.trim() || !activeContact || !user) return;
        setSending(true);
        const content = draft.trim();
        setDraft('');
        try {
            await api.post(`/chat/thread/${activeContact.id}`, { content });
            fetchThread(activeContact.id, false);
            setTimeout(() => inputRef.current?.focus(), 50);
        } finally {
            setSending(false);
        }
    };

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const toggleFlag = async (msgId: string, type: 'important' | 'archive') => {
        await api.post(`/chat/message/${msgId}/toggle-${type}`);
        // Optimistic UI update
        setMessages(prev => prev.map(m => {
            if (m.id === msgId) {
                if (type === 'important') return { ...m, isImportant: !m.isImportant };
                if (type === 'archive') return { ...m, isArchived: !m.isArchived };
            }
            return m;
        }));
    };

    const exportThreadToCSV = () => {
        if (!activeContact || messages.length === 0) return;
        const rows = [['Tanggal', 'Pengirim', 'Pesan', 'Status Penting', 'Status Arsip']];
        messages.forEach(m => {
            const sender = m.senderId === user?.id ? (user.name + ' (Anda)') : activeContact.name;
            rows.push([fmtTime(m.createdAt) + ' ' + fmtFullTime(m.createdAt), sender, m.content, m.isImportant ? 'Ya' : 'Tidak', m.isArchived ? 'Ya' : 'Tidak']);
        });
        const csvContent = "data:text/csv;charset=utf-8," + rows.map(e => e.join(",")).join("\n");
        const a = document.createElement('a');
        a.href = encodeURI(csvContent);
        a.download = `Log_Chat_${activeContact.name}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };

    // Filter contacts context (Name, Role, LastMessage Text)
    const slc = searchContact.toLowerCase();
    const filteredContacts = contacts.filter(c => 
        c.name.toLowerCase().includes(slc) || 
        (ROLE_LABELS[c.role] || c.role).toLowerCase().includes(slc) || 
        (c.lastMessage?.content || '').toLowerCase().includes(slc)
    );

    // Grouping & Filtering Messages
    const viewMessages = messages.filter(m => {
        if (threadFilter === 'IMPORTANT') return m.isImportant;
        if (threadFilter === 'ARCHIVED') return m.isArchived;
        return !m.isArchived; // by default hide archived
    });

    const grouped: { date: string; msgs: Message[] }[] = [];
    viewMessages.forEach(m => {
        const d = fmtDate(m.createdAt);
        const last = grouped.length > 0 ? grouped[grouped.length - 1] : undefined;
        if (last?.date === d) last.msgs.push(m);
        else grouped.push({ date: d, msgs: [m] });
    });

    return (
        <div className="relative flex h-[calc(100vh-120px)] bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            
            {/* IN-APP TOAST */}
            {toastMessage && (
                <div className="absolute top-4 right-4 z-50 bg-gray-900/95 text-white p-4 rounded-xl shadow-xl flex gap-4 items-center animate-slideIn">
                    <div className="bg-emerald-500 rounded-full p-2"><BellRing size={16} /></div>
                    <div>
                        <h4 className="text-sm font-bold">{toastMessage.title}</h4>
                        <p className="text-xs text-gray-300 max-w-[200px] truncate">{toastMessage.body}</p>
                    </div>
                </div>
            )}

            {/* ── Contacts Panel (Address Book) ────────────────────────────────────────── */}
            <div className={`flex flex-col border-r border-gray-100 ${mobileShowThread ? 'hidden md:flex' : 'flex'} w-full md:w-80 shrink-0 bg-white`}>
                <div className="p-4 border-b border-gray-100 space-y-3">
                    <div className="flex justify-between items-center">
                        <h2 className="text-lg font-bold text-gray-800">Komunikasi</h2>
                        {pushStatus === 'default' && (
                            <button onClick={requestPushRaw} title="Aktifkan Notifikasi" className="p-2 text-rose-500 bg-rose-50 rounded-lg hover:bg-rose-100 transition animate-pulse">
                                <BellOff size={16} />
                            </button>
                        )}
                        {pushStatus === 'granted' && (
                            <div title="Notifikasi Aktif" className="text-emerald-500 p-2"><BellRing size={16} /></div>
                        )}
                    </div>
                    <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 gap-2" />
                        <input
                            value={searchContact}
                            onChange={e => setSearchContact(e.target.value)}
                            placeholder="Cari pengguna/peran/pesan..."
                            className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 transition"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                    {loadingContacts ? (
                        <div className="flex justify-center p-8"><div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>
                    ) : filteredContacts.length === 0 ? (
                        <div className="flex items-center justify-center h-32 text-gray-400 text-xs">Tidak ada hasil cocok.</div>
                    ) : filteredContacts.map(c => (
                        <button
                            key={c.id}
                            onClick={() => handleSelectContact(c)}
                            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-emerald-50 transition-colors border-b border-gray-50/80 text-left ${activeContact?.id === c.id ? 'bg-emerald-50 border-l-4 border-l-emerald-500' : 'border-l-4 border-l-transparent'}`}
                        >
                            <div className="relative">
                                <Avatar name={c.name} />
                                {c.unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center shadow-sm">
                                        {c.unreadCount > 9 ? '9+' : c.unreadCount}
                                    </span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <span className={`text-sm font-bold truncate ${c.unreadCount > 0 ? 'text-gray-900' : 'text-gray-800'}`}>{c.name}</span>
                                    {c.lastMessage && (
                                        <span className={`text-[10px] shrink-0 ml-2 ${c.unreadCount > 0 ? 'text-emerald-600 font-bold' : 'text-gray-400'}`}>
                                            {fmtTime(c.lastMessage.createdAt)}
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1 mt-0.5">
                                    <p className={`text-xs truncate flex-1 ${c.unreadCount > 0 ? 'text-gray-900 font-semibold' : 'text-gray-500'}`}>
                                        {c.lastMessage
                                            ? (c.lastMessage.senderId === user?.id ? 'Anda: ' : '') + c.lastMessage.content
                                            : <span className="text-gray-400 italic font-normal">{ROLE_LABELS[c.role] ?? c.role}</span>
                                        }
                                    </p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Thread Panel ──────────────────────────────────────────── */}
            <div className={`flex-1 flex flex-col min-w-0 bg-[#F0F2F5] relative ${!mobileShowThread ? 'hidden md:flex' : 'flex'}`}>
                {!activeContact ? (
                    <div className="flex flex-col items-center justify-center h-full gap-5 bg-white text-gray-400">
                        <div className="w-24 h-24 rounded-full bg-emerald-50 flex items-center justify-center shadow-inner">
                            <MessageSquare className="w-10 h-10 text-emerald-300" />
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-bold text-gray-700">LPAPP Messenger</h3>
                            <p className="text-sm mt-1">Pilih pengguna dari buku alamat untuk memulai.</p>
                        </div>
                    </div>
                ) : (
                    <>
                        {/* Thread Header */}
                        <div className="px-5 py-3 border-b border-gray-200 flex items-center justify-between bg-white shadow-sm z-10 relative">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => { setMobileShowThread(false); setActiveContact(null); }}
                                    className="md:hidden p-2 rounded-full hover:bg-gray-100 text-gray-500 mr-1"
                                >
                                    <ArrowLeft size={18} />
                                </button>
                                <Avatar name={activeContact.name} />
                                <div>
                                    <p className="text-sm font-bold text-gray-900">{activeContact.name}</p>
                                    <p className="text-xs text-emerald-600 font-medium">{ROLE_LABELS[activeContact.role] ?? activeContact.role}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-xl border border-gray-100">
                                <button onClick={() => setThreadFilter('ALL')} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition ${threadFilter === 'ALL' ? 'bg-white shadow text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}>Utama</button>
                                <button onClick={() => setThreadFilter('IMPORTANT')} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex gap-1 items-center ${threadFilter === 'IMPORTANT' ? 'bg-amber-100 text-amber-800 shadow-sm' : 'text-gray-500 hover:text-amber-600'}`}><Star size={12}/> Penting</button>
                                <button onClick={() => setThreadFilter('ARCHIVED')} className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex gap-1 items-center ${threadFilter === 'ARCHIVED' ? 'bg-purple-100 text-purple-800 shadow-sm' : 'text-gray-500 hover:text-purple-600'}`}><Archive size={12}/> Arsip</button>
                                <div className="w-px h-5 bg-gray-300 mx-1"></div>
                                <button onClick={exportThreadToCSV} title="Ekspor Riwayat Chat (CSV)" className="p-1.5 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"><Download size={14} /></button>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-2">
                            {loadingThread ? (
                                <div className="flex justify-center p-8"><div className="w-5 h-5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div></div>
                            ) : viewMessages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-3 opacity-60">
                                    <Avatar name={activeContact.name} size="lg" />
                                    <p className="text-xs text-gray-500 bg-gray-200/50 px-4 py-1.5 rounded-full">
                                        {threadFilter === 'IMPORTANT' ? 'Belum ada pesan yang dibintangi' : threadFilter === 'ARCHIVED' ? 'Arsip obrolan kosong' : `Kirim sapaan pertama ke ${activeContact.name}`}
                                    </p>
                                </div>
                            ) : grouped.map(group => (
                                <div key={group.date}>
                                    <div className="flex justify-center my-5">
                                        <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider px-3 py-1 bg-white border border-gray-200 rounded-lg shadow-sm">{group.date}</span>
                                    </div>
                                    {group.msgs.map((m, i) => {
                                        const isMe = m.senderId === user?.id;
                                        const prevSame = i > 0 && group.msgs[i - 1].senderId === m.senderId;
                                        return (
                                            <div key={m.id} className={`group flex ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 ${prevSame ? 'mt-1' : 'mt-4'}`}>
                                                
                                                {/* Hidden Actions that appear on hover */}
                                                <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition duration-200 ${isMe ? 'mr-1' : 'ml-1'}`}>
                                                    <button onClick={()=>toggleFlag(m.id,'important')} className={`p-1.5 rounded-full ${m.isImportant ? 'bg-amber-100 text-amber-500' : 'hover:bg-gray-200 text-gray-400'}`}>
                                                        <Star size={13} fill={m.isImportant ? "currentColor" : "none"} />
                                                    </button>
                                                    <button onClick={()=>toggleFlag(m.id,'archive')} className={`p-1.5 rounded-full ${m.isArchived ? 'bg-purple-100 text-purple-600' : 'hover:bg-gray-200 text-gray-400'}`}>
                                                        <Archive size={13} />
                                                    </button>
                                                </div>

                                                <div className={`relative max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                                    <div className={`px-3.5 py-2.5 text-[13px] leading-relaxed break-words shadow-sm ${isMe
                                                        ? 'bg-emerald-600 text-white rounded-2xl rounded-br-sm'
                                                        : 'bg-white border border-gray-100 text-gray-800 rounded-2xl rounded-bl-sm'
                                                        }`}>
                                                        {m.content}
                                                    </div>

                                                    {(m.isImportant || (!prevSame || i === group.msgs.length - 1)) && (
                                                        <div className={`flex items-center gap-1 mt-1 px-1 text-[10px] ${m.isImportant ? 'text-amber-500' : 'text-gray-400'}`}>
                                                            {m.isImportant && <Star size={10} fill="currentColor" />}
                                                            <span>{fmtFullTime(m.createdAt)}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                            <div ref={bottomRef} className="h-2" />
                        </div>

                        {/* Input Area */}
                        {threadFilter === 'ALL' ? (
                            <div className="px-5 py-4 bg-[#F0F2F5]">
                                <div className="flex items-center gap-3 bg-white border border-transparent rounded-full px-5 py-2.5 shadow-sm focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-400 transition-all">
                                    <input
                                        ref={inputRef}
                                        value={draft}
                                        onChange={e => setDraft(e.target.value)}
                                        onKeyDown={handleKey}
                                        placeholder={`Ketik pesan ke ${activeContact.name}...`}
                                        className="flex-1 text-sm bg-transparent outline-none text-gray-800 placeholder-gray-400"
                                        disabled={sending}
                                    />
                                    <button
                                        onClick={handleSend}
                                        disabled={!draft.trim() || sending}
                                        className="p-2 rounded-full bg-emerald-600 text-white disabled:opacity-40 hover:bg-emerald-700 transition-transform active:scale-95 shrink-0 shadow-sm"
                                    >
                                        <Send size={16} className="ml-0.5" />
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="px-5 py-4 bg-[#F0F2F5] text-center">
                                <span className="text-xs text-gray-500 font-medium">Mode pencarian / arsip aktif. Beralih ke <strong>Utama</strong> untuk membalas.</span>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

