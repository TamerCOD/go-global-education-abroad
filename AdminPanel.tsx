import React, { useEffect, useRef, useState } from 'react';
import { useData } from './DataContext';
import { DEFAULT_VISIBILITY, DEFAULT_REGIONS } from './types';

// =====================================================================
// Reusable bits
// =====================================================================

// Material + light neumorphism tokens (was brutalist)
const A_SHADOW = 'shadow-[0_4px_24px_-6px_rgba(15,23,42,0.12),0_1px_3px_rgba(15,23,42,0.05)]';
const A_SHADOW_HOVER = 'hover:shadow-[0_10px_28px_-6px_rgba(15,23,42,0.18)] hover:-translate-y-[1px]';
const A_BORDER = 'border border-slate-200/80';
const A_BTN = `${A_BORDER} rounded-xl ${A_SHADOW} ${A_SHADOW_HOVER} active:translate-y-[1px] active:shadow-sm transition-all font-bold uppercase tracking-wider text-sm px-4 py-2`;
const A_CARD = `bg-white ${A_BORDER} rounded-2xl ${A_SHADOW}`;
const SECTION_BG: Record<string, string> = {
    'CRM': 'bg-fuchsia-100',
    'аналитика': 'bg-cyan-100',
    'видимость': 'bg-lime-100',
    'контент': 'bg-amber-100',
};

const ATooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => (
    <span className="relative inline-flex group">
        {children}
        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-50 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-xs font-mono bg-black text-lime-300 px-2 py-1 rounded-md border border-slate-200">
            {text}
        </span>
    </span>
);

const Section: React.FC<{
    title: string;
    subtitle?: string;
    defaultOpen?: boolean;
    children: React.ReactNode;
    badge?: string;
    accent?: 'lime' | 'cyan' | 'fuchsia' | 'amber' | 'violet' | 'red';
}> = ({ title, subtitle, defaultOpen = false, children, badge, accent }) => {
    const [open, setOpen] = useState(defaultOpen);
    const accentBg: Record<string, string> = {
        lime: 'bg-lime-300',
        cyan: 'bg-cyan-300',
        fuchsia: 'bg-fuchsia-300',
        amber: 'bg-amber-300',
        violet: 'bg-violet-300',
        red: 'bg-red-400',
    };
    const headerBg = accent ? accentBg[accent] : 'bg-yellow-100';
    return (
        <div className={`${A_CARD} mb-4 overflow-hidden`}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={`w-full flex items-center justify-between px-5 py-3 text-left ${headerBg} hover:brightness-95 transition-all border-b border-slate-200`}
            >
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-black uppercase tracking-tight">{title}</h2>
                        {badge && <span className={`text-[10px] bg-black text-lime-300 px-2 py-0.5 font-mono uppercase tracking-widest`}>{badge}</span>}
                    </div>
                    {subtitle && <p className="text-sm text-slate-700 mt-0.5 font-mono">{subtitle}</p>}
                </div>
                <span className={`text-2xl transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {open && <div className="p-5 bg-white">{children}</div>}
        </div>
    );
};

const ImageInput: React.FC<{
    value: string;
    onChange: (v: string) => void;
    password: string;
    placeholder?: string;
}> = ({ value, onChange, password, placeholder }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);

    const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setUploading(true);
        try {
            const fd = new FormData();
            fd.append('file', file);
            const res = await fetch('/api/upload', {
                method: 'POST',
                headers: { 'X-Admin-Password': password },
                body: fd,
            });
            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err.error || `HTTP ${res.status}`);
            }
            const { url } = await res.json();
            onChange(url);
        } catch (err: any) {
            alert('Ошибка загрузки: ' + (err?.message || err));
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    return (
        <div className="flex gap-2 items-center">
            {value ? (
                <img src={value} alt="" className="w-12 h-12 object-cover rounded border bg-slate-100 shrink-0" />
            ) : (
                <div className="w-12 h-12 rounded border bg-slate-100 shrink-0" />
            )}
            <input
                type="text"
                className="border border-slate-300 p-2 flex-grow rounded text-sm"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder ?? 'URL или загрузите файл'}
            />
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            <button
                type="button"
                className="text-sm bg-brand-100 text-brand-700 px-3 py-2 rounded whitespace-nowrap disabled:opacity-50 hover:bg-brand-200"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
            >
                {uploading ? '⏳ ...' : '📁 Файл'}
            </button>
        </div>
    );
};

const ImageListInput: React.FC<{
    values: string[];
    onChange: (v: string[]) => void;
    password: string;
}> = ({ values, onChange, password }) => {
    const inputRef = useRef<HTMLInputElement>(null);
    const [uploading, setUploading] = useState(false);
    const [pendingUrl, setPendingUrl] = useState('');

    const uploadFile = async (file: File) => {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/upload', {
            method: 'POST',
            headers: { 'X-Admin-Password': password },
            body: fd,
        });
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.error || `HTTP ${res.status}`);
        }
        const json = await res.json();
        return json.url as string;
    };

    const handleFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (files.length === 0) return;
        setUploading(true);
        try {
            const next = [...values];
            for (const file of files) {
                const url = await uploadFile(file);
                next.push(url);
            }
            onChange(next);
        } catch (err: any) {
            alert('Ошибка загрузки: ' + (err?.message || err));
        } finally {
            setUploading(false);
            if (inputRef.current) inputRef.current.value = '';
        }
    };

    const removeAt = (i: number) => {
        const next = [...values];
        next.splice(i, 1);
        onChange(next);
    };

    const updateAt = (i: number, v: string) => {
        const next = [...values];
        next[i] = v;
        onChange(next);
    };

    const addUrl = () => {
        const v = pendingUrl.trim();
        if (!v) return;
        onChange([...values, v]);
        setPendingUrl('');
    };

    return (
        <div className="space-y-2">
            {values.map((url, i) => (
                <div key={i} className="flex gap-2 items-center">
                    <img src={url} alt="" className="w-10 h-10 object-cover rounded border bg-slate-100 shrink-0" />
                    <input
                        className="border border-slate-300 p-1 flex-grow rounded text-xs"
                        value={url}
                        onChange={e => updateAt(i, e.target.value)}
                    />
                    <button type="button" className="text-red-500 text-sm px-2" onClick={() => removeAt(i)} title="Удалить">✕</button>
                </div>
            ))}
            <div className="flex gap-2 items-center pt-1">
                <input
                    type="text"
                    placeholder="Вставить URL изображения..."
                    className="border border-slate-300 p-1 flex-grow rounded text-xs"
                    value={pendingUrl}
                    onChange={e => setPendingUrl(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addUrl(); } }}
                />
                <button type="button" className="text-xs bg-slate-200 px-3 py-1 rounded hover:bg-slate-300" onClick={addUrl}>+ URL</button>
                <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
                <button
                    type="button"
                    className="text-xs bg-brand-100 text-brand-700 px-3 py-1 rounded whitespace-nowrap disabled:opacity-50 hover:bg-brand-200"
                    disabled={uploading}
                    onClick={() => inputRef.current?.click()}
                >
                    {uploading ? '⏳ Загрузка...' : '📁 Файлы'}
                </button>
            </div>
        </div>
    );
};

const Toggle: React.FC<{ checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }> =
    ({ checked, onChange, label, hint }) => (
        <label className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-50 cursor-pointer border border-transparent hover:border-slate-200 transition-all">
            <input
                type="checkbox"
                checked={checked}
                onChange={e => onChange(e.target.checked)}
                className="mt-0.5 w-5 h-5 text-brand-600 rounded focus:ring-brand-500 cursor-pointer accent-brand-600"
            />
            <span className="flex-1">
                <span className={`block font-medium ${checked ? 'text-slate-900' : 'text-slate-500'}`}>{label}</span>
                {hint && <span className="block text-xs text-slate-500 mt-0.5">{hint}</span>}
            </span>
        </label>
    );

// =====================================================================
// Analytics widget
// =====================================================================

interface AnalyticsData {
    today: number;
    last7Days: number;
    last30Days: number;
    uniqueToday: number;
    uniqueLast7: number;
    daily: { date: string; visits: number; unique: number }[];
    topPaths: { path: string; visits: number }[];
}

const AnalyticsWidget: React.FC<{ password: string }> = ({ password }) => {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch('/api/analytics', {
                headers: { 'X-Admin-Password': password },
            });
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            setData(await res.json());
        } catch (e: any) {
            setError(e.message || String(e));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, []);

    if (loading) return <p className="text-slate-500 text-sm">Загрузка статистики...</p>;
    if (error) return <p className="text-red-500 text-sm">Ошибка: {error}</p>;
    if (!data) return null;

    const maxDaily = Math.max(1, ...data.daily.map(d => d.visits));

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-brand-50 border border-brand-100 rounded-lg p-3">
                    <div className="text-xs text-slate-600 uppercase tracking-wide">Сегодня</div>
                    <div className="text-2xl font-bold text-brand-700">{data.today}</div>
                    <div className="text-xs text-slate-500 mt-1">{data.uniqueToday} уник.</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-3">
                    <div className="text-xs text-slate-600 uppercase tracking-wide">7 дней</div>
                    <div className="text-2xl font-bold text-emerald-700">{data.last7Days}</div>
                    <div className="text-xs text-slate-500 mt-1">{data.uniqueLast7} уник.</div>
                </div>
                <div className="bg-violet-50 border border-violet-100 rounded-lg p-3">
                    <div className="text-xs text-slate-600 uppercase tracking-wide">30 дней</div>
                    <div className="text-2xl font-bold text-violet-700">{data.last30Days}</div>
                </div>
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center justify-center">
                    <button onClick={load} className="text-sm text-brand-600 font-medium hover:underline">↻ Обновить</button>
                </div>
            </div>

            {data.daily.length > 0 && (
                <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Посещения по дням (30д)</div>
                    <div className="flex items-end gap-1 h-32 bg-slate-50 rounded-lg p-2 border border-slate-200">
                        {data.daily.map(d => (
                            <div key={d.date} className="flex-1 group relative flex flex-col items-center justify-end">
                                <div
                                    className="w-full bg-brand-500 hover:bg-brand-600 rounded-t transition-colors"
                                    style={{ height: `${(d.visits / maxDaily) * 100}%`, minHeight: '2px' }}
                                />
                                <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                                    {d.date}: {d.visits} (уник: {d.unique})
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {data.topPaths.length > 0 && (
                <div>
                    <div className="text-xs text-slate-500 uppercase tracking-wide mb-2">Популярные страницы (30д)</div>
                    <div className="space-y-1">
                        {data.topPaths.map(p => (
                            <div key={p.path} className="flex justify-between text-sm py-1 border-b border-slate-100">
                                <span className="text-slate-700 font-mono text-xs">{p.path}</span>
                                <span className="text-slate-500 font-medium">{p.visits}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

// =====================================================================
// Sharing links (apply forms per channel)
// =====================================================================

const PUBLIC_BASE = (typeof window !== 'undefined') ? window.location.origin : 'https://goglobal.su';

const SharingLinksSection: React.FC<{ contactInfo: any }> = () => {
    const url = `${PUBLIC_BASE}/apply`;
    const [copied, setCopied] = useState(false);

    const copy = async () => {
        try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch {
            alert('Скопируйте вручную: ' + url);
        }
    };

    return (
        <div className="space-y-4">
            <p className="text-sm text-slate-600">
                Это публичная ссылка на форму заявки. В форме клиент сам выберет в выпадающем списке,
                откуда он о нас узнал — и это значение запишется как источник лида.
                Список вариантов настраивается ниже в секции «🎯 Варианты источников лидов».
            </p>
            <div className="rounded-2xl border-2 border-slate-200 bg-gradient-to-br from-blue-50 to-violet-50 p-5">
                <div className="font-bold text-slate-900 mb-3 flex items-center gap-2">
                    🔗 Универсальная форма заявки
                </div>
                <div className="font-mono text-sm break-all bg-white rounded-lg border border-slate-300 p-3 mb-3 select-all">{url}</div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={copy} className="flex-1 bg-slate-900 hover:bg-black text-white text-sm font-bold rounded-lg px-4 py-2.5 transition-colors min-w-[140px]">
                        {copied ? '✓ Скопировано' : '📋 Копировать'}
                    </button>
                    <a href={url} target="_blank" rel="noopener noreferrer"
                        className="bg-white border border-slate-300 hover:bg-slate-50 text-sm font-medium rounded-lg px-4 py-2.5">
                        🔍 Открыть форму
                    </a>
                </div>
                <details className="mt-3">
                    <summary className="text-xs text-slate-500 cursor-pointer hover:text-slate-700">QR-код для печати/баннеров</summary>
                    <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`}
                        alt="QR" className="mt-2 rounded-lg border border-slate-300 bg-white"
                    />
                </details>
            </div>
        </div>
    );
};

// Admin can edit the dropdown list seen by clients on /apply
const AttributionOptionsSection: React.FC<{ value: string[]; onChange: (next: string[]) => void }> = ({ value, onChange }) => {
    const list = value && value.length > 0 ? value : [
        'Сайт', 'Instagram', 'WhatsApp', 'Email', 'Друзья / знакомые', 'Реклама', 'Поиск Google', 'Другое',
    ];
    const [draft, setDraft] = useState('');
    return (
        <div className="space-y-2">
            <p className="text-sm text-slate-600">
                Эти варианты появляются в выпадающем списке «Откуда вы о нас узнали?» на форме заявки.
                Менеджер также может вручную изменить источник лида в карточке — на любое из этих значений.
            </p>
            <div className="flex flex-wrap gap-2">
                {list.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-slate-100 border border-slate-300 rounded-lg pl-3 pr-1 py-1 text-sm">
                        {s}
                        <button className="text-slate-400 hover:text-red-500 px-2" title="Удалить"
                            onClick={() => {
                                const next = [...list]; next.splice(i, 1);
                                onChange(next);
                            }}>✕</button>
                    </span>
                ))}
            </div>
            <div className="flex gap-2 pt-2">
                <input className="flex-grow rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Например: TikTok"
                    value={draft} onChange={e => setDraft(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            const v = draft.trim();
                            if (v && !list.includes(v)) {
                                onChange([...list, v]);
                                setDraft('');
                            }
                        }
                    }} />
                <button className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                    onClick={() => {
                        const v = draft.trim();
                        if (v && !list.includes(v)) {
                            onChange([...list, v]);
                            setDraft('');
                        }
                    }}>+ Добавить</button>
            </div>
        </div>
    );
};

// =====================================================================
// CRM widgets (managers, statuses, leads view)
// =====================================================================

type WorkingDay = { from: string; to: string } | null;
type WorkingSchedule = WorkingDay[]; // [Sun, Mon, Tue, Wed, Thu, Fri, Sat]

const DEFAULT_WORKING_SCHEDULE: WorkingSchedule = [
    null,
    { from: '09:00', to: '18:00' },
    { from: '09:00', to: '18:00' },
    { from: '09:00', to: '18:00' },
    { from: '09:00', to: '18:00' },
    { from: '09:00', to: '18:00' },
    null,
];
const DAY_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

const WorkingHoursEditor: React.FC<{ value: WorkingSchedule | null; onChange: (s: WorkingSchedule) => void }> = ({ value, onChange }) => {
    const schedule = (Array.isArray(value) && value.length === 7) ? value : DEFAULT_WORKING_SCHEDULE;

    const updateDay = (i: number, day: WorkingDay) => {
        const next = [...schedule];
        next[i] = day;
        onChange(next);
    };

    return (
        <div className="space-y-1">
            {DAY_LABELS.map((label, i) => {
                const day = schedule[i];
                const isWorking = !!day;
                return (
                    <div key={i} className="flex items-center gap-2 text-sm">
                        <span className="w-8 font-medium text-slate-700">{label}</span>
                        <label className="flex items-center gap-1">
                            <input type="checkbox" className="accent-brand-600"
                                checked={isWorking}
                                onChange={e => updateDay(i, e.target.checked ? { from: '09:00', to: '18:00' } : null)} />
                            <span className="text-xs text-slate-500">рабочий</span>
                        </label>
                        <input type="time" disabled={!isWorking}
                            className="border border-slate-300 px-2 py-1 rounded text-sm w-24 disabled:opacity-30"
                            value={day?.from || '09:00'}
                            onChange={e => updateDay(i, { from: e.target.value, to: day?.to || '18:00' })} />
                        <span className="text-slate-400">—</span>
                        <input type="time" disabled={!isWorking}
                            className="border border-slate-300 px-2 py-1 rounded text-sm w-24 disabled:opacity-30"
                            value={day?.to || '18:00'}
                            onChange={e => updateDay(i, { from: day?.from || '09:00', to: e.target.value })} />
                    </div>
                );
            })}
            <div className="flex gap-2 pt-2">
                <button type="button" className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded"
                    onClick={() => onChange(DEFAULT_WORKING_SCHEDULE)}>Пн–Пт 9–18</button>
                <button type="button" className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded"
                    onClick={() => onChange([
                        null,
                        { from: '10:00', to: '19:00' }, { from: '10:00', to: '19:00' },
                        { from: '10:00', to: '19:00' }, { from: '10:00', to: '19:00' },
                        { from: '10:00', to: '19:00' }, null,
                    ])}>Пн–Пт 10–19</button>
                <button type="button" className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded"
                    onClick={() => onChange([
                        null,
                        { from: '09:00', to: '18:00' }, { from: '09:00', to: '18:00' },
                        { from: '09:00', to: '18:00' }, { from: '09:00', to: '18:00' },
                        { from: '09:00', to: '18:00' }, { from: '10:00', to: '15:00' },
                    ])}>Пн–Пт 9–18 + Сб 10–15</button>
                <button type="button" className="text-xs bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded"
                    onClick={() => onChange([null, null, null, null, null, null, null])}>Все выходные</button>
            </div>
        </div>
    );
};

interface ManagerRec {
    id: number;
    login: string;
    full_name: string;
    telegram_tag?: string | null;
    active: boolean;
    role?: 'manager' | 'teamlead';
    is_online?: boolean;
    last_assigned_at?: string | null;
    working_hours?: WorkingSchedule | null;
    created_at: string;
}

interface LeadStatusRec {
    code: string;
    label: string;
    color?: string;
    is_terminal: boolean;
    requires_reason?: boolean;
    sort: number;
}

interface LeadRec {
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
    notes?: string | null;
    sla_deadline_at: string;
    processed_at?: string | null;
    manager_name?: string | null;
    manager_login?: string | null;
}

const ManagersSection: React.FC<{ password: string }> = ({ password }) => {
    const [managers, setManagers] = useState<ManagerRec[]>([]);
    const [loading, setLoading] = useState(true);
    const [draft, setDraft] = useState<{ login: string; password: string; full_name: string; telegram_tag: string; role: 'manager' | 'teamlead' }>({
        login: '', password: '', full_name: '', telegram_tag: '', role: 'manager',
    });
    const [editing, setEditing] = useState<Record<number, Partial<ManagerRec> & { password?: string }>>({});
    const [openSchedule, setOpenSchedule] = useState<Record<number, boolean>>({});

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/managers', { headers: { 'X-Admin-Password': password } });
            const j = await res.json();
            setManagers(j.managers || []);
        } finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const create = async () => {
        if (!draft.login || !draft.password || !draft.full_name) {
            alert('Логин, пароль, имя обязательны'); return;
        }
        const res = await fetch('/api/admin/managers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
            body: JSON.stringify(draft),
        });
        if (res.ok) {
            setDraft({ login: '', password: '', full_name: '', telegram_tag: '', role: 'manager' });
            await load();
        } else {
            const j = await res.json().catch(() => ({}));
            alert('Ошибка: ' + (j.error || res.status));
        }
    };

    const update = async (id: number) => {
        const patch = editing[id];
        if (!patch) return;
        const res = await fetch(`/api/admin/managers/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
            body: JSON.stringify(patch),
        });
        if (res.ok) {
            setEditing(prev => { const n = { ...prev }; delete n[id]; return n; });
            await load();
        } else {
            const j = await res.json().catch(() => ({}));
            alert('Ошибка: ' + (j.error || res.status));
        }
    };

    const remove = async (id: number, name: string, leadCount: number) => {
        const msg = leadCount > 0
            ? `${name} имеет ${leadCount} лидов. Карточка будет помечена как "УВОЛЕН" — лиды останутся видны вам и тимлиду. Продолжить?`
            : `Удалить ${name}? Лидов нет, можно удалить полностью.`;
        if (!confirm(msg)) return;
        await fetch(`/api/admin/managers/${id}`, { method: 'DELETE', headers: { 'X-Admin-Password': password } });
        await load();
    };

    const restore = async (id: number, name: string) => {
        if (!confirm(`Восстановить ${name}? Он снова сможет логиниться.`)) return;
        await fetch(`/api/admin/managers/${id}/restore`, { method: 'POST', headers: { 'X-Admin-Password': password } });
        await load();
    };

    if (loading) return <p className="text-slate-500 text-sm">Загрузка...</p>;

    return (
        <div className="space-y-4">
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 grid md:grid-cols-5 gap-2 items-end">
                <input className="border border-slate-300 p-2 rounded text-sm" placeholder="Логин (англ., в нижнем регистре)"
                    value={draft.login} onChange={e => setDraft({ ...draft, login: e.target.value.toLowerCase().replace(/\s/g, '') })} />
                <input className="border border-slate-300 p-2 rounded text-sm" placeholder="Пароль" type="password"
                    value={draft.password} onChange={e => setDraft({ ...draft, password: e.target.value })} />
                <input className="border border-slate-300 p-2 rounded text-sm" placeholder="ФИО"
                    value={draft.full_name} onChange={e => setDraft({ ...draft, full_name: e.target.value })} />
                <input className="border border-slate-300 p-2 rounded text-sm" placeholder="Telegram (@ivan_tg)"
                    value={draft.telegram_tag} onChange={e => setDraft({ ...draft, telegram_tag: e.target.value })} />
                <select className="border border-slate-300 p-2 rounded text-sm bg-white"
                    value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value as 'manager' | 'teamlead' })}>
                    <option value="manager">Менеджер</option>
                    <option value="teamlead">Тимлид</option>
                </select>
                <button onClick={create} className="md:col-span-5 bg-brand-600 hover:bg-brand-700 text-white py-2 rounded font-medium">+ Создать пользователя</button>
            </div>

            {managers.length === 0 ? (
                <p className="text-slate-500 text-sm">Менеджеров пока нет — создайте первого выше.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left border-b border-slate-200">
                                <th className="py-2 px-2">ID</th>
                                <th className="py-2 px-2">Логин</th>
                                <th className="py-2 px-2">ФИО</th>
                                <th className="py-2 px-2">Telegram</th>
                                <th className="py-2 px-2">Роль</th>
                                <th className="py-2 px-2 text-center">Онлайн</th>
                                <th className="py-2 px-2 text-center">Активен</th>
                                <th className="py-2 px-2">Новый пароль</th>
                                <th className="py-2 px-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {managers.map(m => {
                                const e = editing[m.id] || {};
                                const hasEdit = !!editing[m.id];
                                const isScheduleOpen = !!openSchedule[m.id];
                                const currentSchedule = (e.working_hours ?? m.working_hours) as WorkingSchedule | null;
                                return (
                                    <React.Fragment key={m.id}>
                                        <tr className={`border-b border-slate-100 hover:bg-slate-50 ${m.archived_at ? 'opacity-60' : ''}`}>
                                            <td className="py-2 px-2 text-slate-400">
                                                #{m.id}
                                                {m.archived_at && <div className="text-[10px] bg-slate-700 text-white px-1 mt-0.5 inline-block">УВОЛЕН</div>}
                                            </td>
                                            <td className="py-2 px-2 font-mono">{m.login}</td>
                                            <td className="py-2 px-2">
                                                <input className="border border-slate-300 p-1 rounded text-sm w-full"
                                                    value={(e.full_name ?? m.full_name) as string}
                                                    onChange={ev => setEditing(prev => ({ ...prev, [m.id]: { ...prev[m.id], full_name: ev.target.value } }))} />
                                            </td>
                                            <td className="py-2 px-2">
                                                <input className="border border-slate-300 p-1 rounded text-sm w-full"
                                                    value={(e.telegram_tag ?? m.telegram_tag ?? '') as string}
                                                    onChange={ev => setEditing(prev => ({ ...prev, [m.id]: { ...prev[m.id], telegram_tag: ev.target.value } }))} />
                                            </td>
                                            <td className="py-2 px-2">
                                                <select className="border border-slate-300 p-1 rounded text-sm w-full bg-white"
                                                    value={(e.role ?? m.role ?? 'manager') as string}
                                                    onChange={ev => setEditing(prev => ({ ...prev, [m.id]: { ...prev[m.id], role: ev.target.value as 'manager' | 'teamlead' } }))}>
                                                    <option value="manager">Менеджер</option>
                                                    <option value="teamlead">Тимлид</option>
                                                </select>
                                            </td>
                                            <td className="py-2 px-2 text-center">
                                                {m.is_online ? (
                                                    <span className="inline-flex items-center gap-1 text-emerald-700 text-xs"><span className="w-2 h-2 rounded-full bg-emerald-500" /> в сети</span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-slate-500 text-xs"><span className="w-2 h-2 rounded-full bg-slate-300" /> офлайн</span>
                                                )}
                                            </td>
                                            <td className="py-2 px-2 text-center">
                                                <input type="checkbox" className="w-4 h-4 accent-brand-600"
                                                    checked={(e.active ?? m.active) as boolean}
                                                    onChange={ev => setEditing(prev => ({ ...prev, [m.id]: { ...prev[m.id], active: ev.target.checked } }))} />
                                            </td>
                                            <td className="py-2 px-2">
                                                <input className="border border-slate-300 p-1 rounded text-sm w-full" type="password" placeholder="—"
                                                    value={e.password ?? ''}
                                                    onChange={ev => setEditing(prev => ({ ...prev, [m.id]: { ...prev[m.id], password: ev.target.value } }))} />
                                            </td>
                                            <td className="py-2 px-2 whitespace-nowrap">
                                                <button onClick={() => setOpenSchedule(p => ({ ...p, [m.id]: !p[m.id] }))}
                                                    className={`text-xs px-2 py-1 rounded mr-1 ${isScheduleOpen ? 'bg-brand-200 text-brand-800' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                                                    🕐 Часы
                                                </button>
                                                <button onClick={() => update(m.id)} disabled={!hasEdit} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 text-white text-xs px-3 py-1 rounded mr-1">Сохранить</button>
                                                {m.archived_at ? (
                                                    <button onClick={() => restore(m.id, m.full_name)} className="bg-emerald-100 hover:bg-emerald-200 text-emerald-700 text-xs px-3 py-1 rounded">↺ Восстановить</button>
                                                ) : (
                                                    <button onClick={() => remove(m.id, m.full_name, (m as any).lead_count || 0)} className="bg-red-100 hover:bg-red-200 text-red-700 text-xs px-3 py-1 rounded">Уволить</button>
                                                )}
                                            </td>
                                        </tr>
                                        {isScheduleOpen && (
                                            <tr className="border-b border-slate-100 bg-slate-50">
                                                <td colSpan={9} className="px-4 py-3">
                                                    <div className="text-xs uppercase tracking-wide text-slate-500 mb-2">Рабочие часы (Asia/Bishkek, UTC+6)</div>
                                                    <WorkingHoursEditor
                                                        value={currentSchedule}
                                                        onChange={s => setEditing(prev => ({ ...prev, [m.id]: { ...prev[m.id], working_hours: s } }))}
                                                    />
                                                    <p className="text-xs text-slate-500 mt-2">SLA-таймер (3ч) тикает только в рабочие часы. Лиды, поступившие ночью, начинают отсчёт с начала следующего рабочего дня.</p>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const StatusesSection: React.FC<{ password: string }> = ({ password }) => {
    const [statuses, setStatuses] = useState<LeadStatusRec[]>([]);
    const [loading, setLoading] = useState(true);
    const [draft, setDraft] = useState<LeadStatusRec>({ code: '', label: '', color: '#3b82f6', is_terminal: false, requires_reason: false, sort: 50 });

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/admin/lead-statuses', { headers: { 'X-Admin-Password': password } });
            const j = await res.json();
            setStatuses(j.statuses || []);
        } finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const upsert = async (s: LeadStatusRec) => {
        await fetch('/api/admin/lead-statuses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
            body: JSON.stringify(s),
        });
        await load();
    };

    const remove = async (code: string) => {
        if (!confirm(`Удалить статус "${code}"?`)) return;
        const res = await fetch(`/api/admin/lead-statuses/${encodeURIComponent(code)}`, {
            method: 'DELETE', headers: { 'X-Admin-Password': password }
        });
        if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            alert(j.error || 'Ошибка');
        }
        await load();
    };

    if (loading) return <p className="text-slate-500 text-sm">Загрузка...</p>;

    return (
        <div className="space-y-3">
            <p className="text-xs text-slate-500">«Терминальные» статусы автоматически фиксируют время обработки и снимают лид с SLA-таймера. «Требует причины» = при выборе менеджеру показывается форма с обязательным полем (например, причина отказа).</p>
            {statuses.map(s => (
                <div key={s.code} className="grid md:grid-cols-14 gap-2 items-center bg-slate-50 p-2 rounded border border-slate-200" style={{ gridTemplateColumns: 'auto 1fr 60px 60px auto auto auto' }}>
                    <code className="text-xs font-mono px-2">{s.code}</code>
                    <input className="border border-slate-300 p-1.5 rounded text-sm"
                        value={s.label}
                        onChange={e => upsert({ ...s, label: e.target.value })} />
                    <input type="color" className="h-8 border border-slate-300 rounded"
                        value={s.color || '#3b82f6'}
                        onChange={e => upsert({ ...s, color: e.target.value })} />
                    <input type="number" className="border border-slate-300 p-1.5 rounded text-sm"
                        value={s.sort}
                        onChange={e => upsert({ ...s, sort: parseInt(e.target.value) || 0 })} />
                    <label className="text-xs flex items-center gap-1 whitespace-nowrap">
                        <input type="checkbox" className="accent-brand-600"
                            checked={s.is_terminal}
                            onChange={e => upsert({ ...s, is_terminal: e.target.checked })} />
                        закрывает
                    </label>
                    <label className="text-xs flex items-center gap-1 whitespace-nowrap">
                        <input type="checkbox" className="accent-red-600"
                            checked={!!s.requires_reason}
                            onChange={e => upsert({ ...s, requires_reason: e.target.checked })} />
                        требует причины
                    </label>
                    <button onClick={() => remove(s.code)} disabled={s.code === 'new'}
                        className="text-xs bg-red-50 hover:bg-red-100 disabled:opacity-30 text-red-700 px-3 py-1.5 rounded whitespace-nowrap">
                        Удалить
                    </button>
                </div>
            ))}
            <hr />
            <div className="grid gap-2 items-center bg-emerald-50 p-2 rounded border border-emerald-200" style={{ gridTemplateColumns: 'auto 1fr 60px 60px auto auto auto' }}>
                <input className="border border-slate-300 p-1.5 rounded text-sm font-mono w-24"
                    placeholder="code"
                    value={draft.code}
                    onChange={e => setDraft({ ...draft, code: e.target.value.toLowerCase().replace(/\s/g, '_') })} />
                <input className="border border-slate-300 p-1.5 rounded text-sm"
                    placeholder="Метка для UI"
                    value={draft.label}
                    onChange={e => setDraft({ ...draft, label: e.target.value })} />
                <input type="color" className="h-8 border border-slate-300 rounded"
                    value={draft.color || '#3b82f6'}
                    onChange={e => setDraft({ ...draft, color: e.target.value })} />
                <input type="number" className="border border-slate-300 p-1.5 rounded text-sm"
                    value={draft.sort}
                    onChange={e => setDraft({ ...draft, sort: parseInt(e.target.value) || 0 })} />
                <label className="text-xs flex items-center gap-1 whitespace-nowrap">
                    <input type="checkbox" className="accent-brand-600"
                        checked={draft.is_terminal}
                        onChange={e => setDraft({ ...draft, is_terminal: e.target.checked })} />
                    закрывает
                </label>
                <label className="text-xs flex items-center gap-1 whitespace-nowrap">
                    <input type="checkbox" className="accent-red-600"
                        checked={!!draft.requires_reason}
                        onChange={e => setDraft({ ...draft, requires_reason: e.target.checked })} />
                    требует причины
                </label>
                <button onClick={async () => {
                    if (!draft.code || !draft.label) { alert('code и label обязательны'); return; }
                    await upsert(draft);
                    setDraft({ code: '', label: '', color: '#3b82f6', is_terminal: false, sort: 50 });
                }} className="text-xs bg-brand-600 hover:bg-brand-700 text-white px-3 py-1.5 rounded whitespace-nowrap">+ Добавить</button>
            </div>
        </div>
    );
};

const CRMDashboard: React.FC<{ password: string }> = ({ password }) => {
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(30);
    const [from, setFrom] = useState('');
    const [to, setTo] = useState('');

    const load = async () => {
        setLoading(true);
        try {
            const res = await fetch(`/api/admin/dashboard?days=${days}`, { headers: { 'X-Admin-Password': password } });
            setData(await res.json());
        } finally { setLoading(false); }
    };
    useEffect(() => { load(); }, [days]);

    const exportCsv = async () => {
        const params = new URLSearchParams();
        if (from) params.set('from', new Date(from).toISOString());
        if (to) params.set('to', new Date(to).toISOString());
        const url = `/api/admin/leads/export?${params.toString()}`;
        // Use fetch + blob so we can attach the admin header
        const res = await fetch(url, { headers: { 'X-Admin-Password': password } });
        if (!res.ok) { alert('Ошибка экспорта'); return; }
        const blob = await res.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `leads-${new Date().toISOString().slice(0, 10)}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(a.href);
    };

    if (loading || !data) return <p className="text-slate-500 text-sm">Загрузка...</p>;

    const t = data.totals;
    const maxDaily = Math.max(1, ...data.daily.map((d: any) => d.received));

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs uppercase tracking-wide text-slate-500">Окно:</span>
                {[7, 30, 90, 180].map(d => (
                    <button key={d} onClick={() => setDays(d)}
                        className={`text-sm px-3 py-1 rounded ${days === d ? 'bg-brand-600 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-700'}`}>
                        {d} дн
                    </button>
                ))}
                <button onClick={load} className="text-sm bg-slate-100 hover:bg-slate-200 px-3 py-1 rounded ml-auto">↻</button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                    <div className="text-xs uppercase text-slate-600">Всего лидов</div>
                    <div className="text-2xl font-bold text-slate-900">{t.total}</div>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <div className="text-xs uppercase text-amber-700">Открытых</div>
                    <div className="text-2xl font-bold text-amber-700">{t.open}</div>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                    <div className="text-xs uppercase text-emerald-700">Закрыто (won)</div>
                    <div className="text-2xl font-bold text-emerald-700">{t.won}</div>
                    <div className="text-xs text-slate-500 mt-1">конверсия: {t.conversionPct}%</div>
                </div>
                <div className={`rounded-lg p-3 border ${t.slaCompliancePct >= 80 ? 'bg-emerald-50 border-emerald-200' : t.slaCompliancePct >= 60 ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'}`}>
                    <div className="text-xs uppercase text-slate-700">SLA соблюдён</div>
                    <div className="text-2xl font-bold text-slate-900">{t.slaCompliancePct}%</div>
                    <div className="text-xs text-slate-500 mt-1">просрочено сейчас: {t.slaBreachedOpen}</div>
                </div>
            </div>

            <div>
                <div className="text-xs uppercase text-slate-500 mb-2">Лиды по дням</div>
                <div className="flex items-end gap-1 h-32 bg-slate-50 rounded-lg p-2 border border-slate-200">
                    {data.daily.map((d: any) => (
                        <div key={d.date} className="flex-1 group relative flex flex-col items-center justify-end">
                            <div className="w-full bg-brand-500 hover:bg-brand-600 rounded-t transition-colors"
                                style={{ height: `${(d.received / maxDaily) * 100}%`, minHeight: '2px' }} />
                            <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-900 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                                {d.date}: получено {d.received} / закрыто {d.closed}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-white border border-slate-200 rounded-lg p-3">
                    <div className="text-xs uppercase text-slate-500 mb-2">По статусам</div>
                    {data.byStatus.map((s: any) => (
                        <div key={s.code} className="flex items-center gap-2 mb-1">
                            <span className="w-3 h-3 rounded-sm" style={{ background: s.color || '#94a3b8' }} />
                            <span className="text-sm text-slate-700 flex-grow">{s.label}</span>
                            <span className="text-sm font-medium text-slate-900">{s.n}</span>
                        </div>
                    ))}
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-3 md:col-span-2">
                    <div className="text-xs uppercase text-slate-500 mb-2">📡 По источникам (откуда узнали о нас)</div>
                    {data.bySource && data.bySource.length > 0 ? (
                        <table className="w-full text-xs">
                            <thead className="text-left text-slate-500">
                                <tr>
                                    <th className="py-1">Источник</th>
                                    <th className="text-right">Всего</th>
                                    <th className="text-right">Закрыто</th>
                                    <th className="text-right">Won</th>
                                    <th className="text-right">Конверсия</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data.bySource.map((s: any) => {
                                    const conv = s.closed > 0 ? Math.round((s.won / s.closed) * 100) : 0;
                                    return (
                                        <tr key={s.source} className="border-t border-slate-100">
                                            <td className="py-1 font-medium">{s.source}</td>
                                            <td className="text-right font-mono">{s.total}</td>
                                            <td className="text-right font-mono">{s.closed}</td>
                                            <td className="text-right font-mono text-emerald-700">{s.won}</td>
                                            <td className="text-right font-mono">{conv}%</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    ) : (
                        <p className="text-xs text-slate-400 italic">Пока нет данных</p>
                    )}
                </div>

                <div className="bg-white border border-slate-200 rounded-lg p-3">
                    <div className="text-xs uppercase text-slate-500 mb-2">По менеджерам (за {data.windowDays} дн)</div>
                    <table className="w-full text-xs">
                        <thead className="text-left text-slate-500">
                            <tr><th className="py-1">Менеджер</th><th className="text-right">Всего</th><th className="text-right">Откр.</th><th className="text-right">Закр.</th><th className="text-right">SLA✓</th><th className="text-right">SLA✗</th></tr>
                        </thead>
                        <tbody>
                            {data.byManager.map((m: any) => {
                                const slaTotal = (m.sla_met || 0) + (m.sla_breached || 0);
                                return (
                                    <tr key={m.id} className="border-t border-slate-100">
                                        <td className="py-1">
                                            <div>{m.full_name} <span className="text-slate-400">{m.login}</span></div>
                                            {!m.active && <span className="text-xs text-red-500">неактивен</span>}
                                        </td>
                                        <td className="text-right">{m.total}</td>
                                        <td className="text-right">{m.open}</td>
                                        <td className="text-right">{m.closed}</td>
                                        <td className="text-right text-emerald-600">{m.sla_met}</td>
                                        <td className={`text-right ${m.sla_breached > 0 ? 'text-red-600 font-medium' : ''}`}>{m.sla_breached}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {t.avgCloseMinutes !== null && (
                <div className="text-sm text-slate-600">
                    Среднее время от получения до закрытия: <strong>{Math.floor(t.avgCloseMinutes / 60)}ч {Math.round(t.avgCloseMinutes % 60)}м</strong>
                </div>
            )}

            <div className="border-t border-slate-200 pt-3 mt-3">
                <div className="text-xs uppercase text-slate-500 mb-2">Экспорт CSV</div>
                <div className="flex flex-wrap gap-2 items-center">
                    <label className="text-sm">с
                        <input type="date" className="ml-1 border border-slate-300 px-2 py-1 rounded text-sm" value={from} onChange={e => setFrom(e.target.value)} />
                    </label>
                    <label className="text-sm">по
                        <input type="date" className="ml-1 border border-slate-300 px-2 py-1 rounded text-sm" value={to} onChange={e => setTo(e.target.value)} />
                    </label>
                    <button onClick={exportCsv} className="bg-brand-600 hover:bg-brand-700 text-white text-sm px-4 py-1.5 rounded font-medium">
                        ⬇ Скачать CSV
                    </button>
                    <span className="text-xs text-slate-400">оставьте даты пустыми чтобы выгрузить всё</span>
                </div>
            </div>
        </div>
    );
};

const LeadsView: React.FC<{ password: string }> = ({ password }) => {
    const [leads, setLeads] = useState<LeadRec[]>([]);
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const load = async () => {
        setLoading(true);
        try {
            const [l, s] = await Promise.all([
                fetch('/api/admin/leads', { headers: { 'X-Admin-Password': password } }).then(r => r.json()),
                fetch('/api/admin/leads/stats', { headers: { 'X-Admin-Password': password } }).then(r => r.json()),
            ]);
            setLeads(l.leads || []);
            setStats(s);
        } finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    if (loading) return <p className="text-slate-500 text-sm">Загрузка...</p>;

    return (
        <div className="space-y-4">
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                        <div className="text-xs text-slate-600 uppercase">Всего лидов</div>
                        <div className="text-2xl font-bold text-slate-900">{stats.total}</div>
                    </div>
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                        <div className="text-xs text-amber-700 uppercase">Открытых</div>
                        <div className="text-2xl font-bold text-amber-700">{stats.open}</div>
                    </div>
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="text-xs text-red-700 uppercase">SLA просрочен</div>
                        <div className="text-2xl font-bold text-red-700">{stats.slaBreached}</div>
                    </div>
                    <button onClick={load} className="bg-brand-50 border border-brand-200 rounded-lg p-3 text-sm text-brand-700 font-medium">↻ Обновить</button>
                </div>
            )}

            {stats?.byManager?.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-lg p-3">
                    <div className="text-xs uppercase text-slate-500 mb-2">По менеджерам</div>
                    <table className="w-full text-sm">
                        <thead className="border-b border-slate-200">
                            <tr><th className="text-left py-1">Менеджер</th><th className="text-right">Всего</th><th className="text-right">Открыто</th><th className="text-right">Закрыто</th></tr>
                        </thead>
                        <tbody>
                            {stats.byManager.map((m: any) => (
                                <tr key={m.id} className="border-b border-slate-100">
                                    <td className="py-1">{m.full_name} <span className="text-slate-400">({m.login})</span></td>
                                    <td className="text-right">{m.total}</td>
                                    <td className="text-right">{m.open}</td>
                                    <td className="text-right">{m.closed}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                        <tr className="text-left">
                            <th className="px-2 py-2">ID</th>
                            <th className="px-2 py-2">Когда</th>
                            <th className="px-2 py-2">Источник</th>
                            <th className="px-2 py-2">Имя</th>
                            <th className="px-2 py-2">Контакты</th>
                            <th className="px-2 py-2">Страна</th>
                            <th className="px-2 py-2">Менеджер</th>
                            <th className="px-2 py-2">Статус</th>
                            <th className="px-2 py-2">SLA</th>
                        </tr>
                    </thead>
                    <tbody>
                        {leads.map(l => {
                            const sla = l.processed_at ? '✓ обработан'
                                : new Date(l.sla_deadline_at).getTime() < Date.now() ? '⚠ просрочен'
                                    : 'в работе';
                            const src = (l.source || '').toLowerCase();
                            const srcInfo = src.includes('whatsapp') ? { label: 'WA', bg: 'bg-emerald-500' }
                                : src.includes('instagram') ? { label: 'IG', bg: 'bg-pink-500' }
                                    : src.includes('email') ? { label: 'Mail', bg: 'bg-blue-500' }
                                        : src.includes('apply') ? { label: 'Link', bg: 'bg-violet-500' }
                                            : src.includes('modal') ? { label: 'Popup', bg: 'bg-slate-600' }
                                                : { label: 'Site', bg: 'bg-slate-500' };
                            return (
                                <tr key={l.id} className="border-b border-slate-100 hover:bg-slate-50">
                                    <td className="px-2 py-2 text-slate-400 font-mono text-xs">#{l.id}</td>
                                    <td className="px-2 py-2 text-xs text-slate-600">{new Date(l.received_at).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}</td>
                                    <td className="px-2 py-2">
                                        <span className={`text-[10px] px-2 py-0.5 rounded text-white font-bold ${srcInfo.bg}`} title={l.source}>{srcInfo.label}</span>
                                    </td>
                                    <td className="px-2 py-2 font-medium">{l.name || '—'}</td>
                                    <td className="px-2 py-2 text-xs">
                                        {l.phone && <div>📞 {l.phone}</div>}
                                        {l.email && <div className="text-slate-500">{l.email}</div>}
                                    </td>
                                    <td className="px-2 py-2 text-xs">{l.country}</td>
                                    <td className="px-2 py-2 text-xs">{l.manager_name || <em className="text-slate-400">не назначен</em>}</td>
                                    <td className="px-2 py-2">
                                        <span className="text-xs px-2 py-0.5 rounded text-white font-medium" style={{ backgroundColor: l.status_color || '#94a3b8' }}>{l.status_label || l.status_code}</span>
                                    </td>
                                    <td className="px-2 py-2 text-xs">{sla}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// =====================================================================
// Main panel
// =====================================================================

const AdminPanel: React.FC = () => {
    const { data, refresh } = useData();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [localData, setLocalData] = useState<any>(null);
    const [saving, setSaving] = useState(false);
    const [savedAt, setSavedAt] = useState<number | null>(null);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: 'admin', password })
            });
            if (res.ok) {
                setIsAuthenticated(true);
                // Initialize localData with merged defaults
                setLocalData({
                    ...data,
                    siteConfig: {
                        ...data.siteConfig,
                        visibility: { ...DEFAULT_VISIBILITY, ...(data.siteConfig?.visibility || {}) },
                        regions: data.siteConfig?.regions?.length ? data.siteConfig.regions : DEFAULT_REGIONS,
                    },
                });
            } else {
                alert('Неверный пароль');
            }
        } catch (e) { console.error(e); }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, data: localData })
            });
            if (res.ok) {
                setSavedAt(Date.now());
                refresh();
                setTimeout(() => setSavedAt(null), 3000);
            } else {
                alert('Не удалось сохранить');
            }
        } catch (e) { console.error(e); }
        finally { setSaving(false); }
    };

    const testTelegram = async () => {
        const res = await fetch('/api/telegram/test', {
            method: 'POST',
            headers: { 'X-Admin-Password': password },
        });
        const j = await res.json().catch(() => ({}));
        alert(j.ok ? '✅ Сообщение отправлено в Telegram' : '❌ Не удалось отправить. Проверьте TELEGRAM_BOT_TOKEN и TELEGRAM_CHAT_ID в Railway.');
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-cyan-200 via-blue-100 to-violet-100 p-4" style={{ fontFamily: "'Space Grotesk', system-ui" }}>
                <div className="absolute inset-0 opacity-30 pointer-events-none" style={{
                    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 24px, rgba(0,0,0,0.06) 24px, rgba(0,0,0,0.06) 25px), repeating-linear-gradient(90deg, transparent, transparent 24px, rgba(0,0,0,0.06) 24px, rgba(0,0,0,0.06) 25px)',
                }} />
                <form onSubmit={handleLogin} className={`relative ${A_CARD} p-8 w-full max-w-md`}>
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-200">
                        <img src="/ppp.png" alt="" className="w-12 h-auto" />
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tight">Admin</h2>
                            <p className="text-xs font-mono text-slate-500">// AUTH_REQUIRED</p>
                        </div>
                    </div>
                    <label className="block text-xs uppercase tracking-widest font-bold mb-1">Пароль</label>
                    <input
                        type="password" autoFocus
                        placeholder="••••••••"
                        className={`w-full ${A_BORDER} bg-yellow-100 px-3 py-3 mb-4 font-mono text-base focus:outline-none focus:bg-white`}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                    <button type="submit" className={`${A_BTN} w-full bg-black text-lime-300`}>→ ВОЙТИ</button>
                </form>
            </div>
        );
    }

    if (!localData) return null;

    const sc = localData.siteConfig || {};
    const v = sc.visibility || DEFAULT_VISIBILITY;
    const regions = sc.regions || DEFAULT_REGIONS;
    const ci = localData.contactInfo || {};

    const setSC = (patch: any) => setLocalData({ ...localData, siteConfig: { ...sc, ...patch } });
    const setCI = (patch: any) => setLocalData({ ...localData, contactInfo: { ...ci, ...patch } });
    const setVisibility = (patch: any) => setSC({ visibility: { ...v, ...patch } });

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100" style={{ fontFamily: "'Space Grotesk', system-ui" }}>
            {/* Subtle grid background */}
            <div className="fixed inset-0 pointer-events-none opacity-[0.06]" style={{
                backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 30px, #000 30px, #000 31px), repeating-linear-gradient(90deg, transparent, transparent 30px, #000 30px, #000 31px)',
            }} />

            {/* Sticky brutalist header */}
            <div className="sticky top-0 z-40 bg-slate-900 text-lime-300 border-b border-slate-800 shadow-md">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <h1 className="text-xl font-black uppercase tracking-tight">⚙️ ADMIN_PANEL</h1>
                    <div className="flex items-center gap-3">
                        {savedAt && <span className="text-sm font-mono text-lime-300">✓ SAVED</span>}
                        <ATooltip text="Сохранить все изменения сайта в БД">
                            <button onClick={handleSave} disabled={saving}
                                className={`${A_BTN} bg-lime-300 text-black disabled:opacity-50`}>
                                {saving ? '💾 ...' : '💾 СОХРАНИТЬ'}
                            </button>
                        </ATooltip>
                    </div>
                </div>
            </div>

            <div className="relative max-w-7xl mx-auto p-4">

                <Section title="📊 Статистика посещений" subtitle="Только публичный сайт (без админки)" defaultOpen accent="cyan">
                    <AnalyticsWidget password={password} />
                </Section>

                <Section title="📈 Дашборд CRM" subtitle="Метрики, конверсия, SLA, экспорт" badge="CRM" defaultOpen accent="fuchsia">
                    <CRMDashboard password={password} />
                </Section>

                <Section title="🧑‍💼 Менеджеры по продажам (CRM)" subtitle="Логин/пароль для входа на /lidy + рабочие часы + увольнение" badge="CRM" accent="fuchsia">
                    <ManagersSection password={password} />
                </Section>

                <Section title="🎯 Статусы лидов" subtitle="Что менеджер выбирает в карточке лида" badge="CRM" accent="violet">
                    <StatusesSection password={password} />
                </Section>

                <Section title="📋 Все лиды (обзор)" subtitle="Полный список лидов и статистика по менеджерам" badge="CRM" accent="amber">
                    <LeadsView password={password} />
                </Section>

                <Section
                    title="👁 Видимость блоков сайта"
                    subtitle="Скрытые блоки автоматически исчезают и из шапки сайта"
                    defaultOpen accent="lime"
                >
                    <div className="grid md:grid-cols-2 gap-1">
                        <Toggle checked={v.hero} onChange={c => setVisibility({ hero: c })} label="Hero (главный экран)" hint="Большой блок наверху страницы" />
                        <Toggle checked={v.about} onChange={c => setVisibility({ about: c })} label="О нас" hint="Раздел About с описанием компании" />
                        <Toggle checked={v.destinations} onChange={c => setVisibility({ destinations: c })} label="Направления" hint="Карта мира + список стран" />
                        <Toggle checked={v.calculator} onChange={c => setVisibility({ calculator: c })} label="Калькулятор стоимости" hint="Интерактивный CostCalculator" />
                        <Toggle checked={v.testimonials} onChange={c => setVisibility({ testimonials: c })} label="Отзывы" hint="Истории студентов" />
                        <Toggle checked={v.faq} onChange={c => setVisibility({ faq: c })} label="FAQ" hint="Частые вопросы" />
                        <Toggle checked={v.contact} onChange={c => setVisibility({ contact: c })} label="Контактная форма" hint="Форма заявки внизу страницы" />
                    </div>
                </Section>

                <Section title="🔗 Ссылка на форму заявки" subtitle="Универсальный URL — копируй и отправляй клиентам в любом канале" accent="cyan" defaultOpen>
                    <SharingLinksSection contactInfo={ci} />
                </Section>

                <Section title="🎯 Варианты источников лидов" subtitle="Что клиент выбирает в форме «Откуда вы о нас узнали?»" accent="violet">
                    <AttributionOptionsSection
                        value={(sc.attributionOptions as string[]) || []}
                        onChange={next => setSC({ attributionOptions: next })}
                    />
                </Section>

                <Section title="📞 Контакты, WhatsApp и график работы" subtitle="Телефон, email, расписание для футера" defaultOpen={false}>
                    <div className="space-y-3">
                        <label className="block text-sm">
                            <span className="block font-medium text-slate-700 mb-1">Телефон (отображается на сайте)</span>
                            <input className="border border-slate-300 p-2 w-full rounded" value={ci.phone || ''}
                                onChange={e => setCI({ phone: e.target.value })} />
                        </label>
                        <label className="block text-sm">
                            <span className="block font-medium text-slate-700 mb-1">Email</span>
                            <input className="border border-slate-300 p-2 w-full rounded" value={ci.email || ''}
                                onChange={e => setCI({ email: e.target.value })} />
                        </label>
                        <label className="block text-sm">
                            <span className="block font-medium text-slate-700 mb-1">Адрес офиса</span>
                            <input className="border border-slate-300 p-2 w-full rounded" value={ci.address || ''}
                                onChange={e => setCI({ address: e.target.value })} />
                        </label>
                        <label className="block text-sm">
                            <span className="block font-medium text-slate-700 mb-1">Ссылка на 2GIS / карты</span>
                            <input className="border border-slate-300 p-2 w-full rounded" value={ci.addressLink || ''}
                                onChange={e => setCI({ addressLink: e.target.value })} />
                        </label>
                        <label className="block text-sm">
                            <span className="block font-medium text-slate-700 mb-1">Instagram</span>
                            <input className="border border-slate-300 p-2 w-full rounded" value={ci.instagram || ''}
                                onChange={e => setCI({ instagram: e.target.value })} />
                        </label>
                        <hr className="my-3" />
                        <h3 className="font-semibold text-slate-800">WhatsApp-кнопка (плавающая зелёная справа)</h3>
                        <label className="block text-sm">
                            <span className="block font-medium text-slate-700 mb-1">Номер телефона (только цифры с кодом страны)</span>
                            <input
                                className="border border-slate-300 p-2 w-full rounded font-mono"
                                placeholder="996999530092"
                                value={ci.whatsappNumber || ''}
                                onChange={e => setCI({ whatsappNumber: e.target.value.replace(/\D/g, '') })}
                            />
                            <span className="text-xs text-slate-500 block mt-1">Например: 996999530092 (без + и пробелов)</span>
                        </label>
                        <label className="block text-sm">
                            <span className="block font-medium text-slate-700 mb-1">Автотекст в окно WhatsApp</span>
                            <textarea
                                className="border border-slate-300 p-2 w-full rounded"
                                rows={2}
                                placeholder="Добрый день! Пишу с сайта GoGlobal!"
                                value={ci.whatsappMessage || ''}
                                onChange={e => setCI({ whatsappMessage: e.target.value })}
                            />
                            <span className="text-xs text-slate-500 block mt-1">Подставляется в текстовое поле когда посетитель открывает виджет</span>
                        </label>

                        <hr className="my-3" />
                        <h3 className="font-semibold text-slate-800">⏰ График работы (показывается в футере сайта)</h3>
                        {((sc.workSchedule as Array<{ day: string; hours: string }>) || [
                            { day: 'Пн–Пт', hours: '09:00 – 18:00' },
                            { day: 'Сб', hours: '10:00 – 15:00' },
                            { day: 'Вс', hours: 'Выходной' },
                        ]).map((row, i, arr) => (
                            <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2">
                                <input className="border border-slate-300 p-2 rounded text-sm" placeholder="День (например, Пн–Пт)"
                                    value={row.day}
                                    onChange={e => {
                                        const list = [...arr]; list[i] = { ...row, day: e.target.value };
                                        setSC({ workSchedule: list });
                                    }} />
                                <input className="border border-slate-300 p-2 rounded text-sm" placeholder="Часы (например, 09:00 – 18:00 или Выходной)"
                                    value={row.hours}
                                    onChange={e => {
                                        const list = [...arr]; list[i] = { ...row, hours: e.target.value };
                                        setSC({ workSchedule: list });
                                    }} />
                                <button className="text-red-500 text-sm px-2"
                                    onClick={() => {
                                        const list = [...arr]; list.splice(i, 1);
                                        setSC({ workSchedule: list });
                                    }}>✕</button>
                            </div>
                        ))}
                        <button className="text-brand-600 hover:underline text-sm font-medium mt-1"
                            onClick={() => {
                                const list = [...((sc.workSchedule as any[]) || [])];
                                list.push({ day: 'Новый день', hours: '09:00 – 18:00' });
                                setSC({ workSchedule: list });
                            }}>+ Добавить строку расписания</button>
                    </div>
                </Section>

                <Section title="🎬 Loader (анимация при загрузке)" subtitle="Текст под логотипом во время заставки">
                    <label className="block text-sm">
                        <span className="block font-medium text-slate-700 mb-1">Тагалайн</span>
                        <input
                            className="border border-slate-300 p-2 w-full rounded"
                            placeholder="Образование за рубежом"
                            value={sc.loaderTagline ?? ''}
                            onChange={e => setSC({ loaderTagline: e.target.value })}
                        />
                    </label>
                </Section>

                <Section title="🖼 Изображения сайта" subtitle="Hero и About">
                    <div className="space-y-4">
                        <label className="block text-sm">
                            <span className="block font-medium text-slate-700 mb-1">Hero — фоновая картинка</span>
                            <ImageInput value={sc.heroImage || ''} password={password}
                                onChange={v => setSC({ heroImage: v })} />
                        </label>
                        <label className="block text-sm">
                            <span className="block font-medium text-slate-700 mb-1">About — картинка 1</span>
                            <ImageInput value={sc.aboutImage1 || ''} password={password}
                                onChange={v => setSC({ aboutImage1: v })} />
                        </label>
                        <label className="block text-sm">
                            <span className="block font-medium text-slate-700 mb-1">About — картинка 2</span>
                            <ImageInput value={sc.aboutImage2 || ''} password={password}
                                onChange={v => setSC({ aboutImage2: v })} />
                        </label>
                    </div>
                </Section>

                <Section title="🎓 Партнёры (плашки в About)" subtitle="Список ВУЗов-партнёров">
                    {(sc.partnerUniversities || []).map((uni: any, index: number) => (
                        <div key={index} className="flex gap-2 mb-2 items-center">
                            <input
                                className="border border-slate-300 p-2 flex-grow rounded"
                                placeholder="Название университета"
                                value={uni.name}
                                onChange={e => {
                                    const list = [...(sc.partnerUniversities || [])];
                                    list[index].name = e.target.value;
                                    setSC({ partnerUniversities: list });
                                }}
                            />
                            <label className="flex items-center gap-1 text-sm">
                                <input type="checkbox" checked={uni.highlighted || false}
                                    onChange={e => {
                                        const list = [...(sc.partnerUniversities || [])];
                                        list[index].highlighted = e.target.checked;
                                        setSC({ partnerUniversities: list });
                                    }} /> Highlight
                            </label>
                            <button
                                className="text-red-500 font-bold px-2"
                                onClick={() => {
                                    const list = [...(sc.partnerUniversities || [])];
                                    list.splice(index, 1);
                                    setSC({ partnerUniversities: list });
                                }}
                            >✕</button>
                        </div>
                    ))}
                    <button
                        className="text-brand-600 font-medium hover:underline mt-2"
                        onClick={() => setSC({ partnerUniversities: [...(sc.partnerUniversities || []), { name: 'Новый партнёр', highlighted: false }] })}
                    >+ Добавить партнёра</button>
                </Section>

                <Section title="🌍 Континенты / Регионы" subtitle="Группировка стран в Destinations">
                    <p className="text-xs text-slate-500 mb-3">ID региона должен совпадать с тем, что выбран у каждой страны. Совет: оставить латиницей (Asia, Europe, USA) и менять только Название.</p>
                    {regions.map((r: any, i: number) => (
                        <div key={i} className="flex gap-2 mb-2 items-center">
                            <input
                                className="border border-slate-300 p-2 rounded font-mono text-xs w-24"
                                placeholder="ID"
                                value={r.id}
                                onChange={e => {
                                    const list = [...regions];
                                    list[i] = { ...list[i], id: e.target.value };
                                    setSC({ regions: list });
                                }}
                            />
                            <input
                                className="border border-slate-300 p-2 rounded flex-grow"
                                placeholder="Отображаемое имя (например, Азия)"
                                value={r.name}
                                onChange={e => {
                                    const list = [...regions];
                                    list[i] = { ...list[i], name: e.target.value };
                                    setSC({ regions: list });
                                }}
                            />
                            <button
                                className="text-red-500 font-bold px-2"
                                onClick={() => {
                                    const list = [...regions];
                                    list.splice(i, 1);
                                    setSC({ regions: list });
                                }}
                            >✕</button>
                        </div>
                    ))}
                    <button
                        className="text-brand-600 font-medium hover:underline mt-2"
                        onClick={() => setSC({ regions: [...regions, { id: `region-${Date.now()}`, name: 'Новый регион' }] })}
                    >+ Добавить регион</button>
                </Section>

                <Section title="🌐 Страны и Университеты">
                    <button
                        className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded mb-4 font-medium"
                        onClick={() => {
                            setLocalData({
                                ...localData,
                                countries: [...(localData.countries || []), {
                                    id: `new-${Date.now()}`,
                                    name: 'Новая страна',
                                    region: regions[0]?.id || 'Asia',
                                    description: '',
                                    image: '',
                                    costs: { tuition: { min: 0, max: 0 }, living: { min: 0, max: 0 } },
                                    coordinates: { top: '50%', left: '50%' },
                                    universities: [],
                                }],
                            });
                        }}
                    >+ Добавить страну</button>

                    {(localData.countries || []).map((country: any, cIndex: number) => (
                        <div key={country.id} className="mb-6 border border-slate-200 p-4 rounded-lg bg-slate-50">
                            <div className="flex items-start justify-between mb-3">
                                <input
                                    className="font-bold text-lg border border-slate-300 p-2 rounded flex-grow mr-3"
                                    value={country.name}
                                    onChange={e => {
                                        const list = [...localData.countries];
                                        list[cIndex].name = e.target.value;
                                        setLocalData({ ...localData, countries: list });
                                    }}
                                />
                                <button
                                    className="text-red-500 text-sm hover:underline"
                                    onClick={() => {
                                        if (confirm(`Удалить страну "${country.name}"?`)) {
                                            const list = [...localData.countries];
                                            list.splice(cIndex, 1);
                                            setLocalData({ ...localData, countries: list });
                                        }
                                    }}
                                >Удалить страну</button>
                            </div>
                            <div className="grid md:grid-cols-2 gap-3 mb-4">
                                <label className="text-sm">
                                    <span className="block font-medium text-slate-700 mb-1">Континент / Регион</span>
                                    <select
                                        className="border border-slate-300 p-2 w-full rounded bg-white"
                                        value={country.region || ''}
                                        onChange={e => {
                                            const list = [...localData.countries];
                                            list[cIndex].region = e.target.value;
                                            setLocalData({ ...localData, countries: list });
                                        }}
                                    >
                                        {regions.map((r: any) => (
                                            <option key={r.id} value={r.id}>{r.name} ({r.id})</option>
                                        ))}
                                    </select>
                                </label>
                                <label className="text-sm">
                                    <span className="block font-medium text-slate-700 mb-1">Краткое описание</span>
                                    <input className="border border-slate-300 p-2 w-full rounded" value={country.description}
                                        onChange={e => {
                                            const list = [...localData.countries];
                                            list[cIndex].description = e.target.value;
                                            setLocalData({ ...localData, countries: list });
                                        }}
                                    />
                                </label>
                                <label className="text-sm">
                                    <span className="block font-medium text-slate-700 mb-1">Стоимость обучения min ($)</span>
                                    <input type="number" className="border border-slate-300 p-2 w-full rounded" value={country.costs.tuition.min}
                                        onChange={e => {
                                            const list = [...localData.countries];
                                            list[cIndex].costs.tuition.min = parseInt(e.target.value) || 0;
                                            setLocalData({ ...localData, countries: list });
                                        }} />
                                </label>
                                <label className="text-sm">
                                    <span className="block font-medium text-slate-700 mb-1">Стоимость жизни min ($)</span>
                                    <input type="number" className="border border-slate-300 p-2 w-full rounded" value={country.costs.living.min}
                                        onChange={e => {
                                            const list = [...localData.countries];
                                            list[cIndex].costs.living.min = parseInt(e.target.value) || 0;
                                            setLocalData({ ...localData, countries: list });
                                        }} />
                                </label>
                                <div className="md:col-span-2 text-sm">
                                    <span className="block font-medium text-slate-700 mb-1">Картинка страны</span>
                                    <ImageInput
                                        value={country.image}
                                        password={password}
                                        onChange={v => {
                                            const list = [...localData.countries];
                                            list[cIndex].image = v;
                                            setLocalData({ ...localData, countries: list });
                                        }}
                                    />
                                </div>
                            </div>

                            <div className="mt-3 pt-3 border-t border-slate-200">
                                <h4 className="font-semibold text-sm mb-2">Университеты</h4>
                                {country.universities.map((uni: any, uIndex: number) => (
                                    <div key={uIndex} className="ml-2 mb-3 p-3 border border-slate-200 bg-white rounded">
                                        <input
                                            className="border border-slate-300 p-1 w-full font-bold mb-2 rounded"
                                            placeholder="Название университета"
                                            value={uni.name}
                                            onChange={e => {
                                                const list = [...localData.countries];
                                                list[cIndex].universities[uIndex].name = e.target.value;
                                                setLocalData({ ...localData, countries: list });
                                            }}
                                        />
                                        <textarea
                                            className="border border-slate-300 p-1 w-full text-sm mb-2 rounded"
                                            placeholder="Описание"
                                            value={uni.description}
                                            onChange={e => {
                                                const list = [...localData.countries];
                                                list[cIndex].universities[uIndex].description = e.target.value;
                                                setLocalData({ ...localData, countries: list });
                                            }}
                                        />
                                        <div className="text-xs font-medium text-slate-700 mb-1">Картинки</div>
                                        <ImageListInput
                                            values={uni.images || []}
                                            password={password}
                                            onChange={v => {
                                                const list = [...localData.countries];
                                                list[cIndex].universities[uIndex].images = v;
                                                setLocalData({ ...localData, countries: list });
                                            }}
                                        />
                                        <button
                                            className="text-red-500 text-xs mt-2 hover:underline"
                                            onClick={() => {
                                                const list = [...localData.countries];
                                                list[cIndex].universities.splice(uIndex, 1);
                                                setLocalData({ ...localData, countries: list });
                                            }}
                                        >Удалить университет</button>
                                    </div>
                                ))}
                                <button
                                    className="text-brand-600 text-sm ml-2 hover:underline font-medium"
                                    onClick={() => {
                                        const list = [...localData.countries];
                                        list[cIndex].universities.push({ name: 'Новый университет', description: '', images: [] });
                                        setLocalData({ ...localData, countries: list });
                                    }}
                                >+ Добавить университет</button>
                            </div>
                        </div>
                    ))}
                </Section>

                <Section title="💬 Отзывы студентов">
                    <button
                        className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded mb-4 font-medium"
                        onClick={() => {
                            setLocalData({
                                ...localData,
                                testimonials: [...(localData.testimonials || []), {
                                    id: `t-${Date.now()}`,
                                    name: 'Имя студента',
                                    countryId: localData.countries?.[0]?.id || '',
                                    university: '',
                                    quote: 'Короткая цитата',
                                    story: 'Полная история...',
                                }],
                            });
                        }}
                    >+ Добавить отзыв</button>

                    {(localData.testimonials || []).map((t: any, i: number) => (
                        <div key={t.id} className="mb-4 p-3 border border-slate-200 rounded-lg bg-slate-50 grid md:grid-cols-2 gap-2">
                            <label className="text-sm">
                                <span className="block font-medium text-slate-700 mb-1">Имя</span>
                                <input className="border border-slate-300 p-2 w-full rounded"
                                    value={t.name}
                                    onChange={e => {
                                        const list = [...localData.testimonials]; list[i].name = e.target.value;
                                        setLocalData({ ...localData, testimonials: list });
                                    }} />
                            </label>
                            <label className="text-sm">
                                <span className="block font-medium text-slate-700 mb-1">Страна (ID)</span>
                                <select className="border border-slate-300 p-2 w-full rounded bg-white"
                                    value={t.countryId || ''}
                                    onChange={e => {
                                        const list = [...localData.testimonials]; list[i].countryId = e.target.value;
                                        setLocalData({ ...localData, testimonials: list });
                                    }}>
                                    <option value="">— не указано —</option>
                                    {(localData.countries || []).map((c: any) => (
                                        <option key={c.id} value={c.id}>{c.name}</option>
                                    ))}
                                </select>
                            </label>
                            <label className="text-sm md:col-span-2">
                                <span className="block font-medium text-slate-700 mb-1">Университет</span>
                                <input className="border border-slate-300 p-2 w-full rounded"
                                    value={t.university}
                                    onChange={e => {
                                        const list = [...localData.testimonials]; list[i].university = e.target.value;
                                        setLocalData({ ...localData, testimonials: list });
                                    }} />
                            </label>
                            <label className="text-sm md:col-span-2">
                                <span className="block font-medium text-slate-700 mb-1">Цитата (короткая)</span>
                                <input className="border border-slate-300 p-2 w-full rounded"
                                    value={t.quote}
                                    onChange={e => {
                                        const list = [...localData.testimonials]; list[i].quote = e.target.value;
                                        setLocalData({ ...localData, testimonials: list });
                                    }} />
                            </label>
                            <label className="text-sm md:col-span-2">
                                <span className="block font-medium text-slate-700 mb-1">История (полный текст)</span>
                                <textarea className="border border-slate-300 p-2 w-full rounded" rows={3}
                                    value={t.story}
                                    onChange={e => {
                                        const list = [...localData.testimonials]; list[i].story = e.target.value;
                                        setLocalData({ ...localData, testimonials: list });
                                    }} />
                            </label>
                            <div className="md:col-span-2 flex justify-end">
                                <button className="text-red-500 text-sm hover:underline"
                                    onClick={() => {
                                        if (!confirm(`Удалить отзыв ${t.name}?`)) return;
                                        const list = [...localData.testimonials]; list.splice(i, 1);
                                        setLocalData({ ...localData, testimonials: list });
                                    }}>Удалить отзыв</button>
                            </div>
                        </div>
                    ))}
                </Section>

                <Section title="❓ FAQ — Частые вопросы">
                    <button
                        className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded mb-4 font-medium"
                        onClick={() => {
                            setLocalData({
                                ...localData,
                                faqs: [...(localData.faqs || []), { question: 'Новый вопрос', answer: 'Ответ' }],
                            });
                        }}
                    >+ Добавить вопрос</button>

                    {(localData.faqs || []).map((q: any, i: number) => (
                        <div key={i} className="mb-3 p-3 border border-slate-200 rounded-lg bg-slate-50 space-y-2">
                            <input className="border border-slate-300 p-2 w-full rounded font-medium"
                                placeholder="Вопрос"
                                value={q.question}
                                onChange={e => {
                                    const list = [...localData.faqs]; list[i].question = e.target.value;
                                    setLocalData({ ...localData, faqs: list });
                                }} />
                            <textarea className="border border-slate-300 p-2 w-full rounded" rows={2}
                                placeholder="Ответ"
                                value={q.answer}
                                onChange={e => {
                                    const list = [...localData.faqs]; list[i].answer = e.target.value;
                                    setLocalData({ ...localData, faqs: list });
                                }} />
                            <button className="text-red-500 text-sm hover:underline"
                                onClick={() => {
                                    const list = [...localData.faqs]; list.splice(i, 1);
                                    setLocalData({ ...localData, faqs: list });
                                }}>Удалить</button>
                        </div>
                    ))}
                </Section>

                <Section title="🔔 Telegram-уведомления" subtitle="Бот для нотификаций о лидах (используется в CRM)">
                    <p className="text-sm text-slate-600 mb-3">
                        Чат и токен бота настраиваются через переменные окружения Railway:
                        <code className="bg-slate-100 px-1 mx-1 rounded text-xs">TELEGRAM_BOT_TOKEN</code>,
                        <code className="bg-slate-100 px-1 mx-1 rounded text-xs">TELEGRAM_CHAT_ID</code>.
                        Их можно поменять только из Railway — не из админки.
                    </p>
                    <button
                        onClick={testTelegram}
                        className="bg-sky-500 hover:bg-sky-600 text-white px-4 py-2 rounded font-medium"
                    >📤 Отправить тестовое сообщение</button>
                </Section>

                <div className="text-center text-xs text-slate-400 mt-8">
                    Не забудьте нажать «Сохранить всё» наверху после изменений.
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
