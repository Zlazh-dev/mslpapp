import { useEffect, useRef, useState, useCallback } from 'react';
import api from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { Search, Send, ArrowLeft } from 'lucide-react';

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
        <div className={`${sz} rounded-full bg-gradient-to-br ${color} flex items-center justify-center shrink-0`}>
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
    const [loadingContacts, setLoadingContacts] = useState(true);
    const [loadingThread, setLoadingThread] = useState(false);
    const [mobileShowThread, setMobileShowThread] = useState(false);
    const bottomRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const pollRef = useRef<ReturnType<typeof setInterval>>();

    const fetchContacts = useCallback(() => {
        api.get('/chat/contacts').then(r => setContacts(r.data.data ?? [])).finally(() => setLoadingContacts(false));
    }, []);

    const fetchThread = useCallback((contactId: string) => {
        api.get(`/chat/thread/${contactId}`).then(r => {
            setMessages(r.data.data ?? []);
            // Refresh contacts to update unread counts
            fetchContacts();
        });
    }, [fetchContacts]);

    useEffect(() => {
        fetchContacts();
    }, [fetchContacts]);

    // Poll for new messages when a contact is active
    useEffect(() => {
        clearInterval(pollRef.current);
        if (activeContact) {
            setLoadingThread(true);
            fetchThread(activeContact.id);
            setLoadingThread(false);
            pollRef.current = setInterval(() => {
                fetchThread(activeContact.id);
                fetchContacts();
            }, 4000);
        }
        return () => clearInterval(pollRef.current);
    }, [activeContact?.id]);

    // Scroll to bottom on new messages
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

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
            fetchThread(activeContact.id);
            setTimeout(() => inputRef.current?.focus(), 50);
        } finally {
            setSending(false);
        }
    };

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    // Group messages by date
    const grouped: { date: string; msgs: Message[] }[] = [];
    messages.forEach(m => {
        const d = fmtDate(m.createdAt);
        const last = grouped.length > 0 ? grouped[grouped.length - 1] : undefined;
        if (last?.date === d) last.msgs.push(m);
        else grouped.push({ date: d, msgs: [m] });
    });

    const filteredContacts = contacts.filter(c => c.name.toLowerCase().includes(searchContact.toLowerCase()));

    return (
        <div className="flex h-[calc(100vh-120px)] bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* ── Contacts Panel ────────────────────────────────────────── */}
            <div className={`flex flex-col border-r border-gray-100 ${mobileShowThread ? 'hidden md:flex' : 'flex'} w-full md:w-72 lg:w-80 shrink-0`}>
                {/* Header */}
                <div className="px-4 py-3.5 border-b border-gray-100">
                    <h2 className="text-sm font-bold text-gray-800 mb-2">Pesan</h2>
                    <div className="relative">
                        <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                            value={searchContact}
                            onChange={e => setSearchContact(e.target.value)}
                            placeholder="Cari pengguna..."
                            className="w-full pl-8 pr-3 py-1.5 text-xs bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400"
                        />
                    </div>
                </div>

                {/* Contact list */}
                <div className="flex-1 overflow-y-auto">
                    {loadingContacts ? (
                        <div className="flex items-center justify-center h-32 text-gray-400 text-xs">Memuat kontak...</div>
                    ) : filteredContacts.length === 0 ? (
                        <div className="flex items-center justify-center h-32 text-gray-400 text-xs">Tidak ada pengguna lain</div>
                    ) : filteredContacts.map(c => (
                        <button
                            key={c.id}
                            onClick={() => handleSelectContact(c)}
                            className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors border-b border-gray-50/80 text-left ${activeContact?.id === c.id ? 'bg-emerald-50 border-emerald-100' : ''}`}
                        >
                            <div className="relative">
                                <Avatar name={c.name} />
                                {c.unreadCount > 0 && (
                                    <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-emerald-500 text-white text-[9px] font-bold flex items-center justify-center">
                                        {c.unreadCount > 9 ? '9+' : c.unreadCount}
                                    </span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                    <span className={`text-xs font-semibold truncate ${activeContact?.id === c.id ? 'text-emerald-800' : 'text-gray-800'}`}>{c.name}</span>
                                    {c.lastMessage && (
                                        <span className="text-[10px] text-gray-400 shrink-0 ml-2">{fmtTime(c.lastMessage.createdAt)}</span>
                                    )}
                                </div>
                                <div className="flex items-center gap-1">
                                    <p className={`text-[11px] truncate flex-1 ${c.unreadCount > 0 ? 'text-gray-700 font-medium' : 'text-gray-400'}`}>
                                        {c.lastMessage
                                            ? (c.lastMessage.senderId === user?.id ? 'Anda: ' : '') + c.lastMessage.content
                                            : <span className="italic text-gray-300">{ROLE_LABELS[c.role] ?? c.role}</span>
                                        }
                                    </p>
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Thread Panel ──────────────────────────────────────────── */}
            <div className={`flex-1 flex flex-col min-w-0 ${!mobileShowThread ? 'hidden md:flex' : 'flex'}`}>
                {!activeContact ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
                        <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                        </div>
                        <p className="text-sm">Pilih pengguna untuk mulai chat</p>
                    </div>
                ) : (
                    <>
                        {/* Thread Header */}
                        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3 bg-white">
                            <button
                                onClick={() => { setMobileShowThread(false); setActiveContact(null); }}
                                className="md:hidden p-1.5 rounded-lg hover:bg-gray-100 text-gray-500"
                            >
                                <ArrowLeft size={16} />
                            </button>
                            <Avatar name={activeContact.name} />
                            <div>
                                <p className="text-sm font-semibold text-gray-800">{activeContact.name}</p>
                                <p className="text-[10px] text-gray-400">{ROLE_LABELS[activeContact.role] ?? activeContact.role}</p>
                            </div>
                        </div>

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto px-4 py-4 bg-gray-50/40 space-y-1">
                            {loadingThread ? (
                                <div className="flex items-center justify-center h-full text-xs text-gray-400">Memuat percakapan...</div>
                            ) : messages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full gap-2">
                                    <Avatar name={activeContact.name} size="lg" />
                                    <p className="text-xs text-gray-400 mt-1">Mulai percakapan dengan <span className="font-medium text-gray-600">{activeContact.name}</span></p>
                                </div>
                            ) : grouped.map(group => (
                                <div key={group.date}>
                                    <div className="flex items-center gap-3 my-4">
                                        <div className="flex-1 h-px bg-gray-200" />
                                        <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap px-2 py-0.5 bg-white border border-gray-200 rounded-full">{group.date}</span>
                                        <div className="flex-1 h-px bg-gray-200" />
                                    </div>
                                    {group.msgs.map((m, i) => {
                                        const isMe = m.senderId === user?.id;
                                        const prevSame = i > 0 && group.msgs[i - 1].senderId === m.senderId;
                                        return (
                                            <div key={m.id} className={`flex ${isMe ? 'flex-row-reverse' : 'flex-row'} items-end gap-2 ${prevSame ? 'mt-0.5' : 'mt-3'}`}>
                                                <div className={`max-w-[75%] flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                                                    <div className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed break-words ${isMe
                                                        ? 'bg-emerald-600 text-white rounded-br-sm'
                                                        : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm shadow-sm'
                                                        }`}>
                                                        {m.content}
                                                    </div>
                                                    {(!prevSame || i === group.msgs.length - 1) && (
                                                        <span className="text-[10px] text-gray-400 mt-0.5 px-1">{fmtFullTime(m.createdAt)}</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                            <div ref={bottomRef} />
                        </div>

                        {/* Input */}
                        <div className="px-4 py-3 border-t border-gray-100 bg-white">
                            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 focus-within:ring-2 focus-within:ring-emerald-500/20 focus-within:border-emerald-400 transition-all">
                                <input
                                    ref={inputRef}
                                    value={draft}
                                    onChange={e => setDraft(e.target.value)}
                                    onKeyDown={handleKey}
                                    placeholder={`Tulis ke ${activeContact.name}...`}
                                    className="flex-1 text-sm bg-transparent outline-none text-gray-700 placeholder-gray-400"
                                    disabled={sending}
                                    autoFocus
                                />
                                <button
                                    onClick={handleSend}
                                    disabled={!draft.trim() || sending}
                                    className="p-1.5 rounded-lg bg-emerald-600 text-white disabled:opacity-40 hover:bg-emerald-700 transition-colors shrink-0"
                                >
                                    <Send size={14} />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
