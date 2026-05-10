import React, { useEffect, useMemo, useState } from 'react';

interface Manager {
    id: number;
    login: string;
    full_name: string;
    telegram_tag?: string | null;
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
    sla_deadline_at: string;
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

const formatSla = (deadlineIso: string, processedIso?: string | null) => {
    if (processedIso) return { text: 'обработан', color: 'text-emerald-600' };
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
// Lead row + status changer
// =====================================================================
const LeadCard: React.FC<{
    lead: Lead;
    statuses: StatusOption[];
    onChangeStatus: (id: number, status: string, note?: string) => Promise<void>;
}> = ({ lead, statuses, onChangeStatus }) => {
    const [open, setOpen] = useState(false);
    const [note, setNote] = useState(lead.notes || '');
    const [pendingStatus, setPendingStatus] = useState<string | null>(null);
    const sla = formatSla(lead.sla_deadline_at, lead.processed_at);
    const statusColor = lead.status_color || '#3b82f6';

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
                    </div>
                    <div className="text-sm text-slate-600 mt-1 flex flex-wrap gap-x-4 gap-y-1">
                        {lead.phone && <span>📞 <a href={`tel:${lead.phone}`} className="text-brand-600 hover:underline" onClick={e => e.stopPropagation()}>{lead.phone}</a></span>}
                        {lead.email && <span>✉️ {lead.email}</span>}
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

                    {lead.notes && lead.notes !== note && (
                        <div className="text-xs text-slate-500">
                            Текущая заметка: <em>{lead.notes}</em>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// =====================================================================
// Dashboard
// =====================================================================
const Dashboard: React.FC<{ manager: Manager; onLogout: () => void }> = ({ manager, onLogout }) => {
    const [leads, setLeads] = useState<Lead[]>([]);
    const [statuses, setStatuses] = useState<StatusOption[]>([]);
    const [scope, setScope] = useState<'mine' | 'all'>('mine');
    const [filterStatus, setFilterStatus] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams();
            if (scope === 'all') params.set('scope', 'all');
            if (filterStatus) params.set('status', filterStatus);
            const [leadsRes, stRes] = await Promise.all([
                fetch(`/api/lidy/leads?${params.toString()}`, { credentials: 'include' }),
                fetch('/api/lidy/statuses', { credentials: 'include' }),
            ]);
            if (!leadsRes.ok || !stRes.ok) throw new Error(`HTTP ${leadsRes.status}/${stRes.status}`);
            const lj = await leadsRes.json();
            const sj = await stRes.json();
            setLeads(lj.leads || []);
            setStatuses(sj.statuses || []);
        } catch (e: any) {
            setError(e?.message || String(e));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [scope, filterStatus]);

    // Auto-refresh every 30s
    useEffect(() => {
        const t = window.setInterval(load, 30000);
        return () => window.clearInterval(t);
    }, [scope, filterStatus]);

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

    const counters = useMemo(() => {
        const total = leads.length;
        const open = leads.filter(l => !l.processed_at).length;
        const overdue = leads.filter(l => !l.processed_at && new Date(l.sla_deadline_at).getTime() < Date.now()).length;
        return { total, open, overdue };
    }, [leads]);

    return (
        <div className="min-h-screen bg-slate-100">
            <div className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-sm">
                <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <img src="/ppp.png" alt="" className="h-8 w-auto" />
                        <div>
                            <div className="font-bold text-slate-900">CRM</div>
                            <div className="text-xs text-slate-500">{manager.full_name} · {manager.login}</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <button onClick={load} className="text-sm bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded">↻ Обновить</button>
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

            <div className="max-w-6xl mx-auto p-4">
                {/* Filters + counters */}
                <div className="grid md:grid-cols-2 gap-4 mb-4">
                    <div className="bg-white rounded-xl border border-slate-200 p-4">
                        <div className="flex gap-2 mb-3">
                            <button
                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${scope === 'mine' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                onClick={() => setScope('mine')}
                            >Мои лиды</button>
                            <button
                                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${scope === 'all' ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'}`}
                                onClick={() => setScope('all')}
                            >Все лиды</button>
                        </div>
                        <select
                            className="w-full border border-slate-300 rounded-lg px-3 py-1.5 text-sm bg-white"
                            value={filterStatus}
                            onChange={e => setFilterStatus(e.target.value)}
                        >
                            <option value="">Все статусы</option>
                            {statuses.map(s => <option key={s.code} value={s.code}>{s.label}</option>)}
                        </select>
                    </div>

                    <div className="grid grid-cols-3 gap-2">
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
                    </div>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>
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
                            <LeadCard key={l.id} lead={l} statuses={statuses} onChangeStatus={onChangeStatus} />
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

    return <Dashboard manager={manager} onLogout={() => setManager(null)} />;
};

export default LidyApp;
