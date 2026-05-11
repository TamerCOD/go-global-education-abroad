import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';

// ═════════════════════════════════════════════════════════════════════
//  TYPES
// ═════════════════════════════════════════════════════════════════════
interface Manager {
    id: number;
    login: string;
    full_name: string;
    telegram_tag?: string | null;
    role?: 'manager' | 'teamlead';
    is_online?: boolean;
    active?: boolean;
    archived_at?: string | null;
}
interface RosterManager extends Manager {
    total30?: number;
    open?: number;
    closed30?: number;
    overdue?: number;
}
interface Lead {
    id: number;
    received_at: string;
    name: string;
    phone: string;
    email: string;
    country: string;
    comment: string;
    source: string;
    status_code: string;
    status_label?: string;
    status_color?: string;
    status_is_terminal?: boolean;
    status_is_semi_closed?: boolean;
    status_requires_appointment?: boolean;
    notes?: string;
    rejection_reason?: string | null;
    sla_deadline_at: string | null;
    processed_at?: string | null;
    manager_name?: string;
    manager_login?: string;
    manager_archived_at?: string | null;
    assigned_manager_id?: number;
    pending_transfer_to_id?: number | null;
    pending_transfer_to_name?: string | null;
    pending_transfer_at?: string | null;
    pending_transfer_by_name?: string | null;
    event_id?: number | null;
    event_name?: string | null;
    event_name_snapshot?: string | null;
    desired_university?: string | null;
    study_level?: string | null;
    intake_term?: string | null;
    budget?: string | null;
    english_level?: string | null;
    birth_year?: number | null;
    current_education?: string | null;
    appointment_at?: string | null;
    appointment_until?: string | null;
    appointment_kind?: string | null;
}
interface StatusOption {
    code: string;
    label: string;
    color?: string;
    is_terminal: boolean;
    requires_reason?: boolean;
    requires_appointment?: boolean;
    is_semi_closed?: boolean;
    sort: number;
}
interface CommentRec {
    id: number;
    manager_id?: number | null;
    author_name: string;
    author_role?: string;
    body: string;
    created_at: string;
}

// ═════════════════════════════════════════════════════════════════════
//  HELPERS
// ═════════════════════════════════════════════════════════════════════
const formatRel = (iso: string) => {
    const diffMin = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
    if (diffMin < 1) return 'только что';
    if (diffMin < 60) return `${diffMin} мин`;
    const h = Math.round(diffMin / 60);
    if (h < 24) return `${h} ч`;
    return new Date(iso).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' });
};
const formatFull = (iso: string) =>
    new Date(iso).toLocaleString('ru-RU', {
        timeZone: 'Asia/Bishkek',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

function whatsappLink(phone: string, msg?: string): string | null {
    const digits = (phone || '').replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) return null;
    return `https://wa.me/${digits}${msg ? `?text=${encodeURIComponent(msg)}` : ''}`;
}

function initials(name: string): string {
    const parts = (name || '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0][0]!.toUpperCase();
    return (parts[0][0]! + parts[1][0]!).toUpperCase();
}

// Stable colour from name → consistent avatar background
function colourFromName(name: string): string {
    const palette = ['bg-emerald-100 text-emerald-700', 'bg-sky-100 text-sky-700',
        'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700',
        'bg-violet-100 text-violet-700', 'bg-teal-100 text-teal-700',
        'bg-orange-100 text-orange-700', 'bg-stone-200 text-stone-700'];
    let h = 0;
    for (const c of name || '') h = (h * 31 + c.charCodeAt(0)) | 0;
    return palette[Math.abs(h) % palette.length];
}

function sourceMeta(source: string): { label: string; icon: string; bg: string; ring: string } {
    const s = (source || '').toLowerCase();
    if (s.includes('whatsapp')) return { label: source || 'WhatsApp', icon: '💬', bg: 'bg-green-50 text-green-800 border-green-200', ring: 'ring-green-200' };
    if (s.includes('instagram')) return { label: source || 'Instagram', icon: '📷', bg: 'bg-pink-50 text-pink-800 border-pink-200', ring: 'ring-pink-200' };
    if (s.includes('email') || s.includes('mail')) return { label: source || 'Email', icon: '✉', bg: 'bg-sky-50 text-sky-800 border-sky-200', ring: 'ring-sky-200' };
    if (s.includes('сайт') || s.includes('site') || s.includes('apply')) return { label: source || 'Сайт', icon: '🌐', bg: 'bg-stone-50 text-stone-700 border-stone-200', ring: 'ring-stone-200' };
    if (s.includes('реклама') || s.includes('ad')) return { label: source || 'Реклама', icon: '📢', bg: 'bg-amber-50 text-amber-800 border-amber-200', ring: 'ring-amber-200' };
    if (s.includes('друз') || s.includes('referral')) return { label: source || 'Друзья', icon: '👥', bg: 'bg-violet-50 text-violet-800 border-violet-200', ring: 'ring-violet-200' };
    return { label: source || '—', icon: '🏷', bg: 'bg-stone-100 text-stone-700 border-stone-200', ring: 'ring-stone-200' };
}

// SLA chip
function slaChip(deadlineIso: string | null, processedIso?: string | null): { text: string; cls: string } {
    if (processedIso) return { text: '✓ обработан', cls: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
    if (!deadlineIso) return { text: 'в очереди', cls: 'bg-amber-50 text-amber-700 border border-amber-200' };
    const ms = new Date(deadlineIso).getTime() - Date.now();
    if (ms < 0) {
        const overMin = Math.round(-ms / 60000);
        const h = Math.floor(overMin / 60);
        const m = overMin % 60;
        return { text: `⚠ просрочен ${h ? `${h}ч ` : ''}${m}м`, cls: 'bg-rose-50 text-rose-700 border border-rose-200 font-semibold' };
    }
    const tot = Math.round(ms / 60000);
    const h = Math.floor(tot / 60);
    const m = tot % 60;
    return {
        text: `${h ? `${h}ч ` : ''}${m}м до SLA`,
        cls: h < 1 ? 'bg-orange-50 text-orange-700 border border-orange-200' : 'bg-stone-100 text-stone-600 border border-stone-200',
    };
}

function useDebounced<T>(value: T, ms: number): T {
    const [v, setV] = useState(value);
    useEffect(() => {
        const t = window.setTimeout(() => setV(value), ms);
        return () => window.clearTimeout(t);
    }, [value, ms]);
    return v;
}

function useCountdown(targetIso: string | null) {
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        if (!targetIso) return;
        const t = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(t);
    }, [targetIso]);
    if (!targetIso) return null;
    const ms = new Date(targetIso).getTime() - now;
    if (ms <= 0) return '00:00';
    const tot = Math.floor(ms / 1000);
    return `${String(Math.floor(tot / 60)).padStart(2, '0')}:${String(tot % 60).padStart(2, '0')}`;
}

// ═════════════════════════════════════════════════════════════════════
//  PRIMITIVES
// ═════════════════════════════════════════════════════════════════════
const Avatar: React.FC<{ name: string; size?: 'sm' | 'md' | 'lg' }> = ({ name, size = 'md' }) => {
    const cls = size === 'sm' ? 'w-7 h-7 text-xs' : size === 'lg' ? 'w-12 h-12 text-base' : 'w-9 h-9 text-sm';
    return (
        <div className={`${cls} ${colourFromName(name || '?')} rounded-full flex items-center justify-center font-semibold flex-shrink-0`}>
            {initials(name || '?')}
        </div>
    );
};

const Pill: React.FC<{ children: React.ReactNode; cls?: string }> = ({ children, cls }) => (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md ${cls || 'bg-stone-100 text-stone-700'}`}>{children}</span>
);

const Btn: React.FC<{ children: React.ReactNode; onClick?: any; variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'; disabled?: boolean; type?: 'button' | 'submit'; title?: string; className?: string }> = ({ children, onClick, variant = 'secondary', disabled, type = 'button', title, className }) => {
    const map: Record<string, string> = {
        primary: 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow disabled:bg-emerald-300',
        secondary: 'bg-white hover:bg-stone-50 border border-stone-200 text-stone-700 shadow-sm hover:shadow disabled:opacity-50',
        ghost: 'hover:bg-stone-100 text-stone-700 disabled:opacity-50',
        danger: 'bg-rose-500 hover:bg-rose-600 text-white shadow-sm disabled:opacity-50',
        success: 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm disabled:opacity-50',
    };
    return (
        <button type={type} disabled={disabled} onClick={onClick} title={title}
            className={`inline-flex items-center justify-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition-all ${map[variant]} ${className || ''}`}>
            {children}
        </button>
    );
};

const StatusBadge: React.FC<{ code: string; label?: string; color?: string }> = ({ code, label, color }) => (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md border" style={{
        backgroundColor: color ? `${color}15` : '#f5f5f4',
        borderColor: color ? `${color}40` : '#e7e5e4',
        color: color || '#44403c',
    }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color || '#a8a29e' }} />
        {label || code}
    </span>
);

// ═════════════════════════════════════════════════════════════════════
//  LOGIN SCREEN
// ═════════════════════════════════════════════════════════════════════
const LoginScreen: React.FC<{ onAuthed: (m: Manager) => void }> = ({ onAuthed }) => {
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const submit = async (e: React.FormEvent) => {
        e.preventDefault(); setError(null); setLoading(true);
        try {
            const r = await fetch('/api/lidy/login', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                credentials: 'include', body: JSON.stringify({ login, password }),
            });
            const j = await r.json().catch(() => ({}));
            if (!r.ok) setError(j.error || `Ошибка ${r.status}`);
            else onAuthed(j.manager);
        } catch (err: any) { setError(err?.message || String(err)); }
        finally { setLoading(false); }
    };
    return (
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden"
            style={{ background: 'linear-gradient(135deg, #f0fdf4 0%, #ecfeff 35%, #f8fafc 100%)' }}>
            <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
                backgroundImage: `radial-gradient(circle at 25% 30%, rgba(16,185,129,0.12), transparent 50%),
                                  radial-gradient(circle at 75% 70%, rgba(56,189,248,0.10), transparent 50%)`,
            }} />
            <form onSubmit={submit} className="relative bg-white rounded-2xl shadow-xl border border-stone-200 p-8 w-full max-w-md">
                <div className="flex items-center gap-3 mb-6 pb-5 border-b border-stone-100">
                    <img src="/ppp.png" alt="" className="w-11 h-auto" />
                    <div>
                        <h1 className="text-xl font-bold text-stone-900">GoGlobal CRM</h1>
                        <p className="text-sm text-stone-500">Вход для менеджеров</p>
                    </div>
                </div>
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Логин</label>
                <input type="text" autoFocus autoComplete="username"
                    className="w-full bg-stone-50 border border-stone-200 px-4 py-2.5 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                    value={login} onChange={e => setLogin(e.target.value)} />
                <label className="block text-sm font-medium text-stone-700 mb-1.5">Пароль</label>
                <input type="password" autoComplete="current-password"
                    className="w-full bg-stone-50 border border-stone-200 px-4 py-2.5 rounded-lg mb-5 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white transition"
                    value={password} onChange={e => setPassword(e.target.value)} />
                {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-3 py-2 mb-4">⚠ {error}</div>}
                <Btn type="submit" variant="primary" disabled={loading} className="w-full !py-2.5">
                    {loading ? 'Вход…' : 'Войти'}
                </Btn>
            </form>
        </div>
    );
};

// ═════════════════════════════════════════════════════════════════════
//  APPOINTMENT PICKER (inline form for statuses that require it)
// ═════════════════════════════════════════════════════════════════════
const AppointmentForm: React.FC<{
    onSubmit: (data: { at: string; until?: string; kind: 'specific' | 'range' | 'within_day' }) => void;
    onCancel: () => void;
}> = ({ onSubmit, onCancel }) => {
    const [kind, setKind] = useState<'specific' | 'range' | 'within_day'>('specific');
    const [at, setAt] = useState('');
    const [until, setUntil] = useState('');
    return (
        <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-4 space-y-3">
            <div className="text-sm font-semibold text-cyan-900">📅 Когда клиент подойдёт в офис?</div>
            <div className="flex gap-2">
                {[
                    { v: 'specific', l: 'Точная дата и время' },
                    { v: 'within_day', l: 'В течение дня' },
                    { v: 'range', l: 'Интервал' },
                ].map(o => (
                    <button key={o.v} type="button"
                        onClick={() => setKind(o.v as any)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${kind === o.v ? 'bg-cyan-600 text-white border-cyan-700' : 'bg-white text-cyan-800 border-cyan-200 hover:bg-cyan-50'}`}>
                        {o.l}
                    </button>
                ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="text-xs text-stone-600">
                    <span className="block mb-1">{kind === 'within_day' ? 'Дата' : 'С (дата и время)'}</span>
                    <input type={kind === 'within_day' ? 'date' : 'datetime-local'} value={at} onChange={e => setAt(e.target.value)}
                        className="w-full border border-stone-300 rounded-lg px-2 py-1.5 bg-white" />
                </label>
                {kind === 'range' && (
                    <label className="text-xs text-stone-600">
                        <span className="block mb-1">По (дата и время)</span>
                        <input type="datetime-local" value={until} onChange={e => setUntil(e.target.value)}
                            className="w-full border border-stone-300 rounded-lg px-2 py-1.5 bg-white" />
                    </label>
                )}
            </div>
            <div className="flex gap-2">
                <Btn variant="primary" disabled={!at} onClick={() => onSubmit({ at, until: kind === 'range' ? until : undefined, kind })}>
                    Подтвердить визит
                </Btn>
                <Btn variant="ghost" onClick={onCancel}>Отмена</Btn>
            </div>
        </div>
    );
};

// ═════════════════════════════════════════════════════════════════════
//  LEAD ROW (table view)
// ═════════════════════════════════════════════════════════════════════
const LeadRow: React.FC<{ lead: Lead; me: Manager; onOpen: () => void }> = ({ lead, me, onOpen }) => {
    const sla = slaChip(lead.sla_deadline_at, lead.processed_at);
    const sm = sourceMeta(lead.source || '');
    const isIncomingTransfer = lead.pending_transfer_to_id === me.id;
    const wa = lead.phone ? whatsappLink(lead.phone) : null;
    return (
        <tr className={`border-b border-stone-100 hover:bg-stone-50 cursor-pointer ${isIncomingTransfer ? 'bg-fuchsia-50/50' : ''}`} onClick={onOpen}>
            <td className="py-2 px-3"><Avatar name={lead.name} size="sm" /></td>
            <td className="py-2 px-3">
                <div className="font-medium text-stone-900">{lead.name || '— без имени —'}</div>
                <div className="text-xs text-stone-500">#{lead.id} · {formatRel(lead.received_at)}</div>
            </td>
            <td className="py-2 px-3 text-sm">
                {lead.phone && <div className="font-mono">{lead.phone}</div>}
                {lead.email && <div className="text-xs text-stone-500 truncate max-w-[200px]">{lead.email}</div>}
            </td>
            <td className="py-2 px-3"><StatusBadge code={lead.status_code} label={lead.status_label} color={lead.status_color} /></td>
            <td className="py-2 px-3">
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md border ${sm.bg}`}>
                    <span>{sm.icon}</span> {sm.label}
                </span>
            </td>
            <td className="py-2 px-3 text-sm text-stone-700">{lead.country || '—'}</td>
            <td className="py-2 px-3 text-sm text-stone-700">
                {lead.manager_name || <span className="text-stone-400 italic">не назначен</span>}
                {lead.manager_archived_at && <Pill cls="bg-stone-200 text-stone-600 ml-1">уволен</Pill>}
            </td>
            <td className="py-2 px-3"><Pill cls={sla.cls}>{sla.text}</Pill></td>
            <td className="py-2 px-3" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-1">
                    {wa && <a href={wa} target="_blank" rel="noopener noreferrer" title="WhatsApp" className="text-[#25D366] hover:bg-green-50 p-1.5 rounded">💬</a>}
                    {lead.phone && <a href={`tel:${lead.phone}`} title="Позвонить" className="text-stone-600 hover:bg-stone-100 p-1.5 rounded">📞</a>}
                    {lead.email && <a href={`mailto:${lead.email}`} title="Email" className="text-stone-600 hover:bg-stone-100 p-1.5 rounded">✉</a>}
                </div>
            </td>
        </tr>
    );
};

// ═════════════════════════════════════════════════════════════════════
//  LEAD CARD (cards view)
// ═════════════════════════════════════════════════════════════════════
const LeadCard: React.FC<{ lead: Lead; me: Manager; onOpen: () => void }> = ({ lead, me, onOpen }) => {
    const sla = slaChip(lead.sla_deadline_at, lead.processed_at);
    const sm = sourceMeta(lead.source || '');
    const isIncomingTransfer = lead.pending_transfer_to_id === me.id;
    const wa = lead.phone ? whatsappLink(lead.phone) : null;
    return (
        <div onClick={onOpen}
            className={`bg-white border rounded-2xl p-4 hover:shadow-md transition-all cursor-pointer relative ${isIncomingTransfer ? 'border-fuchsia-300 ring-2 ring-fuchsia-200' : 'border-stone-200'}`}>
            {isIncomingTransfer && (
                <div className="absolute -top-2 -right-2 bg-fuchsia-500 text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shadow">передано</div>
            )}
            <div className="flex items-start gap-3 mb-3">
                <Avatar name={lead.name} />
                <div className="flex-grow min-w-0">
                    <div className="font-semibold text-stone-900 truncate">{lead.name || '— без имени —'}</div>
                    <div className="text-xs text-stone-500">#{lead.id} · {formatRel(lead.received_at)}</div>
                </div>
                <StatusBadge code={lead.status_code} label={lead.status_label} color={lead.status_color} />
            </div>
            <div className="space-y-1 text-sm">
                {lead.phone && <div className="font-mono text-stone-700">📞 {lead.phone}</div>}
                {lead.email && <div className="text-stone-600 truncate">✉ {lead.email}</div>}
                {lead.country && <div className="text-stone-600">🌍 {lead.country}</div>}
                {lead.desired_university && <div className="text-stone-600 text-xs truncate">🎓 {lead.desired_university}</div>}
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-stone-100">
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md border ${sm.bg}`}>
                    {sm.icon} {sm.label}
                </span>
                <Pill cls={sla.cls}>{sla.text}</Pill>
                {lead.manager_name && (
                    <Pill cls="bg-stone-50 text-stone-600 border border-stone-200">
                        👤 {lead.manager_name}{lead.manager_archived_at && ' (уволен)'}
                    </Pill>
                )}
            </div>
            {wa && (
                <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
                    <a href={wa} target="_blank" rel="noopener noreferrer"
                        className="flex-1 inline-flex items-center justify-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#1eba56] text-white">
                        💬 WhatsApp
                    </a>
                    <Btn variant="secondary" onClick={onOpen}>📋 Открыть</Btn>
                </div>
            )}
        </div>
    );
};

// ═════════════════════════════════════════════════════════════════════
//  PIPELINE VIEW (kanban-style columns by status)
// ═════════════════════════════════════════════════════════════════════
const PipelineView: React.FC<{ leads: Lead[]; statuses: StatusOption[]; me: Manager; onOpen: (l: Lead) => void }> = ({ leads, statuses, me, onOpen }) => {
    const grouped = useMemo(() => {
        const m: Record<string, Lead[]> = {};
        for (const s of statuses) m[s.code] = [];
        for (const l of leads) {
            if (!m[l.status_code]) m[l.status_code] = [];
            m[l.status_code].push(l);
        }
        return m;
    }, [leads, statuses]);
    const orderedStatuses = useMemo(() => [...statuses].sort((a, b) => a.sort - b.sort), [statuses]);
    return (
        <div className="flex gap-3 overflow-x-auto pb-4">
            {orderedStatuses.map(s => {
                const list = grouped[s.code] || [];
                return (
                    <div key={s.code} className="bg-stone-50 border border-stone-200 rounded-xl p-3 min-w-[280px] w-[280px] flex-shrink-0">
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-stone-200">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color || '#a8a29e' }} />
                                <span className="font-semibold text-sm text-stone-900">{s.label}</span>
                            </div>
                            <span className="text-xs text-stone-500 font-mono">{list.length}</span>
                        </div>
                        <div className="space-y-2 max-h-[600px] overflow-y-auto">
                            {list.length === 0 ? (
                                <div className="text-xs text-stone-400 italic py-4 text-center">—</div>
                            ) : list.map(l => {
                                const sla = slaChip(l.sla_deadline_at, l.processed_at);
                                return (
                                    <div key={l.id} onClick={() => onOpen(l)}
                                        className="bg-white border border-stone-200 rounded-lg p-2.5 cursor-pointer hover:shadow-sm transition-all hover:border-emerald-300">
                                        <div className="flex items-start gap-2 mb-1.5">
                                            <Avatar name={l.name} size="sm" />
                                            <div className="flex-grow min-w-0">
                                                <div className="text-sm font-medium text-stone-900 truncate">{l.name || '—'}</div>
                                                <div className="text-[10px] text-stone-500">#{l.id} · {formatRel(l.received_at)}</div>
                                            </div>
                                        </div>
                                        {l.phone && <div className="font-mono text-xs text-stone-600">{l.phone}</div>}
                                        <div className="mt-1"><Pill cls={sla.cls}>{sla.text}</Pill></div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
        </div>
    );
};

// ═════════════════════════════════════════════════════════════════════
//  LEAD DETAIL DRAWER (right side panel)
// ═════════════════════════════════════════════════════════════════════
const LeadDetailDrawer: React.FC<{
    lead: Lead;
    me: Manager;
    statuses: StatusOption[];
    roster: RosterManager[];
    sourceOptions: string[];
    onClose: () => void;
    onRefresh: () => void;
}> = ({ lead, me, statuses, roster, sourceOptions, onClose, onRefresh }) => {
    const [tab, setTab] = useState<'overview' | 'activity' | 'related'>('overview');
    const [comments, setComments] = useState<CommentRec[] | null>(null);
    const [related, setRelated] = useState<any[] | null>(null);
    const [newComment, setNewComment] = useState('');
    const [pendingStatus, setPendingStatus] = useState<string | null>(null);
    const [appointmentForStatus, setAppointmentForStatus] = useState<string | null>(null);
    const [rejectionForStatus, setRejectionForStatus] = useState<{ statusCode: string; reason: string } | null>(null);
    const [editingFields, setEditingFields] = useState(false);
    const [savingFields, setSavingFields] = useState(false);
    const [draft, setDraft] = useState({
        name: lead.name || '', phone: lead.phone || '', email: lead.email || '',
        country: lead.country || '', desired_university: lead.desired_university || '',
        study_level: lead.study_level || '', intake_term: lead.intake_term || '',
        budget: lead.budget || '', english_level: lead.english_level || '',
        birth_year: lead.birth_year ? String(lead.birth_year) : '',
        current_education: lead.current_education || '', comment: lead.comment || '',
    });
    const [editSource, setEditSource] = useState(false);
    const [transferTo, setTransferTo] = useState('');
    const [reassignTo, setReassignTo] = useState('');

    const isTeamlead = me.role === 'teamlead';
    const isOwner = lead.assigned_manager_id === me.id;
    const canEdit = isTeamlead || isOwner;
    const isIncomingTransfer = lead.pending_transfer_to_id === me.id;
    const isOutgoingTransfer = !!lead.pending_transfer_to_id && lead.pending_transfer_to_id !== me.id;
    const transferDeadlineIso = lead.pending_transfer_at
        ? new Date(new Date(lead.pending_transfer_at).getTime() + 10 * 60_000).toISOString()
        : null;
    const transferCountdown = useCountdown(transferDeadlineIso);
    const sla = slaChip(lead.sla_deadline_at, lead.processed_at);
    const sm = sourceMeta(lead.source || '');
    const wa = lead.phone ? whatsappLink(lead.phone, 'Здравствуйте! Это GoGlobal по вашей заявке.') : null;

    useEffect(() => {
        fetch(`/api/lidy/leads/${lead.id}/comments`, { credentials: 'include' })
            .then(r => r.json()).then(j => setComments(j.comments || [])).catch(() => setComments([]));
    }, [lead.id]);

    useEffect(() => {
        if (tab !== 'related' || related !== null) return;
        fetch(`/api/lidy/leads/${lead.id}/related`, { credentials: 'include' })
            .then(r => r.json()).then(j => setRelated(j.related || [])).catch(() => setRelated([]));
    }, [tab, lead.id, related]);

    const submitComment = async () => {
        const body = newComment.trim(); if (!body) return;
        const r = await fetch(`/api/lidy/leads/${lead.id}/comments`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            credentials: 'include', body: JSON.stringify({ body }),
        });
        if (r.ok) {
            const j = await r.json();
            setComments(prev => [...(prev || []), j.comment]);
            setNewComment('');
        } else alert('Ошибка отправки');
    };

    const changeStatus = async (code: string, extras?: any) => {
        setPendingStatus(code);
        try {
            const r = await fetch(`/api/lidy/leads/${lead.id}/status`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                credentials: 'include', body: JSON.stringify({ status: code, ...extras }),
            });
            if (!r.ok) {
                const j = await r.json().catch(() => ({}));
                alert('Ошибка: ' + (j.error || r.status));
                return;
            }
            // refresh comments + parent
            const c = await fetch(`/api/lidy/leads/${lead.id}/comments`, { credentials: 'include' }).then(r => r.json());
            setComments(c.comments || []);
            onRefresh();
        } finally { setPendingStatus(null); }
    };

    const onStatusClick = (s: StatusOption) => {
        if (s.requires_appointment) { setAppointmentForStatus(s.code); return; }
        if (s.requires_reason) { setRejectionForStatus({ statusCode: s.code, reason: '' }); return; }
        changeStatus(s.code);
    };

    const changeSource = async (newSource: string) => {
        await fetch(`/api/lidy/leads/${lead.id}/source`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            credentials: 'include', body: JSON.stringify({ source: newSource }),
        });
        setEditSource(false);
        onRefresh();
    };

    const saveFields = async () => {
        setSavingFields(true);
        try {
            const payload: any = { ...draft };
            payload.birth_year = draft.birth_year ? Number(draft.birth_year) : null;
            const r = await fetch(`/api/lidy/leads/${lead.id}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                credentials: 'include', body: JSON.stringify(payload),
            });
            if (r.ok) { setEditingFields(false); onRefresh(); }
            else alert('Ошибка сохранения');
        } finally { setSavingFields(false); }
    };

    const doTransfer = async (mgrId: number) => {
        const r = await fetch(`/api/lidy/leads/${lead.id}/transfer`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            credentials: 'include', body: JSON.stringify({ manager_id: mgrId }),
        });
        if (!r.ok) { const j = await r.json().catch(() => ({})); alert(j.error || 'Ошибка'); }
        else { setTransferTo(''); onRefresh(); }
    };
    const doReassign = async (mgrId: number) => {
        const r = await fetch(`/api/lidy/leads/${lead.id}/reassign`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            credentials: 'include', body: JSON.stringify({ manager_id: mgrId }),
        });
        if (!r.ok) { const j = await r.json().catch(() => ({})); alert(j.error || 'Ошибка'); }
        else { setReassignTo(''); onRefresh(); }
    };
    const acceptTransfer = async () => {
        const r = await fetch(`/api/lidy/leads/${lead.id}/transfer/accept`, { method: 'POST', credentials: 'include' });
        if (r.ok) onRefresh();
    };
    const rejectTransfer = async () => {
        const r = await fetch(`/api/lidy/leads/${lead.id}/transfer/reject`, { method: 'POST', credentials: 'include' });
        if (r.ok) onRefresh();
    };
    const deleteLead = async () => {
        if (!confirm(`⚠️ Удалить лид #${lead.id}?\nКомментарии и история тоже удалятся. Действие необратимо.`)) return;
        const r = await fetch(`/api/lidy/leads/${lead.id}`, { method: 'DELETE', credentials: 'include' });
        if (r.ok) { onClose(); onRefresh(); }
    };

    return (
        <div className="fixed inset-0 z-50 flex" onClick={onClose}>
            <div className="flex-grow bg-stone-900/30 backdrop-blur-[2px]" />
            <div className="w-full md:w-[640px] bg-stone-50 h-full overflow-y-auto shadow-2xl border-l border-stone-200" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="sticky top-0 z-10 bg-white border-b border-stone-200 px-5 py-4">
                    <div className="flex items-start gap-3">
                        <Avatar name={lead.name} size="lg" />
                        <div className="flex-grow min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-xl font-bold text-stone-900 truncate">{lead.name || '— без имени —'}</h2>
                                <span className="text-sm font-mono text-stone-400">#{lead.id}</span>
                            </div>
                            <div className="text-xs text-stone-500 mt-0.5">Поступил {formatFull(lead.received_at)}</div>
                            <div className="flex items-center gap-1.5 flex-wrap mt-2">
                                <StatusBadge code={lead.status_code} label={lead.status_label} color={lead.status_color} />
                                <Pill cls={sla.cls}>{sla.text}</Pill>
                                {canEdit ? (
                                    <button onClick={() => setEditSource(!editSource)}
                                        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md border ${sm.bg} hover:brightness-95`}>
                                        {sm.icon} {sm.label} <span className="opacity-60">✎</span>
                                    </button>
                                ) : (
                                    <Pill cls={sm.bg}>{sm.icon} {sm.label}</Pill>
                                )}
                            </div>
                            {editSource && (
                                <div className="mt-2 flex flex-wrap gap-1">
                                    {sourceOptions.map(opt => (
                                        <button key={opt} onClick={() => changeSource(opt)}
                                            className={`text-xs px-2 py-1 rounded-md border ${lead.source === opt ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-white border-stone-300 hover:bg-stone-50'}`}>
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <button onClick={onClose} className="text-stone-400 hover:text-stone-700 text-2xl leading-none">×</button>
                    </div>

                    {/* Quick actions */}
                    <div className="flex gap-2 mt-3 flex-wrap">
                        {wa && <a href={wa} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#1eba56] text-white">
                            💬 WhatsApp
                        </a>}
                        {lead.phone && <a href={`tel:${lead.phone}`}
                            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-stone-700">
                            📞 Позвонить
                        </a>}
                        {lead.email && <a href={`mailto:${lead.email}`}
                            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-white border border-stone-200 hover:bg-stone-50 text-stone-700">
                            ✉ Email
                        </a>}
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 mt-4 border-b border-stone-200 -mb-4">
                        {[
                            { v: 'overview', l: 'Обзор' },
                            { v: 'activity', l: 'История' },
                            { v: 'related', l: 'Связанные' },
                        ].map(t => (
                            <button key={t.v} onClick={() => setTab(t.v as any)}
                                className={`px-4 py-2 text-sm font-medium border-b-2 transition ${tab === t.v ? 'border-emerald-600 text-emerald-700' : 'border-transparent text-stone-500 hover:text-stone-700'}`}>
                                {t.l}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4">
                    {/* Transfer banners */}
                    {isIncomingTransfer && (
                        <div className="bg-fuchsia-50 border border-fuchsia-200 rounded-xl p-4">
                            <div className="font-semibold text-fuchsia-900">🤝 Вам передал лид {lead.pending_transfer_by_name}</div>
                            <div className="text-sm text-fuchsia-700 mt-1">Решите за <strong>{transferCountdown}</strong>, иначе лид вернётся автору</div>
                            <div className="flex gap-2 mt-3">
                                <Btn variant="success" onClick={acceptTransfer}>✓ Принять</Btn>
                                <Btn variant="danger" onClick={rejectTransfer}>✗ Отказать</Btn>
                            </div>
                        </div>
                    )}
                    {isOutgoingTransfer && (
                        <div className="bg-violet-50 border border-violet-200 rounded-xl p-3 flex items-center justify-between">
                            <div className="text-sm text-violet-900">
                                ⏱ Передан <strong>{lead.pending_transfer_to_name}</strong> — ждёт принятия (<strong>{transferCountdown}</strong>)
                            </div>
                            {(isOwner || isTeamlead) && <Btn variant="ghost" onClick={rejectTransfer}>↩ Отменить</Btn>}
                        </div>
                    )}

                    {tab === 'overview' && (
                        <>
                            {/* Status change */}
                            {canEdit && !isIncomingTransfer && (
                                <section className="bg-white border border-stone-200 rounded-xl p-4">
                                    <div className="text-xs uppercase tracking-wider font-semibold text-stone-500 mb-3">🎯 Сменить статус</div>
                                    <div className="flex flex-wrap gap-1.5">
                                        {statuses.map(s => (
                                            <button key={s.code} disabled={pendingStatus !== null}
                                                onClick={() => onStatusClick(s)}
                                                title={s.is_terminal ? 'Закрывает лид' : s.requires_appointment ? 'Запросит дату визита' : s.requires_reason ? 'Запросит причину' : ''}
                                                className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition disabled:opacity-50 ${lead.status_code === s.code ? 'text-white shadow-sm' : 'bg-white text-stone-700 border-stone-300 hover:bg-stone-50'}`}
                                                style={lead.status_code === s.code ? { backgroundColor: s.color || '#10b981', borderColor: s.color || '#10b981' } : undefined}>
                                                {pendingStatus === s.code ? '…' : s.label}
                                                {s.is_terminal && ' ✓'}
                                                {s.requires_appointment && ' 📅'}
                                                {s.requires_reason && ' ✎'}
                                            </button>
                                        ))}
                                    </div>
                                    {appointmentForStatus && (
                                        <div className="mt-3">
                                            <AppointmentForm
                                                onSubmit={(data) => {
                                                    const code = appointmentForStatus;
                                                    setAppointmentForStatus(null);
                                                    changeStatus(code, { appointment_at: data.at, appointment_until: data.until, appointment_kind: data.kind });
                                                }}
                                                onCancel={() => setAppointmentForStatus(null)} />
                                        </div>
                                    )}
                                    {rejectionForStatus && (
                                        <div className="mt-3 bg-rose-50 border border-rose-200 rounded-xl p-3">
                                            <div className="text-sm font-semibold text-rose-900 mb-2">❌ Причина для «{statuses.find(s => s.code === rejectionForStatus.statusCode)?.label}»</div>
                                            <textarea autoFocus rows={3}
                                                className="w-full text-sm border border-rose-300 rounded-lg bg-white p-2 mb-2"
                                                value={rejectionForStatus.reason}
                                                onChange={e => setRejectionForStatus(prev => prev ? { ...prev, reason: e.target.value } : null)}
                                                placeholder="Клиент передумал / выбрал другое агентство…" />
                                            <div className="flex gap-2">
                                                <Btn variant="danger" disabled={!rejectionForStatus.reason.trim()}
                                                    onClick={() => {
                                                        const r = rejectionForStatus;
                                                        setRejectionForStatus(null);
                                                        changeStatus(r.statusCode, { rejection_reason: r.reason });
                                                    }}>Подтвердить отказ</Btn>
                                                <Btn variant="ghost" onClick={() => setRejectionForStatus(null)}>Отмена</Btn>
                                            </div>
                                        </div>
                                    )}
                                </section>
                            )}

                            {/* Appointment */}
                            {lead.appointment_at && (
                                <section className="bg-cyan-50 border border-cyan-200 rounded-xl p-4">
                                    <div className="text-xs uppercase tracking-wider font-semibold text-cyan-700 mb-1">📅 Запланирован визит в офис</div>
                                    <div className="text-sm text-cyan-900 font-semibold">
                                        {lead.appointment_kind === 'within_day'
                                            ? `В течение дня ${new Date(lead.appointment_at).toLocaleDateString('ru-RU')}`
                                            : lead.appointment_kind === 'range' && lead.appointment_until
                                                ? `С ${formatFull(lead.appointment_at)} до ${formatFull(lead.appointment_until)}`
                                                : formatFull(lead.appointment_at)}
                                    </div>
                                </section>
                            )}

                            {/* Rejection reason */}
                            {lead.rejection_reason && (
                                <section className="bg-rose-50 border border-rose-200 rounded-xl p-4">
                                    <div className="text-xs uppercase tracking-wider font-semibold text-rose-700 mb-1">❌ Причина отказа</div>
                                    <div className="text-sm text-rose-900">{lead.rejection_reason}</div>
                                </section>
                            )}

                            {/* Customer info card */}
                            <section className="bg-white border border-stone-200 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="text-xs uppercase tracking-wider font-semibold text-stone-500">📋 Информация о клиенте</div>
                                    {canEdit && (
                                        <button onClick={() => setEditingFields(!editingFields)} className="text-xs text-emerald-700 hover:underline">
                                            {editingFields ? 'Отмена' : 'Редактировать'}
                                        </button>
                                    )}
                                </div>
                                {editingFields ? (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                        {[
                                            ['name', 'Имя'], ['phone', 'Телефон'], ['email', 'Email'],
                                            ['country', 'Страна'], ['desired_university', 'Желаемый ВУЗ'],
                                            ['study_level', 'Уровень'], ['intake_term', 'Когда поступает'],
                                            ['budget', 'Бюджет'], ['english_level', 'Английский'],
                                            ['birth_year', 'Год рождения'], ['current_education', 'Текущее образование'],
                                        ].map(([k, l]) => (
                                            <label key={k}>
                                                <span className="block text-xs text-stone-500 mb-1">{l}</span>
                                                <input className="w-full border border-stone-300 rounded-lg px-2 py-1.5 bg-white"
                                                    value={(draft as any)[k]} onChange={e => setDraft(prev => ({ ...prev, [k]: e.target.value }))} />
                                            </label>
                                        ))}
                                        <label className="md:col-span-2">
                                            <span className="block text-xs text-stone-500 mb-1">Комментарий клиента</span>
                                            <textarea rows={2} className="w-full border border-stone-300 rounded-lg px-2 py-1.5 bg-white"
                                                value={draft.comment} onChange={e => setDraft(prev => ({ ...prev, comment: e.target.value }))} />
                                        </label>
                                        <Btn variant="primary" onClick={saveFields} disabled={savingFields} className="md:col-span-2">
                                            {savingFields ? 'Сохранение…' : '💾 Сохранить'}
                                        </Btn>
                                    </div>
                                ) : (
                                    <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                                        <Field label="📞 Телефон" value={lead.phone} />
                                        <Field label="✉ Email" value={lead.email} />
                                        <Field label="🌍 Страна" value={lead.country} />
                                        <Field label="🎓 Желаемый ВУЗ" value={lead.desired_university} />
                                        <Field label="📚 Уровень" value={lead.study_level} />
                                        <Field label="🗓 Поступление" value={lead.intake_term} />
                                        <Field label="💰 Бюджет" value={lead.budget} />
                                        <Field label="🇬🇧 Английский" value={lead.english_level} />
                                        <Field label="🎂 Год рождения" value={lead.birth_year ? String(lead.birth_year) : null} />
                                        <Field label="📖 Образование" value={lead.current_education} />
                                        <Field label="👨‍💼 Менеджер" value={lead.manager_name} />
                                        <Field label="📥 Получен" value={formatFull(lead.received_at)} />
                                        {lead.sla_deadline_at && !lead.processed_at && <Field label="⏰ SLA до" value={formatFull(lead.sla_deadline_at)} />}
                                        {lead.event_name && <Field label="🎟 Событие" value={lead.event_name} />}
                                    </dl>
                                )}
                                {lead.comment && (
                                    <div className="mt-3 pt-3 border-t border-stone-100">
                                        <div className="text-xs uppercase tracking-wider font-semibold text-stone-500 mb-1">💬 Комментарий клиента</div>
                                        <p className="text-sm text-stone-700">{lead.comment}</p>
                                    </div>
                                )}
                            </section>

                            {/* Transfer / Reassign */}
                            {(isOwner || isTeamlead) && (
                                <section className="bg-white border border-stone-200 rounded-xl p-4 space-y-3">
                                    <div className="text-xs uppercase tracking-wider font-semibold text-stone-500">⇄ Передача лида</div>
                                    {isOwner && !lead.pending_transfer_to_id && (
                                        <div>
                                            <div className="text-xs text-stone-500 mb-1">Передать другому менеджеру (10 мин на принятие)</div>
                                            <div className="flex gap-2">
                                                <select className="flex-grow border border-stone-300 rounded-lg px-2 py-1.5 bg-white text-sm"
                                                    value={transferTo} onChange={e => setTransferTo(e.target.value)}>
                                                    <option value="">— выбрать —</option>
                                                    {roster.filter(m => m.role === 'manager' && (m.active !== false) && !m.archived_at && m.id !== me.id).map(m => (
                                                        <option key={m.id} value={m.id}>{m.full_name} {m.is_online ? '🟢' : '⚪'}</option>
                                                    ))}
                                                </select>
                                                <Btn variant="primary" disabled={!transferTo} onClick={() => doTransfer(Number(transferTo))}>🤝 Передать</Btn>
                                            </div>
                                        </div>
                                    )}
                                    {isTeamlead && (
                                        <>
                                            {lead.assigned_manager_id !== me.id && (
                                                <Btn variant="secondary" onClick={() => doReassign(me.id)}>👤 Взять лид себе</Btn>
                                            )}
                                            <div>
                                                <div className="text-xs text-stone-500 mb-1">Переназначить (без подтверждения)</div>
                                                <div className="flex gap-2">
                                                    <select className="flex-grow border border-stone-300 rounded-lg px-2 py-1.5 bg-white text-sm"
                                                        value={reassignTo} onChange={e => setReassignTo(e.target.value)}>
                                                        <option value="">— выбрать —</option>
                                                        {roster.filter(m => (m.active !== false) && !m.archived_at && m.id !== lead.assigned_manager_id).map(m => (
                                                            <option key={m.id} value={m.id}>{m.full_name} {m.is_online ? '🟢' : '⚪'} {m.role === 'teamlead' ? '👑' : ''}</option>
                                                        ))}
                                                    </select>
                                                    <Btn variant="secondary" disabled={!reassignTo} onClick={() => doReassign(Number(reassignTo))}>🔄 Переназначить</Btn>
                                                </div>
                                            </div>
                                        </>
                                    )}
                                </section>
                            )}

                            {isTeamlead && (
                                <Btn variant="danger" onClick={deleteLead}>🗑 Удалить лид</Btn>
                            )}
                        </>
                    )}

                    {tab === 'activity' && (
                        <section className="bg-white border border-stone-200 rounded-xl p-4">
                            <div className="text-xs uppercase tracking-wider font-semibold text-stone-500 mb-3">📜 История событий</div>
                            <div className="space-y-3">
                                {comments === null ? (
                                    <div className="text-sm text-stone-400">Загрузка…</div>
                                ) : comments.length === 0 ? (
                                    <div className="text-sm text-stone-400 italic">Событий пока нет</div>
                                ) : (
                                    comments.slice().reverse().map(c => (
                                        <div key={c.id} className="flex gap-3">
                                            <Avatar name={c.author_name} size="sm" />
                                            <div className="flex-grow">
                                                <div className="flex items-baseline gap-2 flex-wrap">
                                                    <span className="font-semibold text-sm text-stone-900">{c.author_name}</span>
                                                    {c.author_role === 'teamlead' && <Pill cls="bg-violet-100 text-violet-700">тимлид</Pill>}
                                                    <span className="text-xs text-stone-400 ml-auto">{formatRel(c.created_at)}</span>
                                                </div>
                                                <p className="text-sm text-stone-700 whitespace-pre-wrap mt-0.5">{c.body}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            {canEdit && (
                                <div className="mt-4 pt-4 border-t border-stone-100 flex gap-2">
                                    <textarea rows={2}
                                        className="flex-grow text-sm border border-stone-300 rounded-lg bg-stone-50 focus:bg-white p-2"
                                        value={newComment} onChange={e => setNewComment(e.target.value)}
                                        placeholder="Оставить комментарий…" />
                                    <Btn variant="primary" onClick={submitComment} disabled={!newComment.trim()}>
                                        Отправить
                                    </Btn>
                                </div>
                            )}
                        </section>
                    )}

                    {tab === 'related' && (
                        <section className="bg-white border border-stone-200 rounded-xl p-4">
                            <div className="text-xs uppercase tracking-wider font-semibold text-stone-500 mb-3">
                                🔗 Тот же клиент (по телефону или email)
                            </div>
                            {related === null ? (
                                <div className="text-sm text-stone-400">Загрузка…</div>
                            ) : related.length === 0 ? (
                                <div className="text-sm text-stone-400 italic">Других лидов с такими контактами нет</div>
                            ) : (
                                <div className="space-y-2">
                                    {related.map((r: any) => (
                                        <div key={r.id} className="border border-stone-200 rounded-lg p-3 hover:bg-stone-50">
                                            <div className="flex items-center gap-3">
                                                <Avatar name={r.name} size="sm" />
                                                <div className="flex-grow min-w-0">
                                                    <div className="text-sm font-medium text-stone-900">{r.name || '— без имени —'} <span className="text-xs text-stone-400">#{r.id}</span></div>
                                                    <div className="text-xs text-stone-500">
                                                        {r.phone && <span className="font-mono">{r.phone}</span>}
                                                        {r.phone && r.email && <span> · </span>}
                                                        {r.email}
                                                    </div>
                                                </div>
                                                <StatusBadge code={r.status_code} label={r.status_label} color={r.status_color} />
                                            </div>
                                            <div className="flex items-center gap-2 mt-1.5 text-xs text-stone-500">
                                                <span>{formatRel(r.received_at)}</span>
                                                {r.manager_name && <span>· 👤 {r.manager_name}</span>}
                                                {r.source && <span>· 🏷 {r.source}</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
};

const Field: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
    <div>
        <dt className="text-xs text-stone-500">{label}</dt>
        <dd className={`text-sm ${value ? 'text-stone-900 font-medium' : 'text-stone-400 italic'}`}>{value || '—'}</dd>
    </div>
);

// ═════════════════════════════════════════════════════════════════════
//  CREATE LEAD MODAL
// ═════════════════════════════════════════════════════════════════════
const CreateLeadModal: React.FC<{
    onClose: () => void;
    onCreated: () => void;
    sourceOptions: string[];
    roster: RosterManager[];
    isTeamlead: boolean;
}> = ({ onClose, onCreated, sourceOptions, roster, isTeamlead }) => {
    const [form, setForm] = useState({
        name: '', phone: '', email: '', country: '', comment: '', source: '',
        desired_university: '', study_level: '', intake_term: '',
        budget: '', english_level: '', birth_year: '', current_education: '',
        assigned_manager_id: '',
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
    const submit = async () => {
        if (!form.source) { setError('Укажите источник'); return; }
        if (!form.name && !form.phone && !form.email) { setError('Нужно имя, телефон или email'); return; }
        setSaving(true); setError(null);
        try {
            const payload: any = { ...form };
            payload.birth_year = form.birth_year ? Number(form.birth_year) : undefined;
            if (!form.assigned_manager_id) delete payload.assigned_manager_id;
            const r = await fetch('/api/lidy/leads', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                credentials: 'include', body: JSON.stringify(payload),
            });
            const j = await r.json().catch(() => ({}));
            if (!r.ok) { setError(j.error || 'Ошибка'); return; }
            onCreated(); onClose();
        } finally { setSaving(false); }
    };
    return (
        <div className="fixed inset-0 z-50 bg-stone-900/40 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl border border-stone-200 max-w-2xl w-full my-8" onClick={e => e.stopPropagation()}>
                <div className="border-b border-stone-200 px-5 py-4 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-stone-900">📞 Создать лид вручную</h3>
                    <button onClick={onClose} className="text-stone-400 hover:text-stone-700 text-2xl leading-none">×</button>
                </div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {error && <div className="md:col-span-2 bg-rose-50 border border-rose-200 text-rose-700 p-2 rounded-lg">⚠ {error}</div>}
                    {[
                        ['name', 'Имя', 'Айбек', 'text'], ['phone', 'Телефон', '+996…', 'tel'],
                        ['email', 'Email', 'mail@…', 'email'], ['country', 'Страна', 'США', 'text'],
                        ['desired_university', 'Желаемый ВУЗ', '', 'text'], ['intake_term', 'Когда поступает', 'Осень 2026', 'text'],
                        ['budget', 'Бюджет', '$15k–30k', 'text'], ['english_level', 'Английский', 'B2 / IELTS 6.5', 'text'],
                    ].map(([k, l, ph, t]) => (
                        <label key={k}>
                            <span className="block text-xs text-stone-500 mb-1">{l}</span>
                            <input type={t} className="w-full border border-stone-300 rounded-lg px-3 py-2"
                                placeholder={ph} value={(form as any)[k]} onChange={e => set(k, e.target.value)} />
                        </label>
                    ))}
                    <label className="md:col-span-2">
                        <span className="block text-xs text-stone-500 mb-1">Источник <span className="text-rose-500">*</span></span>
                        <select className="w-full border border-stone-300 rounded-lg px-3 py-2 bg-white"
                            value={form.source} onChange={e => set('source', e.target.value)}>
                            <option value="">— выберите —</option>
                            {sourceOptions.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </label>
                    {isTeamlead && (
                        <label className="md:col-span-2">
                            <span className="block text-xs text-stone-500 mb-1">Назначить (по умолчанию — себе)</span>
                            <select className="w-full border border-stone-300 rounded-lg px-3 py-2 bg-white"
                                value={form.assigned_manager_id} onChange={e => set('assigned_manager_id', e.target.value)}>
                                <option value="">— себе —</option>
                                {roster.filter(m => m.role === 'manager' && (m.active !== false) && !m.archived_at).map(m => (
                                    <option key={m.id} value={m.id}>{m.full_name} {m.is_online ? '🟢' : '⚪'}</option>
                                ))}
                            </select>
                        </label>
                    )}
                    <label className="md:col-span-2">
                        <span className="block text-xs text-stone-500 mb-1">Комментарий</span>
                        <textarea rows={2} className="w-full border border-stone-300 rounded-lg px-3 py-2"
                            value={form.comment} onChange={e => set('comment', e.target.value)} />
                    </label>
                </div>
                <div className="border-t border-stone-200 px-5 py-3 flex justify-end gap-2">
                    <Btn variant="ghost" onClick={onClose}>Отмена</Btn>
                    <Btn variant="primary" onClick={submit} disabled={saving}>{saving ? 'Сохранение…' : '💾 Создать'}</Btn>
                </div>
            </div>
        </div>
    );
};

// ═════════════════════════════════════════════════════════════════════
//  ROSTER PANEL (teamlead-only)
// ═════════════════════════════════════════════════════════════════════
const RosterPanel: React.FC<{ roster: RosterManager[] }> = ({ roster }) => (
    <div className="bg-white border border-stone-200 rounded-xl p-4">
        <div className="text-xs uppercase tracking-wider font-semibold text-stone-500 mb-3">👥 Команда — 30 дней</div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left text-xs text-stone-500 border-b border-stone-200">
                        <th className="py-2">Менеджер</th>
                        <th className="text-center">Статус</th>
                        <th className="text-right">Всего</th>
                        <th className="text-right">Открыто</th>
                        <th className="text-right">Закрыто</th>
                        <th className="text-right">SLA✗</th>
                    </tr>
                </thead>
                <tbody>
                    {roster.map(m => (
                        <tr key={m.id} className={`border-b border-stone-100 ${m.archived_at ? 'opacity-50' : ''}`}>
                            <td className="py-2">
                                <div className="flex items-center gap-2">
                                    <Avatar name={m.full_name} size="sm" />
                                    <div>
                                        <div className="font-medium text-stone-900">
                                            {m.full_name}
                                            {m.role === 'teamlead' && <Pill cls="bg-violet-100 text-violet-700 ml-1">тимлид</Pill>}
                                            {m.archived_at && <Pill cls="bg-stone-200 text-stone-600 ml-1">УВОЛЕН</Pill>}
                                        </div>
                                        <div className="text-xs text-stone-500 font-mono">{m.login}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="text-center">
                                {m.archived_at || !m.active ? '⛔'
                                    : m.is_online ? <span className="text-emerald-500">●</span>
                                        : <span className="text-stone-300">○</span>}
                            </td>
                            <td className="text-right font-mono">{m.total30 ?? 0}</td>
                            <td className="text-right font-mono">{m.open ?? 0}</td>
                            <td className="text-right font-mono text-emerald-700">{m.closed30 ?? 0}</td>
                            <td className={`text-right font-mono ${(m.overdue ?? 0) > 0 ? 'text-rose-700 font-bold' : 'text-stone-400'}`}>{m.overdue ?? 0}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

// ═════════════════════════════════════════════════════════════════════
//  DASHBOARD
// ═════════════════════════════════════════════════════════════════════
const Dashboard: React.FC<{ manager: Manager; onLogout: () => void; onMeUpdate: (m: Manager) => void; sourceOptions: string[] }> = ({ manager, onLogout, onMeUpdate, sourceOptions }) => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [statuses, setStatuses] = useState<StatusOption[]>([]);
    const [roster, setRoster] = useState<RosterManager[]>([]);
    const isTeamlead = manager.role === 'teamlead';

    // View + filters
    const [view, setView] = useState<'cards' | 'table' | 'pipeline'>('cards');
    const [scope, setScope] = useState<'mine' | 'all'>(isTeamlead ? 'all' : 'mine');
    const [search, setSearch] = useState('');
    const debouncedSearch = useDebounced(search, 300);
    const [filterStatus, setFilterStatus] = useState('');
    const [filterSource, setFilterSource] = useState('');
    const [filterCountry, setFilterCountry] = useState('');
    const [filterUniversity, setFilterUniversity] = useState('');
    const [filterLevel, setFilterLevel] = useState('');
    const [filterManagerId, setFilterManagerId] = useState('');
    const [filterFrom, setFilterFrom] = useState('');
    const [filterTo, setFilterTo] = useState('');
    const [overdueOnly, setOverdueOnly] = useState(false);
    const [includeClosed, setIncludeClosed] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    // UI state
    const [openLead, setOpenLead] = useState<Lead | null>(null);
    const [showCreate, setShowCreate] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [togglingOnline, setTogglingOnline] = useState(false);
    const [autoRefresh, setAutoRefresh] = useState(false);
    const [lastRefresh, setLastRefresh] = useState<number | null>(null);

    const isOnline = manager.is_online !== false;

    const load = useCallback(async () => {
        setLoading(true); setError(null);
        try {
            const p = new URLSearchParams();
            if (scope === 'all') p.set('scope', 'all');
            if (filterStatus) p.set('status', filterStatus);
            if (filterSource) p.set('source', filterSource);
            if (filterCountry) p.set('country', filterCountry);
            if (filterUniversity) p.set('university', filterUniversity);
            if (filterLevel) p.set('study_level', filterLevel);
            if (filterManagerId) p.set('manager_id', filterManagerId);
            if (filterFrom) p.set('from', filterFrom);
            if (filterTo) p.set('to', filterTo);
            if (overdueOnly) p.set('overdue', '1');
            if (includeClosed) p.set('include_closed', '1');
            if (debouncedSearch.trim()) p.set('q', debouncedSearch.trim());
            const [lR, sR, rR] = await Promise.all([
                fetch(`/api/lidy/leads?${p.toString()}`, { credentials: 'include' }),
                fetch('/api/lidy/statuses', { credentials: 'include' }),
                fetch('/api/lidy/managers', { credentials: 'include' }),
            ]);
            if (!lR.ok) throw new Error(`HTTP ${lR.status}`);
            const lj = await lR.json(); const sj = await sR.json(); const rj = await rR.json();
            setLeads(lj.leads || []); setStatuses(sj.statuses || []); setRoster(rj.managers || []);
            setLastRefresh(Date.now());
        } catch (e: any) {
            setError(e?.message || String(e));
        } finally { setLoading(false); }
    }, [scope, filterStatus, filterSource, filterCountry, filterUniversity, filterLevel,
        filterManagerId, filterFrom, filterTo, overdueOnly, includeClosed, debouncedSearch]);

    useEffect(() => { load(); }, [load]);
    useEffect(() => {
        if (!autoRefresh) return;
        const t = window.setInterval(load, 15000);
        return () => window.clearInterval(t);
    }, [autoRefresh, load]);

    const toggleOnline = async () => {
        setTogglingOnline(true);
        try {
            const r = await fetch('/api/lidy/me/status', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                credentials: 'include', body: JSON.stringify({ is_online: !isOnline }),
            });
            const j = await r.json().catch(() => ({}));
            if (r.ok) {
                onMeUpdate({ ...manager, is_online: j.manager?.is_online });
                if (j.redistribution?.assigned > 0) alert(`Распределено ${j.redistribution.assigned} ожидавших лидов`);
                load();
            }
        } finally { setTogglingOnline(false); }
    };

    const counters = useMemo(() => {
        const total = leads.length;
        const open = leads.filter(l => !l.processed_at).length;
        const overdue = leads.filter(l => !l.processed_at && l.sla_deadline_at && new Date(l.sla_deadline_at).getTime() < Date.now()).length;
        const queued = leads.filter(l => !l.assigned_manager_id).length;
        const incoming = leads.filter(l => l.pending_transfer_to_id === manager.id).length;
        return { total, open, overdue, queued, incoming };
    }, [leads, manager.id]);

    // Available countries from current leads
    const uniqueCountries = useMemo(() => {
        const set = new Set<string>();
        for (const l of leads) if (l.country) set.add(l.country);
        return Array.from(set).sort();
    }, [leads]);

    const STUDY_LEVELS = ['Бакалавриат', 'Магистратура', 'PhD / докторантура', 'Foundation / подготовка', 'Языковые курсы', 'Среднее образование'];

    const activeFiltersCount = [filterStatus, filterSource, filterCountry, filterUniversity, filterLevel,
        filterManagerId, filterFrom, filterTo].filter(Boolean).length + (overdueOnly ? 1 : 0) + (includeClosed ? 1 : 0);

    const resetFilters = () => {
        setFilterStatus(''); setFilterSource(''); setFilterCountry(''); setFilterUniversity('');
        setFilterLevel(''); setFilterManagerId(''); setFilterFrom(''); setFilterTo('');
        setOverdueOnly(false); setIncludeClosed(false); setSearch('');
    };

    return (
        <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(180deg, #fafaf9 0%, #f5f5f4 100%)' }}>
            {/* Top bar */}
            <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-stone-200">
                <div className="max-w-[1600px] mx-auto px-4 py-2.5 flex items-center gap-3">
                    <button onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 hover:bg-stone-100 rounded-lg" title={sidebarOpen ? 'Свернуть фильтры' : 'Развернуть фильтры'}>
                        <span className="block w-5 h-0.5 bg-stone-700 mb-1" />
                        <span className="block w-5 h-0.5 bg-stone-700 mb-1" />
                        <span className="block w-5 h-0.5 bg-stone-700" />
                    </button>
                    <img src="/ppp.png" alt="" className="h-7 w-auto" />
                    <div className="hidden md:block">
                        <div className="font-bold text-stone-900 leading-none">CRM</div>
                        <div className="text-xs text-stone-500">{manager.full_name}{isTeamlead && ' · тимлид'}</div>
                    </div>
                    {/* Search */}
                    <div className="flex-grow max-w-2xl relative">
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="🔍 Поиск по имени, телефону, email, ВУЗу, комментарию…"
                            className="w-full bg-stone-100 hover:bg-stone-50 focus:bg-white border border-stone-200 focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 rounded-xl px-4 py-2 text-sm transition outline-none" />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700">×</button>
                        )}
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                        <button onClick={toggleOnline} disabled={togglingOnline}
                            title={isOnline ? 'Я в сети — лиды распределяются' : 'Я не в сети — лиды не идут'}
                            className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition ${isOnline ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100' : 'bg-stone-100 text-stone-600 border border-stone-200 hover:bg-stone-200'}`}>
                            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'}`} />
                            <span className="hidden md:inline">{isOnline ? 'В сети' : 'Не в сети'}</span>
                        </button>
                        <button onClick={() => setAutoRefresh(!autoRefresh)}
                            title={autoRefresh ? 'Автообновление вкл (15с)' : 'Автообновление выкл'}
                            className={`p-2 rounded-lg ${autoRefresh ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-50'}`}>
                            <svg className={`w-4 h-4 ${autoRefresh ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                        </button>
                        <Btn variant="secondary" onClick={load} title="Обновить вручную">↻</Btn>
                        <Btn variant="primary" onClick={() => setShowCreate(true)}>+ Лид</Btn>
                        <Btn variant="ghost" onClick={async () => { await fetch('/api/lidy/logout', { method: 'POST', credentials: 'include' }); onLogout(); }}>
                            Выйти
                        </Btn>
                    </div>
                </div>
            </header>

            <div className="flex flex-grow">
                {/* Sidebar */}
                {sidebarOpen && (
                    <aside className="w-72 flex-shrink-0 bg-white border-r border-stone-200 p-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 56px)' }}>
                        {/* Scope */}
                        {isTeamlead && (
                            <div>
                                <div className="text-xs uppercase tracking-wider font-semibold text-stone-500 mb-2">Просмотр</div>
                                <div className="flex bg-stone-100 p-0.5 rounded-lg">
                                    <button onClick={() => setScope('all')}
                                        className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition ${scope === 'all' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-600 hover:text-stone-900'}`}>
                                        Все
                                    </button>
                                    <button onClick={() => setScope('mine')}
                                        className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition ${scope === 'mine' ? 'bg-white shadow-sm text-stone-900' : 'text-stone-600 hover:text-stone-900'}`}>
                                        Мои
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Quick filters */}
                        <div>
                            <div className="text-xs uppercase tracking-wider font-semibold text-stone-500 mb-2">Быстрые фильтры</div>
                            <div className="space-y-1.5">
                                <button onClick={() => setOverdueOnly(!overdueOnly)}
                                    className={`w-full text-left text-sm px-3 py-2 rounded-lg transition flex items-center justify-between ${overdueOnly ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-stone-50 hover:bg-stone-100 text-stone-700'}`}>
                                    <span>⏰ Просроченные</span>
                                    {overdueOnly && <span>✓</span>}
                                </button>
                                <button onClick={() => setIncludeClosed(!includeClosed)}
                                    className={`w-full text-left text-sm px-3 py-2 rounded-lg transition flex items-center justify-between ${includeClosed ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-stone-50 hover:bg-stone-100 text-stone-700'}`}>
                                    <span>📂 Показать закрытые</span>
                                    {includeClosed && <span>✓</span>}
                                </button>
                            </div>
                        </div>

                        {/* Status filter */}
                        <div>
                            <div className="text-xs uppercase tracking-wider font-semibold text-stone-500 mb-2">Статус</div>
                            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                                className="w-full border border-stone-300 rounded-lg px-3 py-1.5 text-sm bg-white">
                                <option value="">Все статусы</option>
                                {statuses.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
                            </select>
                        </div>

                        {/* Source */}
                        <div>
                            <div className="text-xs uppercase tracking-wider font-semibold text-stone-500 mb-2">Источник</div>
                            <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
                                className="w-full border border-stone-300 rounded-lg px-3 py-1.5 text-sm bg-white">
                                <option value="">Все источники</option>
                                {sourceOptions.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        {/* Country */}
                        <div>
                            <div className="text-xs uppercase tracking-wider font-semibold text-stone-500 mb-2">Страна</div>
                            <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)}
                                className="w-full border border-stone-300 rounded-lg px-3 py-1.5 text-sm bg-white">
                                <option value="">Все страны</option>
                                {uniqueCountries.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        {/* University */}
                        <div>
                            <div className="text-xs uppercase tracking-wider font-semibold text-stone-500 mb-2">Университет</div>
                            <input type="text" value={filterUniversity} onChange={e => setFilterUniversity(e.target.value)}
                                placeholder="Поиск по названию…"
                                className="w-full border border-stone-300 rounded-lg px-3 py-1.5 text-sm bg-white" />
                        </div>

                        {/* Level */}
                        <div>
                            <div className="text-xs uppercase tracking-wider font-semibold text-stone-500 mb-2">Уровень программы</div>
                            <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)}
                                className="w-full border border-stone-300 rounded-lg px-3 py-1.5 text-sm bg-white">
                                <option value="">Все уровни</option>
                                {STUDY_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </div>

                        {/* Manager filter (teamlead, all scope) */}
                        {isTeamlead && scope === 'all' && (
                            <div>
                                <div className="text-xs uppercase tracking-wider font-semibold text-stone-500 mb-2">Менеджер</div>
                                <select value={filterManagerId} onChange={e => setFilterManagerId(e.target.value)}
                                    className="w-full border border-stone-300 rounded-lg px-3 py-1.5 text-sm bg-white">
                                    <option value="">Все</option>
                                    {roster.filter(m => m.role === 'manager').map(m => (
                                        <option key={m.id} value={m.id}>{m.full_name}{m.archived_at ? ' (уволен)' : ''}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Date range */}
                        <div>
                            <div className="text-xs uppercase tracking-wider font-semibold text-stone-500 mb-2">Дата получения</div>
                            <div className="space-y-1.5">
                                <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
                                    className="w-full border border-stone-300 rounded-lg px-3 py-1.5 text-sm bg-white" />
                                <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
                                    className="w-full border border-stone-300 rounded-lg px-3 py-1.5 text-sm bg-white" />
                            </div>
                        </div>

                        {activeFiltersCount > 0 && (
                            <Btn variant="ghost" onClick={resetFilters} className="w-full">
                                ✕ Сбросить фильтры ({activeFiltersCount})
                            </Btn>
                        )}
                    </aside>
                )}

                {/* Main content */}
                <main className="flex-grow p-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 56px)' }}>
                    {/* KPI tiles */}
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                        <div className="bg-white border border-stone-200 rounded-xl p-3 shadow-sm">
                            <div className="text-xs text-stone-500 uppercase tracking-wider">Всего</div>
                            <div className="text-2xl font-bold text-stone-900 mt-0.5">{counters.total}</div>
                            {lastRefresh && <div className="text-[10px] text-stone-400 mt-1">обн: {new Date(lastRefresh).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>}
                        </div>
                        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 shadow-sm">
                            <div className="text-xs text-amber-700 uppercase tracking-wider">Открытых</div>
                            <div className="text-2xl font-bold text-amber-900 mt-0.5">{counters.open}</div>
                        </div>
                        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 shadow-sm">
                            <div className="text-xs text-rose-700 uppercase tracking-wider">Просрочено</div>
                            <div className="text-2xl font-bold text-rose-900 mt-0.5">{counters.overdue}</div>
                        </div>
                        <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 shadow-sm">
                            <div className="text-xs text-orange-700 uppercase tracking-wider">В очереди</div>
                            <div className="text-2xl font-bold text-orange-900 mt-0.5">{counters.queued}</div>
                        </div>
                        <div className={`border rounded-xl p-3 shadow-sm transition ${counters.incoming > 0 ? 'bg-fuchsia-50 border-fuchsia-300 animate-pulse' : 'bg-stone-50 border-stone-200'}`}>
                            <div className="text-xs text-fuchsia-700 uppercase tracking-wider">Передачи мне</div>
                            <div className="text-2xl font-bold text-fuchsia-900 mt-0.5">{counters.incoming}</div>
                        </div>
                    </div>

                    {/* Roster (teamlead) */}
                    {isTeamlead && roster.length > 0 && <RosterPanel roster={roster} />}

                    {/* Header bar: results count + view switcher */}
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="text-sm text-stone-600">
                            {loading ? 'Загрузка…' : `Найдено: ${leads.length}`}
                            {search.trim() && <span className="ml-2 text-stone-400">по запросу «{search.trim()}»</span>}
                        </div>
                        <div className="flex bg-white border border-stone-200 rounded-lg p-0.5 shadow-sm">
                            {[
                                { v: 'cards', l: '🪟 Карточки' },
                                { v: 'table', l: '📋 Таблица' },
                                { v: 'pipeline', l: '📊 Pipeline' },
                            ].map(o => (
                                <button key={o.v} onClick={() => setView(o.v as any)}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${view === o.v ? 'bg-emerald-600 text-white' : 'text-stone-600 hover:bg-stone-100'}`}>
                                    {o.l}
                                </button>
                            ))}
                        </div>
                    </div>

                    {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-xl text-sm">⚠ {error}</div>}
                    {!isOnline && (
                        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-xl text-sm">
                            ⚪ Вы не в сети — новые лиды не распределяются. Переключите тумблер «Не в сети» в шапке.
                        </div>
                    )}

                    {loading ? (
                        <div className="text-center py-12 text-stone-400">Загрузка…</div>
                    ) : leads.length === 0 ? (
                        <div className="bg-white border border-stone-200 rounded-xl p-8 text-center">
                            <div className="text-5xl mb-3">📭</div>
                            <p className="text-stone-600">
                                {activeFiltersCount > 0 || search ? 'Нет лидов под текущие фильтры' : (scope === 'mine' ? 'У вас пока нет лидов' : 'Лидов пока нет')}
                            </p>
                            {(activeFiltersCount > 0 || search) && (
                                <Btn variant="ghost" onClick={resetFilters} className="mt-3">Сбросить фильтры</Btn>
                            )}
                        </div>
                    ) : view === 'table' ? (
                        <div className="bg-white border border-stone-200 rounded-xl overflow-x-auto shadow-sm">
                            <table className="w-full text-sm">
                                <thead className="bg-stone-50 text-xs uppercase tracking-wider text-stone-500">
                                    <tr>
                                        <th className="py-2 px-3 text-left w-10"></th>
                                        <th className="py-2 px-3 text-left">Клиент</th>
                                        <th className="py-2 px-3 text-left">Контакты</th>
                                        <th className="py-2 px-3 text-left">Статус</th>
                                        <th className="py-2 px-3 text-left">Источник</th>
                                        <th className="py-2 px-3 text-left">Страна</th>
                                        <th className="py-2 px-3 text-left">Менеджер</th>
                                        <th className="py-2 px-3 text-left">SLA</th>
                                        <th className="py-2 px-3 text-left w-32">Действия</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {leads.map(l => <LeadRow key={l.id} lead={l} me={manager} onOpen={() => setOpenLead(l)} />)}
                                </tbody>
                            </table>
                        </div>
                    ) : view === 'pipeline' ? (
                        <PipelineView leads={leads} statuses={statuses} me={manager} onOpen={l => setOpenLead(l)} />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {leads.map(l => <LeadCard key={l.id} lead={l} me={manager} onOpen={() => setOpenLead(l)} />)}
                        </div>
                    )}
                </main>
            </div>

            {/* Drawer */}
            {openLead && (
                <LeadDetailDrawer lead={openLead} me={manager} statuses={statuses} roster={roster}
                    sourceOptions={sourceOptions}
                    onClose={() => setOpenLead(null)} onRefresh={async () => {
                        await load();
                        // Re-fetch the open lead to reflect latest changes
                        const r = await fetch(`/api/lidy/leads/${openLead.id}`, { credentials: 'include' });
                        if (r.ok) { const j = await r.json(); if (j.lead) setOpenLead(j.lead); }
                    }} />
            )}

            {/* Create modal */}
            {showCreate && (
                <CreateLeadModal onClose={() => setShowCreate(false)} onCreated={load}
                    sourceOptions={sourceOptions} roster={roster} isTeamlead={isTeamlead} />
            )}
        </div>
    );
};

// ═════════════════════════════════════════════════════════════════════
//  TOP-LEVEL
// ═════════════════════════════════════════════════════════════════════
const DEFAULT_SOURCE_OPTIONS = ['Сайт', 'Instagram', 'WhatsApp', 'Email', 'Друзья / знакомые', 'Реклама', 'Поиск Google', 'Другое'];

const LidyApp: React.FC = () => {
    const [manager, setManager] = useState<Manager | null>(null);
    const [checking, setChecking] = useState(true);
    const [sourceOptions, setSourceOptions] = useState<string[]>(DEFAULT_SOURCE_OPTIONS);

    useEffect(() => {
        fetch('/api/lidy/me', { credentials: 'include' })
            .then(r => r.ok ? r.json() : null)
            .then(j => setManager(j?.manager || null))
            .catch(() => setManager(null))
            .finally(() => setChecking(false));
    }, []);

    useEffect(() => {
        fetch('/api/data').then(r => r.ok ? r.json() : null).then(j => {
            const opts = j?.siteConfig?.attributionOptions;
            if (Array.isArray(opts) && opts.length > 0) setSourceOptions(opts);
        }).catch(() => {});
    }, []);

    if (checking) return <div className="min-h-screen flex items-center justify-center bg-stone-50 text-stone-400">Загрузка…</div>;
    if (!manager) return <LoginScreen onAuthed={setManager} />;

    return <Dashboard manager={manager} onLogout={() => setManager(null)} onMeUpdate={setManager} sourceOptions={sourceOptions} />;
};

export default LidyApp;
