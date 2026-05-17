import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Skeleton loader — shimmering placeholder card
const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`relative overflow-hidden bg-slate-800/40 rounded ${className || ''}`}>
        <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-slate-700/40 to-transparent" />
    </div>
);
const LeadCardSkeleton: React.FC = () => (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex gap-3">
            <Skeleton className="w-10 h-10 rounded-full" />
            <div className="flex-grow space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-6 w-16 rounded" />
        </div>
        <Skeleton className="h-3 w-2/3" />
        <Skeleton className="h-3 w-1/2" />
        <div className="flex gap-2">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-5 w-20 rounded-full" />
        </div>
    </div>
);

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
    stage_code?: string | null;
    stage_label?: string | null;
    stage_color?: string | null;
    // Deal / sales
    deal_value?: number | string | null;
    deal_currency?: string | null;
    deal_probability?: number | null;
    score?: number | null;
    // Extended client fields
    dob_date?: string | null;
    passport_number?: string | null;
    city?: string | null;
    parent_name?: string | null;
    parent_contact?: string | null;
    parent_profession?: string | null;
    preferred_channel?: string | null;
    preferred_time?: string | null;
    language_cert_test?: string | null;
    language_cert_score?: string | null;
    language_cert_expires?: string | null;
    // Tags + tasks summary
    tags?: TagRec[];
    open_tasks?: number;
    overdue_tasks?: number;
}
interface TagRec {
    id: number;
    label: string;
    color?: string;
    emoji?: string;
}
interface TaskRec {
    id: number;
    lead_id: number;
    assigned_to_id?: number;
    title: string;
    description?: string;
    due_at: string;
    completed_at?: string | null;
    assignee_name?: string;
    lead_name?: string;
    lead_phone?: string;
    lead_status?: string;
    lead_status_label?: string;
    lead_status_color?: string;
}
interface StatusOption {
    code: string;
    label: string;
    color?: string;
    is_terminal: boolean;
    requires_reason?: boolean;
    requires_appointment?: boolean;
    is_semi_closed?: boolean;
    is_client_stage?: boolean;
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
function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw = atob(base64);
    const out = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
}

const formatFull = (iso: string) =>
    new Date(iso).toLocaleString('ru-RU', {
        timeZone: 'Asia/Bishkek',
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
    });

function formatMoney(value: number | string | null | undefined, currency = 'USD'): string {
    if (value === null || value === undefined || value === '') return '';
    const n = typeof value === 'string' ? parseFloat(value) : value;
    if (!isFinite(n)) return '';
    if (n >= 1000) return `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k ${currency === 'USD' ? '$' : currency}`;
    return `${Math.round(n)} ${currency === 'USD' ? '$' : currency}`;
}

function scoreColor(score: number | null | undefined): string {
    if (!score || score < 30) return 'bg-slate-800/70 text-slate-300 border-slate-800';
    if (score < 60) return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    if (score < 85) return 'bg-orange-100 text-orange-300 border-orange-300';
    return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
}

function scoreEmoji(score: number | null | undefined): string {
    if (!score || score < 30) return '❄';
    if (score < 60) return '🌡';
    if (score < 85) return '🔥';
    return '🚀';
}

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
    const palette = ['bg-emerald-500/20 text-emerald-300', 'bg-sky-500/20 text-sky-300',
        'bg-amber-500/20 text-amber-300', 'bg-rose-500/20 text-rose-300',
        'bg-violet-500/20 text-violet-300', 'bg-teal-100 text-teal-700',
        'bg-orange-100 text-orange-300', 'bg-slate-700 text-slate-200'];
    let h = 0;
    for (const c of name || '') h = (h * 31 + c.charCodeAt(0)) | 0;
    return palette[Math.abs(h) % palette.length];
}

function sourceMeta(source: string): { label: string; icon: string; bg: string; ring: string } {
    const s = (source || '').toLowerCase();
    if (s.includes('whatsapp')) return { label: source || 'WhatsApp', icon: '💬', bg: 'bg-green-500/10 text-green-300 border-green-500/30', ring: 'ring-green-500/30' };
    if (s.includes('instagram')) return { label: source || 'Instagram', icon: '📷', bg: 'bg-pink-500/10 text-pink-300 border-pink-500/30', ring: 'ring-pink-500/30' };
    if (s.includes('email') || s.includes('mail')) return { label: source || 'Email', icon: '✉', bg: 'bg-sky-500/10 text-sky-300 border-sky-500/30', ring: 'ring-sky-500/30' };
    if (s.includes('сайт') || s.includes('site') || s.includes('apply')) return { label: source || 'Сайт', icon: '🌐', bg: 'bg-slate-800/40 text-slate-200 border-slate-700', ring: 'ring-slate-500/30' };
    if (s.includes('реклама') || s.includes('ad')) return { label: source || 'Реклама', icon: '📢', bg: 'bg-amber-500/10 text-amber-300 border-amber-500/30', ring: 'ring-amber-500/30' };
    if (s.includes('друз') || s.includes('referral')) return { label: source || 'Друзья', icon: '👥', bg: 'bg-violet-500/10 text-violet-300 border-violet-500/30', ring: 'ring-violet-500/30' };
    return { label: source || '—', icon: '🏷', bg: 'bg-slate-800/70 text-slate-200 border-slate-700', ring: 'ring-slate-500/30' };
}

// SLA chip
function slaChip(deadlineIso: string | null, processedIso?: string | null): { text: string; cls: string } {
    if (processedIso) return { text: '✓ обработан', cls: 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' };
    if (!deadlineIso) return { text: 'в очереди', cls: 'bg-amber-500/10 text-amber-300 border border-amber-500/30' };
    const ms = new Date(deadlineIso).getTime() - Date.now();
    if (ms < 0) {
        const overMin = Math.round(-ms / 60000);
        const h = Math.floor(overMin / 60);
        const m = overMin % 60;
        return { text: `⚠ просрочен ${h ? `${h}ч ` : ''}${m}м`, cls: 'bg-rose-500/10 text-rose-300 border border-rose-500/30 font-semibold' };
    }
    const tot = Math.round(ms / 60000);
    const h = Math.floor(tot / 60);
    const m = tot % 60;
    return {
        text: `${h ? `${h}ч ` : ''}${m}м до SLA`,
        cls: h < 1 ? 'bg-orange-500/10 text-orange-300 border border-orange-500/30' : 'bg-slate-800/70 text-slate-300 border border-slate-800',
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
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-md ${cls || 'bg-slate-800/70 text-slate-200'}`}>{children}</span>
);

const Btn: React.FC<{ children: React.ReactNode; onClick?: any; variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'; disabled?: boolean; type?: 'button' | 'submit'; title?: string; className?: string }> = ({ children, onClick, variant = 'secondary', disabled, type = 'button', title, className }) => {
    const map: Record<string, string> = {
        primary: 'bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white shadow-[0_0_20px_-4px_rgba(56,189,248,0.5)] border border-sky-400/40 disabled:opacity-50',
        secondary: 'bg-slate-800/70 hover:bg-slate-700 border border-slate-700 text-slate-100 disabled:opacity-50',
        ghost: 'hover:bg-slate-800/70 text-slate-300 disabled:opacity-50',
        danger: 'bg-rose-500 hover:bg-rose-400 text-white shadow-[0_0_16px_-4px_rgba(244,63,94,0.5)] disabled:opacity-50',
        success: 'bg-emerald-500 hover:bg-emerald-400 text-white shadow-[0_0_16px_-4px_rgba(16,185,129,0.5)] disabled:opacity-50',
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
        backgroundColor: color ? `${color}22` : 'rgba(148,163,184,0.15)',
        borderColor: color ? `${color}55` : 'rgba(148,163,184,0.3)',
        color: color || '#cbd5e1',
        textShadow: color ? `0 0 12px ${color}55` : undefined,
    }}>
        <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color || '#94a3b8', boxShadow: color ? `0 0 6px ${color}` : undefined }} />
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
        <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden text-slate-100"
            style={{ background: 'radial-gradient(ellipse at center, #0f172a 0%, #020617 50%, #000 100%)' }}>
            <div className="absolute inset-0 opacity-50 pointer-events-none" style={{
                backgroundImage: `radial-gradient(circle at 20% 30%, rgba(56,189,248,0.25), transparent 50%),
                                  radial-gradient(circle at 80% 70%, rgba(168,85,247,0.18), transparent 50%)`,
            }} />
            <div className="absolute inset-0 opacity-[0.08] pointer-events-none" style={{
                backgroundImage: `linear-gradient(rgba(56,189,248,0.4) 1px, transparent 1px),
                                  linear-gradient(90deg, rgba(56,189,248,0.4) 1px, transparent 1px)`,
                backgroundSize: '32px 32px',
            }} />
            <form onSubmit={submit} className="relative bg-slate-900/70 backdrop-blur-xl rounded-2xl shadow-[0_24px_60px_-12px_rgba(0,0,0,0.8),0_0_40px_-12px_rgba(56,189,248,0.4)] border border-sky-500/20 p-8 w-full max-w-md">
                <div className="flex items-center gap-3 mb-6 pb-5 border-b border-slate-800/60">
                    <img src="/ppp.png" alt="" className="w-11 h-auto" />
                    <div>
                        <h1 className="text-xl font-bold bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent">GoGlobal CRM</h1>
                        <p className="text-sm text-slate-400">Вход для менеджеров</p>
                    </div>
                </div>
                <label className="block text-sm font-medium text-slate-200 mb-1.5">Логин</label>
                <input type="text" autoFocus autoComplete="username"
                    className="w-full bg-slate-800/50 border border-slate-700 text-slate-100 placeholder-slate-500 px-4 py-2.5 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 focus:bg-slate-800 transition"
                    value={login} onChange={e => setLogin(e.target.value)} />
                <label className="block text-sm font-medium text-slate-200 mb-1.5">Пароль</label>
                <input type="password" autoComplete="current-password"
                    className="w-full bg-slate-800/50 border border-slate-700 text-slate-100 placeholder-slate-500 px-4 py-2.5 rounded-lg mb-5 focus:outline-none focus:ring-2 focus:ring-sky-500/40 focus:border-sky-500 focus:bg-slate-800 transition"
                    value={password} onChange={e => setPassword(e.target.value)} />
                {error && <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm rounded-lg px-3 py-2 mb-4">⚠ {error}</div>}
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
        <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 space-y-3">
            <div className="text-sm font-semibold text-cyan-900">📅 Когда клиент подойдёт в офис?</div>
            <div className="flex gap-2">
                {[
                    { v: 'specific', l: 'Точная дата и время' },
                    { v: 'within_day', l: 'В течение дня' },
                    { v: 'range', l: 'Интервал' },
                ].map(o => (
                    <button key={o.v} type="button"
                        onClick={() => setKind(o.v as any)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${kind === o.v ? 'bg-cyan-600 text-white border-cyan-700' : 'bg-slate-900/60 backdrop-blur-sm text-cyan-800 border-cyan-500/30 hover:bg-cyan-500/10'}`}>
                        {o.l}
                    </button>
                ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="text-xs text-slate-300">
                    <span className="block mb-1">{kind === 'within_day' ? 'Дата' : 'С (дата и время)'}</span>
                    <input type={kind === 'within_day' ? 'date' : 'datetime-local'} value={at} onChange={e => setAt(e.target.value)}
                        className="w-full border border-slate-700 rounded-lg px-2 py-1.5 bg-slate-900/60 backdrop-blur-sm" />
                </label>
                {kind === 'range' && (
                    <label className="text-xs text-slate-300">
                        <span className="block mb-1">По (дата и время)</span>
                        <input type="datetime-local" value={until} onChange={e => setUntil(e.target.value)}
                            className="w-full border border-slate-700 rounded-lg px-2 py-1.5 bg-slate-900/60 backdrop-blur-sm" />
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
        <tr className={`border-b border-slate-800/60 hover:bg-slate-800/40 cursor-pointer ${isIncomingTransfer ? 'bg-fuchsia-50/50' : ''}`} onClick={onOpen}>
            <td className="py-2 px-3"><Avatar name={lead.name} size="sm" /></td>
            <td className="py-2 px-3">
                <div className="font-medium text-slate-50">{lead.name || '— без имени —'}</div>
                <div className="text-xs text-slate-400">#{lead.id} · {formatRel(lead.received_at)}</div>
            </td>
            <td className="py-2 px-3 text-sm">
                {lead.phone && <div className="font-mono">{lead.phone}</div>}
                {lead.email && <div className="text-xs text-slate-400 truncate max-w-[200px]">{lead.email}</div>}
            </td>
            <td className="py-2 px-3">
                <div className="flex flex-col gap-1">
                    <StatusBadge code={lead.status_code} label={lead.status_label} color={lead.status_color} />
                    {lead.stage_code && <StatusBadge code={lead.stage_code} label={lead.stage_label || ''} color={lead.stage_color || '#0ea5e9'} />}
                </div>
            </td>
            <td className="py-2 px-3">
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md border ${sm.bg}`}>
                    <span>{sm.icon}</span> {sm.label}
                </span>
            </td>
            <td className="py-2 px-3 text-sm text-slate-200">{lead.country || '—'}</td>
            <td className="py-2 px-3 text-sm text-slate-200">
                {lead.manager_name || <span className="text-slate-400 italic">не назначен</span>}
                {lead.manager_archived_at && <Pill cls="bg-slate-700 text-slate-300 ml-1">уволен</Pill>}
            </td>
            <td className="py-2 px-3"><Pill cls={sla.cls}>{sla.text}</Pill></td>
            <td className="py-2 px-3" onClick={e => e.stopPropagation()}>
                <div className="flex items-center gap-1">
                    {wa && <a href={wa} target="_blank" rel="noopener noreferrer" title="WhatsApp" className="text-[#25D366] hover:bg-green-50 p-1.5 rounded">💬</a>}
                    {lead.phone && <a href={`tel:${lead.phone}`} title="Позвонить" className="text-slate-300 hover:bg-slate-800/70 p-1.5 rounded">📞</a>}
                    {lead.email && <a href={`mailto:${lead.email}`} title="Email" className="text-slate-300 hover:bg-slate-800/70 p-1.5 rounded">✉</a>}
                </div>
            </td>
        </tr>
    );
};

// ═════════════════════════════════════════════════════════════════════
//  LEAD CARD (cards view)
// ═════════════════════════════════════════════════════════════════════
const LeadCard: React.FC<{
    lead: Lead;
    me: Manager;
    onOpen: () => void;
    selectable?: boolean;
    selected?: boolean;
    onToggleSelect?: () => void;
}> = ({ lead, me, onOpen, selectable, selected, onToggleSelect }) => {
    const sla = slaChip(lead.sla_deadline_at, lead.processed_at);
    const sm = sourceMeta(lead.source || '');
    const isIncomingTransfer = lead.pending_transfer_to_id === me.id;
    const wa = lead.phone ? whatsappLink(lead.phone) : null;
    return (
        <div onClick={() => selectable ? onToggleSelect && onToggleSelect() : onOpen()}
            className={`group bg-slate-900/60 backdrop-blur-md border rounded-2xl p-4 hover:bg-slate-800/60 hover:border-sky-500/40 hover:shadow-[0_8px_32px_-8px_rgba(56,189,248,0.25)] transition-all cursor-pointer relative ${selected ? 'ring-2 ring-sky-400 border-sky-500/60 bg-sky-500/5' : isIncomingTransfer ? 'border-fuchsia-500/50 shadow-[0_0_24px_-4px_rgba(217,70,239,0.4)]' : 'border-slate-800'}`}>
            {selectable && (
                <div className="absolute top-3 right-3 z-10">
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition ${selected ? 'bg-sky-500 border-sky-400' : 'bg-slate-800/80 border-slate-600'}`}>
                        {selected && <span className="text-white text-xs">✓</span>}
                    </div>
                </div>
            )}
            {isIncomingTransfer && (
                <div className="absolute -top-2 -right-2 bg-fuchsia-500 text-white text-[10px] font-bold uppercase px-2 py-0.5 rounded-full shadow">передано</div>
            )}
            <div className="flex items-start gap-3 mb-3">
                <Avatar name={lead.name} />
                <div className="flex-grow min-w-0">
                    <div className="font-semibold text-slate-50 truncate">{lead.name || '— без имени —'}</div>
                    <div className="text-xs text-slate-400">#{lead.id} · {formatRel(lead.received_at)}</div>
                </div>
                <div className="flex flex-col gap-1 items-end">
                    <StatusBadge code={lead.status_code} label={lead.status_label} color={lead.status_color} />
                    {lead.stage_code && <StatusBadge code={lead.stage_code} label={lead.stage_label || ''} color={lead.stage_color || '#0ea5e9'} />}
                </div>
            </div>
            <div className="space-y-1 text-sm">
                {lead.phone && <div className="font-mono text-slate-200">📞 {lead.phone}</div>}
                {lead.email && <div className="text-slate-300 truncate">✉ {lead.email}</div>}
                {lead.country && <div className="text-slate-300">🌍 {lead.country}</div>}
                {lead.desired_university && <div className="text-slate-300 text-xs truncate">🎓 {lead.desired_university}</div>}
            </div>
            <div className="flex items-center gap-2 flex-wrap mt-3 pt-3 border-t border-slate-800/60">
                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md border ${sm.bg}`}>
                    {sm.icon} {sm.label}
                </span>
                <Pill cls={sla.cls}>{sla.text}</Pill>
                {lead.deal_value && (
                    <Pill cls="bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-semibold">
                        💰 {formatMoney(lead.deal_value, lead.deal_currency || 'USD')}
                    </Pill>
                )}
                {lead.score !== undefined && lead.score !== null && lead.score > 0 && (
                    <Pill cls={`border ${scoreColor(lead.score)}`}>
                        {scoreEmoji(lead.score)} {lead.score}
                    </Pill>
                )}
                {(lead.open_tasks || 0) > 0 && (
                    <Pill cls={`border ${(lead.overdue_tasks || 0) > 0 ? 'bg-rose-500/10 text-rose-300 border-rose-500/40' : 'bg-sky-500/10 text-sky-300 border-sky-500/30'}`}>
                        ✓ {lead.open_tasks} задач{(lead.overdue_tasks || 0) > 0 ? ` (${lead.overdue_tasks} просрочено)` : ''}
                    </Pill>
                )}
                {lead.manager_name && (
                    <Pill cls="bg-slate-800/40 text-slate-300 border border-slate-800">
                        👤 {lead.manager_name}{lead.manager_archived_at && ' (уволен)'}
                    </Pill>
                )}
            </div>
            {lead.tags && lead.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                    {lead.tags.map(t => (
                        <span key={t.id} className="inline-flex items-center gap-0.5 text-xs px-2 py-0.5 rounded-full border"
                            style={{ backgroundColor: (t.color || '#94a3b8') + '20', borderColor: (t.color || '#94a3b8') + '60', color: t.color || '#475569' }}>
                            {t.emoji} {t.label}
                        </span>
                    ))}
                </div>
            )}
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
//  PIPELINE VIEW (kanban-style columns by status OR stage) + drag&drop
// ═════════════════════════════════════════════════════════════════════
type PipelineMode = 'status' | 'stage';
const PipelineView: React.FC<{
    leads: Lead[];
    statuses: StatusOption[];
    me: Manager;
    onOpen: (l: Lead) => void;
    onRefresh?: () => void;
    mode: PipelineMode;
}> = ({ leads, statuses, me, onOpen, onRefresh, mode }) => {
    const [draggingLeadId, setDraggingLeadId] = useState<number | null>(null);
    const [hoverColumn, setHoverColumn] = useState<string | null>(null);
    const [movingId, setMovingId] = useState<number | null>(null);
    // Filter columns by mode (lead processing vs client stages)
    const columns = useMemo(() => {
        const filtered = statuses.filter(s => mode === 'stage' ? !!s.is_client_stage : !s.is_client_stage);
        return [...filtered].sort((a, b) => a.sort - b.sort);
    }, [statuses, mode]);

    // Group leads into columns
    const grouped = useMemo(() => {
        const m: Record<string, Lead[]> = {};
        for (const c of columns) m[c.code] = [];
        // "No-stage" bucket only in stage mode (leads that haven't entered post-win pipeline yet)
        if (mode === 'stage') m['__none__'] = [];

        for (const l of leads) {
            if (mode === 'status') {
                if (m[l.status_code]) m[l.status_code].push(l);
            } else {
                // stage mode: only show leads that are closed_won (entered client pipeline)
                if (l.status_code !== 'closed_won') continue;
                const key = l.stage_code || '__none__';
                if (m[key]) m[key].push(l);
                else m['__none__'].push(l);
            }
        }
        return m;
    }, [leads, columns, mode]);

    // Total deal value per column (only in stage mode)
    const colSummary = (list: Lead[]) => {
        const total = list.reduce((sum, l) => sum + (Number(l.deal_value) || 0), 0);
        return total;
    };

    // Drop handler — moves a lead's status/stage on column drop
    const handleDrop = async (columnCode: string) => {
        const leadId = draggingLeadId;
        setDraggingLeadId(null);
        setHoverColumn(null);
        if (!leadId) return;
        const lead = leads.find(l => l.id === leadId);
        if (!lead) return;
        // No-op if column matches current
        if (mode === 'status' && lead.status_code === columnCode) return;
        if (mode === 'stage' && (lead.stage_code || '') === (columnCode === '__none__' ? '' : columnCode)) return;
        setMovingId(leadId);
        try {
            const endpoint = mode === 'status'
                ? `/api/lidy/leads/${leadId}/status`
                : `/api/lidy/leads/${leadId}/stage`;
            const payload = mode === 'status'
                ? { status: columnCode }
                : { stage: columnCode === '__none__' ? '' : columnCode };
            const r = await fetch(endpoint, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                credentials: 'include', body: JSON.stringify(payload),
            });
            if (!r.ok) {
                const j = await r.json().catch(() => ({}));
                alert('Не удалось переместить: ' + (j.error || r.status));
            } else {
                onRefresh && onRefresh();
            }
        } finally { setMovingId(null); }
    };

    const renderColumn = (key: string, label: string, color: string | undefined, list: Lead[], isMuted = false) => (
        <div key={key}
            onDragOver={e => { e.preventDefault(); setHoverColumn(key); }}
            onDragLeave={() => { if (hoverColumn === key) setHoverColumn(null); }}
            onDrop={e => { e.preventDefault(); handleDrop(key); }}
            className={`border rounded-xl p-3 min-w-[280px] w-[280px] flex-shrink-0 backdrop-blur-sm transition-all ${isMuted ? 'bg-slate-900/30 border-slate-800/60' : 'bg-slate-800/40 border-slate-800'} ${hoverColumn === key ? 'ring-2 ring-sky-400 shadow-[0_0_24px_-4px_rgba(56,189,248,0.6)] bg-sky-500/10' : ''}`}>
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color || '#94a3b8', boxShadow: color ? `0 0 8px ${color}` : undefined }} />
                    <span className="font-semibold text-sm text-slate-50 truncate">{label}</span>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                    {mode === 'stage' && colSummary(list) > 0 && (
                        <span className="text-[10px] text-emerald-300 font-mono">${Math.round(colSummary(list) / 1000)}k</span>
                    )}
                    <span className="text-xs text-slate-400 font-mono bg-slate-800/70 px-1.5 py-0.5 rounded">{list.length}</span>
                </div>
            </div>
            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
                {list.length === 0 ? (
                    <div className="text-xs text-slate-500 italic py-6 text-center border-2 border-dashed border-slate-800 rounded-lg">{hoverColumn === key ? '↓ отпустите здесь' : 'пусто'}</div>
                ) : list.map(l => {
                    const sla = slaChip(l.sla_deadline_at, l.processed_at);
                    const canDrag = me.role === 'teamlead' || l.assigned_manager_id === me.id;
                    return (
                        <div key={l.id}
                            draggable={canDrag && movingId !== l.id}
                            onDragStart={e => { setDraggingLeadId(l.id); e.dataTransfer.effectAllowed = 'move'; }}
                            onDragEnd={() => { setDraggingLeadId(null); setHoverColumn(null); }}
                            onClick={() => onOpen(l)}
                            className={`bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-lg p-2.5 cursor-pointer transition-all hover:bg-slate-800/70 hover:border-sky-500/40 hover:shadow-[0_4px_16px_-4px_rgba(56,189,248,0.25)] ${draggingLeadId === l.id ? 'opacity-40 scale-95' : ''} ${movingId === l.id ? 'animate-pulse' : ''}`}>
                            <div className="flex items-start gap-2 mb-1.5">
                                <Avatar name={l.name} size="sm" />
                                <div className="flex-grow min-w-0">
                                    <div className="text-sm font-medium text-slate-50 truncate">{l.name || '—'}</div>
                                    <div className="text-[10px] text-slate-400">#{l.id} · {formatRel(l.received_at)}</div>
                                </div>
                                {l.score !== undefined && l.score !== null && l.score > 0 && (
                                    <span className="text-[10px] font-bold text-slate-300" title={`Скоринг ${l.score}/100`}>
                                        {scoreEmoji(l.score)}
                                    </span>
                                )}
                            </div>
                            {l.phone && <div className="font-mono text-xs text-slate-300">{l.phone}</div>}
                            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                                {mode === 'status' ? (
                                    <Pill cls={sla.cls}>{sla.text}</Pill>
                                ) : (
                                    l.deal_value && (
                                        <Pill cls="bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-semibold text-[10px]">
                                            💰 {formatMoney(l.deal_value, l.deal_currency || 'USD')}
                                        </Pill>
                                    )
                                )}
                                {l.manager_name && (
                                    <span className="inline-flex items-center gap-1 text-[10px] bg-slate-800/40 border border-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                                        <span className={`w-3 h-3 ${colourFromName(l.manager_name)} rounded-full flex items-center justify-center text-[7px] font-bold text-white`}>{initials(l.manager_name)}</span>
                                        {l.manager_name}
                                    </span>
                                )}
                                {(l.open_tasks || 0) > 0 && (
                                    <Pill cls={`text-[10px] ${(l.overdue_tasks || 0) > 0 ? 'bg-rose-500/10 text-rose-300 border-rose-500/30' : 'bg-sky-500/10 text-sky-300 border-sky-500/30'} border`}>
                                        ✓ {l.open_tasks}
                                    </Pill>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    if (mode === 'stage' && columns.length === 0) {
        return (
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-xl p-8 text-center text-slate-400">
                Этапы клиентов не настроены. Добавьте их в админке → «Статусы лидов» (галка «Этап клиента»).
            </div>
        );
    }

    return (
        <div className="flex gap-3 overflow-x-auto pb-4">
            {columns.map(s => renderColumn(s.code, s.label, s.color, grouped[s.code] || []))}
            {mode === 'stage' && (grouped['__none__'] || []).length > 0 &&
                renderColumn('__none__', '— без этапа —', undefined, grouped['__none__'], true)}
        </div>
    );
};

// ═════════════════════════════════════════════════════════════════════
//  CALENDAR VIEW — list / week / month modes
// ═════════════════════════════════════════════════════════════════════
const CalendarView: React.FC<{ appointments: any[]; onOpen: (id: number) => void }> = ({ appointments, onOpen }) => {
    const [mode, setMode] = useState<'list' | 'week' | 'month'>('list');
    const [anchor, setAnchor] = useState(() => new Date());

    // Group by date (Asia/Bishkek)
    const grouped = useMemo(() => {
        const map = new Map<string, any[]>();
        for (const a of appointments) {
            const d = new Date(a.appointment_at);
            const key = d.toLocaleDateString('ru-RU', { timeZone: 'Asia/Bishkek' });
            if (!map.has(key)) map.set(key, []);
            map.get(key)!.push(a);
        }
        return Array.from(map.entries()).sort((a, b) => {
            const da = new Date(a[1][0].appointment_at).getTime();
            const db = new Date(b[1][0].appointment_at).getTime();
            return da - db;
        });
    }, [appointments]);

    const todayKey = new Date().toLocaleDateString('ru-RU', { timeZone: 'Asia/Bishkek' });
    const dateKeyOf = (d: Date) => d.toLocaleDateString('ru-RU', { timeZone: 'Asia/Bishkek' });

    // Quick lookup: dateKey → list of appointments
    const byDateKey = useMemo(() => {
        const m = new Map<string, any[]>();
        for (const a of appointments) {
            const k = dateKeyOf(new Date(a.appointment_at));
            if (!m.has(k)) m.set(k, []);
            m.get(k)!.push(a);
        }
        return m;
    }, [appointments]);

    const renderHeader = () => {
        const title =
            mode === 'month'
                ? anchor.toLocaleDateString('ru-RU', { month: 'long', year: 'numeric' })
                : mode === 'week'
                    ? (() => {
                        const start = new Date(anchor);
                        const dow = start.getDay() === 0 ? 6 : start.getDay() - 1; // Mon-based
                        start.setDate(start.getDate() - dow);
                        const end = new Date(start);
                        end.setDate(end.getDate() + 6);
                        return `${start.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })} — ${end.toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}`;
                    })()
                    : 'Все запланированные визиты';
        const shift = (dir: number) => {
            const d = new Date(anchor);
            if (mode === 'month') d.setMonth(d.getMonth() + dir);
            else if (mode === 'week') d.setDate(d.getDate() + 7 * dir);
            else d.setDate(d.getDate() + dir);
            setAnchor(d);
        };
        return (
            <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-3 shadow-sm mb-3 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                    {mode !== 'list' && (
                        <>
                            <button onClick={() => shift(-1)} className="px-2 py-1 hover:bg-slate-800/70 rounded">‹</button>
                            <button onClick={() => setAnchor(new Date())} className="text-sm px-3 py-1 bg-slate-800/70 hover:bg-slate-700 rounded">сегодня</button>
                            <button onClick={() => shift(1)} className="px-2 py-1 hover:bg-slate-800/70 rounded">›</button>
                        </>
                    )}
                    <span className="font-semibold text-slate-50 ml-2 capitalize">{title}</span>
                </div>
                <div className="flex bg-slate-800/70 rounded-lg p-0.5">
                    {[
                        { v: 'list', l: '📋 Список' },
                        { v: 'week', l: '📆 Неделя' },
                        { v: 'month', l: '🗓 Месяц' },
                    ].map(o => (
                        <button key={o.v} onClick={() => setMode(o.v as any)}
                            className={`text-sm px-3 py-1 rounded-md transition ${mode === o.v ? 'bg-slate-900/60 backdrop-blur-sm shadow-sm text-slate-50' : 'text-slate-300 hover:text-slate-50'}`}>
                            {o.l}
                        </button>
                    ))}
                </div>
            </div>
        );
    };

    // MONTH grid — 6 rows × 7 cols
    if (mode === 'month') {
        const first = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
        const firstDow = first.getDay() === 0 ? 6 : first.getDay() - 1;
        const start = new Date(first);
        start.setDate(start.getDate() - firstDow);
        const cells: { date: Date; outside: boolean }[] = [];
        for (let i = 0; i < 42; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            cells.push({ date: d, outside: d.getMonth() !== anchor.getMonth() });
        }
        return (
            <div>
                {renderHeader()}
                <div className="grid grid-cols-7 gap-1 bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-2 shadow-sm">
                    {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(d => (
                        <div key={d} className="text-xs font-semibold text-slate-400 text-center py-1">{d}</div>
                    ))}
                    {cells.map(({ date, outside }, i) => {
                        const k = dateKeyOf(date);
                        const list = byDateKey.get(k) || [];
                        const isToday = k === todayKey;
                        return (
                            <div key={i} className={`min-h-[90px] rounded-lg p-1.5 border ${outside ? 'bg-slate-800/40 border-slate-800/60 opacity-50' : isToday ? 'bg-sky-500/10 border-sky-300' : 'bg-slate-900/60 backdrop-blur-sm border-slate-800'} hover:border-sky-300 transition`}>
                                <div className={`text-xs font-semibold ${isToday ? 'text-sky-300' : 'text-slate-300'}`}>{date.getDate()}</div>
                                <div className="space-y-0.5 mt-1">
                                    {list.slice(0, 3).map(a => {
                                        const t = new Date(a.appointment_at).toLocaleTimeString('ru-RU', { timeZone: 'Asia/Bishkek', hour: '2-digit', minute: '2-digit' });
                                        return (
                                            <button key={a.id} onClick={() => onOpen(a.id)}
                                                className="block w-full text-left text-[10px] px-1.5 py-0.5 rounded truncate hover:bg-sky-500/20 transition"
                                                style={{ backgroundColor: (a.status_color || '#0ea5e9') + '20', color: a.status_color || '#0369a1' }}
                                                title={`${a.name || '—'} · ${t}`}>
                                                <span className="font-mono mr-1">{t}</span>{a.name || '—'}
                                            </button>
                                        );
                                    })}
                                    {list.length > 3 && <div className="text-[10px] text-slate-400">+{list.length - 3} ещё</div>}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // WEEK view
    if (mode === 'week') {
        const start = new Date(anchor);
        const dow = start.getDay() === 0 ? 6 : start.getDay() - 1;
        start.setDate(start.getDate() - dow);
        const days: Date[] = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            days.push(d);
        }
        return (
            <div>
                {renderHeader()}
                <div className="grid grid-cols-1 md:grid-cols-7 gap-2">
                    {days.map(d => {
                        const k = dateKeyOf(d);
                        const list = byDateKey.get(k) || [];
                        const isToday = k === todayKey;
                        return (
                            <div key={k} className={`bg-slate-900/60 backdrop-blur-sm border ${isToday ? 'border-sky-300 ring-2 ring-sky-500/30' : 'border-slate-800'} rounded-xl p-2 shadow-sm min-h-[140px]`}>
                                <div className={`text-xs font-semibold mb-2 ${isToday ? 'text-sky-300' : 'text-slate-200'}`}>
                                    {d.toLocaleDateString('ru-RU', { weekday: 'short', day: '2-digit', month: 'short' })}
                                    {isToday && <span className="ml-1 text-[10px] bg-sky-600 text-white px-1.5 rounded">сегодня</span>}
                                </div>
                                {list.length === 0 ? (
                                    <div className="text-xs text-slate-400 italic">—</div>
                                ) : (
                                    <div className="space-y-1">
                                        {list.map(a => {
                                            const t = new Date(a.appointment_at).toLocaleTimeString('ru-RU', { timeZone: 'Asia/Bishkek', hour: '2-digit', minute: '2-digit' });
                                            return (
                                                <button key={a.id} onClick={() => onOpen(a.id)}
                                                    className="block w-full text-left text-xs rounded-md p-1.5 hover:bg-sky-500/10 border border-slate-800/60">
                                                    <div className="font-mono font-bold" style={{ color: a.status_color || '#0369a1' }}>{t}</div>
                                                    <div className="truncate text-slate-100">{a.name || '—'}</div>
                                                    {a.phone && <div className="text-[10px] text-slate-400">{a.phone}</div>}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    }

    // LIST mode (default)
    if (appointments.length === 0) {
        return (
            <div>
                {renderHeader()}
                <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-12 text-center shadow-sm">
                    <div className="text-5xl mb-3">📅</div>
                    <p className="text-slate-300">Запланированных визитов пока нет.</p>
                    <p className="text-xs text-slate-400 mt-1">Когда менеджер выберет статус «Подойдёт в офис», встреча появится здесь.</p>
                </div>
            </div>
        );
    }

    return (
        <div>
            {renderHeader()}
            <div className="space-y-3">
            {grouped.map(([dateKey, list]) => {
                const date = new Date(list[0].appointment_at);
                const isToday = dateKey === todayKey;
                const weekday = date.toLocaleDateString('ru-RU', { weekday: 'long' });
                return (
                    <div key={dateKey} className={`bg-slate-900/60 backdrop-blur-sm border ${isToday ? 'border-sky-300 ring-2 ring-sky-500/30' : 'border-slate-800'} rounded-xl overflow-hidden shadow-sm`}>
                        <div className={`px-4 py-2 border-b ${isToday ? 'bg-sky-500/10 border-sky-500/30' : 'bg-slate-800/40 border-slate-800'}`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <span className="font-semibold text-slate-50">{dateKey}</span>
                                    <span className="text-xs text-slate-400 ml-2">· {weekday}</span>
                                    {isToday && <span className="text-xs bg-sky-600 text-white px-2 py-0.5 rounded ml-2">сегодня</span>}
                                </div>
                                <span className="text-xs text-slate-400 font-mono">{list.length} визит(ов)</span>
                            </div>
                        </div>
                        <div className="divide-y divide-slate-800/60">
                            {list.map(a => {
                                const t = new Date(a.appointment_at).toLocaleTimeString('ru-RU', { timeZone: 'Asia/Bishkek', hour: '2-digit', minute: '2-digit' });
                                const wa = a.phone ? whatsappLink(a.phone) : null;
                                return (
                                    <div key={a.id} className="px-4 py-3 hover:bg-slate-800/40 cursor-pointer flex items-center gap-3"
                                        onClick={() => onOpen(a.id)}>
                                        <div className="text-center min-w-[60px]">
                                            <div className="font-mono text-lg font-bold text-slate-50">{t}</div>
                                            {a.appointment_kind === 'within_day' && <div className="text-[10px] text-slate-400">в течение дня</div>}
                                            {a.appointment_kind === 'range' && <div className="text-[10px] text-slate-400">интервал</div>}
                                        </div>
                                        <Avatar name={a.name} size="sm" />
                                        <div className="flex-grow min-w-0">
                                            <div className="font-medium text-slate-50 truncate">{a.name || '— без имени —'}</div>
                                            <div className="text-xs text-slate-400 flex flex-wrap gap-x-3">
                                                {a.phone && <span className="font-mono">{a.phone}</span>}
                                                {a.country && <span>🌍 {a.country}</span>}
                                                {a.manager_name && <span>👤 {a.manager_name}</span>}
                                            </div>
                                        </div>
                                        <StatusBadge code={a.status_code} label={a.status_label} color={a.status_color} />
                                        {wa && (
                                            <a href={wa} target="_blank" rel="noopener noreferrer"
                                                onClick={e => e.stopPropagation()}
                                                className="text-[#25D366] hover:bg-green-50 p-1.5 rounded" title="WhatsApp">💬</a>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                );
            })}
            </div>
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
    mode: 'side' | 'center';
    onToggleMode: () => void;
    onClose: () => void;
    onRefresh: () => void;
}> = ({ lead, me, statuses, roster, sourceOptions, mode, onToggleMode, onClose, onRefresh }) => {
    const [tab, setTab] = useState<'overview' | 'deal' | 'tasks' | 'files' | 'activity' | 'audit' | 'related'>('overview');
    const [tasks, setTasks] = useState<TaskRec[] | null>(null);
    const [allTags, setAllTags] = useState<TagRec[]>([]);
    const [leadTags, setLeadTags] = useState<TagRec[]>([]);
    const [files, setFiles] = useState<any[] | null>(null);
    const [auditEvents, setAuditEvents] = useState<any[] | null>(null);
    const [quickReplies, setQuickReplies] = useState<any[]>([]);
    const [showQuickReplies, setShowQuickReplies] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadingFile, setUploadingFile] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskDue, setNewTaskDue] = useState('');
    const [dealDraft, setDealDraft] = useState({
        value: (lead.deal_value !== null && lead.deal_value !== undefined) ? String(lead.deal_value) : '',
        currency: lead.deal_currency || 'USD',
        probability: lead.deal_probability ?? 30,
    });
    const [savingDeal, setSavingDeal] = useState(false);
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
        // Extended client fields
        dob_date: lead.dob_date ? lead.dob_date.substring(0, 10) : '',
        passport_number: lead.passport_number || '',
        city: lead.city || '',
        parent_name: lead.parent_name || '',
        parent_contact: lead.parent_contact || '',
        parent_profession: lead.parent_profession || '',
        preferred_channel: lead.preferred_channel || '',
        preferred_time: lead.preferred_time || '',
        language_cert_test: lead.language_cert_test || '',
        language_cert_score: lead.language_cert_score || '',
        language_cert_expires: lead.language_cert_expires ? lead.language_cert_expires.substring(0, 10) : '',
    });
    const [showExtended, setShowExtended] = useState(false);
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
        fetch(`/api/lidy/leads/${lead.id}/tags`, { credentials: 'include' })
            .then(r => r.json()).then(j => setLeadTags(j.tags || [])).catch(() => setLeadTags([]));
        fetch(`/api/lidy/tags`, { credentials: 'include' })
            .then(r => r.json()).then(j => setAllTags(j.tags || [])).catch(() => setAllTags([]));
    }, [lead.id]);

    useEffect(() => {
        if (tab !== 'related' || related !== null) return;
        fetch(`/api/lidy/leads/${lead.id}/related`, { credentials: 'include' })
            .then(r => r.json()).then(j => setRelated(j.related || [])).catch(() => setRelated([]));
    }, [tab, lead.id, related]);

    useEffect(() => {
        if (tab !== 'tasks' || tasks !== null) return;
        fetch(`/api/lidy/leads/${lead.id}/tasks`, { credentials: 'include' })
            .then(r => r.json()).then(j => setTasks(j.tasks || [])).catch(() => setTasks([]));
    }, [tab, lead.id, tasks]);

    useEffect(() => {
        if (tab !== 'files' || files !== null) return;
        fetch(`/api/lidy/leads/${lead.id}/files`, { credentials: 'include' })
            .then(r => r.json()).then(j => setFiles(j.files || [])).catch(() => setFiles([]));
    }, [tab, lead.id, files]);

    useEffect(() => {
        if (tab !== 'audit' || auditEvents !== null) return;
        fetch(`/api/lidy/leads/${lead.id}/audit`, { credentials: 'include' })
            .then(r => r.json()).then(j => setAuditEvents(j.events || [])).catch(() => setAuditEvents([]));
    }, [tab, lead.id, auditEvents]);

    useEffect(() => {
        fetch('/api/lidy/quick-replies', { credentials: 'include' })
            .then(r => r.json()).then(j => setQuickReplies(j.replies || [])).catch(() => {});
    }, []);

    const uploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]; if (!f) return;
        setUploadingFile(true);
        try {
            const fd = new FormData();
            fd.append('file', f);
            fd.append('kind', 'document');
            const r = await fetch(`/api/lidy/leads/${lead.id}/files`, {
                method: 'POST', credentials: 'include', body: fd,
            });
            if (r.ok) {
                const refresh = await fetch(`/api/lidy/leads/${lead.id}/files`, { credentials: 'include' }).then(r => r.json());
                setFiles(refresh.files || []);
            }
        } finally {
            setUploadingFile(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };
    const deleteFile = async (id: number, name: string) => {
        if (!confirm(`Удалить «${name}»?`)) return;
        await fetch(`/api/lidy/files/${id}`, { method: 'DELETE', credentials: 'include' });
        setFiles(prev => (prev || []).filter(f => f.id !== id));
    };

    const renderReplyTemplate = (body: string) => {
        return body
            .replaceAll('{manager}', me.full_name.split(' ')[0])
            .replaceAll('{name}', lead.name || '')
            .replaceAll('{amount}', '');
    };

    const sendQuickReply = (body: string) => {
        const text = renderReplyTemplate(body);
        if (lead.phone && wa) {
            const link = whatsappLink(lead.phone, text);
            window.open(link, '_blank');
        } else {
            navigator.clipboard?.writeText(text).then(() => alert('Текст скопирован — вставьте в любой мессенджер.'));
        }
        setShowQuickReplies(false);
    };

    const refetchTasks = () => fetch(`/api/lidy/leads/${lead.id}/tasks`, { credentials: 'include' })
        .then(r => r.json()).then(j => setTasks(j.tasks || []));

    const createTask = async () => {
        if (!newTaskTitle.trim() || !newTaskDue) return;
        await fetch(`/api/lidy/leads/${lead.id}/tasks`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ title: newTaskTitle.trim(), due_at: new Date(newTaskDue).toISOString() }),
        });
        setNewTaskTitle(''); setNewTaskDue('');
        await refetchTasks(); onRefresh();
    };
    const toggleTask = async (t: TaskRec) => {
        await fetch(`/api/lidy/tasks/${t.id}`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ completed: !t.completed_at }),
        });
        await refetchTasks(); onRefresh();
    };
    const deleteTask = async (t: TaskRec) => {
        if (!confirm(`Удалить задачу «${t.title}»?`)) return;
        await fetch(`/api/lidy/tasks/${t.id}`, { method: 'DELETE', credentials: 'include' });
        await refetchTasks(); onRefresh();
    };

    const toggleTag = async (tag: TagRec) => {
        const isOn = leadTags.some(t => t.id === tag.id);
        if (isOn) {
            await fetch(`/api/lidy/leads/${lead.id}/tags/${tag.id}`, { method: 'DELETE', credentials: 'include' });
            setLeadTags(prev => prev.filter(t => t.id !== tag.id));
        } else {
            await fetch(`/api/lidy/leads/${lead.id}/tags`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ tag_id: tag.id }),
            });
            setLeadTags(prev => [...prev, tag]);
        }
        onRefresh();
    };

    const saveDeal = async () => {
        setSavingDeal(true);
        try {
            await fetch(`/api/lidy/leads/${lead.id}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    deal_value: dealDraft.value ? parseFloat(dealDraft.value) : null,
                    deal_currency: dealDraft.currency,
                    deal_probability: Number(dealDraft.probability) || 0,
                }),
            });
            onRefresh();
        } finally { setSavingDeal(false); }
    };

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

    const changeStage = async (stageCode: string) => {
        setPendingStatus(stageCode);
        try {
            const r = await fetch(`/api/lidy/leads/${lead.id}/stage`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ stage: stageCode }),
            });
            if (!r.ok) {
                const j = await r.json().catch(() => ({}));
                alert('Ошибка: ' + (j.error || r.status));
                return;
            }
            const c = await fetch(`/api/lidy/leads/${lead.id}/comments`, { credentials: 'include' }).then(r => r.json());
            setComments(c.comments || []);
            onRefresh();
        } finally { setPendingStatus(null); }
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
            payload.dob_date = draft.dob_date || null;
            payload.language_cert_expires = draft.language_cert_expires || null;
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

    const isCenter = mode === 'center';
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className={`fixed inset-0 z-50 ${isCenter ? 'flex items-center justify-center p-4 bg-black/70 backdrop-blur-[3px]' : 'flex'}`} onClick={onClose}>
            {!isCenter && <div className="flex-grow bg-black/60 backdrop-blur-[3px]" />}
            <motion.div
                initial={isCenter ? { opacity: 0, scale: 0.95, y: 20 } : { x: '100%' }}
                animate={isCenter ? { opacity: 1, scale: 1, y: 0 } : { x: 0 }}
                exit={isCenter ? { opacity: 0, scale: 0.95, y: 20 } : { x: '100%' }}
                transition={{ type: 'spring', damping: 30, stiffness: 280 }}
                className={`bg-slate-950/95 backdrop-blur-xl overflow-y-auto shadow-[0_24px_60px_-12px_rgba(0,0,0,0.8),0_0_40px_-12px_rgba(56,189,248,0.2)] border-sky-500/20 ${isCenter
                ? 'w-full max-w-3xl max-h-[92vh] rounded-2xl border'
                : 'w-full md:w-[640px] h-full border-l'}`}
                onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="sticky top-0 z-10 bg-slate-950/90 backdrop-blur-xl border-b border-sky-500/20 px-5 py-4">
                    <div className="flex items-start gap-3">
                        <Avatar name={lead.name} size="lg" />
                        <div className="flex-grow min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="text-xl font-bold text-slate-50 truncate">{lead.name || '— без имени —'}</h2>
                                <span className="text-sm font-mono text-slate-400">#{lead.id}</span>
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">Поступил {formatFull(lead.received_at)}</div>
                            <div className="flex items-center gap-1.5 flex-wrap mt-2">
                                <StatusBadge code={lead.status_code} label={lead.status_label} color={lead.status_color} />
                                {lead.stage_code && <StatusBadge code={lead.stage_code} label={lead.stage_label || ''} color={lead.stage_color || '#0ea5e9'} />}
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
                                            className={`text-xs px-2 py-1 rounded-md border ${lead.source === opt ? 'bg-sky-600 text-white border-sky-700' : 'bg-slate-900/60 backdrop-blur-sm border-slate-700 hover:bg-slate-800/40'}`}>
                                            {opt}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="flex flex-col items-end gap-2">
                            <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-2xl leading-none">×</button>
                            <button onClick={onToggleMode}
                                title={mode === 'side' ? 'Открыть по центру' : 'Открыть сбоку'}
                                className="text-slate-400 hover:text-slate-200 text-xs px-2 py-0.5 border border-slate-800 rounded hover:bg-slate-800/70">
                                {mode === 'side' ? '⛶ центр' : '⇥ сбоку'}
                            </button>
                        </div>
                    </div>

                    {/* Quick actions */}
                    <div className="flex gap-2 mt-3 flex-wrap relative">
                        {wa && <a href={wa} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-[#25D366] hover:bg-[#1eba56] text-white">
                            💬 WhatsApp
                        </a>}
                        {lead.phone && <a href={`tel:${lead.phone}`}
                            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-slate-900/60 backdrop-blur-sm border border-slate-800 hover:bg-slate-800/40 text-slate-200">
                            📞 Позвонить
                        </a>}
                        {lead.email && <a href={`mailto:${lead.email}`}
                            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-slate-900/60 backdrop-blur-sm border border-slate-800 hover:bg-slate-800/40 text-slate-200">
                            ✉ Email
                        </a>}
                        {quickReplies.length > 0 && (
                            <button onClick={() => setShowQuickReplies(!showQuickReplies)}
                                className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/40 text-violet-200">
                                📨 Шаблон ▾
                            </button>
                        )}
                        {showQuickReplies && (
                            <div className="absolute top-full left-0 mt-2 z-30 w-full max-w-md bg-slate-950/95 backdrop-blur-xl border border-violet-500/30 rounded-xl shadow-[0_24px_60px_-12px_rgba(0,0,0,0.8)] p-2 space-y-1">
                                <div className="text-[10px] uppercase tracking-wider text-slate-500 px-2 py-1">Выберите шаблон — откроется в WhatsApp или скопируется</div>
                                {quickReplies.map(r => (
                                    <button key={r.id} onClick={() => sendQuickReply(r.body)}
                                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-800/70 transition group">
                                        <div className="text-sm font-medium text-slate-100">{r.title}</div>
                                        <div className="text-xs text-slate-400 line-clamp-2 group-hover:text-slate-300">{renderReplyTemplate(r.body)}</div>
                                    </button>
                                ))}
                                <button onClick={() => setShowQuickReplies(false)} className="w-full text-center text-xs text-slate-500 py-1 hover:text-slate-300">закрыть</button>
                            </div>
                        )}
                    </div>

                    {/* Tabs */}
                    <div className="flex gap-1 mt-4 border-b border-slate-800 -mb-4 overflow-x-auto">
                        {[
                            { v: 'overview', l: 'Обзор' },
                            { v: 'deal', l: '💰 Сделка' },
                            { v: 'tasks', l: '📋 Задачи', badge: (lead.open_tasks || 0) > 0 ? lead.open_tasks : undefined },
                            { v: 'files', l: '📎 Файлы' },
                            { v: 'activity', l: '💬 Чат' },
                            { v: 'audit', l: '🕒 Аудит' },
                            { v: 'related', l: '🔗 Связанные' },
                        ].map(t => (
                            <button key={t.v} onClick={() => setTab(t.v as any)}
                                className={`px-3 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap flex items-center gap-1 ${tab === t.v ? 'border-sky-500 text-sky-300' : 'border-transparent text-slate-400 hover:text-slate-200'}`}>
                                {t.l}
                                {t.badge !== undefined && (
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${(lead.overdue_tasks || 0) > 0 ? 'bg-rose-500 text-white' : 'bg-sky-500 text-white'}`}>{t.badge}</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Body */}
                <div className="p-5 space-y-4">
                    {/* Transfer banners */}
                    {isIncomingTransfer && (
                        <div className="bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-xl p-4">
                            <div className="font-semibold text-fuchsia-200">🤝 Вам передал лид {lead.pending_transfer_by_name}</div>
                            <div className="text-sm text-fuchsia-300 mt-1">Решите за <strong>{transferCountdown}</strong>, иначе лид вернётся автору</div>
                            <div className="flex gap-2 mt-3">
                                <Btn variant="success" onClick={acceptTransfer}>✓ Принять</Btn>
                                <Btn variant="danger" onClick={rejectTransfer}>✗ Отказать</Btn>
                            </div>
                        </div>
                    )}
                    {isOutgoingTransfer && (
                        <div className="bg-violet-500/10 border border-violet-500/30 rounded-xl p-3 flex items-center justify-between">
                            <div className="text-sm text-violet-200">
                                ⏱ Передан <strong>{lead.pending_transfer_to_name}</strong> — ждёт принятия (<strong>{transferCountdown}</strong>)
                            </div>
                            {(isOwner || isTeamlead) && <Btn variant="ghost" onClick={rejectTransfer}>↩ Отменить</Btn>}
                        </div>
                    )}

                    {tab === 'overview' && (
                        <>
                            {/* Status change */}
                            {canEdit && !isIncomingTransfer && (
                                <section className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-4">
                                    {/* Lead processing statuses */}
                                    <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-3">🎯 Обработка лида</div>
                                    <div className="flex flex-wrap gap-1.5 mb-4">
                                        {statuses.filter(s => !s.is_client_stage).map(s => (
                                            <button key={s.code} disabled={pendingStatus !== null}
                                                onClick={() => onStatusClick(s)}
                                                title={s.is_terminal ? 'Закрывает лид' : s.requires_appointment ? 'Запросит дату визита' : s.requires_reason ? 'Запросит причину' : ''}
                                                className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition disabled:opacity-50 ${lead.status_code === s.code ? 'text-white shadow-sm' : 'bg-slate-900/60 backdrop-blur-sm text-slate-200 border-slate-700 hover:bg-slate-800/40'}`}
                                                style={lead.status_code === s.code ? { backgroundColor: s.color || '#10b981', borderColor: s.color || '#10b981' } : undefined}>
                                                {pendingStatus === s.code ? '…' : s.label}
                                                {s.is_terminal && ' ✓'}
                                                {s.requires_appointment && ' 📅'}
                                                {s.requires_reason && ' ✎'}
                                            </button>
                                        ))}
                                    </div>
                                    {/* Client pipeline stages — INDEPENDENT from status (separate field) */}
                                    {statuses.filter(s => s.is_client_stage).length > 0 && (
                                        <>
                                            <div className="flex items-center justify-between mb-2 mt-2 pt-3 border-t border-slate-800/60">
                                                <div className="text-xs uppercase tracking-wider font-semibold text-sky-300">
                                                    🎓 Этап клиента (независимо от статуса)
                                                </div>
                                                {lead.stage_code && (
                                                    <button onClick={() => changeStage('')} disabled={pendingStatus !== null}
                                                        className="text-xs text-slate-400 hover:text-slate-200 hover:underline">
                                                        × снять этап
                                                    </button>
                                                )}
                                            </div>
                                            <div className="flex flex-wrap gap-1.5">
                                                {statuses.filter(s => s.is_client_stage).map(s => (
                                                    <button key={s.code} disabled={pendingStatus !== null}
                                                        onClick={() => changeStage(s.code)}
                                                        title="Параллельный этап ведения клиента"
                                                        className={`text-xs font-medium px-3 py-1.5 rounded-lg border transition disabled:opacity-50 ${lead.stage_code === s.code ? 'text-white shadow-sm' : 'bg-sky-500/10 text-sky-200 border-sky-500/30 hover:bg-sky-500/20'}`}
                                                        style={lead.stage_code === s.code ? { backgroundColor: s.color || '#0ea5e9', borderColor: s.color || '#0ea5e9' } : undefined}>
                                                        {pendingStatus === s.code ? '…' : s.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </>
                                    )}
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
                                        <div className="mt-3 bg-rose-500/10 border border-rose-500/30 rounded-xl p-3">
                                            <div className="text-sm font-semibold text-rose-200 mb-2">❌ Причина для «{statuses.find(s => s.code === rejectionForStatus.statusCode)?.label}»</div>
                                            <textarea autoFocus rows={3}
                                                className="w-full text-sm border border-rose-500/40 rounded-lg bg-slate-900/60 backdrop-blur-sm p-2 mb-2"
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
                                <section className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4">
                                    <div className="text-xs uppercase tracking-wider font-semibold text-cyan-300 mb-1">📅 Запланирован визит в офис</div>
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
                                <section className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4">
                                    <div className="text-xs uppercase tracking-wider font-semibold text-rose-300 mb-1">❌ Причина отказа</div>
                                    <div className="text-sm text-rose-200">{lead.rejection_reason}</div>
                                </section>
                            )}

                            {/* Customer info card */}
                            <section className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="text-xs uppercase tracking-wider font-semibold text-slate-400">📋 Информация о клиенте</div>
                                    {canEdit && (
                                        <button onClick={() => setEditingFields(!editingFields)} className="text-xs text-sky-300 hover:underline">
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
                                                <span className="block text-xs text-slate-400 mb-1">{l}</span>
                                                <input className="w-full border border-slate-700 rounded-lg px-2 py-1.5 bg-slate-900/60 backdrop-blur-sm"
                                                    value={(draft as any)[k]} onChange={e => setDraft(prev => ({ ...prev, [k]: e.target.value }))} />
                                            </label>
                                        ))}
                                        <label className="md:col-span-2">
                                            <span className="block text-xs text-slate-400 mb-1">Комментарий клиента</span>
                                            <textarea rows={2} className="w-full border border-slate-700 rounded-lg px-2 py-1.5 bg-slate-900/60 backdrop-blur-sm"
                                                value={draft.comment} onChange={e => setDraft(prev => ({ ...prev, comment: e.target.value }))} />
                                        </label>

                                        <button type="button" onClick={() => setShowExtended(!showExtended)}
                                            className="md:col-span-2 text-xs font-semibold text-sky-300 hover:underline text-left">
                                            {showExtended ? '▼ Скрыть' : '▶ Развернуть'} полную анкету клиента
                                        </button>
                                        {showExtended && (
                                            <>
                                                <label>
                                                    <span className="block text-xs text-slate-400 mb-1">🎂 Дата рождения</span>
                                                    <input type="date" className="w-full border border-slate-700 rounded-lg px-2 py-1.5 bg-slate-900/60 backdrop-blur-sm"
                                                        value={draft.dob_date} onChange={e => setDraft(p => ({ ...p, dob_date: e.target.value }))} />
                                                </label>
                                                <label>
                                                    <span className="block text-xs text-slate-400 mb-1">🛂 Номер паспорта</span>
                                                    <input className="w-full border border-slate-700 rounded-lg px-2 py-1.5 bg-slate-900/60 backdrop-blur-sm"
                                                        value={draft.passport_number} onChange={e => setDraft(p => ({ ...p, passport_number: e.target.value }))} />
                                                </label>
                                                <label>
                                                    <span className="block text-xs text-slate-400 mb-1">🏙 Город</span>
                                                    <input className="w-full border border-slate-700 rounded-lg px-2 py-1.5 bg-slate-900/60 backdrop-blur-sm"
                                                        value={draft.city} onChange={e => setDraft(p => ({ ...p, city: e.target.value }))} />
                                                </label>
                                                <label>
                                                    <span className="block text-xs text-slate-400 mb-1">📲 Удобный канал связи</span>
                                                    <select className="w-full border border-slate-700 rounded-lg px-2 py-1.5 bg-slate-900/60 backdrop-blur-sm"
                                                        value={draft.preferred_channel} onChange={e => setDraft(p => ({ ...p, preferred_channel: e.target.value }))}>
                                                        <option value="">—</option>
                                                        <option value="WhatsApp">WhatsApp</option>
                                                        <option value="Telegram">Telegram</option>
                                                        <option value="Звонок">Звонок</option>
                                                        <option value="Email">Email</option>
                                                        <option value="Личная встреча">Личная встреча</option>
                                                    </select>
                                                </label>
                                                <label>
                                                    <span className="block text-xs text-slate-400 mb-1">🕐 Удобное время</span>
                                                    <input className="w-full border border-slate-700 rounded-lg px-2 py-1.5 bg-slate-900/60 backdrop-blur-sm"
                                                        placeholder="например, 18:00–20:00"
                                                        value={draft.preferred_time} onChange={e => setDraft(p => ({ ...p, preferred_time: e.target.value }))} />
                                                </label>
                                                <label>
                                                    <span className="block text-xs text-slate-400 mb-1">👪 Родитель / опекун</span>
                                                    <input className="w-full border border-slate-700 rounded-lg px-2 py-1.5 bg-slate-900/60 backdrop-blur-sm"
                                                        value={draft.parent_name} onChange={e => setDraft(p => ({ ...p, parent_name: e.target.value }))} />
                                                </label>
                                                <label>
                                                    <span className="block text-xs text-slate-400 mb-1">📞 Контакт родителя</span>
                                                    <input className="w-full border border-slate-700 rounded-lg px-2 py-1.5 bg-slate-900/60 backdrop-blur-sm"
                                                        value={draft.parent_contact} onChange={e => setDraft(p => ({ ...p, parent_contact: e.target.value }))} />
                                                </label>
                                                <label>
                                                    <span className="block text-xs text-slate-400 mb-1">💼 Профессия родителя</span>
                                                    <input className="w-full border border-slate-700 rounded-lg px-2 py-1.5 bg-slate-900/60 backdrop-blur-sm"
                                                        value={draft.parent_profession} onChange={e => setDraft(p => ({ ...p, parent_profession: e.target.value }))} />
                                                </label>
                                                <label>
                                                    <span className="block text-xs text-slate-400 mb-1">📝 Языковой тест</span>
                                                    <select className="w-full border border-slate-700 rounded-lg px-2 py-1.5 bg-slate-900/60 backdrop-blur-sm"
                                                        value={draft.language_cert_test} onChange={e => setDraft(p => ({ ...p, language_cert_test: e.target.value }))}>
                                                        <option value="">—</option>
                                                        <option value="IELTS">IELTS</option>
                                                        <option value="TOEFL">TOEFL</option>
                                                        <option value="Duolingo">Duolingo English Test</option>
                                                        <option value="SAT">SAT</option>
                                                        <option value="GRE">GRE</option>
                                                        <option value="GMAT">GMAT</option>
                                                        <option value="HSK">HSK</option>
                                                        <option value="TestDaF">TestDaF</option>
                                                    </select>
                                                </label>
                                                <label>
                                                    <span className="block text-xs text-slate-400 mb-1">🎯 Балл</span>
                                                    <input className="w-full border border-slate-700 rounded-lg px-2 py-1.5 bg-slate-900/60 backdrop-blur-sm"
                                                        placeholder="например, 6.5"
                                                        value={draft.language_cert_score} onChange={e => setDraft(p => ({ ...p, language_cert_score: e.target.value }))} />
                                                </label>
                                                <label>
                                                    <span className="block text-xs text-slate-400 mb-1">📅 Сертификат действует до</span>
                                                    <input type="date" className="w-full border border-slate-700 rounded-lg px-2 py-1.5 bg-slate-900/60 backdrop-blur-sm"
                                                        value={draft.language_cert_expires} onChange={e => setDraft(p => ({ ...p, language_cert_expires: e.target.value }))} />
                                                </label>
                                            </>
                                        )}

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

                                {/* Extended client info */}
                                {!editingFields && (lead.dob_date || lead.passport_number || lead.city || lead.parent_name || lead.parent_contact || lead.parent_profession || lead.preferred_channel || lead.preferred_time || lead.language_cert_test || lead.language_cert_score || lead.language_cert_expires) && (
                                    <details className="mt-3 pt-3 border-t border-slate-800/60">
                                        <summary className="text-xs uppercase tracking-wider font-semibold text-slate-400 cursor-pointer hover:text-slate-200">
                                            👤 Полная анкета клиента
                                        </summary>
                                        <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-2 text-sm mt-3">
                                            {lead.dob_date && <Field label="🎂 Дата рождения" value={new Date(lead.dob_date).toLocaleDateString('ru-RU')} />}
                                            {lead.passport_number && <Field label="🛂 Паспорт" value={lead.passport_number} />}
                                            {lead.city && <Field label="🏙 Город" value={lead.city} />}
                                            {lead.preferred_channel && <Field label="📲 Канал связи" value={lead.preferred_channel} />}
                                            {lead.preferred_time && <Field label="🕐 Удобное время" value={lead.preferred_time} />}
                                            {lead.parent_name && <Field label="👪 Родитель" value={lead.parent_name} />}
                                            {lead.parent_contact && <Field label="📞 Контакт родителя" value={lead.parent_contact} />}
                                            {lead.parent_profession && <Field label="💼 Профессия родителя" value={lead.parent_profession} />}
                                            {lead.language_cert_test && <Field label="📝 Языковой тест" value={lead.language_cert_test} />}
                                            {lead.language_cert_score && <Field label="🎯 Балл" value={lead.language_cert_score} />}
                                            {lead.language_cert_expires && <Field label="📅 Действует до" value={new Date(lead.language_cert_expires).toLocaleDateString('ru-RU')} />}
                                        </dl>
                                    </details>
                                )}

                                {/* Quick tags strip */}
                                {leadTags.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-slate-800/60">
                                        <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-2">🏷 Метки</div>
                                        <div className="flex flex-wrap gap-1.5">
                                            {leadTags.map(tag => (
                                                <span key={tag.id} className="text-xs px-2.5 py-1 rounded-full text-white font-medium"
                                                    style={{ backgroundColor: tag.color || '#0ea5e9' }}>
                                                    {tag.emoji && <span className="mr-1">{tag.emoji}</span>}{tag.label}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {lead.comment && (
                                    <div className="mt-3 pt-3 border-t border-slate-800/60">
                                        <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-1">💬 Комментарий клиента</div>
                                        <p className="text-sm text-slate-200">{lead.comment}</p>
                                    </div>
                                )}
                            </section>

                            {/* Transfer / Reassign */}
                            {(isOwner || isTeamlead) && (
                                <section className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-4 space-y-3">
                                    <div className="text-xs uppercase tracking-wider font-semibold text-slate-400">⇄ Передача лида</div>
                                    {isOwner && !lead.pending_transfer_to_id && (
                                        <div>
                                            <div className="text-xs text-slate-400 mb-1">Передать другому менеджеру (10 мин на принятие)</div>
                                            <div className="flex gap-2">
                                                <select className="flex-grow border border-slate-700 rounded-lg px-2 py-1.5 bg-slate-900/60 backdrop-blur-sm text-sm"
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
                                                <div className="text-xs text-slate-400 mb-1">Переназначить (без подтверждения)</div>
                                                <div className="flex gap-2">
                                                    <select className="flex-grow border border-slate-700 rounded-lg px-2 py-1.5 bg-slate-900/60 backdrop-blur-sm text-sm"
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

                    {tab === 'deal' && (
                        <section className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-4 space-y-4">
                            <div className="text-xs uppercase tracking-wider font-semibold text-slate-400">💰 Сделка</div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-300">Сумма сделки</label>
                                    <input type="number" min="0" step="100"
                                        disabled={!canEdit}
                                        value={dealDraft.value}
                                        onChange={e => setDealDraft(d => ({ ...d, value: e.target.value }))}
                                        placeholder="например, 12000"
                                        className="mt-1 w-full text-base font-bold text-slate-50 border border-slate-700 rounded-lg p-2 bg-slate-800/40 focus:bg-slate-800/80" />
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-300">Валюта</label>
                                    <select disabled={!canEdit}
                                        value={dealDraft.currency}
                                        onChange={e => setDealDraft(d => ({ ...d, currency: e.target.value }))}
                                        className="mt-1 w-full text-sm border border-slate-700 rounded-lg p-2 bg-slate-800/40 focus:bg-slate-800/80">
                                        <option value="USD">$ USD</option>
                                        <option value="EUR">€ EUR</option>
                                        <option value="KGS">⃀ KGS</option>
                                        <option value="RUB">₽ RUB</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-xs font-semibold text-slate-300">Вероятность {dealDraft.probability}%</label>
                                    <input type="range" min="0" max="100" step="5"
                                        disabled={!canEdit}
                                        value={dealDraft.probability}
                                        onChange={e => setDealDraft(d => ({ ...d, probability: Number(e.target.value) }))}
                                        className="mt-2 w-full accent-sky-600" />
                                </div>
                            </div>

                            {/* Forecast preview */}
                            <div className="grid grid-cols-3 gap-2 text-center">
                                <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3">
                                    <div className="text-[10px] uppercase text-slate-400 font-semibold">Pipeline</div>
                                    <div className="text-lg font-bold text-slate-50">
                                        {dealDraft.value ? `${dealDraft.currency === 'USD' ? '$' : ''}${Number(dealDraft.value).toLocaleString()}` : '—'}
                                    </div>
                                </div>
                                <div className="bg-sky-500/10 border border-sky-500/30 rounded-lg p-3">
                                    <div className="text-[10px] uppercase text-sky-300 font-semibold">Взвешенно</div>
                                    <div className="text-lg font-bold text-sky-900">
                                        {dealDraft.value
                                            ? `${dealDraft.currency === 'USD' ? '$' : ''}${Math.round(Number(dealDraft.value) * dealDraft.probability / 100).toLocaleString()}`
                                            : '—'}
                                    </div>
                                </div>
                                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                                    <div className="text-[10px] uppercase text-emerald-300 font-semibold">Скоринг</div>
                                    <div className="text-lg font-bold text-emerald-200">
                                        {lead.score ?? 0}/100
                                    </div>
                                </div>
                            </div>

                            {canEdit && (
                                <div className="flex justify-end pt-2 border-t border-slate-800/60">
                                    <Btn variant="primary" onClick={saveDeal} disabled={savingDeal}>
                                        {savingDeal ? 'Сохранение…' : '💾 Сохранить сделку'}
                                    </Btn>
                                </div>
                            )}

                            {/* Tag picker */}
                            <div className="pt-3 border-t border-slate-800/60">
                                <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-2">🏷 Метки</div>
                                {allTags.length === 0 ? (
                                    <div className="text-sm text-slate-400 italic">Меток пока нет — настройте в админке</div>
                                ) : (
                                    <div className="flex flex-wrap gap-1.5">
                                        {allTags.map(tag => {
                                            const on = leadTags.some(t => t.id === tag.id);
                                            return (
                                                <button key={tag.id} disabled={!canEdit}
                                                    onClick={() => toggleTag(tag)}
                                                    className={`text-xs px-2.5 py-1 rounded-full border transition disabled:opacity-50 ${on ? 'text-white shadow-sm' : 'bg-slate-900/60 backdrop-blur-sm border-slate-700 text-slate-200 hover:bg-slate-800/40'}`}
                                                    style={on ? { backgroundColor: tag.color || '#0ea5e9', borderColor: tag.color || '#0ea5e9' } : undefined}>
                                                    {tag.emoji && <span className="mr-1">{tag.emoji}</span>}
                                                    {tag.label}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {tab === 'tasks' && (
                        <section className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-4 space-y-4">
                            <div className="text-xs uppercase tracking-wider font-semibold text-slate-400">📋 Задачи</div>

                            {canEdit && (
                                <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3 space-y-2">
                                    <input type="text"
                                        placeholder="Что нужно сделать? (например, «Перезвонить в среду»)"
                                        value={newTaskTitle}
                                        onChange={e => setNewTaskTitle(e.target.value)}
                                        className="w-full text-sm border border-slate-700 rounded-lg p-2 bg-slate-900/60 backdrop-blur-sm" />
                                    <div className="flex gap-2 items-end">
                                        <div className="flex-grow">
                                            <label className="text-[10px] text-slate-400 uppercase font-semibold">Срок</label>
                                            <input type="datetime-local"
                                                value={newTaskDue}
                                                onChange={e => setNewTaskDue(e.target.value)}
                                                className="w-full text-sm border border-slate-700 rounded-lg p-2 bg-slate-900/60 backdrop-blur-sm" />
                                        </div>
                                        <Btn variant="primary" onClick={createTask} disabled={!newTaskTitle.trim() || !newTaskDue}>
                                            ＋ Добавить
                                        </Btn>
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                {tasks === null ? (
                                    <div className="text-sm text-slate-400">Загрузка…</div>
                                ) : tasks.length === 0 ? (
                                    <div className="text-sm text-slate-400 italic text-center py-4">Задач пока нет</div>
                                ) : (
                                    tasks.map(t => {
                                        const done = !!t.completed_at;
                                        const due = new Date(t.due_at);
                                        const overdue = !done && due.getTime() < Date.now();
                                        return (
                                            <div key={t.id} className={`flex items-start gap-3 border rounded-lg p-3 ${done ? 'bg-slate-800/40 border-slate-800 opacity-60' : overdue ? 'bg-rose-500/10 border-rose-500/30' : 'bg-slate-900/60 backdrop-blur-sm border-slate-800'}`}>
                                                <button onClick={() => toggleTask(t)}
                                                    className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${done ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-slate-900/60 backdrop-blur-sm border-slate-700 hover:border-emerald-500'}`}>
                                                    {done && '✓'}
                                                </button>
                                                <div className="flex-grow min-w-0">
                                                    <div className={`text-sm font-medium ${done ? 'line-through text-slate-400' : 'text-slate-50'}`}>{t.title}</div>
                                                    <div className="flex items-center gap-2 mt-0.5 text-xs">
                                                        <span className={overdue && !done ? 'text-rose-300 font-semibold' : 'text-slate-400'}>
                                                            ⏰ {formatFull(t.due_at)} {overdue && !done && '— просрочено'}
                                                        </span>
                                                    </div>
                                                </div>
                                                {canEdit && (
                                                    <button onClick={() => deleteTask(t)}
                                                        className="text-slate-400 hover:text-rose-600 text-sm flex-shrink-0" title="Удалить">
                                                        🗑
                                                    </button>
                                                )}
                                            </div>
                                        );
                                    })
                                )}
                            </div>
                        </section>
                    )}

                    {tab === 'files' && (
                        <section className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="text-xs uppercase tracking-wider font-semibold text-slate-400">📎 Документы клиента</div>
                                {canEdit && (
                                    <label className="text-xs bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white px-3 py-1.5 rounded-lg font-semibold cursor-pointer">
                                        {uploadingFile ? '⏳ Загрузка…' : '⬆ Загрузить'}
                                        <input ref={fileInputRef} type="file" className="hidden" onChange={uploadFile} disabled={uploadingFile} />
                                    </label>
                                )}
                            </div>
                            {files === null ? (
                                <div className="text-sm text-slate-400">Загрузка…</div>
                            ) : files.length === 0 ? (
                                <div className="text-sm text-slate-500 italic text-center py-6 border-2 border-dashed border-slate-800 rounded-lg">Документов пока нет — паспорт, диплом, IELTS-сертификат сюда</div>
                            ) : (
                                <div className="space-y-2">
                                    {files.map(f => {
                                        const ext = (f.filename || '').split('.').pop()?.toLowerCase() || '';
                                        const isImg = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(ext);
                                        const icon = isImg ? '🖼' : ext === 'pdf' ? '📕' : ['doc', 'docx'].includes(ext) ? '📘' : ['xls', 'xlsx', 'csv'].includes(ext) ? '📗' : '📄';
                                        return (
                                            <div key={f.id} className="flex items-center gap-3 border border-slate-800 rounded-lg p-3 bg-slate-800/30 hover:bg-slate-800/60 transition">
                                                <span className="text-2xl">{icon}</span>
                                                <div className="flex-grow min-w-0">
                                                    <a href={f.url} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-sky-300 hover:underline truncate block">{f.filename}</a>
                                                    <div className="text-xs text-slate-500">
                                                        {Math.round((f.size || 0) / 1024)} KB · {f.uploaded_by_name || '—'} · {formatRel(f.created_at)}
                                                    </div>
                                                </div>
                                                {canEdit && (
                                                    <button onClick={() => deleteFile(f.id, f.filename)} className="text-slate-500 hover:text-rose-400 text-sm">🗑</button>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    )}

                    {tab === 'audit' && (
                        <section className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-4">
                            <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-3">🕒 Полный аудит-лог</div>
                            {auditEvents === null ? (
                                <div className="text-sm text-slate-400">Загрузка…</div>
                            ) : auditEvents.length === 0 ? (
                                <div className="text-sm text-slate-500 italic text-center py-6">События не зафиксированы</div>
                            ) : (
                                <div className="space-y-2">
                                    {auditEvents.map(e => (
                                        <div key={e.id} className="border-l-2 border-sky-500/40 pl-3 py-1.5">
                                            <div className="text-xs text-slate-500">{formatFull(e.created_at)} · {e.actor_name || '—'} {e.actor_role === 'teamlead' && '👑'}</div>
                                            <div className="text-sm text-slate-200"><span className="font-mono text-sky-300">{e.action}</span></div>
                                            {(e.after_data || e.before_data) && (
                                                <details className="mt-1">
                                                    <summary className="text-[10px] text-slate-500 cursor-pointer hover:text-slate-300">детали</summary>
                                                    <pre className="text-[10px] text-slate-400 bg-slate-950/60 rounded p-2 mt-1 overflow-x-auto">
{JSON.stringify(e.after_data || e.before_data, null, 2)}
                                                    </pre>
                                                </details>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {tab === 'activity' && (
                        <section className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-4">
                            <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-3">📜 История событий</div>
                            <div className="space-y-3">
                                {comments === null ? (
                                    <div className="text-sm text-slate-400">Загрузка…</div>
                                ) : comments.length === 0 ? (
                                    <div className="text-sm text-slate-400 italic">Событий пока нет</div>
                                ) : (
                                    comments.slice().reverse().map(c => (
                                        <div key={c.id} className="flex gap-3">
                                            <Avatar name={c.author_name} size="sm" />
                                            <div className="flex-grow">
                                                <div className="flex items-baseline gap-2 flex-wrap">
                                                    <span className="font-semibold text-sm text-slate-50">{c.author_name}</span>
                                                    {c.author_role === 'teamlead' && <Pill cls="bg-violet-500/20 text-violet-300">тимлид</Pill>}
                                                    <span className="text-xs text-slate-400 ml-auto">{formatRel(c.created_at)}</span>
                                                </div>
                                                <p className="text-sm text-slate-200 whitespace-pre-wrap mt-0.5">{c.body}</p>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                            {canEdit && (
                                <div className="mt-4 pt-4 border-t border-slate-800/60 flex gap-2">
                                    <textarea rows={2}
                                        className="flex-grow text-sm border border-slate-700 rounded-lg bg-slate-800/40 focus:bg-slate-800/80 p-2"
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
                        <section className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-4">
                            <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-3">
                                🔗 Тот же клиент (по телефону или email)
                            </div>
                            {related === null ? (
                                <div className="text-sm text-slate-400">Загрузка…</div>
                            ) : related.length === 0 ? (
                                <div className="text-sm text-slate-400 italic">Других лидов с такими контактами нет</div>
                            ) : (
                                <div className="space-y-2">
                                    {related.map((r: any) => (
                                        <div key={r.id} className="border border-slate-800 rounded-lg p-3 hover:bg-slate-800/40">
                                            <div className="flex items-center gap-3">
                                                <Avatar name={r.name} size="sm" />
                                                <div className="flex-grow min-w-0">
                                                    <div className="text-sm font-medium text-slate-50">{r.name || '— без имени —'} <span className="text-xs text-slate-400">#{r.id}</span></div>
                                                    <div className="text-xs text-slate-400">
                                                        {r.phone && <span className="font-mono">{r.phone}</span>}
                                                        {r.phone && r.email && <span> · </span>}
                                                        {r.email}
                                                    </div>
                                                </div>
                                                <StatusBadge code={r.status_code} label={r.status_label} color={r.status_color} />
                                            </div>
                                            <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400">
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
            </motion.div>
        </motion.div>
    );
};

const Field: React.FC<{ label: string; value?: string | null }> = ({ label, value }) => (
    <div>
        <dt className="text-xs text-slate-400">{label}</dt>
        <dd className={`text-sm ${value ? 'text-slate-50 font-medium' : 'text-slate-400 italic'}`}>{value || '—'}</dd>
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
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto" onClick={onClose}>
            <div className="bg-slate-900/60 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-800 max-w-2xl w-full my-8" onClick={e => e.stopPropagation()}>
                <div className="border-b border-slate-800 px-5 py-4 flex items-center justify-between">
                    <h3 className="text-lg font-bold text-slate-50">📞 Создать лид вручную</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-200 text-2xl leading-none">×</button>
                </div>
                <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {error && <div className="md:col-span-2 bg-rose-500/10 border border-rose-500/30 text-rose-300 p-2 rounded-lg">⚠ {error}</div>}
                    {[
                        ['name', 'Имя', 'Айбек', 'text'], ['phone', 'Телефон', '+996…', 'tel'],
                        ['email', 'Email', 'mail@…', 'email'], ['country', 'Страна', 'США', 'text'],
                        ['desired_university', 'Желаемый ВУЗ', '', 'text'], ['intake_term', 'Когда поступает', 'Осень 2026', 'text'],
                        ['budget', 'Бюджет', '$15k–30k', 'text'], ['english_level', 'Английский', 'B2 / IELTS 6.5', 'text'],
                    ].map(([k, l, ph, t]) => (
                        <label key={k}>
                            <span className="block text-xs text-slate-400 mb-1">{l}</span>
                            <input type={t} className="bg-slate-800/60 text-slate-100 placeholder-slate-500 w-full border border-slate-700 rounded-lg px-3 py-2"
                                placeholder={ph} value={(form as any)[k]} onChange={e => set(k, e.target.value)} />
                        </label>
                    ))}
                    <label className="md:col-span-2">
                        <span className="block text-xs text-slate-400 mb-1">Источник <span className="text-rose-500">*</span></span>
                        <select className="w-full border border-slate-700 rounded-lg px-3 py-2 bg-slate-900/60 backdrop-blur-sm"
                            value={form.source} onChange={e => set('source', e.target.value)}>
                            <option value="">— выберите —</option>
                            {sourceOptions.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </label>
                    {isTeamlead && (
                        <label className="md:col-span-2">
                            <span className="block text-xs text-slate-400 mb-1">Назначить (по умолчанию — себе)</span>
                            <select className="w-full border border-slate-700 rounded-lg px-3 py-2 bg-slate-900/60 backdrop-blur-sm"
                                value={form.assigned_manager_id} onChange={e => set('assigned_manager_id', e.target.value)}>
                                <option value="">— себе —</option>
                                {roster.filter(m => m.role === 'manager' && (m.active !== false) && !m.archived_at).map(m => (
                                    <option key={m.id} value={m.id}>{m.full_name} {m.is_online ? '🟢' : '⚪'}</option>
                                ))}
                            </select>
                        </label>
                    )}
                    <label className="md:col-span-2">
                        <span className="block text-xs text-slate-400 mb-1">Комментарий</span>
                        <textarea rows={2} className="bg-slate-800/60 text-slate-100 placeholder-slate-500 w-full border border-slate-700 rounded-lg px-3 py-2"
                            value={form.comment} onChange={e => set('comment', e.target.value)} />
                    </label>
                </div>
                <div className="border-t border-slate-800 px-5 py-3 flex justify-end gap-2">
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
    <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-4">
        <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-3">👥 Команда — 30 дней</div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left text-xs text-slate-400 border-b border-slate-800">
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
                        <tr key={m.id} className={`border-b border-slate-800/60 ${m.archived_at ? 'opacity-50' : ''}`}>
                            <td className="py-2">
                                <div className="flex items-center gap-2">
                                    <Avatar name={m.full_name} size="sm" />
                                    <div>
                                        <div className="font-medium text-slate-50">
                                            {m.full_name}
                                            {m.role === 'teamlead' && <Pill cls="bg-violet-500/20 text-violet-300 ml-1">тимлид</Pill>}
                                            {m.archived_at && <Pill cls="bg-slate-700 text-slate-300 ml-1">УВОЛЕН</Pill>}
                                        </div>
                                        <div className="text-xs text-slate-400 font-mono">{m.login}</div>
                                    </div>
                                </div>
                            </td>
                            <td className="text-center">
                                {m.archived_at || !m.active ? '⛔'
                                    : m.is_online ? <span className="text-emerald-500">●</span>
                                        : <span className="text-slate-300">○</span>}
                            </td>
                            <td className="text-right font-mono">{m.total30 ?? 0}</td>
                            <td className="text-right font-mono">{m.open ?? 0}</td>
                            <td className="text-right font-mono text-emerald-300">{m.closed30 ?? 0}</td>
                            <td className={`text-right font-mono ${(m.overdue ?? 0) > 0 ? 'text-rose-300 font-bold' : 'text-slate-400'}`}>{m.overdue ?? 0}</td>
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

    // Persisted UI helpers (localStorage)
    const lsGet = <T,>(key: string, fallback: T): T => {
        try { const v = localStorage.getItem('gg.' + key); return v !== null ? JSON.parse(v) as T : fallback; } catch { return fallback; }
    };
    const lsSet = (key: string, value: any) => {
        try { localStorage.setItem('gg.' + key, JSON.stringify(value)); } catch {}
    };

    // View + filters (persisted)
    const [view, setView] = useState<'cards' | 'table' | 'pipeline' | 'stages' | 'calendar'>(() => lsGet('view', 'cards'));
    const [drawerMode, setDrawerMode] = useState<'side' | 'center'>(() => lsGet('drawerMode', 'side'));
    const [calendarData, setCalendarData] = useState<any[]>([]);
    const [scope, setScope] = useState<'mine' | 'all'>(() => lsGet('scope', isTeamlead ? 'all' : 'mine'));
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
    const [inboxZero, setInboxZero] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(() => lsGet('sidebarOpen', true));
    const [bulkMode, setBulkMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

    // Persist preferences
    useEffect(() => lsSet('view', view), [view]);
    useEffect(() => lsSet('drawerMode', drawerMode), [drawerMode]);
    useEffect(() => lsSet('scope', scope), [scope]);
    useEffect(() => lsSet('sidebarOpen', sidebarOpen), [sidebarOpen]);

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

    // Push notification setup (asks for permission once, then subscribes)
    useEffect(() => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
        if (Notification.permission === 'denied') return;
        let cancelled = false;
        (async () => {
            try {
                const reg = await navigator.serviceWorker.ready;
                let perm = Notification.permission;
                if (perm === 'default') perm = await Notification.requestPermission();
                if (perm !== 'granted' || cancelled) return;
                const keyRes = await fetch('/api/lidy/push/vapid-public-key', { credentials: 'include' }).then(r => r.json());
                const vapidKey = keyRes.key;
                if (!vapidKey) return; // VAPID not configured server-side — skip silently
                const sub = await reg.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlBase64ToUint8Array(vapidKey),
                });
                await fetch('/api/lidy/push/subscribe', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({
                        endpoint: sub.endpoint,
                        keys: sub.toJSON().keys,
                        userAgent: navigator.userAgent,
                    }),
                });
            } catch (e) { /* user dismissed / privacy block */ }
        })();
        return () => { cancelled = true; };
    }, []);

    // Apply client-side Inbox-Zero filter (only mine, only "action needed":
    // open AND (overdue OR new with no comment) AND not in transfer-pending state)
    const displayedLeads = useMemo(() => {
        if (!inboxZero) return leads;
        const now = Date.now();
        return leads.filter(l => {
            if (l.processed_at) return false;
            if (l.assigned_manager_id !== manager.id) return false;
            const overdue = l.sla_deadline_at && new Date(l.sla_deadline_at).getTime() < now;
            const isNew = l.status_code === 'new';
            const hasOpenTasks = (l.open_tasks || 0) > 0;
            return overdue || isNew || hasOpenTasks;
        });
    }, [leads, inboxZero, manager.id]);
    useEffect(() => {
        if (!autoRefresh) return;
        const t = window.setInterval(load, 15000);
        return () => window.clearInterval(t);
    }, [autoRefresh, load]);

    // Load calendar data when calendar view active
    useEffect(() => {
        if (view !== 'calendar') return;
        const from = new Date(); from.setHours(0, 0, 0, 0);
        const to = new Date(); to.setDate(to.getDate() + 60); to.setHours(23, 59, 59, 999);
        const p = new URLSearchParams();
        p.set('from', from.toISOString()); p.set('to', to.toISOString());
        if (scope === 'all') p.set('scope', 'all');
        fetch(`/api/lidy/calendar?${p.toString()}`, { credentials: 'include' })
            .then(r => r.ok ? r.json() : { appointments: [] })
            .then(j => setCalendarData(j.appointments || []))
            .catch(() => setCalendarData([]));
    }, [view, scope, lastRefresh]);

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

    // "Мой день" — computed from current leads
    const myDay = useMemo(() => {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const todayEnd = todayStart + 86_400_000;
        let appointmentsToday = 0;
        let hot = 0;
        let openTasksTotal = 0;
        let overdueTasksTotal = 0;
        let pipelineSum = 0;
        let weightedSum = 0;
        let topLead: Lead | null = null;
        for (const l of leads) {
            if (l.assigned_manager_id !== manager.id) continue;
            if (l.appointment_at) {
                const ts = new Date(l.appointment_at).getTime();
                if (ts >= todayStart && ts < todayEnd) appointmentsToday++;
            }
            if ((l.score ?? 0) >= 60) hot++;
            openTasksTotal += l.open_tasks || 0;
            overdueTasksTotal += l.overdue_tasks || 0;
            if (l.deal_value) {
                const v = Number(l.deal_value);
                pipelineSum += v;
                weightedSum += v * (Number(l.deal_probability ?? 30) / 100);
            }
            if (!topLead || (l.score ?? 0) > (topLead.score ?? 0)) topLead = l;
        }
        return { appointmentsToday, hot, openTasksTotal, overdueTasksTotal, pipelineSum, weightedSum, topLead };
    }, [leads, manager.id]);

    const activeFiltersCount = [filterStatus, filterSource, filterCountry, filterUniversity, filterLevel,
        filterManagerId, filterFrom, filterTo].filter(Boolean).length + (overdueOnly ? 1 : 0) + (includeClosed ? 1 : 0);

    const resetFilters = () => {
        setFilterStatus(''); setFilterSource(''); setFilterCountry(''); setFilterUniversity('');
        setFilterLevel(''); setFilterManagerId(''); setFilterFrom(''); setFilterTo('');
        setOverdueOnly(false); setIncludeClosed(false); setSearch('');
    };

    return (
        <div className="min-h-screen flex flex-col relative text-slate-100" style={{ background: 'radial-gradient(ellipse at top, #0f172a 0%, #020617 60%, #000 100%)' }}>
            <div className="fixed inset-0 pointer-events-none opacity-[0.07] z-0" style={{
                backgroundImage: `linear-gradient(rgba(56,189,248,0.4) 1px, transparent 1px),
                                  linear-gradient(90deg, rgba(56,189,248,0.4) 1px, transparent 1px)`,
                backgroundSize: '32px 32px',
            }} />
            {/* Glow orbs */}
            <div className="fixed top-[10%] -left-[5%] w-[400px] h-[400px] rounded-full opacity-15 pointer-events-none z-0" style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.6) 0%, transparent 70%)' }} />
            <div className="fixed bottom-[15%] -right-[5%] w-[400px] h-[400px] rounded-full opacity-10 pointer-events-none z-0" style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.6) 0%, transparent 70%)' }} />

            {/* Top bar */}
            <header className="sticky top-0 z-30 bg-slate-950/85 backdrop-blur-xl border-b border-sky-500/20 shadow-[0_4px_24px_-8px_rgba(56,189,248,0.25)]">
                <div className="max-w-[1600px] mx-auto px-4 py-2.5 flex items-center gap-3">
                    <button onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 hover:bg-slate-800/60 rounded-lg transition" title={sidebarOpen ? 'Свернуть фильтры' : 'Развернуть фильтры'}>
                        <span className="block w-5 h-0.5 bg-slate-300 mb-1" />
                        <span className="block w-5 h-0.5 bg-slate-300 mb-1" />
                        <span className="block w-5 h-0.5 bg-slate-300" />
                    </button>
                    <img src="/ppp.png" alt="" className="h-7 w-auto" />
                    <div className="hidden md:block">
                        <div className="font-bold leading-none bg-gradient-to-r from-sky-400 to-cyan-300 bg-clip-text text-transparent">CRM</div>
                        <div className="text-xs text-slate-400">{manager.full_name}{isTeamlead && ' · тимлид'}</div>
                    </div>
                    {/* Search */}
                    <div className="flex-grow max-w-2xl relative">
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="🔍 Поиск по имени, телефону, email, ВУЗу, комментарию…"
                            className="w-full bg-slate-800/70 hover:bg-slate-800/40 focus:bg-slate-800/80 border border-slate-800 focus:border-sky-500 focus:ring-2 focus:ring-sky-500/30 rounded-xl px-4 py-2 text-sm transition outline-none" />
                        {search && (
                            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200">×</button>
                        )}
                    </div>
                    {/* Actions */}
                    <div className="flex items-center gap-1.5">
                        <button onClick={toggleOnline} disabled={togglingOnline}
                            title={isOnline ? 'Я в сети — лиды распределяются' : 'Я не в сети — лиды не идут'}
                            className={`inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg transition ${isOnline ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20' : 'bg-slate-800/70 text-slate-300 border border-slate-800 hover:bg-slate-700'}`}>
                            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                            <span className="hidden md:inline">{isOnline ? 'В сети' : 'Не в сети'}</span>
                        </button>
                        <button onClick={() => setAutoRefresh(!autoRefresh)}
                            title={autoRefresh ? 'Автообновление вкл (15с)' : 'Автообновление выкл'}
                            className={`p-2 rounded-lg ${autoRefresh ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'bg-slate-900/60 backdrop-blur-sm border border-slate-800 text-slate-300 hover:bg-slate-800/40'}`}>
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
                    <aside className="w-72 flex-shrink-0 bg-slate-900/60 backdrop-blur-sm border-r border-slate-800 p-4 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 56px)' }}>
                        {/* Scope */}
                        {isTeamlead && (
                            <div>
                                <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-2">Просмотр</div>
                                <div className="flex bg-slate-800/70 p-0.5 rounded-lg">
                                    <button onClick={() => setScope('all')}
                                        className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition ${scope === 'all' ? 'bg-slate-900/60 backdrop-blur-sm shadow-sm text-slate-50' : 'text-slate-300 hover:text-slate-50'}`}>
                                        Все
                                    </button>
                                    <button onClick={() => setScope('mine')}
                                        className={`flex-1 px-3 py-1.5 text-sm font-medium rounded-md transition ${scope === 'mine' ? 'bg-slate-900/60 backdrop-blur-sm shadow-sm text-slate-50' : 'text-slate-300 hover:text-slate-50'}`}>
                                        Мои
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Quick filters */}
                        <div>
                            <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-2">Быстрые фильтры</div>
                            <div className="space-y-1.5">
                                <button onClick={() => setInboxZero(!inboxZero)}
                                    className={`w-full text-left text-sm px-3 py-2 rounded-lg transition flex items-center justify-between ${inboxZero ? 'bg-gradient-to-r from-sky-500/20 to-cyan-500/10 text-sky-200 border border-sky-500/40 shadow-[0_0_12px_-4px_rgba(56,189,248,0.4)]' : 'bg-slate-800/40 hover:bg-slate-800/70 text-slate-200'}`}>
                                    <span>📥 Inbox 0 (требует действий)</span>
                                    {inboxZero && <span>✓</span>}
                                </button>
                                <button onClick={() => setOverdueOnly(!overdueOnly)}
                                    className={`w-full text-left text-sm px-3 py-2 rounded-lg transition flex items-center justify-between ${overdueOnly ? 'bg-rose-500/10 text-rose-300 border border-rose-500/30' : 'bg-slate-800/40 hover:bg-slate-800/70 text-slate-200'}`}>
                                    <span>⏰ Просроченные</span>
                                    {overdueOnly && <span>✓</span>}
                                </button>
                                <button onClick={() => setIncludeClosed(!includeClosed)}
                                    className={`w-full text-left text-sm px-3 py-2 rounded-lg transition flex items-center justify-between ${includeClosed ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800/40 hover:bg-slate-800/70 text-slate-200'}`}>
                                    <span>📂 Показать закрытые</span>
                                    {includeClosed && <span>✓</span>}
                                </button>
                                <button onClick={() => { setBulkMode(!bulkMode); setSelectedIds(new Set()); }}
                                    className={`w-full text-left text-sm px-3 py-2 rounded-lg transition flex items-center justify-between ${bulkMode ? 'bg-violet-500/10 text-violet-300 border border-violet-500/30' : 'bg-slate-800/40 hover:bg-slate-800/70 text-slate-200'}`}>
                                    <span>☑️ Массовые действия</span>
                                    {bulkMode && <span>✓</span>}
                                </button>
                            </div>
                        </div>

                        {/* Status filter */}
                        <div>
                            <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-2">Статус</div>
                            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                                className="w-full border border-slate-700 rounded-lg px-3 py-1.5 text-sm bg-slate-900/60 backdrop-blur-sm">
                                <option value="">Все статусы</option>
                                {statuses.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
                            </select>
                        </div>

                        {/* Source */}
                        <div>
                            <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-2">Источник</div>
                            <select value={filterSource} onChange={e => setFilterSource(e.target.value)}
                                className="w-full border border-slate-700 rounded-lg px-3 py-1.5 text-sm bg-slate-900/60 backdrop-blur-sm">
                                <option value="">Все источники</option>
                                {sourceOptions.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>

                        {/* Country */}
                        <div>
                            <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-2">Страна</div>
                            <select value={filterCountry} onChange={e => setFilterCountry(e.target.value)}
                                className="w-full border border-slate-700 rounded-lg px-3 py-1.5 text-sm bg-slate-900/60 backdrop-blur-sm">
                                <option value="">Все страны</option>
                                {uniqueCountries.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>

                        {/* University */}
                        <div>
                            <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-2">Университет</div>
                            <input type="text" value={filterUniversity} onChange={e => setFilterUniversity(e.target.value)}
                                placeholder="Поиск по названию…"
                                className="w-full border border-slate-700 rounded-lg px-3 py-1.5 text-sm bg-slate-900/60 backdrop-blur-sm" />
                        </div>

                        {/* Level */}
                        <div>
                            <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-2">Уровень программы</div>
                            <select value={filterLevel} onChange={e => setFilterLevel(e.target.value)}
                                className="w-full border border-slate-700 rounded-lg px-3 py-1.5 text-sm bg-slate-900/60 backdrop-blur-sm">
                                <option value="">Все уровни</option>
                                {STUDY_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                            </select>
                        </div>

                        {/* Manager filter (teamlead, all scope) */}
                        {isTeamlead && scope === 'all' && (
                            <div>
                                <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-2">Менеджер</div>
                                <select value={filterManagerId} onChange={e => setFilterManagerId(e.target.value)}
                                    className="w-full border border-slate-700 rounded-lg px-3 py-1.5 text-sm bg-slate-900/60 backdrop-blur-sm">
                                    <option value="">Все</option>
                                    {roster.filter(m => m.role === 'manager').map(m => (
                                        <option key={m.id} value={m.id}>{m.full_name}{m.archived_at ? ' (уволен)' : ''}</option>
                                    ))}
                                </select>
                            </div>
                        )}

                        {/* Date range */}
                        <div>
                            <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-2">Дата получения</div>
                            <div className="space-y-1.5">
                                <input type="date" value={filterFrom} onChange={e => setFilterFrom(e.target.value)}
                                    className="w-full border border-slate-700 rounded-lg px-3 py-1.5 text-sm bg-slate-900/60 backdrop-blur-sm" />
                                <input type="date" value={filterTo} onChange={e => setFilterTo(e.target.value)}
                                    className="w-full border border-slate-700 rounded-lg px-3 py-1.5 text-sm bg-slate-900/60 backdrop-blur-sm" />
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
                        <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-3 shadow-sm">
                            <div className="text-xs text-slate-400 uppercase tracking-wider">Всего</div>
                            <div className="text-2xl font-bold text-slate-50 mt-0.5">{counters.total}</div>
                            {lastRefresh && <div className="text-[10px] text-slate-400 mt-1">обн: {new Date(lastRefresh).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}</div>}
                        </div>
                        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 shadow-sm">
                            <div className="text-xs text-amber-300 uppercase tracking-wider">Открытых</div>
                            <div className="text-2xl font-bold text-amber-200 mt-0.5">{counters.open}</div>
                        </div>
                        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-3 shadow-sm">
                            <div className="text-xs text-rose-300 uppercase tracking-wider">Просрочено</div>
                            <div className="text-2xl font-bold text-rose-200 mt-0.5">{counters.overdue}</div>
                        </div>
                        <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 shadow-sm">
                            <div className="text-xs text-orange-300 uppercase tracking-wider">В очереди</div>
                            <div className="text-2xl font-bold text-orange-200 mt-0.5">{counters.queued}</div>
                        </div>
                        <div className={`border rounded-xl p-3 shadow-sm transition ${counters.incoming > 0 ? 'bg-fuchsia-500/10 border-fuchsia-500/40 animate-pulse' : 'bg-slate-800/40 border-slate-800'}`}>
                            <div className="text-xs text-fuchsia-300 uppercase tracking-wider">Передачи мне</div>
                            <div className="text-2xl font-bold text-fuchsia-200 mt-0.5">{counters.incoming}</div>
                        </div>
                    </div>

                    {/* "Мой день" — personal dashboard */}
                    <section className="bg-gradient-to-br from-sky-600 via-sky-700 to-indigo-800 rounded-2xl shadow-xl overflow-hidden text-white">
                        <div className="px-5 py-4 flex items-center justify-between flex-wrap gap-3">
                            <div>
                                <div className="text-xs uppercase tracking-widest text-sky-200 font-bold">
                                    {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
                                </div>
                                <div className="text-xl md:text-2xl font-extrabold mt-0.5">
                                    Доброго дня, {manager.full_name.split(' ')[0]}! 👋
                                </div>
                            </div>
                            <div className="flex gap-2 text-xs">
                                {myDay.overdueTasksTotal > 0 && (
                                    <div className="bg-rose-500/20 border border-rose-500/40 backdrop-blur rounded-lg px-3 py-1.5 font-semibold">
                                        🔥 {myDay.overdueTasksTotal} просрочено
                                    </div>
                                )}
                                {myDay.appointmentsToday > 0 && (
                                    <div className="bg-white/15 border border-white/20 backdrop-blur rounded-lg px-3 py-1.5 font-semibold">
                                        📅 {myDay.appointmentsToday} встреч сегодня
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-5 gap-px bg-white/10">
                            <div className="bg-sky-700/40 backdrop-blur px-4 py-3">
                                <div className="text-[10px] uppercase tracking-wider text-sky-200 font-semibold">📅 Встречи сегодня</div>
                                <div className="text-2xl font-bold mt-1">{myDay.appointmentsToday}</div>
                            </div>
                            <div className="bg-sky-700/40 backdrop-blur px-4 py-3">
                                <div className="text-[10px] uppercase tracking-wider text-sky-200 font-semibold">🔥 Горячих лидов</div>
                                <div className="text-2xl font-bold mt-1">{myDay.hot}</div>
                            </div>
                            <div className="bg-sky-700/40 backdrop-blur px-4 py-3">
                                <div className="text-[10px] uppercase tracking-wider text-sky-200 font-semibold">📋 Открытых задач</div>
                                <div className="text-2xl font-bold mt-1">
                                    {myDay.openTasksTotal}
                                    {myDay.overdueTasksTotal > 0 && (
                                        <span className="text-sm text-rose-200 font-semibold ml-2">({myDay.overdueTasksTotal} ⚠)</span>
                                    )}
                                </div>
                            </div>
                            <div className="bg-sky-700/40 backdrop-blur px-4 py-3">
                                <div className="text-[10px] uppercase tracking-wider text-sky-200 font-semibold">💰 В работе</div>
                                <div className="text-2xl font-bold mt-1">${Math.round(myDay.pipelineSum).toLocaleString()}</div>
                            </div>
                            <div className="bg-emerald-700/40 backdrop-blur px-4 py-3">
                                <div className="text-[10px] uppercase tracking-wider text-emerald-200 font-semibold">🎯 Прогноз</div>
                                <div className="text-2xl font-bold mt-1">${Math.round(myDay.weightedSum).toLocaleString()}</div>
                            </div>
                        </div>
                    </section>

                    {/* Roster (teamlead) */}
                    {isTeamlead && roster.length > 0 && <RosterPanel roster={roster} />}

                    {/* Header bar: results count + view switcher */}
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div className="text-sm text-slate-300">
                            {loading ? 'Загрузка…' : `Найдено: ${leads.length}`}
                            {search.trim() && <span className="ml-2 text-slate-400">по запросу «{search.trim()}»</span>}
                        </div>
                        <div className="flex bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-lg p-0.5 shadow-sm flex-wrap">
                            {[
                                { v: 'cards', l: '🪟 Карточки' },
                                { v: 'table', l: '📋 Таблица' },
                                { v: 'pipeline', l: '🎯 Воронка статусов' },
                                { v: 'stages', l: '🎓 Этапы клиентов' },
                                { v: 'calendar', l: '📅 Календарь' },
                            ].map(o => (
                                <button key={o.v} onClick={() => setView(o.v as any)}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-md transition ${view === o.v ? 'bg-gradient-to-r from-sky-500 to-cyan-500 text-white shadow-[0_0_12px_-2px_rgba(56,189,248,0.5)]' : 'text-slate-300 hover:bg-slate-800/70'}`}>
                                    {o.l}
                                </button>
                            ))}
                        </div>
                    </div>

                    {error && <div className="bg-rose-500/10 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-xl text-sm">⚠ {error}</div>}
                    {!isOnline && (
                        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-200 px-4 py-3 rounded-xl text-sm">
                            ⚪ Вы не в сети — новые лиды не распределяются. Переключите тумблер «Не в сети» в шапке.
                        </div>
                    )}

                    {loading ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {Array.from({ length: 6 }).map((_, i) => <LeadCardSkeleton key={i} />)}
                        </div>
                    ) : displayedLeads.length === 0 ? (
                        <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-8 text-center">
                            <div className="text-5xl mb-3">📭</div>
                            <p className="text-slate-300">
                                {activeFiltersCount > 0 || search ? 'Нет лидов под текущие фильтры' : (scope === 'mine' ? 'У вас пока нет лидов' : 'Лидов пока нет')}
                            </p>
                            {(activeFiltersCount > 0 || search) && (
                                <Btn variant="ghost" onClick={resetFilters} className="mt-3">Сбросить фильтры</Btn>
                            )}
                        </div>
                    ) : view === 'table' ? (
                        <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl overflow-x-auto shadow-sm">
                            <table className="w-full text-sm">
                                <thead className="bg-slate-800/40 text-xs uppercase tracking-wider text-slate-400">
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
                                    {displayedLeads.map(l => <LeadRow key={l.id} lead={l} me={manager} onOpen={() => setOpenLead(l)} />)}
                                </tbody>
                            </table>
                        </div>
                    ) : view === 'pipeline' ? (
                        <PipelineView leads={displayedLeads} statuses={statuses} me={manager} onOpen={l => setOpenLead(l)} onRefresh={load} mode="status" />
                    ) : view === 'stages' ? (
                        <PipelineView leads={displayedLeads} statuses={statuses} me={manager} onOpen={l => setOpenLead(l)} onRefresh={load} mode="stage" />
                    ) : view === 'calendar' ? (
                        <CalendarView appointments={calendarData} onOpen={async (id) => {
                            // Fetch single lead and open drawer
                            const r = await fetch(`/api/lidy/leads/${id}`, { credentials: 'include' });
                            if (r.ok) { const j = await r.json(); setOpenLead(j.lead); }
                        }} />
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                            {displayedLeads.map(l => (
                                <LeadCard key={l.id} lead={l} me={manager}
                                    onOpen={() => setOpenLead(l)}
                                    selectable={bulkMode}
                                    selected={selectedIds.has(l.id)}
                                    onToggleSelect={() => {
                                        const next = new Set(selectedIds);
                                        next.has(l.id) ? next.delete(l.id) : next.add(l.id);
                                        setSelectedIds(next);
                                    }}
                                />
                            ))}
                        </div>
                    )}
                </main>

                {/* Bulk action bar (floating bottom) */}
                {bulkMode && selectedIds.size > 0 && (
                    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 backdrop-blur-xl border border-sky-500/40 rounded-2xl shadow-[0_24px_60px_-12px_rgba(0,0,0,0.8),0_0_40px_-12px_rgba(56,189,248,0.4)] px-4 py-3 flex items-center gap-3 flex-wrap max-w-3xl">
                        <span className="text-sm text-slate-200">
                            Выбрано: <strong className="text-sky-300">{selectedIds.size}</strong>
                        </span>
                        <select onChange={async e => {
                            const code = e.target.value; if (!code) return;
                            await fetch('/api/lidy/leads/bulk', {
                                method: 'POST', headers: { 'Content-Type': 'application/json' },
                                credentials: 'include',
                                body: JSON.stringify({ ids: [...selectedIds], action: 'set_status', payload: { status: code } }),
                            });
                            setSelectedIds(new Set()); load();
                            e.target.value = '';
                        }} className="text-sm bg-slate-800/70 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100">
                            <option value="">→ Сменить статус…</option>
                            {statuses.filter(s => !s.is_client_stage).map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
                        </select>
                        {isTeamlead && (
                            <select onChange={async e => {
                                const mgrId = e.target.value; if (!mgrId) return;
                                await fetch('/api/lidy/leads/bulk', {
                                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                                    credentials: 'include',
                                    body: JSON.stringify({ ids: [...selectedIds], action: 'reassign', payload: { manager_id: Number(mgrId) } }),
                                });
                                setSelectedIds(new Set()); load();
                                e.target.value = '';
                            }} className="text-sm bg-slate-800/70 border border-slate-700 rounded-lg px-3 py-1.5 text-slate-100">
                                <option value="">→ Переназначить…</option>
                                {roster.filter(m => (m.active !== false) && !m.archived_at).map(m => (
                                    <option key={m.id} value={m.id}>{m.full_name}{m.role === 'teamlead' ? ' 👑' : ''}</option>
                                ))}
                            </select>
                        )}
                        <Btn variant="ghost" onClick={() => setSelectedIds(new Set())}>Снять выбор</Btn>
                    </div>
                )}
            </div>

            {/* Drawer */}
            <AnimatePresence>
                {openLead && (
                    <LeadDetailDrawer key={openLead.id} lead={openLead} me={manager} statuses={statuses} roster={roster}
                        sourceOptions={sourceOptions}
                        mode={drawerMode}
                        onToggleMode={() => setDrawerMode(m => m === 'side' ? 'center' : 'side')}
                        onClose={() => setOpenLead(null)} onRefresh={async () => {
                            await load();
                            // Re-fetch the open lead to reflect latest changes
                            const r = await fetch(`/api/lidy/leads/${openLead.id}`, { credentials: 'include' });
                            if (r.ok) { const j = await r.json(); if (j.lead) setOpenLead(j.lead); }
                        }} />
                )}
            </AnimatePresence>

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

    if (checking) return <div className="min-h-screen flex items-center justify-center bg-slate-800/40 text-slate-400">Загрузка…</div>;
    if (!manager) return <LoginScreen onAuthed={setManager} />;

    return <Dashboard manager={manager} onLogout={() => setManager(null)} onMeUpdate={setManager} sourceOptions={sourceOptions} />;
};

export default LidyApp;
