import React, { useEffect, useMemo, useState } from 'react';

interface Manager {
    id: number;
    login: string;
    full_name: string;
    telegram_tag?: string | null;
    role?: 'manager' | 'teamlead';
    is_online?: boolean;
    active?: boolean;
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
    assigned_manager_id?: number;
}

interface StatusOption {
    code: string;
    label: string;
    color?: string;
    is_terminal: boolean;
    sort: number;
}

const formatRel = (iso: string) => {
    const t = new Date(iso).getTime();
    const diffMin = Math.round((Date.now() - t) / 60000);
    if (diffMin < 1) return 'только что';
    if (diffMin < 60) return `${diffMin} мин назад`;
    const h = Math.round(diffMin / 60);
    if (h < 24) return `${h} ч назад`;
    return new Date(iso).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' });
};

const formatSla = (deadlineIso: string | null, processedIso?: string | null) => {
    if (processedIso) return { text: 'обработан', color: 'text-emerald-600' };
    if (!deadlineIso) return { text: 'в очереди — нет онлайн', color: 'text-orange-600 font-medium' };
    const ms = new Date(deadlineIso).getTime() - Date.now();
    if (ms < 0) {
        const overMin = Math.round(-ms / 60000);
        const h = Math.floor(overMin / 60);
        const m = overMin % 60;
        return { text: `просрочен ${h ? `${h}ч ` : ''}${m}м`, color: 'text-red-600 font-bold' };
    }
    const totalMin = Math.round(ms / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    return { text: `${h ? `${h}ч ` : ''}${m}м до SLA`, color: h < 1 ? 'text-orange-600 font-medium' : 'text-slate-600' };
};

function whatsappLink(phone: string, msg?: string): string | null {
    const digits = (phone || '').replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) return null;
    return `https://wa.me/${digits}${msg ? `?text=${encodeURIComponent(msg)}` : ''}`;
}

// =====================================================================
// Login screen
// =====================================================================
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
            if (!res.ok) {
                setError(j.error || `Ошибка ${res.status}`);
            } else {
                onAuthed(j.manager);
            }
        } catch (err: any) {
            setError(err?.message || String(err));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50">
            <form onSubmit={submit} className="bg-white p-8 rounded-2xl shadow-xl w-96 border border-slate-100">
                <div className="flex items-center gap-3 mb-6">
                    <img src="/ppp.png" alt="" className="w-12 h-auto" />
                    <div>
                        <h2 className="text-xl font-bold text-slate-900">GoGlobal CRM</h2>
                        <p className="text-xs text-slate-500">Вход для менеджера</p>
                    </div>
                </div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Логин</label>
                <input
                    type="text"
                    autoFocus
                    autoComplete="username"
                    className="w-full p-3 border border-slate-300 rounded-lg mb-3 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    value={login}
                    onChange={e => setLogin(e.target.value)}
                />
                <label className="block text-sm font-medium text-slate-700 mb-1">Пароль</label>
                <input
                    type="password"
                    autoComplete="current-password"
                    className="w-full p-3 border border-slate-300 rounded-lg mb-4 focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                />
                {error && <p className="text-red-600 text-sm mb-3">{error}</p>}
                <button
                    type="submit"
                    disabled={loading}
                    className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium py-3 rounded-lg transition-colors"
                >
                    {loading ? 'Вход...' : 'Войти'}
                </button>
                <p className="text-xs text-slate-400 mt-4 text-center">
                    Учётка создаётся в админ-панели сайта
                </p>
            </form>
        </div>
    );
};

// =====================================================================
// Lead card
// =====================================================================
const LeadCard: React.FC<{
    lead: Lead;
    statuses: StatusOption[];
    onChangeStatus: (id: number, status: string, note?: string) => Promise<void>;
    isTeamlead: boolean;
    roster: RosterManager[];
    onReassign: (leadId: number, newManagerId: number) => Promise<void>;
    waMessage: string;
}> = ({ lead, statuses, onChangeStatus, isTeamlead, roster, onReassign, waMessage }) => {
    const [open, setOpen] = useState(false);
    const [note, setNote] = useState(lead.notes || '');
    const [pendingStatus, setPendingStatus] = useState<string | null>(null);
    const [reassignTo, setReassignTo] = useState<string>('');
    const sla = formatSla(lead.sla_deadline_at, lead.processed_at);
    const statusColor = lead.status_color || '#3b82f6';
    const wa = lead.phone ? whatsappLink(lead.phone, waMessage) : null;

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div
                className="p-4 cursor-pointer flex items-start justify-between gap-4 hover:bg-slate-50 transition-colors"
                onClick={() => setOpen(!open)}
            >
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs font-mono text-slate-400">#{lead.id}</span>
                        <span className="font-semibold text-slate-900">{lead.name || '— без имени —'}</span>
                        <span
                            className="text-xs px-2 py-0.5 rounded-full font-medium text-white"
                            style={{ backgroundColor: statusColor }}
                        >
                            {lead.status_label || lead.status_code}
                        </span>
                        {wa && (
                            <a
                                href={wa}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={e => e.stopPropagation()}
                                className="text-xs px-2 py-0.5 rounded-full font-medium bg-[#25D366] text-white hover:bg-[#20bd5a] inline-flex items-center gap-1"
                                title="Написать в WhatsApp"
                            >
                                💬 WhatsApp
                            </a>
                        )}
                        {isTeamlead && lead.manager_name && (
                            <span className="text-xs text-slate-500 italic">→ {lead.manager_name}</span>
                        )}
                        {!lead.manager_name && (
                            <span className="text-xs text-orange-600 italic">⏳ ждёт менеджера</span>
                        )}
                    </div>
                    <div className="text-sm text-slate-600 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                        {lead.phone && <span>📞 <a href={`tel:${lead.phone}`} className="text-brand-600 hover:underline" onClick={e => e.stopPropagation()}>{lead.phone}</a></span>}
                        {lead.email && <span>✉️ <a href={`mailto:${lead.email}`} className="text-brand-600 hover:underline" onClick={e => e.stopPropagation()}>{lead.email}</a></span>}
                        {lead.country && <span>🌍 {lead.country}</span>}
                    </div>
                    {lead.comment && !open && (
                        <p className="text-sm text-slate-500 mt-1 truncate">💬 {lead.comment}</p>
                    )}
                </div>
                <div className="text-right text-xs whitespace-nowrap flex-shrink-0">
                    <div className="text-slate-500">{formatRel(lead.received_at)}</div>
                    <div className={`mt-1 ${sla.color}`}>⏱ {sla.text}</div>
                </div>
            </div>

            {open && (
                <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-3 bg-slate-50">
                    {lead.comment && (
                        <div>
                            <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Комментарий клиента</div>
                            <p className="text-sm text-slate-700 bg-white p-3 rounded border border-slate-200">{lead.comment}</p>
                        </div>
                    )}

                    <div>
                        <div className="text-xs uppercase tracking-wide text-slate-500 mb-1">Заметка менеджера</div>
                        <textarea
                            className="w-full text-sm p-2 border border-slate-300 rounded"
                            rows={2}
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            placeholder="Внутренняя заметка..."
                        />
                    </div>

                    <div>
                        <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Сменить статус</div>
                        <div className="flex flex-wrap gap-2">
                            {statuses.map(s => (
                                <button
                                    key={s.code}
                                    type="button"
                                    disabled={pendingStatus !== null}
                                    onClick={async () => {
                                        setPendingStatus(s.code);
                                        try {
                                            await onChangeStatus(lead.id, s.code, note);
                                        } finally {
                                            setPendingStatus(null);
                                        }
                                    }}
                                    className={`text-sm px-3 py-1.5 rounded-lg border transition-all ${lead.status_code === s.code
                                        ? 'border-transparent text-white shadow-sm'
                                        : 'border-slate-300 bg-white hover:border-slate-400 text-slate-700'
                                        } disabled:opacity-50`}
                                    style={lead.status_code === s.code ? { backgroundColor: s.color || '#3b82f6' } : undefined}
                                >
                                    {pendingStatus === s.code ? '...' : s.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {isTeamlead && (
                        <div className="border-t border-slate-200 pt-3">
                            <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Переназначить лид</div>
                            <div className="flex gap-2">
                                <select
                                    className="border border-slate-300 px-2 py-1 rounded text-sm flex-grow bg-white"
                                    value={reassignTo}
                                    onChange={e => setReassignTo(e.target.value)}
                                >
                                    <option value="">— выбрать менеджера —</option>
                                    {roster.filter(m => m.active && m.id !== lead.assigned_manager_id).map(m => (
                                        <option key={m.id} value={m.id}>
                                            {m.full_name} {m.is_online ? '🟢' : '⚪'} ({m.role || 'manager'})
                                        </option>
                                    ))}
                                </select>
                                <button
                                    type="button"
                                    disabled={!reassignTo}
                                    onClick={async () => {
                                        await onReassign(lead.id, Number(reassignTo));
                                        setReassignTo('');
                                    }}
                                    className="bg-brand-600 hover:bg-brand-700 disabled:opacity-30 text-white text-sm px-3 py-1 rounded font-medium"
                                >
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

// =====================================================================
// Roster panel (only for teamlead)
// =====================================================================
const RosterPanel: React.FC<{ roster: RosterManager[] }> = ({ roster }) => (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="text-xs uppercase tracking-wide text-slate-500 mb-3">Команда (за 30 дней)</div>
        <div className="overflow-x-auto">
            <table className="w-full text-xs">
                <thead className="text-left text-slate-500">
                    <tr>
                        <th className="py-1">Менеджер</th>
                        <th className="text-center">Статус</th>
                        <th className="text-right">Всего 30д</th>
                        <th className="text-right">Открыто</th>
                        <th className="text-right">Закрыто</th>
                        <th className="text-right">SLA✗</th>
                    </tr>
                </thead>
                <tbody>
                    {roster.map(m => (
                        <tr key={m.id} className="border-t border-slate-100">
                            <td className="py-1.5">
                                {m.full_name}
                                {m.role === 'teamlead' && <span className="ml-1 text-xs bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded">тимлид</span>}
                                <div className="text-slate-400 font-mono text-xs">{m.login}</div>
                            </td>
                            <td className="text-center">
                                {!m.active ? <span className="text-red-500" title="Неактивен">⛔</span>
                                    : m.is_online ? <span className="text-emerald-500" title="В сети">🟢</span>
                                        : <span className="text-slate-400" title="Не в сети">⚪</span>}
                            </td>
                            <td className="text-right">{m.total30 ?? 0}</td>
                            <td className="text-right">{m.open ?? 0}</td>
                            <td className="text-right">{m.closed30 ?? 0}</td>
                            <td className={`text-right ${(m.overdue ?? 0) > 0 ? 'text-red-600 font-bold' : 'text-slate-400'}`}>{m.overdue ?? 0}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
);

// =====================================================================
// Dashboard
// =====================================================================
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
        const t = window.setInterval(load, 30000);
        return () => window.clearInterval(t);
    }, [scope, filterStatus, overdueOnly, filterManagerId]);

    const onChangeStatus = async (id: number, status: string, note?: string) => {
        try {
            const res = await fetch(`/api/lidy/leads/${id}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ status, note }),
            });
            if (!res.ok) {
                const j = await res.json().catch(() => ({}));
                alert('Ошибка: ' + (j.error || res.status));
            } else {
                await load();
            }
        } catch (e: any) {
            alert('Ошибка: ' + (e?.message || e));
        }
    };

    const onReassign = async (leadId: number, newManagerId: number) => {
        const res = await fetch(`/api/lidy/leads/${leadId}/reassign`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ manager_id: newManagerId }),
        });
        if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            alert('Ошибка: ' + (j.error || res.status));
        } else {
            await load();
        }
    };

    const toggleOnline = async () => {
        setTogglingOnline(true);
        try {
            const res = await fetch('/api/lidy/me/status', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ is_online: !isOnline }),
            });
            const j = await res.json().catch(() => ({}));
            if (res.ok) {
                onMeUpdate({ ...manager, is_online: j.manager?.is_online });
                if (j.redistribution?.assigned > 0) {
                    alert(`Распределено ${j.redistribution.assigned} ожидавших лидов`);
                }
                await load();
            } else {
                alert('Ошибка: ' + (j.error || res.status));
            }
        } finally {
            setTogglingOnline(false);
        }
    };

    const counters = useMemo(() => {
        const total = leads.length;
        const open = leads.filter(l => !l.processed_at).length;
        const overdue = leads.filter(l => !l.processed_at && l.sla_deadline_at && new Date(l.sla_deadline_at).getTime() < Date.now()).length;
        const queued = leads.filter(l => !l.assigned_manager_id).length;
        return { total, open, overdue, queued };
    }, [leads]);

    return (
        <div className="min-h-screen bg-slate-100">
            <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/ppp.png" alt="" className="h-8 w-auto" />
                        <div>
                            <div className="font-bold text-slate-900 flex items-center gap-2">
                                CRM
                                {isTeamlead && <span className="text-xs bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full">тимлид</span>}
                            </div>
                            <div className="text-xs text-slate-500">{manager.full_name} · {manager.login}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleOnline}
                            disabled={togglingOnline}
                            className={`text-sm px-3 py-1.5 rounded font-medium transition-colors flex items-center gap-2 ${isOnline ? 'bg-emerald-100 hover:bg-emerald-200 text-emerald-800' : 'bg-slate-200 hover:bg-slate-300 text-slate-700'}`}
                            title={isOnline ? 'Я в сети — лиды поступают' : 'Я не в сети — лиды не поступают'}
                        >
                            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                            {togglingOnline ? '...' : (isOnline ? 'В сети' : 'Не в сети')}
                        </button>
                        <button onClick={load} className="text-sm bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded">↻</button>
                        <button
                            onClick={async () => {
                                await fetch('/api/lidy/logout', { method: 'POST', credentials: 'include' });
                                onLogout();
                            }}
                            className="text-sm bg-red-50 hover:bg-red-100 text-red-700 px-3 py-1.5 rounded"
                        >Выйти</button>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto p-4 space-y-4">
                {/* Filters + counters */}
                <div className="grid md:grid-cols-2 gap-4">
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex gap-2 mb-3 flex-wrap">
                            {isTeamlead && (
                                <>
                                    <button
                                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${scope === 'all' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                        onClick={() => setScope('all')}
                                    >Все лиды</button>
                                    <button
                                        className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${scope === 'mine' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                        onClick={() => setScope('mine')}
                                    >Мои лиды</button>
                                </>
                            )}
                            <button
                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${overdueOnly ? 'bg-red-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                onClick={() => setOverdueOnly(!overdueOnly)}
                            >⏰ Только просроченные</button>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <select
                                className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white"
                                value={filterStatus}
                                onChange={e => setFilterStatus(e.target.value)}
                            >
                                <option value="">Все статусы</option>
                                {statuses.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
                            </select>
                            {isTeamlead && scope === 'all' && (
                                <select
                                    className="border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white"
                                    value={filterManagerId}
                                    onChange={e => setFilterManagerId(e.target.value)}
                                >
                                    <option value="">Все менеджеры</option>
                                    {roster.filter(m => m.active).map(m => (
                                        <option key={m.id} value={m.id}>{m.full_name}</option>
                                    ))}
                                </select>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-4 gap-2">
                        <div className="bg-white rounded-xl border border-slate-200 p-3 text-center">
                            <div className="text-xs uppercase tracking-wide text-slate-500">Всего</div>
                            <div className="text-2xl font-bold text-slate-900">{counters.total}</div>
                        </div>
                        <div className="bg-amber-50 rounded-xl border border-amber-200 p-3 text-center">
                            <div className="text-xs uppercase tracking-wide text-amber-700">Открытых</div>
                            <div className="text-2xl font-bold text-amber-700">{counters.open}</div>
                        </div>
                        <div className="bg-red-50 rounded-xl border border-red-200 p-3 text-center">
                            <div className="text-xs uppercase tracking-wide text-red-700">Просрочено</div>
                            <div className="text-2xl font-bold text-red-700">{counters.overdue}</div>
                        </div>
                        <div className="bg-orange-50 rounded-xl border border-orange-200 p-3 text-center">
                            <div className="text-xs uppercase tracking-wide text-orange-700">В очереди</div>
                            <div className="text-2xl font-bold text-orange-700">{counters.queued}</div>
                        </div>
                    </div>
                </div>

                {/* Roster panel for teamlead */}
                {isTeamlead && roster.length > 0 && <RosterPanel roster={roster} />}

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm">{error}</div>
                )}

                {!isOnline && (
                    <div className="bg-orange-50 border border-orange-200 text-orange-800 p-3 rounded text-sm flex items-center gap-2">
                        ⚪ Вы помечены как «не в сети» — новые лиды не будут вам распределяться. Тумблер вверху, чтобы вернуться в сеть.
                    </div>
                )}

                {loading ? (
                    <p className="text-slate-500 text-center py-8">Загрузка...</p>
                ) : leads.length === 0 ? (
                    <div className="bg-white rounded-xl border border-slate-200 p-8 text-center">
                        <div className="text-5xl mb-3">📭</div>
                        <p className="text-slate-600">
                            {scope === 'mine' ? 'У вас пока нет лидов.' : 'Лидов пока нет.'}
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {leads.map(l => (
                            <LeadCard
                                key={l.id}
                                lead={l}
                                statuses={statuses}
                                onChangeStatus={onChangeStatus}
                                isTeamlead={isTeamlead}
                                roster={roster}
                                onReassign={onReassign}
                                waMessage={waMessage}
                            />
                        ))}
                    </div>
                )}

                <p className="text-center text-xs text-slate-400 mt-8">
                    Авто-обновление каждые 30 секунд.
                </p>
            </div>
        </div>
    );
};

// =====================================================================
// Top-level
// =====================================================================
const LidyApp: React.FC = () => {
    const [manager, setManager] = useState<Manager | null>(null);
    const [checking, setChecking] = useState(true);
    const [waMessage, setWaMessage] = useState('Здравствуйте! Я ваш менеджер из GoGlobal по поводу заявки.');

    const checkSession = async () => {
        try {
            const res = await fetch('/api/lidy/me', { credentials: 'include' });
            if (res.ok) {
                const j = await res.json();
                setManager(j.manager);
            } else {
                setManager(null);
            }
        } catch {
            setManager(null);
        } finally {
            setChecking(false);
        }
    };

    // Read public site config to get WhatsApp message template (use for outgoing CRM clicks)
    useEffect(() => {
        fetch('/api/data')
            .then(r => r.ok ? r.json() : null)
            .then(j => {
                const m = j?.contactInfo?.whatsappMessage;
                // We use a CRM-specific default; could be made configurable separately
                if (m) setWaMessage(`Здравствуйте! Это GoGlobal по вашей заявке.`);
            })
            .catch(() => {});
    }, []);

    useEffect(() => { checkSession(); }, []);

    if (checking) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
                <p className="text-slate-500">Загрузка...</p>
            </div>
        );
    }

    if (!manager) {
        return <LoginScreen onAuthed={setManager} />;
    }

    return (
        <Dashboard
            manager={manager}
            onLogout={() => setManager(null)}
            onMeUpdate={setManager}
            waMessage={waMessage}
        />
    );
};

export default LidyApp;
