import React, { useEffect, useMemo, useState } from 'react';

// ─────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────
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
    notes?: string;
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
}
interface StatusOption {
    code: string;
    label: string;
    color?: string;
    is_terminal: boolean;
    sort: number;
}

// ─────────────────────────────────────────────────────────────────────
// Brutalist primitives
// ─────────────────────────────────────────────────────────────────────
const SHADOW = 'shadow-[4px_4px_0_0_#0a0a0a]';
const SHADOW_HOVER = 'hover:shadow-[6px_6px_0_0_#0a0a0a] hover:-translate-x-[2px] hover:-translate-y-[2px]';
const BORDER = 'border-2 border-black';
const BTN = `${BORDER} ${SHADOW} ${SHADOW_HOVER} active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all font-bold uppercase tracking-wider text-sm px-4 py-2`;
const CARD = `bg-white ${BORDER} ${SHADOW}`;

const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => (
    <span className="relative inline-flex group">
        {children}
        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-50 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-xs font-mono bg-black text-lime-300 px-2 py-1 border-2 border-black">
            {text}
        </span>
    </span>
);

// ─────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────
const formatRel = (iso: string) => {
    const t = new Date(iso).getTime();
    const diffMin = Math.round((Date.now() - t) / 60000);
    if (diffMin < 1) return 'только что';
    if (diffMin < 60) return `${diffMin} мин`;
    const h = Math.round(diffMin / 60);
    if (h < 24) return `${h} ч`;
    return new Date(iso).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
};

const formatSla = (deadlineIso: string | null, processedIso?: string | null) => {
    if (processedIso) return { text: 'обработан', color: 'bg-emerald-300', textColor: 'text-emerald-900' };
    if (!deadlineIso) return { text: 'в очереди', color: 'bg-orange-300', textColor: 'text-orange-900' };
    const ms = new Date(deadlineIso).getTime() - Date.now();
    if (ms < 0) {
        const overMin = Math.round(-ms / 60000);
        const h = Math.floor(overMin / 60);
        const m = overMin % 60;
        return { text: `Просрочен ${h ? `${h}ч ` : ''}${m}м`, color: 'bg-red-500', textColor: 'text-white' };
    }
    const totalMin = Math.round(ms / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return { text: `${h ? `${h}ч ` : ''}${m}м до SLA`, color: h < 1 ? 'bg-amber-300' : 'bg-cyan-200', textColor: 'text-black' };
};

function whatsappLink(phone: string, msg?: string): string | null {
    const digits = (phone || '').replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) return null;
    return `https://wa.me/${digits}${msg ? `?text=${encodeURIComponent(msg)}` : ''}`;
}

// Countdown helper for transfer expiry
const useCountdown = (targetIso: string | null) => {
    const [now, setNow] = useState(Date.now());
    useEffect(() => {
        if (!targetIso) return;
        const i = window.setInterval(() => setNow(Date.now()), 1000);
        return () => window.clearInterval(i);
    }, [targetIso]);
    if (!targetIso) return null;
    const ms = new Date(targetIso).getTime() - now;
    if (ms <= 0) return '00:00';
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
};

// ─────────────────────────────────────────────────────────────────────
// Login screen — brutalist
// ─────────────────────────────────────────────────────────────────────
const LoginScreen: React.FC<{ onAuthed: (m: Manager) => void }> = ({ onAuthed }) => {
    const [login, setLogin] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const submit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setLoading(true);
        try {
            const res = await fetch('/api/lidy/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ login, password }),
                credentials: 'include',
            });
            const j = await res.json().catch(() => ({}));
            if (!res.ok) setError(j.error || `Ошибка ${res.status}`);
            else onAuthed(j.manager);
        } catch (err: any) {
            setError(err?.message || String(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-lime-300 p-4" style={{ fontFamily: "'Space Grotesk', system-ui" }}>
            <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 24px, rgba(0,0,0,0.05) 24px, rgba(0,0,0,0.05) 25px), repeating-linear-gradient(90deg, transparent, transparent 24px, rgba(0,0,0,0.05) 24px, rgba(0,0,0,0.05) 25px)',
            }} />
            <form onSubmit={submit} className={`relative ${CARD} p-8 w-full max-w-md`}>
                <div className="flex items-center gap-3 mb-6 pb-4 border-b-2 border-black">
                    <img src="/ppp.png" alt="" className="w-12 h-auto" />
                    <div>
                        <h1 className="text-2xl font-black uppercase tracking-tight">GoGlobal CRM</h1>
                        <p className="text-xs font-mono text-slate-500">// LOGIN_REQUIRED</p>
                    </div>
                </div>
                <label className="block text-xs uppercase tracking-widest font-bold text-black mb-1">Логин</label>
                <input
                    type="text" autoFocus autoComplete="username"
                    className={`w-full ${BORDER} bg-yellow-100 px-3 py-3 mb-4 font-mono text-base focus:outline-none focus:bg-white`}
                    value={login} onChange={e => setLogin(e.target.value)}
                />
                <label className="block text-xs uppercase tracking-widest font-bold text-black mb-1">Пароль</label>
                <input
                    type="password" autoComplete="current-password"
                    className={`w-full ${BORDER} bg-yellow-100 px-3 py-3 mb-4 font-mono text-base focus:outline-none focus:bg-white`}
                    value={password} onChange={e => setPassword(e.target.value)}
                />
                {error && (
                    <div className={`${BORDER} bg-red-400 text-black px-3 py-2 mb-4 font-mono text-sm`}>
                        ⚠ {error}
                    </div>
                )}
                <button type="submit" disabled={loading} className={`${BTN} w-full bg-black text-lime-300 disabled:opacity-50`}>
                    {loading ? '⏳ ВХОД...' : '→ ВОЙТИ'}
                </button>
                <p className="text-xs text-slate-600 mt-4 text-center font-mono">Учётка создаётся в /admin</p>
            </form>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────
// Lead card — brutalist
// ─────────────────────────────────────────────────────────────────────
const LeadCard: React.FC<{
    lead: Lead;
    statuses: StatusOption[];
    me: Manager;
    onChangeStatus: (id: number, status: string, note?: string) => Promise<void>;
    roster: RosterManager[];
    onReassign: (leadId: number, newManagerId: number) => Promise<void>;
    onTransfer: (leadId: number, newManagerId: number) => Promise<void>;
    onTransferAccept: (leadId: number) => Promise<void>;
    onTransferReject: (leadId: number) => Promise<void>;
    waMessage: string;
}> = ({ lead, statuses, me, onChangeStatus, roster, onReassign, onTransfer, onTransferAccept, onTransferReject, waMessage }) => {
    const [open, setOpen] = useState(false);
    const [note, setNote] = useState(lead.notes || '');
    const [pendingStatus, setPendingStatus] = useState<string | null>(null);
    const [reassignTo, setReassignTo] = useState<string>('');
    const [transferTo, setTransferTo] = useState<string>('');
    const isTeamlead = me.role === 'teamlead';
    const isOwner = lead.assigned_manager_id === me.id;
    const sla = formatSla(lead.sla_deadline_at, lead.processed_at);
    const wa = lead.phone ? whatsappLink(lead.phone, waMessage) : null;
    const isProcessed = !!lead.processed_at;
    const isQueued = !lead.assigned_manager_id;

    // Pending transfer state
    const transferDeadlineIso = lead.pending_transfer_at
        ? new Date(new Date(lead.pending_transfer_at).getTime() + 10 * 60_000).toISOString()
        : null;
    const transferCountdown = useCountdown(transferDeadlineIso);
    const isIncomingTransfer = lead.pending_transfer_to_id === me.id;
    const isOutgoingTransfer = !!lead.pending_transfer_to_id && lead.pending_transfer_to_id !== me.id;

    const statusColor = lead.status_color || '#3b82f6';

    return (
        <div className={`${CARD} relative overflow-hidden`}>
            {/* Top row: status block + assignee + sla */}
            <div className="grid grid-cols-[auto_1fr_auto] border-b-2 border-black">
                {/* ID block */}
                <div className="bg-black text-lime-300 px-4 py-3 font-mono font-bold flex items-center border-r-2 border-black">
                    #{lead.id}
                </div>
                {/* Status + processed badge */}
                <div className="px-3 py-2 flex items-center gap-2 flex-wrap min-w-0">
                    <span
                        className="text-xs font-bold uppercase tracking-wider px-2 py-1 border-2 border-black text-white"
                        style={{ backgroundColor: statusColor }}
                    >
                        {lead.status_label || lead.status_code}
                    </span>
                    {isProcessed ? (
                        <Tooltip text="Лид закрыт менеджером">
                            <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 border-2 border-black bg-emerald-400 text-black">
                                ✓ Обработан
                            </span>
                        </Tooltip>
                    ) : (
                        <Tooltip text="Лид ещё в работе или не взят">
                            <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 border-2 border-black bg-amber-300 text-black">
                                ⏳ Не обработан
                            </span>
                        </Tooltip>
                    )}
                    {/* Assignee badge */}
                    {lead.manager_name ? (
                        <Tooltip text={`Назначен на ${lead.manager_name}${lead.manager_archived_at ? ' (уволен)' : ''}`}>
                            <span className={`text-xs font-bold px-2 py-1 border-2 border-black ${lead.manager_archived_at ? 'bg-slate-300 line-through text-slate-700' : 'bg-cyan-200 text-black'}`}>
                                👤 {lead.manager_name}{lead.manager_archived_at && ' (уволен)'}
                            </span>
                        </Tooltip>
                    ) : (
                        <span className="text-xs font-bold px-2 py-1 border-2 border-black bg-orange-400 text-black">
                            ⏳ Без менеджера
                        </span>
                    )}
                    {wa && (
                        <Tooltip text="Открыть WhatsApp клиента">
                            <a href={wa} target="_blank" rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="text-xs font-bold px-2 py-1 border-2 border-black bg-[#25D366] text-black hover:bg-[#1eba56]">
                                💬 WA
                            </a>
                        </Tooltip>
                    )}
                </div>
                {/* SLA right */}
                <div className={`px-4 py-2 flex flex-col items-end justify-center border-l-2 border-black ${sla.color} ${sla.textColor}`}>
                    <span className="font-mono text-xs uppercase">{sla.text}</span>
                    <span className="font-mono text-[10px] opacity-70">{formatRel(lead.received_at)}</span>
                </div>
            </div>

            {/* Pending transfer banners */}
            {isIncomingTransfer && (
                <div className="bg-fuchsia-300 border-b-2 border-black px-4 py-3 flex items-center justify-between gap-3">
                    <div>
                        <div className="font-bold text-sm">🤝 ВАМ ПЕРЕДАЛИ ЛИД от {lead.pending_transfer_by_name}</div>
                        <div className="font-mono text-xs">Решите за <strong>{transferCountdown}</strong> или вернётся обратно</div>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={() => onTransferAccept(lead.id)} className={`${BTN} bg-emerald-400 text-black`}>
                            ✓ Принять
                        </button>
                        <button onClick={() => onTransferReject(lead.id)} className={`${BTN} bg-red-400 text-black`}>
                            ✗ Отказать
                        </button>
                    </div>
                </div>
            )}
            {isOutgoingTransfer && (
                <div className="bg-violet-300 border-b-2 border-black px-4 py-3 flex items-center justify-between gap-3">
                    <div className="font-mono text-xs">
                        ⏱ Передан <strong>{lead.pending_transfer_to_name}</strong> — ждёт принятия (<strong>{transferCountdown}</strong>)
                    </div>
                    {(isOwner || isTeamlead) && (
                        <button onClick={() => onTransferReject(lead.id)} className={`${BTN} bg-white text-black`}>
                            ↩ Отменить
                        </button>
                    )}
                </div>
            )}

            {/* Main content */}
            <div className="p-4 cursor-pointer" onClick={() => setOpen(!open)}>
                <div className="font-bold text-lg mb-1">{lead.name || '— без имени —'}</div>
                <div className="text-sm text-slate-700 flex flex-wrap gap-x-4 gap-y-1 font-mono">
                    {lead.phone && (
                        <a href={`tel:${lead.phone}`} className="hover:underline" onClick={e => e.stopPropagation()}>
                            📞 {lead.phone}
                        </a>
                    )}
                    {lead.email && (
                        <a href={`mailto:${lead.email}`} className="hover:underline" onClick={e => e.stopPropagation()}>
                            ✉ {lead.email}
                        </a>
                    )}
                    {lead.country && <span>🌍 {lead.country}</span>}
                </div>
                {lead.comment && !open && (
                    <p className="text-sm text-slate-600 mt-2 truncate">💬 {lead.comment}</p>
                )}
                <button className="text-xs font-mono text-slate-500 mt-2 hover:underline">
                    {open ? '▲ свернуть' : '▼ развернуть для действий'}
                </button>
            </div>

            {open && (
                <div className="border-t-2 border-black bg-yellow-50 p-4 space-y-4">
                    {lead.comment && (
                        <div>
                            <div className="text-xs font-bold uppercase tracking-widest mb-1">💬 Комментарий клиента</div>
                            <p className={`text-sm ${BORDER} bg-white p-3`}>{lead.comment}</p>
                        </div>
                    )}

                    <div>
                        <div className="text-xs font-bold uppercase tracking-widest mb-1">📝 Заметка менеджера</div>
                        <textarea
                            className={`w-full text-sm ${BORDER} bg-white p-2`}
                            rows={2}
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            placeholder="Внутренняя заметка..."
                        />
                    </div>

                    {/* Status buttons */}
                    {(isOwner || isTeamlead || isQueued) && !isIncomingTransfer && (
                        <div>
                            <div className="text-xs font-bold uppercase tracking-widest mb-2">🎯 Сменить статус</div>
                            <div className="flex flex-wrap gap-2">
                                {statuses.map(s => (
                                    <Tooltip key={s.code} text={s.is_terminal ? 'Закрывает лид (обработан)' : 'Промежуточный статус'}>
                                        <button
                                            type="button"
                                            disabled={pendingStatus !== null}
                                            onClick={async () => {
                                                setPendingStatus(s.code);
                                                try { await onChangeStatus(lead.id, s.code, note); }
                                                finally { setPendingStatus(null); }
                                            }}
                                            className={`${BORDER} ${SHADOW} ${SHADOW_HOVER} active:shadow-none active:translate-x-[4px] active:translate-y-[4px] transition-all text-xs font-bold uppercase tracking-wider px-3 py-1.5 ${lead.status_code === s.code ? 'text-white' : 'bg-white text-black'}`}
                                            style={lead.status_code === s.code ? { backgroundColor: s.color || '#3b82f6' } : undefined}
                                        >
                                            {pendingStatus === s.code ? '...' : s.label}
                                            {s.is_terminal && ' ✓'}
                                        </button>
                                    </Tooltip>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Manager-to-manager transfer (any manager who owns it) */}
                    {isOwner && !lead.pending_transfer_to_id && (
                        <div>
                            <div className="text-xs font-bold uppercase tracking-widest mb-2">🤝 Передать другому менеджеру (10 мин на принятие)</div>
                            <div className="flex gap-2">
                                <select className={`${BORDER} bg-white px-2 py-1.5 text-sm flex-grow font-mono`}
                                    value={transferTo} onChange={e => setTransferTo(e.target.value)}>
                                    <option value="">— выбрать менеджера —</option>
                                    {roster.filter(m => m.role === 'manager' && m.active && !m.archived_at && m.id !== me.id).map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.full_name} {m.is_online ? '🟢' : '⚪'}
                                        </option>
                                    ))}
                                </select>
                                <button type="button" disabled={!transferTo}
                                    onClick={async () => {
                                        await onTransfer(lead.id, Number(transferTo));
                                        setTransferTo('');
                                    }}
                                    className={`${BTN} bg-fuchsia-400 text-black disabled:opacity-30`}>
                                    🤝 Передать
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Teamlead-only: hard reassign */}
                    {isTeamlead && (
                        <div className="border-t-2 border-dashed border-black pt-3">
                            <div className="text-xs font-bold uppercase tracking-widest mb-2">🔄 Переназначить (тимлид, без подтверждения)</div>
                            <div className="flex gap-2">
                                <select className={`${BORDER} bg-white px-2 py-1.5 text-sm flex-grow font-mono`}
                                    value={reassignTo} onChange={e => setReassignTo(e.target.value)}>
                                    <option value="">— выбрать менеджера —</option>
                                    {roster.filter(m => m.role === 'manager' && m.active && !m.archived_at && m.id !== lead.assigned_manager_id).map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.full_name} {m.is_online ? '🟢' : '⚪'}
                                        </option>
                                    ))}
                                </select>
                                <button type="button" disabled={!reassignTo}
                                    onClick={async () => {
                                        await onReassign(lead.id, Number(reassignTo));
                                        setReassignTo('');
                                    }}
                                    className={`${BTN} bg-violet-400 text-black disabled:opacity-30`}>
                                    🔄 Передать
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────
// Roster panel for teamlead — bento style
// ─────────────────────────────────────────────────────────────────────
const RosterPanel: React.FC<{ roster: RosterManager[] }> = ({ roster }) => (
    <div className={`${CARD} p-4`}>
        <div className="text-xs font-black uppercase tracking-widest mb-3 flex items-center gap-2">
            <span className="bg-black text-lime-300 px-2 py-0.5 font-mono">TEAM</span> за 30 дней
        </div>
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-left border-b-2 border-black bg-yellow-100">
                        <th className="py-2 px-2 text-xs font-black uppercase">Менеджер</th>
                        <th className="text-center text-xs font-black uppercase px-2">Статус</th>
                        <th className="text-right text-xs font-black uppercase px-2">Всего</th>
                        <th className="text-right text-xs font-black uppercase px-2">Откр</th>
                        <th className="text-right text-xs font-black uppercase px-2">Закр</th>
                        <th className="text-right text-xs font-black uppercase px-2">SLA✗</th>
                    </tr>
                </thead>
                <tbody>
                    {roster.map(m => (
                        <tr key={m.id} className={`border-b border-black/20 ${m.archived_at ? 'bg-slate-200/50' : ''}`}>
                            <td className="py-2 px-2">
                                <div className="font-bold flex items-center gap-1">
                                    {m.full_name}
                                    {m.role === 'teamlead' && <span className="text-[10px] bg-violet-400 px-1.5 border border-black">тимлид</span>}
                                    {m.archived_at && <span className="text-[10px] bg-slate-400 text-white px-1.5 border border-black">УВОЛЕН</span>}
                                </div>
                                <div className="text-xs font-mono text-slate-500">{m.login}</div>
                            </td>
                            <td className="text-center px-2">
                                {m.archived_at ? <span title="Уволен">⛔</span>
                                    : !m.active ? <span title="Деактивирован">⛔</span>
                                        : m.is_online ? <span className="inline-flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded-full inline-block"></span></span>
                                            : <span className="inline-flex items-center gap-1"><span className="w-2 h-2 bg-slate-300 rounded-full inline-block"></span></span>}
                            </td>
                            <td className="text-right px-2 font-mono font-bold">{m.total30 ?? 0}</td>
                            <td className="text-right px-2 font-mono">{m.open ?? 0}</td>
                            <td className="text-right px-2 font-mono text-emerald-700">{m.closed30 ?? 0}</td>
                            <td className={`text-right px-2 font-mono ${(m.overdue ?? 0) > 0 ? 'text-red-700 font-black' : 'text-slate-400'}`}>{m.overdue ?? 0}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

// ─────────────────────────────────────────────────────────────────────
// Dashboard
// ─────────────────────────────────────────────────────────────────────
const Dashboard: React.FC<{ manager: Manager; onLogout: () => void; onMeUpdate: (m: Manager) => void; waMessage: string }> = ({ manager, onLogout, onMeUpdate, waMessage }) => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [statuses, setStatuses] = useState<StatusOption[]>([]);
    const [roster, setRoster] = useState<RosterManager[]>([]);
    const isTeamlead = manager.role === 'teamlead';
    const [scope, setScope] = useState<'mine' | 'all'>(isTeamlead ? 'all' : 'mine');
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [overdueOnly, setOverdueOnly] = useState(false);
    const [filterManagerId, setFilterManagerId] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [togglingOnline, setTogglingOnline] = useState(false);
    const isOnline = manager.is_online !== false;

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (scope === 'all') params.set('scope', 'all');
            if (filterStatus) params.set('status', filterStatus);
            if (overdueOnly) params.set('overdue', '1');
            if (filterManagerId) params.set('manager_id', filterManagerId);
            const [leadsRes, stRes, rosterRes] = await Promise.all([
                fetch(`/api/lidy/leads?${params.toString()}`, { credentials: 'include' }),
                fetch('/api/lidy/statuses', { credentials: 'include' }),
                fetch('/api/lidy/managers', { credentials: 'include' }),
            ]);
            if (!leadsRes.ok) throw new Error(`Leads HTTP ${leadsRes.status}`);
            const lj = await leadsRes.json();
            const sj = await stRes.json();
            const rj = await rosterRes.json();
            setLeads(lj.leads || []);
            setStatuses(sj.statuses || []);
            setRoster(rj.managers || []);
        } catch (e: any) {
            setError(e?.message || String(e));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [scope, filterStatus, overdueOnly, filterManagerId]);
    useEffect(() => {
        const t = window.setInterval(load, 15000);
        return () => window.clearInterval(t);
    }, [scope, filterStatus, overdueOnly, filterManagerId]);

    const onChangeStatus = async (id: number, status: string, note?: string) => {
        const res = await fetch(`/api/lidy/leads/${id}/status`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            credentials: 'include', body: JSON.stringify({ status, note }),
        });
        if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            alert('Ошибка: ' + (j.error || res.status));
        } else await load();
    };
    const onReassign = async (leadId: number, mgrId: number) => {
        const res = await fetch(`/api/lidy/leads/${leadId}/reassign`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            credentials: 'include', body: JSON.stringify({ manager_id: mgrId }),
        });
        if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            alert('Ошибка: ' + (j.error || res.status));
        } else await load();
    };
    const onTransfer = async (leadId: number, mgrId: number) => {
        const res = await fetch(`/api/lidy/leads/${leadId}/transfer`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            credentials: 'include', body: JSON.stringify({ manager_id: mgrId }),
        });
        if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            alert('Ошибка: ' + (j.error || res.status));
        } else await load();
    };
    const onTransferAccept = async (leadId: number) => {
        const res = await fetch(`/api/lidy/leads/${leadId}/transfer/accept`, {
            method: 'POST', credentials: 'include',
        });
        if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            alert('Ошибка: ' + (j.error || res.status));
        } else await load();
    };
    const onTransferReject = async (leadId: number) => {
        const res = await fetch(`/api/lidy/leads/${leadId}/transfer/reject`, {
            method: 'POST', credentials: 'include',
        });
        if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            alert('Ошибка: ' + (j.error || res.status));
        } else await load();
    };

    const toggleOnline = async () => {
        setTogglingOnline(true);
        try {
            const res = await fetch('/api/lidy/me/status', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                credentials: 'include', body: JSON.stringify({ is_online: !isOnline }),
            });
            const j = await res.json().catch(() => ({}));
            if (res.ok) {
                onMeUpdate({ ...manager, is_online: j.manager?.is_online });
                if (j.redistribution?.assigned > 0) {
                    alert(`Распределено ${j.redistribution.assigned} ожидавших лидов`);
                }
                await load();
            } else alert('Ошибка: ' + (j.error || res.status));
        } finally {
            setTogglingOnline(false);
        }
    };

    const counters = useMemo(() => {
        const total = leads.length;
        const open = leads.filter(l => !l.processed_at).length;
        const overdue = leads.filter(l => !l.processed_at && l.sla_deadline_at && new Date(l.sla_deadline_at).getTime() < Date.now()).length;
        const queued = leads.filter(l => !l.assigned_manager_id).length;
        const incomingTransfers = leads.filter(l => l.pending_transfer_to_id === manager.id).length;
        return { total, open, overdue, queued, incomingTransfers };
    }, [leads, manager.id]);

    return (
        <div className="min-h-screen bg-yellow-50" style={{ fontFamily: "'Space Grotesk', system-ui" }}>
            {/* Subtle grid background */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.06]" style={{
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 30px, #000 30px, #000 31px), repeating-linear-gradient(90deg, transparent, transparent 30px, #000 30px, #000 31px)',
            }} />

            {/* Header */}
            <div className="sticky top-0 z-30 bg-black text-lime-300 border-b-4 border-black">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-3">
                        <img src="/ppp.png" alt="" className="h-9 w-auto invert" />
                        <div>
                            <div className="font-black tracking-tight text-lg flex items-center gap-2">
                                CRM
                                {isTeamlead && <span className="text-[10px] bg-fuchsia-400 text-black px-2 py-0.5 border-2 border-lime-300 font-mono uppercase">TEAMLEAD</span>}
                            </div>
                            <div className="text-xs font-mono opacity-70">{manager.full_name} · @{manager.login}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Tooltip text={isOnline ? 'Лиды распределяются на меня. Нажми чтобы выйти из распределения.' : 'Лиды НЕ распределяются. Нажми чтобы вернуться в работу.'}>
                            <button onClick={toggleOnline} disabled={togglingOnline}
                                className={`${BTN} flex items-center gap-2 ${isOnline ? 'bg-lime-300 text-black' : 'bg-slate-300 text-black'}`}>
                                <span className={`w-2 h-2 ${isOnline ? 'bg-emerald-600 animate-pulse' : 'bg-slate-600'}`} />
                                {togglingOnline ? '...' : isOnline ? 'В СЕТИ' : 'НЕ В СЕТИ'}
                            </button>
                        </Tooltip>
                        <Tooltip text="Обновить список вручную">
                            <button onClick={load} className={`${BTN} bg-cyan-300 text-black`}>↻</button>
                        </Tooltip>
                        <Tooltip text="Выйти из аккаунта">
                            <button onClick={async () => {
                                await fetch('/api/lidy/logout', { method: 'POST', credentials: 'include' });
                                onLogout();
                            }} className={`${BTN} bg-red-400 text-black`}>EXIT</button>
                        </Tooltip>
                    </div>
                </div>
            </div>

            <div className="relative max-w-7xl mx-auto p-4 space-y-4">
                {/* Bento KPI grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                    <div className={`${CARD} bg-white p-3`}>
                        <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">Всего</div>
                        <div className="text-3xl font-black font-mono">{counters.total}</div>
                    </div>
                    <div className={`${CARD} bg-amber-300 p-3`}>
                        <div className="text-[10px] font-black uppercase tracking-widest">Открытых</div>
                        <div className="text-3xl font-black font-mono">{counters.open}</div>
                    </div>
                    <div className={`${CARD} bg-red-400 p-3`}>
                        <div className="text-[10px] font-black uppercase tracking-widest text-white">Просрочено</div>
                        <div className="text-3xl font-black font-mono text-white">{counters.overdue}</div>
                    </div>
                    <div className={`${CARD} bg-orange-300 p-3`}>
                        <div className="text-[10px] font-black uppercase tracking-widest">В очереди</div>
                        <div className="text-3xl font-black font-mono">{counters.queued}</div>
                    </div>
                    <div className={`${CARD} ${counters.incomingTransfers > 0 ? 'bg-fuchsia-400 animate-pulse' : 'bg-slate-200'} p-3`}>
                        <div className="text-[10px] font-black uppercase tracking-widest">Передачи мне</div>
                        <div className="text-3xl font-black font-mono">{counters.incomingTransfers}</div>
                    </div>
                </div>

                {/* Filters */}
                <div className={`${CARD} bg-white p-4 flex flex-wrap items-center gap-2`}>
                    {isTeamlead && (
                        <>
                            <Tooltip text="Все лиды команды">
                                <button className={`${BTN} ${scope === 'all' ? 'bg-black text-lime-300' : 'bg-white text-black'}`} onClick={() => setScope('all')}>ВСЕ</button>
                            </Tooltip>
                            <Tooltip text="Только мои лиды">
                                <button className={`${BTN} ${scope === 'mine' ? 'bg-black text-lime-300' : 'bg-white text-black'}`} onClick={() => setScope('mine')}>МОИ</button>
                            </Tooltip>
                        </>
                    )}
                    <Tooltip text="Показать только просроченные">
                        <button className={`${BTN} ${overdueOnly ? 'bg-red-500 text-white' : 'bg-white text-black'}`} onClick={() => setOverdueOnly(!overdueOnly)}>⏰ ПРОСРОЧЕНЫ</button>
                    </Tooltip>
                    <select className={`${BORDER} bg-white px-3 py-2 text-sm font-mono`}
                        value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                        <option value="">Все статусы</option>
                        {statuses.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
                    </select>
                    {isTeamlead && scope === 'all' && (
                        <select className={`${BORDER} bg-white px-3 py-2 text-sm font-mono`}
                            value={filterManagerId} onChange={e => setFilterManagerId(e.target.value)}>
                            <option value="">Все менеджеры</option>
                            {roster.filter(m => m.role === 'manager').map(m => (
                                <option key={m.id} value={m.id}>{m.full_name}{m.archived_at ? ' (уволен)' : ''}</option>
                            ))}
                        </select>
                    )}
                </div>

                {/* Roster panel for teamlead */}
                {isTeamlead && roster.length > 0 && <RosterPanel roster={roster} />}

                {error && (
                    <div className={`${CARD} bg-red-400 text-black p-3 font-mono text-sm`}>⚠ {error}</div>
                )}
                {!isOnline && (
                    <div className={`${CARD} bg-orange-300 text-black p-3 font-mono text-sm`}>
                        ⚪ Вы помечены как «не в сети» — новые лиды не распределяются. Кнопка вверху чтобы вернуться.
                    </div>
                )}

                {loading ? (
                    <p className="text-center py-8 font-mono">// LOADING...</p>
                ) : leads.length === 0 ? (
                    <div className={`${CARD} bg-white p-8 text-center`}>
                        <div className="text-6xl mb-3">📭</div>
                        <p className="font-mono text-slate-600">{scope === 'mine' ? '// NO_LEADS_ASSIGNED' : '// NO_LEADS_FOUND'}</p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {leads.map(l => (
                            <LeadCard key={l.id} lead={l} statuses={statuses} me={manager}
                                onChangeStatus={onChangeStatus}
                                roster={roster}
                                onReassign={onReassign}
                                onTransfer={onTransfer}
                                onTransferAccept={onTransferAccept}
                                onTransferReject={onTransferReject}
                                waMessage={waMessage} />
                        ))}
                    </div>
                )}

                <p className="text-center text-xs font-mono text-slate-500 pt-4">
                    // AUTO_REFRESH every 15s · build {new Date().toISOString().slice(0, 10)}
                </p>
            </div>
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────
// Top-level
// ─────────────────────────────────────────────────────────────────────
const LidyApp: React.FC = () => {
    const [manager, setManager] = useState<Manager | null>(null);
    const [checking, setChecking] = useState(true);
    const [waMessage] = useState('Здравствуйте! Это GoGlobal по вашей заявке.');

    const checkSession = async () => {
        try {
            const res = await fetch('/api/lidy/me', { credentials: 'include' });
            if (res.ok) {
                const j = await res.json();
                setManager(j.manager);
            } else setManager(null);
        } catch { setManager(null); }
        finally { setChecking(false); }
    };

    useEffect(() => { checkSession(); }, []);

    if (checking) {
        return <div className="min-h-screen flex items-center justify-center bg-lime-300 font-mono">// LOADING...</div>;
    }

    if (!manager) return <LoginScreen onAuthed={setManager} />;

    return (
        <Dashboard manager={manager} onLogout={() => setManager(null)} onMeUpdate={setManager} waMessage={waMessage} />
    );
};

export default LidyApp;
