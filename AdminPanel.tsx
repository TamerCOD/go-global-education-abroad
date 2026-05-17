import React, { useEffect, useRef, useState } from 'react';
import { useData } from './DataContext';
import { DEFAULT_VISIBILITY, DEFAULT_REGIONS } from './types';

// =====================================================================
// Reusable bits
// =====================================================================

// Material + light neumorphism tokens (was brutalist)
const A_SHADOW = 'shadow-[0_8px_32px_-12px_rgba(0,0,0,0.6),0_2px_6px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.04)]';
const A_SHADOW_HOVER = 'hover:shadow-[0_16px_48px_-12px_rgba(56,189,248,0.25),0_4px_12px_rgba(0,0,0,0.5)] hover:-translate-y-[1px]';
const A_BORDER = 'border border-slate-700/60';
const A_BTN = `${A_BORDER} bg-slate-800 hover:bg-slate-700 text-slate-100 rounded-xl ${A_SHADOW} ${A_SHADOW_HOVER} active:translate-y-[1px] active:shadow-sm transition-all font-bold uppercase tracking-wider text-sm px-4 py-2`;
const A_CARD = `bg-slate-900/60 backdrop-blur-sm ${A_BORDER} rounded-2xl ${A_SHADOW}`;
const SECTION_BG: Record<string, string> = {
    'CRM': 'bg-sky-500/20',
    'аналитика': 'bg-cyan-500/20',
    'видимость': 'bg-emerald-500/20',
    'контент': 'bg-amber-500/20',
};

const ATooltip: React.FC<{ text: string; children: React.ReactNode }> = ({ text, children }) => (
    <span className="relative inline-flex group">
        {children}
        <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 z-50 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap text-xs font-mono bg-black text-lime-300 px-2 py-1 rounded-md border border-slate-800">
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
        lime: 'bg-gradient-to-r from-emerald-500/30 via-emerald-500/20 to-transparent',
        cyan: 'bg-gradient-to-r from-cyan-500/30 via-cyan-500/20 to-transparent',
        fuchsia: 'bg-gradient-to-r from-fuchsia-500/30 via-fuchsia-500/20 to-transparent',
        amber: 'bg-gradient-to-r from-amber-500/30 via-amber-500/20 to-transparent',
        violet: 'bg-gradient-to-r from-violet-500/30 via-violet-500/20 to-transparent',
        red: 'bg-gradient-to-r from-rose-500/30 via-rose-500/20 to-transparent',
    };
    const headerBg = accent ? accentBg[accent] : 'bg-gradient-to-r from-sky-500/30 via-sky-500/20 to-transparent';
    return (
        <div className={`${A_CARD} mb-4 overflow-hidden`}>
            <button
                type="button"
                onClick={() => setOpen(!open)}
                className={`w-full flex items-center justify-between px-5 py-3 text-left ${headerBg} hover:brightness-95 transition-all border-b border-slate-800`}
            >
                <div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <h2 className="text-lg font-black uppercase tracking-tight">{title}</h2>
                        {badge && <span className={`text-[10px] bg-black text-lime-300 px-2 py-0.5 font-mono uppercase tracking-widest`}>{badge}</span>}
                    </div>
                    {subtitle && <p className="text-sm text-slate-200 mt-0.5 font-mono">{subtitle}</p>}
                </div>
                <span className={`text-2xl transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▾</span>
            </button>
            {open && <div className="p-5 bg-slate-900/60 backdrop-blur-sm">{children}</div>}
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
                <img src={value} alt="" className="w-12 h-12 object-cover rounded border bg-slate-800/70 shrink-0" />
            ) : (
                <div className="w-12 h-12 rounded border bg-slate-800/70 shrink-0" />
            )}
            <input
                type="text"
                className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-2 flex-grow rounded text-sm"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder ?? 'URL или загрузите файл'}
            />
            <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            <button
                type="button"
                className="text-sm bg-sky-500/20 text-sky-300 px-3 py-2 rounded whitespace-nowrap disabled:opacity-50 hover:bg-brand-200"
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
                    <img src={url} alt="" className="w-10 h-10 object-cover rounded border bg-slate-800/70 shrink-0" />
                    <input
                        className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-1 flex-grow rounded text-xs"
                        value={url}
                        onChange={e => updateAt(i, e.target.value)}
                    />
                    <button type="button" className="text-red-400 text-sm px-2" onClick={() => removeAt(i)} title="Удалить">✕</button>
                </div>
            ))}
            <div className="flex gap-2 items-center pt-1">
                <input
                    type="text"
                    placeholder="Вставить URL изображения..."
                    className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-1 flex-grow rounded text-xs"
                    value={pendingUrl}
                    onChange={e => setPendingUrl(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addUrl(); } }}
                />
                <button type="button" className="text-xs bg-slate-700 px-3 py-1 rounded hover:bg-slate-300" onClick={addUrl}>+ URL</button>
                <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
                <button
                    type="button"
                    className="text-xs bg-sky-500/20 text-sky-300 px-3 py-1 rounded whitespace-nowrap disabled:opacity-50 hover:bg-brand-200"
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
        <label className="flex items-start gap-3 p-3 rounded-lg hover:bg-slate-800/40 cursor-pointer border border-transparent hover:border-slate-800 transition-all">
            <input
                type="checkbox"
                checked={checked}
                onChange={e => onChange(e.target.checked)}
                className="mt-0.5 w-5 h-5 text-brand-600 rounded focus:ring-brand-500 cursor-pointer accent-brand-600"
            />
            <span className="flex-1">
                <span className={`block font-medium ${checked ? 'text-slate-50' : 'text-slate-400'}`}>{label}</span>
                {hint && <span className="block text-xs text-slate-400 mt-0.5">{hint}</span>}
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
    hourly?: { hour: number; visits: number }[];
    topRefs?: { source: string; visits: number }[];
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

    if (loading) return <p className="text-slate-400 text-sm">Загрузка статистики...</p>;
    if (error) return <p className="text-red-400 text-sm">Ошибка: {error}</p>;
    if (!data) return null;

    const maxDaily = Math.max(1, ...data.daily.map(d => d.visits));

    return (
        <div className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-sky-500/10 border border-brand-100 rounded-lg p-3">
                    <div className="text-xs text-slate-300 uppercase tracking-wide">Сегодня</div>
                    <div className="text-2xl font-bold text-sky-300">{data.today}</div>
                    <div className="text-xs text-slate-400 mt-1">{data.uniqueToday} уник.</div>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-100 rounded-lg p-3">
                    <div className="text-xs text-slate-300 uppercase tracking-wide">7 дней</div>
                    <div className="text-2xl font-bold text-emerald-300">{data.last7Days}</div>
                    <div className="text-xs text-slate-400 mt-1">{data.uniqueLast7} уник.</div>
                </div>
                <div className="bg-violet-500/10 border border-violet-100 rounded-lg p-3">
                    <div className="text-xs text-slate-300 uppercase tracking-wide">30 дней</div>
                    <div className="text-2xl font-bold text-violet-300">{data.last30Days}</div>
                </div>
                <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3 flex items-center justify-center">
                    <button onClick={load} className="text-sm text-brand-600 font-medium hover:underline">↻ Обновить</button>
                </div>
            </div>

            {data.daily.length > 0 && (
                <div>
                    <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">Посещения по дням (30д)</div>
                    <div className="flex items-end gap-1 h-32 bg-slate-800/40 rounded-lg p-2 border border-slate-800">
                        {data.daily.map(d => (
                            <div key={d.date} className="flex-1 group relative flex flex-col items-center justify-end">
                                <div
                                    className="w-full bg-sky-500 hover:bg-sky-600 rounded-t transition-colors"
                                    style={{ height: `${(d.visits / maxDaily) * 100}%`, minHeight: '2px' }}
                                />
                                <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-900/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                                    {d.date}: {d.visits} (уник: {d.unique})
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div className="grid md:grid-cols-2 gap-4">
                {data.topPaths.length > 0 && (
                    <div>
                        <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">📄 Популярные страницы (30д)</div>
                        <div className="space-y-1">
                            {data.topPaths.map(p => (
                                <div key={p.path} className="flex justify-between text-sm py-1 border-b border-slate-800/60">
                                    <span className="text-slate-200 font-mono text-xs truncate max-w-[70%]" title={p.path}>{p.path}</span>
                                    <span className="text-slate-400 font-medium">{p.visits}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {data.topRefs && data.topRefs.length > 0 && (
                    <div>
                        <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">🌐 Откуда пришли (30д)</div>
                        <div className="space-y-1">
                            {data.topRefs.map(r => (
                                <div key={r.source} className="flex justify-between text-sm py-1 border-b border-slate-800/60">
                                    <span className="text-slate-200 text-xs truncate max-w-[70%]" title={r.source}>{r.source}</span>
                                    <span className="text-slate-400 font-medium">{r.visits}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

            {data.hourly && data.hourly.length > 0 && (
                <div>
                    <div className="text-xs text-slate-400 uppercase tracking-wide mb-2">⏰ Активность по часам (7д, Asia/Bishkek)</div>
                    <div className="flex items-end gap-0.5 h-24 bg-slate-800/40 rounded-lg p-2 border border-slate-800">
                        {Array.from({ length: 24 }).map((_, h) => {
                            const item = data.hourly!.find(x => x.hour === h);
                            const v = item?.visits || 0;
                            const maxV = Math.max(1, ...data.hourly!.map(x => x.visits));
                            return (
                                <div key={h} className="flex-1 group relative flex flex-col items-center justify-end">
                                    <div className="w-full bg-cyan-500 hover:bg-cyan-600 rounded-t transition-colors"
                                        style={{ height: `${(v / maxV) * 100}%`, minHeight: v > 0 ? '2px' : '0' }} />
                                    <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-900/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                                        {String(h).padStart(2, '0')}:00 — {v} визитов
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1 px-2">
                        <span>00</span><span>06</span><span>12</span><span>18</span><span>23</span>
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
            <p className="text-sm text-slate-300">
                Это публичная ссылка на форму заявки. В форме клиент сам выберет в выпадающем списке,
                откуда он о нас узнал — и это значение запишется как источник лида.
                Список вариантов настраивается ниже в секции «🎯 Варианты источников лидов».
            </p>
            <div className="rounded-2xl border-2 border-slate-800 bg-gradient-to-br from-blue-50 to-violet-50 p-5">
                <div className="font-bold text-slate-50 mb-3 flex items-center gap-2">
                    🔗 Универсальная форма заявки
                </div>
                <div className="font-mono text-sm break-all bg-slate-900/60 backdrop-blur-sm rounded-lg border border-slate-700 p-3 mb-3 select-all">{url}</div>
                <div className="flex flex-wrap gap-2">
                    <button onClick={copy} className="flex-1 bg-slate-900/60 backdrop-blur-sm hover:bg-black text-white text-sm font-bold rounded-lg px-4 py-2.5 transition-colors min-w-[140px]">
                        {copied ? '✓ Скопировано' : '📋 Копировать'}
                    </button>
                    <a href={url} target="_blank" rel="noopener noreferrer"
                        className="bg-slate-900/60 backdrop-blur-sm border border-slate-700 hover:bg-slate-800/40 text-sm font-medium rounded-lg px-4 py-2.5">
                        🔍 Открыть форму
                    </a>
                </div>
                <details className="mt-3">
                    <summary className="text-xs text-slate-400 cursor-pointer hover:text-slate-200">QR-код для печати/баннеров</summary>
                    <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`}
                        alt="QR" className="mt-2 rounded-lg border border-slate-700 bg-slate-900/60 backdrop-blur-sm"
                    />
                </details>
            </div>
        </div>
    );
};

// Events section — admin creates events with auto-generated slug
interface EventRec {
    id: number;
    slug: string;
    name: string;
    description?: string;
    active: boolean;
    lead_count?: number;
    created_at: string;
}

const EventsSection: React.FC<{ password: string }> = ({ password }) => {
    const [events, setEvents] = useState<EventRec[]>([]);
    const [loading, setLoading] = useState(true);
    const [draft, setDraft] = useState({ name: '', description: '' });
    const [copied, setCopied] = useState<string | null>(null);

    const load = async () => {
        setLoading(true);
        try {
            const r = await fetch('/api/admin/events', { headers: { 'X-Admin-Password': password } });
            const j = await r.json();
            setEvents(j.events || []);
        } finally { setLoading(false); }
    };
    useEffect(() => { load(); }, []);

    const create = async () => {
        if (!draft.name.trim()) { alert('Введите название события'); return; }
        const r = await fetch('/api/admin/events', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
            body: JSON.stringify(draft),
        });
        if (r.ok) {
            setDraft({ name: '', description: '' });
            await load();
        } else {
            const j = await r.json().catch(() => ({}));
            alert('Ошибка: ' + (j.error || r.status));
        }
    };

    const update = async (id: number, patch: Partial<EventRec>) => {
        await fetch(`/api/admin/events/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
            body: JSON.stringify(patch),
        });
        await load();
    };

    const remove = async (id: number, name: string) => {
        if (!confirm(`Удалить событие "${name}"? Лиды этого события сохранятся, но останутся без привязки.`)) return;
        await fetch(`/api/admin/events/${id}`, { method: 'DELETE', headers: { 'X-Admin-Password': password } });
        await load();
    };

    const copy = async (text: string, key: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(key);
            setTimeout(() => setCopied(null), 1500);
        } catch { alert('Скопируйте вручную: ' + text); }
    };

    if (loading) return <p className="text-slate-400 text-sm">Загрузка...</p>;

    return (
        <div className="space-y-3">
            <p className="text-sm text-slate-300">
                Каждое событие получает свою ссылку с auto-генерируемым slug.
                Лиды, пришедшие по ссылке события, будут помечены этим событием в карточке + Telegram-уведомлении.
                Клиент в форме увидит баннер с названием/описанием события.
            </p>

            <div className="bg-emerald-500/10 border-2 border-emerald-500/30 rounded-xl p-3 grid md:grid-cols-3 gap-2 items-end">
                <input className="bg-slate-800/60 text-slate-100 placeholder-slate-500 md:col-span-2 border border-slate-700 rounded-lg p-2 text-sm"
                    placeholder="Название события (напр. День открытых дверей в США)"
                    value={draft.name} onChange={e => setDraft({ ...draft, name: e.target.value })} />
                <button onClick={create} className="bg-sky-600 hover:bg-sky-700 text-white py-2 rounded-lg text-sm font-medium">+ Создать событие</button>
                <textarea className="bg-slate-800/60 text-slate-100 placeholder-slate-500 md:col-span-3 border border-slate-700 rounded-lg p-2 text-sm" rows={2}
                    placeholder="Описание (необязательно — показывается клиенту в баннере на форме)"
                    value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} />
            </div>

            {events.length === 0 ? (
                <p className="text-slate-400 text-sm italic">Событий пока нет</p>
            ) : (
                <div className="space-y-3">
                    {events.map(ev => {
                        const url = `${PUBLIC_BASE}/apply?event=${encodeURIComponent(ev.slug)}`;
                        return (
                            <div key={ev.id} className={`border border-slate-800 rounded-xl p-3 ${ev.active ? 'bg-slate-900/60 backdrop-blur-sm' : 'bg-slate-800/40 opacity-70'}`}>
                                <div className="grid md:grid-cols-[1fr_auto] gap-2 items-start">
                                    <div className="space-y-2">
                                        <input className="bg-slate-800/60 text-slate-100 placeholder-slate-500 w-full border border-slate-700 rounded-lg p-2 text-sm font-bold"
                                            value={ev.name}
                                            onChange={e => setEvents(prev => prev.map(p => p.id === ev.id ? { ...p, name: e.target.value } : p))}
                                            onBlur={e => update(ev.id, { name: e.target.value })} />
                                        <textarea className="bg-slate-800/60 text-slate-100 placeholder-slate-500 w-full border border-slate-700 rounded-lg p-2 text-xs" rows={2}
                                            placeholder="Описание (необязательно)"
                                            value={ev.description || ''}
                                            onChange={e => setEvents(prev => prev.map(p => p.id === ev.id ? { ...p, description: e.target.value } : p))}
                                            onBlur={e => update(ev.id, { description: e.target.value })} />
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <code className="text-xs font-mono bg-slate-800/70 px-2 py-1 rounded">slug: {ev.slug}</code>
                                            <span className="text-xs text-slate-400">лидов: <strong>{ev.lead_count ?? 0}</strong></span>
                                            <label className="text-xs flex items-center gap-1">
                                                <input type="checkbox" className="accent-emerald-600"
                                                    checked={ev.active}
                                                    onChange={e => update(ev.id, { active: e.target.checked })} />
                                                активно
                                            </label>
                                        </div>
                                        <div className="text-xs font-mono break-all bg-slate-800/70 rounded p-2 select-all">{url}</div>
                                    </div>
                                    <div className="flex md:flex-col gap-2">
                                        <button onClick={() => copy(url, ev.slug)}
                                            className="bg-slate-900/60 backdrop-blur-sm hover:bg-black text-white text-xs font-bold px-3 py-2 rounded-lg whitespace-nowrap">
                                            {copied === ev.slug ? '✓ Скопировано' : '📋 Копировать'}
                                        </button>
                                        <a href={url} target="_blank" rel="noopener noreferrer"
                                            className="bg-slate-900/60 backdrop-blur-sm border border-slate-700 hover:bg-slate-800/40 text-xs font-medium px-3 py-2 rounded-lg whitespace-nowrap text-center">
                                            🔍 Открыть
                                        </a>
                                        <button onClick={() => remove(ev.id, ev.name)}
                                            className="bg-red-500/10 hover:bg-red-100 text-red-300 text-xs font-medium px-3 py-2 rounded-lg whitespace-nowrap">
                                            Удалить
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

// Cost calculator config (texts + checklist + company services price)
const CalculatorConfigSection: React.FC<{ sc: any; setSC: (patch: any) => void }> = ({ sc, setSC }) => {
    const cfg = sc.calculatorConfig || {};
    const setCfg = (patch: any) => setSC({ calculatorConfig: { ...cfg, ...patch } });
    const items: string[] = Array.isArray(cfg.checklistItems) ? cfg.checklistItems : [];
    const [draftItem, setDraftItem] = useState('');

    return (
        <div className="space-y-4">
            <p className="text-sm text-slate-300">
                Цена в калькуляторе считается так: <strong>минимальная стоимость обучения</strong> из университетов выбранной страны
                <strong> + минимальная стоимость проживания</strong> для страны
                <strong> + услуги GoGlobal</strong>. Если у университета не задано «Стоимость обучения / год», используется значение страны (поле «Tuition Min» внизу).
            </p>

            <div className="grid md:grid-cols-2 gap-3">
                <label className="block text-sm">
                    <span className="block font-medium text-slate-200 mb-1">Заголовок секции</span>
                    <input className="bg-slate-800/60 text-slate-100 placeholder-slate-500 w-full border border-slate-700 rounded-lg p-2" value={cfg.title || ''}
                        onChange={e => setCfg({ title: e.target.value })} placeholder="Планируйте бюджет" />
                </label>
                <label className="block text-sm">
                    <span className="block font-medium text-slate-200 mb-1">Подзаголовок</span>
                    <input className="bg-slate-800/60 text-slate-100 placeholder-slate-500 w-full border border-slate-700 rounded-lg p-2" value={cfg.subtitle || ''}
                        onChange={e => setCfg({ subtitle: e.target.value })} placeholder="Узнайте примерную..." />
                </label>
                <label className="block text-sm">
                    <span className="block font-medium text-slate-200 mb-1">💵 Стоимость услуг GoGlobal / год ($)</span>
                    <input type="number" className="bg-slate-800/60 text-slate-100 placeholder-slate-500 w-full border border-slate-700 rounded-lg p-2 font-mono"
                        value={cfg.companyServicesCost ?? 0}
                        onChange={e => setCfg({ companyServicesCost: Math.max(0, parseInt(e.target.value) || 0) })} />
                    <span className="text-xs text-slate-400 block mt-1">Прибавляется к итогу. 0 — не учитывать.</span>
                </label>
                <label className="block text-sm md:col-span-1">
                    <span className="block font-medium text-slate-200 mb-1">Подпись чекбокса «гранты»</span>
                    <input className="bg-slate-800/60 text-slate-100 placeholder-slate-500 w-full border border-slate-700 rounded-lg p-2" value={cfg.grantToggleLabel || ''}
                        onChange={e => setCfg({ grantToggleLabel: e.target.value })} placeholder="Рассматриваю гранты / Бюджет" />
                </label>
                <label className="block text-sm md:col-span-2">
                    <span className="block font-medium text-slate-200 mb-1">Подсказка под чекбоксом «гранты»</span>
                    <input className="bg-slate-800/60 text-slate-100 placeholder-slate-500 w-full border border-slate-700 rounded-lg p-2" value={cfg.grantToggleHint || ''}
                        onChange={e => setCfg({ grantToggleHint: e.target.value })} placeholder="Учитывать возможность бесплатного обучения..." />
                </label>
                <label className="block text-sm md:col-span-2">
                    <span className="block font-medium text-slate-200 mb-1">Дисклеймер внизу</span>
                    <input className="bg-slate-800/60 text-slate-100 placeholder-slate-500 w-full border border-slate-700 rounded-lg p-2" value={cfg.disclaimer || ''}
                        onChange={e => setCfg({ disclaimer: e.target.value })} placeholder="*Не является публичной офертой..." />
                </label>
            </div>

            <div>
                <div className="text-sm font-medium text-slate-200 mb-2">✓ Чек-лист «что входит» (отображается под ценой)</div>
                <div className="space-y-2">
                    {items.map((it, i) => (
                        <div key={i} className="flex gap-2 items-center">
                            <span className="text-emerald-400 text-lg">✓</span>
                            <input className="bg-slate-800/60 text-slate-100 placeholder-slate-500 flex-grow border border-slate-700 rounded-lg p-2 text-sm" value={it}
                                onChange={e => {
                                    const next = [...items]; next[i] = e.target.value;
                                    setCfg({ checklistItems: next });
                                }} />
                            <button className="text-red-400 text-sm px-2"
                                onClick={() => {
                                    const next = [...items]; next.splice(i, 1);
                                    setCfg({ checklistItems: next });
                                }}>✕</button>
                        </div>
                    ))}
                </div>
                <div className="flex gap-2 mt-2">
                    <input className="bg-slate-800/60 text-slate-100 placeholder-slate-500 flex-grow border border-slate-700 rounded-lg p-2 text-sm"
                        placeholder="Например: Сопровождение от подачи до прилёта"
                        value={draftItem} onChange={e => setDraftItem(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); if (draftItem.trim()) { setCfg({ checklistItems: [...items, draftItem.trim()] }); setDraftItem(''); } } }} />
                    <button className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                        onClick={() => { if (draftItem.trim()) { setCfg({ checklistItems: [...items, draftItem.trim()] }); setDraftItem(''); } }}>+ Добавить пункт</button>
                </div>
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
            <p className="text-sm text-slate-300">
                Эти варианты появляются в выпадающем списке «Откуда вы о нас узнали?» на форме заявки.
                Менеджер также может вручную изменить источник лида в карточке — на любое из этих значений.
            </p>
            <div className="flex flex-wrap gap-2">
                {list.map((s, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-slate-800/70 border border-slate-700 rounded-lg pl-3 pr-1 py-1 text-sm">
                        {s}
                        <button className="text-slate-400 hover:text-red-400 px-2" title="Удалить"
                            onClick={() => {
                                const next = [...list]; next.splice(i, 1);
                                onChange(next);
                            }}>✕</button>
                    </span>
                ))}
            </div>
            <div className="flex gap-2 pt-2">
                <input className="bg-slate-800/60 text-slate-100 placeholder-slate-500 flex-grow rounded-lg border border-slate-700 px-3 py-2 text-sm"
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
                <button className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
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
                        <span className="w-8 font-medium text-slate-200">{label}</span>
                        <label className="flex items-center gap-1">
                            <input type="checkbox" className="accent-brand-600"
                                checked={isWorking}
                                onChange={e => updateDay(i, e.target.checked ? { from: '09:00', to: '18:00' } : null)} />
                            <span className="text-xs text-slate-400">рабочий</span>
                        </label>
                        <input type="time" disabled={!isWorking}
                            className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 px-2 py-1 rounded text-sm w-24 disabled:opacity-30"
                            value={day?.from || '09:00'}
                            onChange={e => updateDay(i, { from: e.target.value, to: day?.to || '18:00' })} />
                        <span className="text-slate-400">—</span>
                        <input type="time" disabled={!isWorking}
                            className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 px-2 py-1 rounded text-sm w-24 disabled:opacity-30"
                            value={day?.to || '18:00'}
                            onChange={e => updateDay(i, { from: day?.from || '09:00', to: e.target.value })} />
                    </div>
                );
            })}
            <div className="flex gap-2 pt-2">
                <button type="button" className="text-xs bg-slate-800/70 hover:bg-slate-700 px-2 py-1 rounded"
                    onClick={() => onChange(DEFAULT_WORKING_SCHEDULE)}>Пн–Пт 9–18</button>
                <button type="button" className="text-xs bg-slate-800/70 hover:bg-slate-700 px-2 py-1 rounded"
                    onClick={() => onChange([
                        null,
                        { from: '10:00', to: '19:00' }, { from: '10:00', to: '19:00' },
                        { from: '10:00', to: '19:00' }, { from: '10:00', to: '19:00' },
                        { from: '10:00', to: '19:00' }, null,
                    ])}>Пн–Пт 10–19</button>
                <button type="button" className="text-xs bg-slate-800/70 hover:bg-slate-700 px-2 py-1 rounded"
                    onClick={() => onChange([
                        null,
                        { from: '09:00', to: '18:00' }, { from: '09:00', to: '18:00' },
                        { from: '09:00', to: '18:00' }, { from: '09:00', to: '18:00' },
                        { from: '09:00', to: '18:00' }, { from: '10:00', to: '15:00' },
                    ])}>Пн–Пт 9–18 + Сб 10–15</button>
                <button type="button" className="text-xs bg-slate-800/70 hover:bg-slate-700 px-2 py-1 rounded"
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
    requires_appointment?: boolean;
    is_semi_closed?: boolean;
    is_client_stage?: boolean;
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
    event_name_snapshot?: string | null;
    desired_university?: string | null;
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

    if (loading) return <p className="text-slate-400 text-sm">Загрузка...</p>;

    return (
        <div className="space-y-4">
            <div className="bg-slate-800/40 rounded-lg p-3 border border-slate-800 grid md:grid-cols-5 gap-2 items-end">
                <input className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-2 rounded text-sm" placeholder="Логин (англ., в нижнем регистре)"
                    value={draft.login} onChange={e => setDraft({ ...draft, login: e.target.value.toLowerCase().replace(/\s/g, '') })} />
                <input className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-2 rounded text-sm" placeholder="Пароль" type="password"
                    value={draft.password} onChange={e => setDraft({ ...draft, password: e.target.value })} />
                <input className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-2 rounded text-sm" placeholder="ФИО"
                    value={draft.full_name} onChange={e => setDraft({ ...draft, full_name: e.target.value })} />
                <input className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-2 rounded text-sm" placeholder="Telegram (@ivan_tg)"
                    value={draft.telegram_tag} onChange={e => setDraft({ ...draft, telegram_tag: e.target.value })} />
                <select className="border border-slate-700 p-2 rounded text-sm bg-slate-900/60 backdrop-blur-sm"
                    value={draft.role} onChange={e => setDraft({ ...draft, role: e.target.value as 'manager' | 'teamlead' })}>
                    <option value="manager">Менеджер</option>
                    <option value="teamlead">Тимлид</option>
                </select>
                <button onClick={create} className="md:col-span-5 bg-sky-600 hover:bg-sky-700 text-white py-2 rounded font-medium">+ Создать пользователя</button>
            </div>

            {managers.length === 0 ? (
                <p className="text-slate-400 text-sm">Менеджеров пока нет — создайте первого выше.</p>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="text-left border-b border-slate-800">
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
                                        <tr className={`border-b border-slate-800/60 hover:bg-slate-800/40 ${m.archived_at ? 'opacity-60' : ''}`}>
                                            <td className="py-2 px-2 text-slate-400">
                                                #{m.id}
                                                {m.archived_at && <div className="text-[10px] bg-slate-700 text-white px-1 mt-0.5 inline-block">УВОЛЕН</div>}
                                            </td>
                                            <td className="py-2 px-2 font-mono">{m.login}</td>
                                            <td className="py-2 px-2">
                                                <input className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-1 rounded text-sm w-full"
                                                    value={(e.full_name ?? m.full_name) as string}
                                                    onChange={ev => setEditing(prev => ({ ...prev, [m.id]: { ...prev[m.id], full_name: ev.target.value } }))} />
                                            </td>
                                            <td className="py-2 px-2">
                                                <input className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-1 rounded text-sm w-full"
                                                    value={(e.telegram_tag ?? m.telegram_tag ?? '') as string}
                                                    onChange={ev => setEditing(prev => ({ ...prev, [m.id]: { ...prev[m.id], telegram_tag: ev.target.value } }))} />
                                            </td>
                                            <td className="py-2 px-2">
                                                <select className="border border-slate-700 p-1 rounded text-sm w-full bg-slate-900/60 backdrop-blur-sm"
                                                    value={(e.role ?? m.role ?? 'manager') as string}
                                                    onChange={ev => setEditing(prev => ({ ...prev, [m.id]: { ...prev[m.id], role: ev.target.value as 'manager' | 'teamlead' } }))}>
                                                    <option value="manager">Менеджер</option>
                                                    <option value="teamlead">Тимлид</option>
                                                </select>
                                            </td>
                                            <td className="py-2 px-2 text-center">
                                                {m.is_online ? (
                                                    <span className="inline-flex items-center gap-1 text-emerald-300 text-xs"><span className="w-2 h-2 rounded-full bg-emerald-500" /> в сети</span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-slate-400 text-xs"><span className="w-2 h-2 rounded-full bg-slate-300" /> офлайн</span>
                                                )}
                                            </td>
                                            <td className="py-2 px-2 text-center">
                                                <input type="checkbox" className="w-4 h-4 accent-brand-600"
                                                    checked={(e.active ?? m.active) as boolean}
                                                    onChange={ev => setEditing(prev => ({ ...prev, [m.id]: { ...prev[m.id], active: ev.target.checked } }))} />
                                            </td>
                                            <td className="py-2 px-2">
                                                <input className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-1 rounded text-sm w-full" type="password" placeholder="—"
                                                    value={e.password ?? ''}
                                                    onChange={ev => setEditing(prev => ({ ...prev, [m.id]: { ...prev[m.id], password: ev.target.value } }))} />
                                            </td>
                                            <td className="py-2 px-2 whitespace-nowrap">
                                                <button onClick={() => setOpenSchedule(p => ({ ...p, [m.id]: !p[m.id] }))}
                                                    className={`text-xs px-2 py-1 rounded mr-1 ${isScheduleOpen ? 'bg-brand-200 text-brand-800' : 'bg-slate-800/70 hover:bg-slate-700 text-slate-200'}`}>
                                                    🕐 Часы
                                                </button>
                                                <button onClick={() => update(m.id)} disabled={!hasEdit} className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-30 text-white text-xs px-3 py-1 rounded mr-1">Сохранить</button>
                                                {m.archived_at ? (
                                                    <button onClick={() => restore(m.id, m.full_name)} className="bg-emerald-500/20 hover:bg-emerald-200 text-emerald-300 text-xs px-3 py-1 rounded">↺ Восстановить</button>
                                                ) : (
                                                    <button onClick={() => remove(m.id, m.full_name, (m as any).lead_count || 0)} className="bg-red-100 hover:bg-red-200 text-red-300 text-xs px-3 py-1 rounded">Уволить</button>
                                                )}
                                            </td>
                                        </tr>
                                        {isScheduleOpen && (
                                            <tr className="border-b border-slate-800/60 bg-slate-800/40">
                                                <td colSpan={9} className="px-4 py-3">
                                                    <div className="text-xs uppercase tracking-wide text-slate-400 mb-2">Рабочие часы (Asia/Bishkek, UTC+6)</div>
                                                    <WorkingHoursEditor
                                                        value={currentSchedule}
                                                        onChange={s => setEditing(prev => ({ ...prev, [m.id]: { ...prev[m.id], working_hours: s } }))}
                                                    />
                                                    <p className="text-xs text-slate-400 mt-2">SLA-таймер (3ч) тикает только в рабочие часы. Лиды, поступившие ночью, начинают отсчёт с начала следующего рабочего дня.</p>
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

    if (loading) return <p className="text-slate-400 text-sm">Загрузка...</p>;

    const leadStatuses = statuses.filter(s => !s.is_client_stage);
    const clientStages = statuses.filter(s => !!s.is_client_stage);

    const renderRow = (s: LeadStatusRec) => (
        <div key={s.code} className="grid gap-2 items-center bg-slate-800/40 p-2 rounded border border-slate-800"
            style={{ gridTemplateColumns: 'auto 1fr 60px 60px auto auto auto auto' }}>
            <code className="text-xs font-mono px-2">{s.code}</code>
            <input className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-1.5 rounded text-sm"
                value={s.label}
                onChange={e => upsert({ ...s, label: e.target.value })} />
            <input type="color" className="bg-slate-800/60 text-slate-100 placeholder-slate-500 h-8 border border-slate-700 rounded"
                value={s.color || '#3b82f6'}
                onChange={e => upsert({ ...s, color: e.target.value })} />
            <input type="number" className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-1.5 rounded text-sm"
                value={s.sort}
                onChange={e => upsert({ ...s, sort: parseInt(e.target.value) || 0 })} />
            <label className="text-xs flex items-center gap-1 whitespace-nowrap">
                <input type="checkbox" className="accent-emerald-600"
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
            <label className="text-xs flex items-center gap-1 whitespace-nowrap">
                <input type="checkbox" className="accent-sky-600"
                    checked={!!s.is_client_stage}
                    onChange={e => upsert({ ...s, is_client_stage: e.target.checked })} />
                этап клиента
            </label>
            <button onClick={() => remove(s.code)} disabled={s.code === 'new'}
                className="text-xs bg-red-500/10 hover:bg-red-100 disabled:opacity-30 text-red-300 px-3 py-1.5 rounded whitespace-nowrap">
                Удалить
            </button>
        </div>
    );

    return (
        <div className="space-y-3">
            <p className="text-xs text-slate-400">
                <strong>Терминальные</strong> = закрывают лид и снимают с SLA-таймера. <strong>Требует причины</strong> = при выборе менеджер вводит обязательный текст.
                <strong>Этап клиента</strong> = пост-победный этап ведения (сопровождение от заявки до зачисления).
            </p>

            {/* Lead processing statuses */}
            <div>
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-slate-200">🎯 Обработка лидов</span>
                    <span className="text-xs text-slate-400">— статусы воронки до закрытия</span>
                </div>
                {leadStatuses.map(renderRow)}
            </div>

            {/* Client pipeline stages */}
            <div className="pt-3 mt-3 border-t border-slate-800">
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-semibold text-sky-300">🎓 Этапы клиента (после выигрыша)</span>
                    <span className="text-xs text-slate-400">— контракт, оплата, документы, экзамены, виза, и т.д.</span>
                </div>
                {clientStages.length === 0
                    ? <p className="text-xs text-slate-400 italic">Этапов клиента нет. Создайте статус и отметьте «этап клиента».</p>
                    : clientStages.map(renderRow)}
            </div>
            <hr />
            <div className="grid gap-2 items-center bg-emerald-500/10 p-2 rounded border border-emerald-500/30" style={{ gridTemplateColumns: 'auto 1fr 60px 60px auto auto auto' }}>
                <input className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-1.5 rounded text-sm font-mono w-24"
                    placeholder="code"
                    value={draft.code}
                    onChange={e => setDraft({ ...draft, code: e.target.value.toLowerCase().replace(/\s/g, '_') })} />
                <input className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-1.5 rounded text-sm"
                    placeholder="Метка для UI"
                    value={draft.label}
                    onChange={e => setDraft({ ...draft, label: e.target.value })} />
                <input type="color" className="bg-slate-800/60 text-slate-100 placeholder-slate-500 h-8 border border-slate-700 rounded"
                    value={draft.color || '#3b82f6'}
                    onChange={e => setDraft({ ...draft, color: e.target.value })} />
                <input type="number" className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-1.5 rounded text-sm"
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
                }} className="text-xs bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded whitespace-nowrap">+ Добавить</button>
            </div>
        </div>
    );
};

// ─────────────────────────── SALES HEALTH (traffic light) ───────────────────────────
const SalesHealthWidget: React.FC<{ password: string }> = ({ password }) => {
    const [data, setData] = useState<any>(null);
    useEffect(() => {
        fetch('/api/admin/health', { headers: { 'X-Admin-Password': password } })
            .then(r => r.json()).then(setData).catch(() => setData(null));
    }, [password]);
    if (!data) return <div className="text-sm text-slate-400">Загрузка…</div>;
    const colors = {
        green: { bg: 'from-emerald-500/30 to-emerald-500/10', border: 'border-emerald-500/40', text: 'text-emerald-300', icon: '🟢', label: 'ВСЁ В ПОРЯДКЕ' },
        yellow: { bg: 'from-amber-500/30 to-amber-500/10', border: 'border-amber-500/40', text: 'text-amber-300', icon: '🟡', label: 'ЕСТЬ ВОПРОСЫ' },
        red: { bg: 'from-rose-500/30 to-rose-500/10', border: 'border-rose-500/40', text: 'text-rose-300', icon: '🔴', label: 'СРОЧНО' },
    } as any;
    const c = colors[data.level] || colors.yellow;
    return (
        <div className="space-y-3">
            <div className={`bg-gradient-to-br ${c.bg} border ${c.border} rounded-xl p-5 flex items-center gap-4`}>
                <div className="text-5xl">{c.icon}</div>
                <div className="flex-grow">
                    <div className={`text-xs uppercase tracking-widest font-bold ${c.text}`}>Здоровье продаж</div>
                    <div className="text-xl font-bold text-slate-50 mt-1">{c.label}</div>
                    {data.reasons?.length > 0 && (
                        <ul className="text-sm text-slate-300 mt-2 space-y-0.5 list-disc pl-5">
                            {data.reasons.map((r: string, i: number) => <li key={i}>{r}</li>)}
                        </ul>
                    )}
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3">
                    <div className="text-slate-500 uppercase tracking-wider">SLA</div>
                    <div className={`text-lg font-bold ${data.sla_pct == null ? 'text-slate-500' : data.sla_pct >= 80 ? 'text-emerald-300' : data.sla_pct >= 60 ? 'text-amber-300' : 'text-rose-300'}`}>{data.sla_pct == null ? '—' : `${data.sla_pct}%`}</div>
                </div>
                <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3">
                    <div className="text-slate-500 uppercase tracking-wider">Конверсия</div>
                    <div className={`text-lg font-bold ${data.conversion_pct == null ? 'text-slate-500' : data.conversion_pct >= 15 ? 'text-emerald-300' : 'text-amber-300'}`}>{data.conversion_pct == null ? '—' : `${data.conversion_pct}%`}</div>
                </div>
                <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3">
                    <div className="text-slate-500 uppercase tracking-wider">Просрочено</div>
                    <div className={`text-lg font-bold ${data.overdue_open > 5 ? 'text-rose-300' : 'text-slate-200'}`}>{data.overdue_open}</div>
                </div>
                <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3">
                    <div className="text-slate-500 uppercase tracking-wider">Застряли &gt;14дн</div>
                    <div className={`text-lg font-bold ${data.stuck_leads > 0 ? 'text-amber-300' : 'text-slate-200'}`}>{data.stuck_leads}</div>
                </div>
            </div>
            {data.offline_managers?.length > 0 && (
                <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3 text-sm">
                    <div className="text-xs text-slate-500 uppercase tracking-wider mb-2">Оффлайн менеджеры (&gt;2ч)</div>
                    <ul className="space-y-1">
                        {data.offline_managers.map((m: any) => (
                            <li key={m.id} className="text-slate-300">⚪ {m.full_name} <span className="text-slate-500 text-xs">— последний раз {m.last_online_at ? new Date(m.last_online_at).toLocaleString('ru-RU') : 'давно'}</span></li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
};

// ─────────────────────────── COHORT ANALYSIS ───────────────────────────
const CohortSection: React.FC<{ password: string }> = ({ password }) => {
    const [data, setData] = useState<any>(null);
    const [months, setMonths] = useState(6);
    useEffect(() => {
        fetch(`/api/admin/cohort?months=${months}`, { headers: { 'X-Admin-Password': password } })
            .then(r => r.json()).then(setData);
    }, [password, months]);
    if (!data) return <div className="text-sm text-slate-400">Загрузка…</div>;
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <span className="text-xs uppercase text-slate-400">Окно:</span>
                {[3, 6, 12].map(m => (
                    <button key={m} onClick={() => setMonths(m)}
                        className={`text-sm px-3 py-1 rounded ${months === m ? 'bg-sky-600 text-white' : 'bg-slate-800/70 hover:bg-slate-700 text-slate-200'}`}>
                        {m} мес
                    </button>
                ))}
            </div>
            <div className="overflow-x-auto bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl">
                <table className="w-full text-sm">
                    <thead className="bg-slate-800/40 text-xs uppercase tracking-wider text-slate-400">
                        <tr>
                            <th className="text-left py-2 px-3">Когорта</th>
                            <th className="text-right py-2 px-3">Лидов</th>
                            <th className="text-right py-2 px-3">Won в 30д</th>
                            <th className="text-right py-2 px-3">Won в 60д</th>
                            <th className="text-right py-2 px-3">Won в 90д</th>
                            <th className="text-right py-2 px-3">Won всего</th>
                            <th className="text-right py-2 px-3">Конв.</th>
                            <th className="text-right py-2 px-3">$$$</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(data.cohorts || []).map((c: any) => {
                            const conv = c.total > 0 ? Math.round((c.won / c.total) * 100) : 0;
                            return (
                                <tr key={c.cohort} className="border-t border-slate-800 hover:bg-slate-800/30">
                                    <td className="py-2 px-3 font-mono text-slate-200">{c.cohort}</td>
                                    <td className="py-2 px-3 text-right font-mono text-slate-100">{c.total}</td>
                                    <td className="py-2 px-3 text-right text-sky-300 font-mono">{c.won_in_30}</td>
                                    <td className="py-2 px-3 text-right text-cyan-300 font-mono">{c.won_in_60}</td>
                                    <td className="py-2 px-3 text-right text-teal-300 font-mono">{c.won_in_90}</td>
                                    <td className="py-2 px-3 text-right text-emerald-300 font-bold font-mono">{c.won}</td>
                                    <td className={`py-2 px-3 text-right font-bold font-mono ${conv >= 15 ? 'text-emerald-300' : conv >= 10 ? 'text-amber-300' : 'text-rose-300'}`}>{conv}%</td>
                                    <td className="py-2 px-3 text-right text-emerald-200 font-mono">${Math.round(c.revenue).toLocaleString()}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="text-xs text-slate-500">Когорта = месяц получения лида. Won в Nд = успешно закрыты в течение N дней после прихода.</div>
        </div>
    );
};

// ─────────────────────────── ROI BY SOURCE ───────────────────────────
const SourceRoiSection: React.FC<{ password: string }> = ({ password }) => {
    const [data, setData] = useState<any>(null);
    const [days, setDays] = useState(30);
    const [editing, setEditing] = useState<Record<string, { cpl: string; budget: string }>>({});
    const load = () => fetch(`/api/admin/source-roi?days=${days}`, { headers: { 'X-Admin-Password': password } }).then(r => r.json()).then(setData);
    useEffect(() => { load(); }, [days]);

    const saveCost = async (source: string) => {
        const e = editing[source];
        if (!e) return;
        await fetch('/api/admin/source-cost', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
            body: JSON.stringify({ source, cost_per_lead: parseFloat(e.cpl) || 0, monthly_budget: parseFloat(e.budget) || 0 }),
        });
        setEditing(p => { const c = { ...p }; delete c[source]; return c; });
        load();
    };

    if (!data) return <div className="text-sm text-slate-400">Загрузка…</div>;
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <span className="text-xs uppercase text-slate-400">Окно:</span>
                {[7, 30, 90].map(d => (
                    <button key={d} onClick={() => setDays(d)}
                        className={`text-sm px-3 py-1 rounded ${days === d ? 'bg-sky-600 text-white' : 'bg-slate-800/70 hover:bg-slate-700 text-slate-200'}`}>
                        {d} дн
                    </button>
                ))}
            </div>
            <div className="overflow-x-auto bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl">
                <table className="w-full text-sm">
                    <thead className="bg-slate-800/40 text-xs uppercase tracking-wider text-slate-400">
                        <tr>
                            <th className="text-left py-2 px-3">Источник</th>
                            <th className="text-right py-2 px-3">Лидов</th>
                            <th className="text-right py-2 px-3">Won</th>
                            <th className="text-right py-2 px-3">Выручка</th>
                            <th className="text-right py-2 px-3">CPL $</th>
                            <th className="text-right py-2 px-3">Бюджет $</th>
                            <th className="text-right py-2 px-3">Потрачено</th>
                            <th className="text-right py-2 px-3">ROI</th>
                            <th className="text-right py-2 px-3 w-32">&nbsp;</th>
                        </tr>
                    </thead>
                    <tbody>
                        {(data.sources || []).map((s: any) => {
                            const e = editing[s.source];
                            const editingNow = !!e;
                            const roi = s.spend > 0 ? Math.round((s.revenue / s.spend) * 100) / 100 : null;
                            return (
                                <tr key={s.source} className="border-t border-slate-800">
                                    <td className="py-2 px-3 text-slate-100">{s.source}</td>
                                    <td className="py-2 px-3 text-right font-mono text-slate-200">{s.total}</td>
                                    <td className="py-2 px-3 text-right font-mono text-emerald-300">{s.won}</td>
                                    <td className="py-2 px-3 text-right font-mono text-emerald-200">${Math.round(s.revenue).toLocaleString()}</td>
                                    <td className="py-2 px-3 text-right">
                                        {editingNow ? (
                                            <input className="w-20 text-right bg-slate-800/60 border border-slate-700 px-1.5 py-0.5 text-slate-100 rounded text-xs" value={e.cpl} onChange={ev => setEditing(p => ({ ...p, [s.source]: { ...p[s.source], cpl: ev.target.value } }))} />
                                        ) : <span className="font-mono text-slate-300">${s.cpl}</span>}
                                    </td>
                                    <td className="py-2 px-3 text-right">
                                        {editingNow ? (
                                            <input className="w-24 text-right bg-slate-800/60 border border-slate-700 px-1.5 py-0.5 text-slate-100 rounded text-xs" value={e.budget} onChange={ev => setEditing(p => ({ ...p, [s.source]: { ...p[s.source], budget: ev.target.value } }))} />
                                        ) : <span className="font-mono text-slate-300">${s.budget}</span>}
                                    </td>
                                    <td className="py-2 px-3 text-right font-mono text-amber-300">${Math.round(s.spend).toLocaleString()}</td>
                                    <td className={`py-2 px-3 text-right font-bold font-mono ${roi == null ? 'text-slate-500' : roi >= 3 ? 'text-emerald-300' : roi >= 1 ? 'text-amber-300' : 'text-rose-300'}`}>{roi == null ? '—' : `${roi}x`}</td>
                                    <td className="py-2 px-3 text-right">
                                        {editingNow ? (
                                            <>
                                                <button onClick={() => saveCost(s.source)} className="text-xs bg-sky-600 hover:bg-sky-500 text-white px-2 py-0.5 rounded">✓</button>
                                                <button onClick={() => setEditing(p => { const c = { ...p }; delete c[s.source]; return c; })} className="text-xs ml-1 text-slate-500">×</button>
                                            </>
                                        ) : (
                                            <button onClick={() => setEditing(p => ({ ...p, [s.source]: { cpl: String(s.cpl), budget: String(s.budget) } }))} className="text-xs text-sky-300 hover:underline">✎ цена</button>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// ─────────────────────────── ROUTING RULES ───────────────────────────
const RoutingRulesSection: React.FC<{ password: string }> = ({ password }) => {
    const [rules, setRules] = useState<any[]>([]);
    const [managers, setManagers] = useState<any[]>([]);
    const [draft, setDraft] = useState({ priority: 100, match_country: '', match_source: '', match_study_level: '', match_min_english: '', assign_to_manager_id: '' });

    const load = async () => {
        const r = await fetch('/api/admin/routing-rules', { headers: { 'X-Admin-Password': password } }).then(r => r.json());
        setRules(r.rules || []);
        const m = await fetch('/api/admin/managers', { headers: { 'X-Admin-Password': password } }).then(r => r.json());
        setManagers(m.managers || []);
    };
    useEffect(() => { load(); }, []);

    const save = async (payload: any) => {
        await fetch('/api/admin/routing-rules', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
            body: JSON.stringify(payload),
        });
        load();
    };
    const remove = async (id: number) => {
        if (!confirm('Удалить правило?')) return;
        await fetch(`/api/admin/routing-rules/${id}`, { method: 'DELETE', headers: { 'X-Admin-Password': password } });
        load();
    };

    return (
        <div className="space-y-3">
            <p className="text-xs text-slate-500">Правила распределения новых лидов. Срабатывает первое подходящее (по сортировке priority). Если ни одно не подошло — обычный round-robin.</p>
            {rules.length === 0 && <div className="text-sm text-slate-500 italic">Правил пока нет</div>}
            {rules.map(r => (
                <div key={r.id} className="bg-slate-800/40 border border-slate-800 rounded-lg p-3 flex items-center gap-2 flex-wrap text-sm">
                    <span className="font-mono text-xs text-slate-400 bg-slate-900 px-2 py-0.5 rounded">p={r.priority}</span>
                    {r.match_country && <span className="text-slate-200">🌍 {r.match_country}</span>}
                    {r.match_source && <span className="text-slate-200">🏷 {r.match_source}</span>}
                    {r.match_study_level && <span className="text-slate-200">📚 {r.match_study_level}</span>}
                    {r.match_min_english && <span className="text-slate-200">🇬🇧 ≥{r.match_min_english}</span>}
                    <span className="text-sky-300">→ {r.manager_name || '— нет —'}</span>
                    {!r.active && <span className="text-xs text-rose-400">[неактивно]</span>}
                    <button onClick={() => remove(r.id)} className="ml-auto text-xs text-rose-400 hover:underline">удалить</button>
                </div>
            ))}
            <div className="border-t border-slate-800 pt-3 mt-3 space-y-2">
                <div className="text-xs uppercase font-semibold text-slate-400">+ Новое правило</div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm">
                    <input placeholder="Приоритет (10-1000)" className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 px-2 py-1.5 rounded" value={draft.priority} onChange={e => setDraft(p => ({ ...p, priority: Number(e.target.value) }))} />
                    <input placeholder="Страна (например, Япония)" className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 px-2 py-1.5 rounded" value={draft.match_country} onChange={e => setDraft(p => ({ ...p, match_country: e.target.value }))} />
                    <input placeholder="Источник" className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 px-2 py-1.5 rounded" value={draft.match_source} onChange={e => setDraft(p => ({ ...p, match_source: e.target.value }))} />
                    <input placeholder="Уровень программы" className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 px-2 py-1.5 rounded" value={draft.match_study_level} onChange={e => setDraft(p => ({ ...p, match_study_level: e.target.value }))} />
                    <input placeholder="Мин. английский (B2)" className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 px-2 py-1.5 rounded" value={draft.match_min_english} onChange={e => setDraft(p => ({ ...p, match_min_english: e.target.value }))} />
                    <select className="bg-slate-800/60 text-slate-100 border border-slate-700 px-2 py-1.5 rounded" value={draft.assign_to_manager_id} onChange={e => setDraft(p => ({ ...p, assign_to_manager_id: e.target.value }))}>
                        <option value="">→ выбрать менеджера</option>
                        {managers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
                    </select>
                </div>
                <button onClick={() => {
                    if (!draft.assign_to_manager_id) return alert('Выберите менеджера');
                    save({ ...draft, active: true });
                    setDraft({ priority: 100, match_country: '', match_source: '', match_study_level: '', match_min_english: '', assign_to_manager_id: '' });
                }} className="bg-sky-600 hover:bg-sky-500 text-white text-sm px-4 py-1.5 rounded font-medium">+ Добавить правило</button>
            </div>
        </div>
    );
};

// ─────────────────────────── QUICK REPLIES CRUD ───────────────────────────
const QuickRepliesSection: React.FC<{ password: string }> = ({ password }) => {
    const [items, setItems] = useState<any[]>([]);
    const [editing, setEditing] = useState<any>({ title: '', body: '', channel: 'whatsapp', sort: 100 });
    const load = () => fetch('/api/admin/quick-replies', { headers: { 'X-Admin-Password': password } }).then(r => r.json()).then(j => setItems(j.replies || []));
    useEffect(() => { load(); }, []);
    const save = async () => {
        if (!editing.title || !editing.body) return;
        await fetch('/api/admin/quick-replies', {
            method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
            body: JSON.stringify(editing),
        });
        setEditing({ title: '', body: '', channel: 'whatsapp', sort: 100 });
        load();
    };
    const remove = async (id: number) => {
        if (!confirm('Удалить шаблон?')) return;
        await fetch(`/api/admin/quick-replies/${id}`, { method: 'DELETE', headers: { 'X-Admin-Password': password } });
        load();
    };
    return (
        <div className="space-y-3">
            <p className="text-xs text-slate-500">Шаблоны быстрых ответов для менеджеров в карточке лида. Поддерживаются плейсхолдеры: <code className="text-sky-300">{'{manager}'}</code>, <code className="text-sky-300">{'{name}'}</code>, <code className="text-sky-300">{'{amount}'}</code>.</p>
            <div className="space-y-2">
                {items.map(r => (
                    <div key={r.id} className="bg-slate-800/40 border border-slate-800 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-slate-100">{r.title}</span>
                            <span className="text-[10px] font-mono bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded">#{r.sort}</span>
                            <span className="text-[10px] bg-slate-900 text-slate-400 px-1.5 py-0.5 rounded">{r.channel}</span>
                            <button onClick={() => setEditing(r)} className="ml-auto text-xs text-sky-300 hover:underline">✎</button>
                            <button onClick={() => remove(r.id)} className="text-xs text-rose-400 hover:underline">🗑</button>
                        </div>
                        <p className="text-xs text-slate-400 whitespace-pre-wrap">{r.body}</p>
                    </div>
                ))}
            </div>
            <div className="border-t border-slate-800 pt-3 space-y-2">
                <div className="text-xs uppercase font-semibold text-slate-400">{editing.id ? '✎ Редактирование' : '+ Новый шаблон'}</div>
                <input placeholder="Название" className="w-full bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 px-3 py-1.5 rounded" value={editing.title} onChange={e => setEditing((p: any) => ({ ...p, title: e.target.value }))} />
                <textarea rows={4} placeholder="Текст сообщения с плейсхолдерами {manager}, {name}…" className="w-full bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 px-3 py-1.5 rounded text-sm" value={editing.body} onChange={e => setEditing((p: any) => ({ ...p, body: e.target.value }))} />
                <div className="flex gap-2">
                    <input type="number" placeholder="Сортировка" className="bg-slate-800/60 text-slate-100 border border-slate-700 px-3 py-1.5 rounded w-32" value={editing.sort} onChange={e => setEditing((p: any) => ({ ...p, sort: Number(e.target.value) }))} />
                    <select className="bg-slate-800/60 text-slate-100 border border-slate-700 px-3 py-1.5 rounded" value={editing.channel} onChange={e => setEditing((p: any) => ({ ...p, channel: e.target.value }))}>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="telegram">Telegram</option>
                        <option value="email">Email</option>
                        <option value="sms">SMS</option>
                    </select>
                    <button onClick={save} className="bg-sky-600 hover:bg-sky-500 text-white text-sm px-4 py-1.5 rounded font-medium">{editing.id ? '💾 Обновить' : '+ Создать'}</button>
                    {editing.id && <button onClick={() => setEditing({ title: '', body: '', channel: 'whatsapp', sort: 100 })} className="text-sm text-slate-400 hover:underline">отмена</button>}
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────── AUDIT VIEWER ───────────────────────────
const AuditViewer: React.FC<{ password: string }> = ({ password }) => {
    const [events, setEvents] = useState<any[]>([]);
    const [entity, setEntity] = useState('');
    useEffect(() => {
        const p = new URLSearchParams();
        if (entity) p.set('entity_type', entity);
        p.set('limit', '200');
        fetch(`/api/admin/audit?${p}`, { headers: { 'X-Admin-Password': password } }).then(r => r.json()).then(j => setEvents(j.events || []));
    }, [entity]);
    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <span className="text-xs uppercase text-slate-400">Тип:</span>
                {[
                    { v: '', l: 'Всё' },
                    { v: 'lead', l: 'Лиды' },
                    { v: 'file', l: 'Файлы' },
                    { v: 'task', l: 'Задачи' },
                ].map(o => (
                    <button key={o.v} onClick={() => setEntity(o.v)}
                        className={`text-xs px-3 py-1 rounded ${entity === o.v ? 'bg-sky-600 text-white' : 'bg-slate-800/70 hover:bg-slate-700 text-slate-200'}`}>{o.l}</button>
                ))}
            </div>
            <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl divide-y divide-slate-800/60 max-h-[600px] overflow-y-auto">
                {events.length === 0 && <div className="text-sm text-slate-500 italic p-4">События не зафиксированы</div>}
                {events.map(e => (
                    <div key={e.id} className="p-3 hover:bg-slate-800/30">
                        <div className="flex items-center gap-2 text-xs">
                            <span className="text-slate-500 font-mono">{new Date(e.created_at).toLocaleString('ru-RU')}</span>
                            <span className="text-slate-300">{e.actor_name || '—'}</span>
                            {e.actor_role === 'teamlead' && <span className="text-violet-300">👑</span>}
                            <span className="text-sky-300 font-mono ml-auto">{e.action}</span>
                            <span className="text-slate-400">#{e.entity_id}</span>
                        </div>
                        {(e.after_data || e.before_data) && (
                            <details className="mt-1">
                                <summary className="text-[10px] text-slate-500 cursor-pointer hover:text-slate-300">детали</summary>
                                <pre className="text-[10px] text-slate-400 bg-slate-950/60 rounded p-2 mt-1 overflow-x-auto">{JSON.stringify(e.after_data || e.before_data, null, 2)}</pre>
                            </details>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

// ─────────────────────────── BACKUP / CALCULATOR SHARE ───────────────────────────
const BackupAndToolsSection: React.FC<{ password: string }> = ({ password }) => {
    const [calcParams, setCalcParams] = useState({ country: '', isScholarship: false });
    const calcUrl = (() => {
        const p = new URLSearchParams();
        if (calcParams.country) p.set('country', calcParams.country);
        if (calcParams.isScholarship) p.set('scholarship', '1');
        return `${typeof window !== 'undefined' ? window.location.origin : ''}/#calculator${p.toString() ? '?' + p.toString() : ''}`;
    })();
    const download = async () => {
        const r = await fetch('/api/admin/backup', { headers: { 'X-Admin-Password': password } });
        const blob = await r.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `goglobal-backup-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(a.href);
    };
    return (
        <div className="space-y-4">
            <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4">
                <div className="text-sm font-semibold text-slate-100 mb-1">💾 Полный бэкап БД</div>
                <p className="text-xs text-slate-400 mb-3">Скачивает JSON-дамп всех таблиц CRM (лиды, менеджеры, статусы, файлы, задачи, теги, audit log, routing rules и т.д.). На случай миграции или восстановления.</p>
                <button onClick={download} className="bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white text-sm px-4 py-2 rounded-lg font-semibold shadow-[0_0_16px_-4px_rgba(56,189,248,0.5)]">
                    📦 Скачать полный дамп
                </button>
            </div>
            <div className="bg-slate-800/40 border border-slate-800 rounded-xl p-4">
                <div className="text-sm font-semibold text-slate-100 mb-1">🔗 Поделиться калькулятором с клиентом</div>
                <p className="text-xs text-slate-400 mb-3">Сгенерируйте ссылку на калькулятор сайта с предзаполненными параметрами — пришлите клиенту в WhatsApp.</p>
                <div className="flex gap-2 mb-2">
                    <input placeholder="Страна (например, japan)" className="flex-grow bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 px-3 py-1.5 rounded text-sm" value={calcParams.country} onChange={e => setCalcParams(p => ({ ...p, country: e.target.value }))} />
                    <label className="flex items-center gap-2 text-sm text-slate-300">
                        <input type="checkbox" checked={calcParams.isScholarship} onChange={e => setCalcParams(p => ({ ...p, isScholarship: e.target.checked }))} />
                        Грант
                    </label>
                </div>
                <div className="flex gap-2 items-center">
                    <code className="flex-grow text-xs text-sky-300 bg-slate-950/60 border border-slate-800 rounded px-2 py-1.5 break-all">{calcUrl}</code>
                    <button onClick={() => { navigator.clipboard.writeText(calcUrl); alert('Скопировано'); }} className="text-xs bg-sky-600 hover:bg-sky-500 text-white px-3 py-1.5 rounded">📋 Копировать</button>
                </div>
            </div>
        </div>
    );
};

// ─────────────────────────── TAGS MANAGEMENT ───────────────────────────
const TagsSection: React.FC<{ password: string }> = ({ password }) => {
    const [tags, setTags] = useState<any[] | null>(null);
    const [draft, setDraft] = useState({ label: '', color: '#0ea5e9', emoji: '' });
    const [saving, setSaving] = useState(false);

    const load = async () => {
        const r = await fetch('/api/admin/tags', { headers: { 'X-Admin-Password': password } });
        const j = await r.json();
        setTags(j.tags || []);
    };
    useEffect(() => { load(); }, []);

    const upsert = async (t: any) => {
        setSaving(true);
        try {
            await fetch('/api/admin/tags', {
                method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
                body: JSON.stringify(t),
            });
            await load();
        } finally { setSaving(false); }
    };

    const remove = async (id: number, label: string) => {
        if (!confirm(`Удалить метку «${label}»? Она снимется со всех лидов.`)) return;
        await fetch(`/api/admin/tags/${id}`, { method: 'DELETE', headers: { 'X-Admin-Password': password } });
        await load();
    };

    const PALETTE = ['#ef4444', '#f97316', '#f59e0b', '#10b981', '#06b6d4', '#0ea5e9', '#3b82f6', '#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#64748b'];

    return (
        <div className="space-y-3">
            <div className="text-xs text-slate-400">Метки — цветные ярлыки для категоризации лидов (горячий, VIP, бюджетник и т.д.). Менеджеры выбирают их во вкладке «Сделка» в карточке лида.</div>
            {!tags ? <p className="text-slate-400 text-sm">Загрузка…</p> : (
                <div className="space-y-2">
                    {tags.length === 0 && <div className="text-sm text-slate-400 italic">Меток пока нет — добавьте первую ниже</div>}
                    {tags.map(t => (
                        <div key={t.id} className="flex items-center gap-2 bg-slate-800/40 border border-slate-800 rounded-lg p-2">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-white text-xs font-medium" style={{ backgroundColor: t.color || '#0ea5e9' }}>
                                {t.emoji && <span>{t.emoji}</span>}
                                {t.label}
                            </span>
                            <span className="text-xs text-slate-400">используется в <span className="font-semibold text-slate-200">{t.usage_count || 0}</span> лидах</span>
                            <button onClick={() => remove(t.id, t.label)} className="ml-auto text-xs text-rose-600 hover:underline">Удалить</button>
                        </div>
                    ))}
                </div>
            )}

            <div className="border-t border-slate-800 pt-3 mt-3">
                <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-2">+ Новая метка</div>
                <div className="flex flex-wrap gap-2 items-end">
                    <label className="text-xs">
                        <span className="block text-slate-400 mb-0.5">Название</span>
                        <input className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 px-2 py-1.5 rounded text-sm w-48"
                            placeholder="например, VIP"
                            value={draft.label} onChange={e => setDraft({ ...draft, label: e.target.value })} />
                    </label>
                    <label className="text-xs">
                        <span className="block text-slate-400 mb-0.5">Эмодзи</span>
                        <input className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 px-2 py-1.5 rounded text-sm w-16 text-center"
                            placeholder="⭐"
                            value={draft.emoji} onChange={e => setDraft({ ...draft, emoji: e.target.value })} />
                    </label>
                    <label className="text-xs">
                        <span className="block text-slate-400 mb-0.5">Цвет</span>
                        <input type="color" className="bg-slate-800/60 text-slate-100 placeholder-slate-500 w-12 h-9 border border-slate-700 rounded cursor-pointer"
                            value={draft.color} onChange={e => setDraft({ ...draft, color: e.target.value })} />
                    </label>
                    <div className="flex flex-wrap gap-1">
                        {PALETTE.map(c => (
                            <button key={c} type="button"
                                onClick={() => setDraft({ ...draft, color: c })}
                                className="w-6 h-6 rounded-full border-2 hover:scale-110 transition"
                                style={{ backgroundColor: c, borderColor: draft.color === c ? '#0f172a' : 'transparent' }} />
                        ))}
                    </div>
                    <button disabled={saving || !draft.label.trim()}
                        onClick={() => {
                            upsert(draft);
                            setDraft({ label: '', color: '#0ea5e9', emoji: '' });
                        }}
                        className="text-xs bg-sky-600 hover:bg-sky-700 disabled:opacity-50 text-white px-4 py-2 rounded font-medium">
                        + Добавить
                    </button>
                </div>
            </div>
        </div>
    );
};

// SVG donut chart for category breakdowns
const DonutChart: React.FC<{ data: { label: string; value: number; color?: string }[]; size?: number; thickness?: number }> = ({ data, size = 180, thickness = 28 }) => {
    const total = data.reduce((s, d) => s + d.value, 0);
    const r = (size - thickness) / 2;
    const circumference = 2 * Math.PI * r;
    let offset = 0;
    const palette = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16', '#f97316', '#64748b'];
    return (
        <div className="flex items-center gap-4">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
                <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e2e8f0" strokeWidth={thickness} />
                {total > 0 && data.map((d, i) => {
                    const len = (d.value / total) * circumference;
                    const seg = (
                        <circle key={i} cx={size / 2} cy={size / 2} r={r}
                            fill="none" stroke={d.color || palette[i % palette.length]}
                            strokeWidth={thickness}
                            strokeDasharray={`${len} ${circumference - len}`}
                            strokeDashoffset={-offset}
                            transform={`rotate(-90 ${size / 2} ${size / 2})`} />
                    );
                    offset += len;
                    return seg;
                })}
                <text x={size / 2} y={size / 2 - 6} textAnchor="middle" className="text-2xl font-bold" fill="#0f172a">{total}</text>
                <text x={size / 2} y={size / 2 + 16} textAnchor="middle" className="text-xs" fill="#64748b">всего</text>
            </svg>
            <div className="space-y-1 text-xs">
                {data.slice(0, 8).map((d, i) => (
                    <div key={i} className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-sm" style={{ background: d.color || palette[i % palette.length] }} />
                        <span className="text-slate-200">{d.label}</span>
                        <span className="font-mono font-semibold text-slate-50">{d.value}</span>
                        <span className="text-slate-400">({total > 0 ? Math.round((d.value / total) * 100) : 0}%)</span>
                    </div>
                ))}
                {data.length > 8 && <div className="text-slate-400">+ ещё {data.length - 8}</div>}
            </div>
        </div>
    );
};

const HBar: React.FC<{ label: string; value: number; max: number; color?: string }> = ({ label, value, max, color }) => (
    <div>
        <div className="flex items-baseline justify-between text-xs mb-0.5">
            <span className="text-slate-200">{label}</span>
            <span className="font-mono font-semibold text-slate-50">{value}</span>
        </div>
        <div className="w-full h-2 bg-slate-800/70 rounded-full overflow-hidden">
            <div className="h-full rounded-full transition-all" style={{ width: `${max > 0 ? (value / max) * 100 : 0}%`, background: color || '#3b82f6' }} />
        </div>
    </div>
);

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
        const res = await fetch(url, { headers: { 'X-Admin-Password': password } });
        if (!res.ok) { alert('Ошибка экспорта'); return; }
        const blob = await res.blob();
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `goglobal-leads-${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(a.href);
    };

    if (loading || !data) return <p className="text-slate-400 text-sm">Загрузка...</p>;

    const t = data.totals;
    const maxDaily = Math.max(1, ...data.daily.map((d: any) => d.received));
    const f = data.forecast || { pipeline: 0, weighted: 0, won_this_month: 0, deals_open: 0, avg_score: 0 };
    const fmt$ = (n: number) => '$' + Math.round(n || 0).toLocaleString();

    return (
        <div className="space-y-4">
            <div className="flex flex-wrap gap-2 items-center">
                <span className="text-xs uppercase tracking-wide text-slate-400">Окно:</span>
                {[7, 30, 90, 180].map(d => (
                    <button key={d} onClick={() => setDays(d)}
                        className={`text-sm px-3 py-1 rounded ${days === d ? 'bg-sky-600 text-white' : 'bg-slate-800/70 hover:bg-slate-700 text-slate-200'}`}>
                        {d} дн
                    </button>
                ))}
                <button onClick={load} className="text-sm bg-slate-800/70 hover:bg-slate-700 px-3 py-1 rounded ml-auto">↻</button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3">
                    <div className="text-xs uppercase text-slate-300">Всего лидов</div>
                    <div className="text-2xl font-bold text-slate-50">{t.total}</div>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                    <div className="text-xs uppercase text-amber-300">Открытых</div>
                    <div className="text-2xl font-bold text-amber-300">{t.open}</div>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3">
                    <div className="text-xs uppercase text-emerald-300">Закрыто (won)</div>
                    <div className="text-2xl font-bold text-emerald-300">{t.won}</div>
                    <div className="text-xs text-slate-400 mt-1">конверсия: {t.conversionPct}%</div>
                </div>
                <div className={`rounded-lg p-3 border ${t.slaCompliancePct >= 80 ? 'bg-emerald-500/10 border-emerald-500/30' : t.slaCompliancePct >= 60 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
                    <div className="text-xs uppercase text-slate-200">SLA соблюдён</div>
                    <div className="text-2xl font-bold text-slate-50">{t.slaCompliancePct}%</div>
                    <div className="text-xs text-slate-400 mt-1">просрочено сейчас: {t.slaBreachedOpen}</div>
                </div>
            </div>

            {/* 💰 Sales forecast */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 text-white rounded-2xl p-5 shadow-xl">
                <div className="flex items-baseline justify-between mb-4">
                    <div>
                        <div className="text-xs uppercase tracking-widest text-sky-300 font-bold">💰 Sales Forecast</div>
                        <div className="text-xs text-white/60 mt-0.5">Прогноз продаж и pipeline по всем менеджерам</div>
                    </div>
                    <div className="text-xs text-white/50">средний скоринг: <span className="text-white font-bold">{Math.round(f.avg_score || 0)}/100</span></div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-white/5 border border-white/10 backdrop-blur rounded-xl p-3">
                        <div className="text-[10px] uppercase tracking-wider text-sky-300 font-semibold">Pipeline</div>
                        <div className="text-2xl font-extrabold mt-1">{fmt$(f.pipeline)}</div>
                        <div className="text-xs text-white/60 mt-1">{f.deals_open || 0} сделок в работе</div>
                    </div>
                    <div className="bg-sky-500/15 border border-sky-300/30 backdrop-blur rounded-xl p-3">
                        <div className="text-[10px] uppercase tracking-wider text-sky-200 font-semibold">Взвешенный прогноз</div>
                        <div className="text-2xl font-extrabold mt-1">{fmt$(f.weighted)}</div>
                        <div className="text-xs text-white/60 mt-1">× вероятность</div>
                    </div>
                    <div className="bg-emerald-500/15 border border-emerald-500/40 backdrop-blur rounded-xl p-3">
                        <div className="text-[10px] uppercase tracking-wider text-emerald-200 font-semibold">Закрыто (won) MTD</div>
                        <div className="text-2xl font-extrabold mt-1">{fmt$(f.won_this_month)}</div>
                        <div className="text-xs text-white/60 mt-1">с начала месяца</div>
                    </div>
                    <div className="bg-amber-500/15 border border-amber-500/40 backdrop-blur rounded-xl p-3">
                        <div className="text-[10px] uppercase tracking-wider text-amber-200 font-semibold">Конверсия</div>
                        <div className="text-2xl font-extrabold mt-1">{t.conversionPct}%</div>
                        <div className="text-xs text-white/60 mt-1">won / closed</div>
                    </div>
                </div>
            </div>

            {/* 🪜 Conversion funnel SVG */}
            {data.funnel && data.funnel.length > 0 && (
                <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-4 shadow-sm">
                    <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-3">🪜 Воронка обработки лидов</div>
                    {(() => {
                        const funnel = data.funnel.filter((s: any) => s.n > 0);
                        if (funnel.length === 0) return <div className="text-sm text-slate-400 italic">нет данных</div>;
                        const maxN = Math.max(1, ...funnel.map((s: any) => s.n));
                        const stepHeight = 38;
                        const fullW = 600;
                        return (
                            <svg viewBox={`0 0 ${fullW} ${funnel.length * (stepHeight + 8)}`} className="w-full">
                                {funnel.map((s: any, i: number) => {
                                    const w = (s.n / maxN) * fullW;
                                    const x = (fullW - w) / 2;
                                    const y = i * (stepHeight + 8);
                                    return (
                                        <g key={s.code}>
                                            <rect x={x} y={y} width={w} height={stepHeight} rx={6}
                                                fill={s.color || '#0ea5e9'} opacity={0.85} />
                                            <text x={fullW / 2} y={y + stepHeight / 2 + 5} textAnchor="middle"
                                                fill="white" fontSize={13} fontWeight={700}>
                                                {s.label}: {s.n}
                                            </text>
                                        </g>
                                    );
                                })}
                            </svg>
                        );
                    })()}
                </div>
            )}

            {/* Client stages mini-bar */}
            {data.stages && data.stages.some((s: any) => s.n > 0) && (
                <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-4 shadow-sm">
                    <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-3">🎓 Этапы клиентов (post-win)</div>
                    <div className="flex flex-wrap gap-2">
                        {data.stages.map((s: any) => (
                            <div key={s.code} className="flex items-center gap-2 bg-slate-800/40 border border-slate-800 rounded-lg px-3 py-2">
                                <span className="w-2 h-2 rounded-full" style={{ background: s.color || '#0ea5e9' }} />
                                <span className="text-xs font-medium text-slate-200">{s.label}</span>
                                <span className="text-sm font-bold text-slate-50">{s.n}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* 👥 Workload per manager — horizontal bars */}
            {data.byManager && data.byManager.length > 0 && (
                <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-4 shadow-sm">
                    <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-3">👥 Нагрузка менеджеров</div>
                    {(() => {
                        const top = data.byManager.filter((m: any) => m.total > 0).slice(0, 12);
                        if (top.length === 0) return <div className="text-sm text-slate-400 italic">нет данных</div>;
                        const maxTotal = Math.max(1, ...top.map((m: any) => m.total));
                        return (
                            <div className="space-y-2">
                                {top.map((m: any) => {
                                    const pctOpen = (m.open / maxTotal) * 100;
                                    const pctWon = (m.won / maxTotal) * 100;
                                    const pctLost = ((m.closed - m.won) / maxTotal) * 100;
                                    return (
                                        <div key={m.id}>
                                            <div className="flex items-baseline justify-between text-xs mb-1">
                                                <span className="text-slate-200 font-medium">
                                                    {m.full_name} <span className="text-slate-400">{m.login}</span>
                                                    {!m.active && <span className="ml-1 text-rose-500">·неактивен</span>}
                                                </span>
                                                <span className="text-slate-400">
                                                    <span className="font-mono font-bold text-slate-50">{m.total}</span>
                                                    {m.pipeline > 0 && <span className="ml-2 text-emerald-300">{fmt$(m.pipeline)}</span>}
                                                    {m.sla_breached > 0 && <span className="ml-2 text-rose-600">⚠{m.sla_breached}</span>}
                                                </span>
                                            </div>
                                            <div className="flex w-full h-3 bg-slate-800/70 rounded-full overflow-hidden">
                                                <div className="h-full bg-amber-500" style={{ width: `${pctOpen}%` }} title={`Открыто: ${m.open}`} />
                                                <div className="h-full bg-emerald-500" style={{ width: `${pctWon}%` }} title={`Won: ${m.won}`} />
                                                <div className="h-full bg-rose-400" style={{ width: `${pctLost}%` }} title={`Lost: ${m.closed - m.won}`} />
                                            </div>
                                        </div>
                                    );
                                })}
                                <div className="flex gap-4 text-xs text-slate-400 pt-2 mt-2 border-t border-slate-800/60">
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-amber-500 rounded" />Открытых</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-emerald-500 rounded" />Won</span>
                                    <span className="flex items-center gap-1"><span className="w-2 h-2 bg-rose-400 rounded" />Lost</span>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            )}

            <div>
                <div className="text-xs uppercase text-slate-400 mb-2">Лиды по дням</div>
                <div className="flex items-end gap-1 h-32 bg-slate-800/40 rounded-lg p-2 border border-slate-800">
                    {data.daily.map((d: any) => (
                        <div key={d.date} className="flex-1 group relative flex flex-col items-center justify-end">
                            <div className="w-full bg-sky-500 hover:bg-sky-600 rounded-t transition-colors"
                                style={{ height: `${(d.received / maxDaily) * 100}%`, minHeight: '2px' }} />
                            <div className="absolute bottom-full mb-1 hidden group-hover:block bg-slate-900/60 backdrop-blur-sm text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                                {d.date}: получено {d.received} / закрыто {d.closed}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="grid md:grid-cols-2 gap-4">
                <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-4 shadow-sm">
                    <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-3">🍩 По статусам</div>
                    {data.byStatus && data.byStatus.length > 0 ? (
                        <DonutChart data={data.byStatus.filter((s: any) => s.n > 0).map((s: any) => ({ label: s.label, value: s.n, color: s.color || undefined }))} />
                    ) : <div className="text-sm text-slate-400 italic">нет данных</div>}
                </div>

                <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-4 shadow-sm md:col-span-2">
                    <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-3">📡 По источникам (откуда узнали)</div>
                    {data.bySource && data.bySource.length > 0 ? (
                        <div className="grid md:grid-cols-2 gap-x-6 gap-y-2.5">
                            {(() => {
                                const max = Math.max(1, ...data.bySource.map((s: any) => s.total));
                                return data.bySource.map((s: any, i: number) => {
                                    const conv = s.closed > 0 ? Math.round((s.won / s.closed) * 100) : 0;
                                    const palette = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316'];
                                    return (
                                        <div key={s.source}>
                                            <div className="flex items-baseline justify-between text-xs mb-0.5">
                                                <span className="text-slate-200 font-medium">{s.source}</span>
                                                <span className="text-slate-400">
                                                    <span className="font-mono font-bold text-slate-50">{s.total}</span>
                                                    {s.closed > 0 && <span className="ml-2 text-emerald-300">won {s.won} · {conv}%</span>}
                                                </span>
                                            </div>
                                            <div className="w-full h-2.5 bg-slate-800/70 rounded-full overflow-hidden">
                                                <div className="h-full rounded-full" style={{ width: `${(s.total / max) * 100}%`, background: palette[i % palette.length] }} />
                                            </div>
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    ) : (
                        <p className="text-xs text-slate-400 italic">Пока нет данных</p>
                    )}
                </div>

                <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-lg p-3">
                    <div className="text-xs uppercase text-slate-400 mb-2">По менеджерам (за {data.windowDays} дн)</div>
                    <table className="w-full text-xs">
                        <thead className="text-left text-slate-400">
                            <tr><th className="py-1">Менеджер</th><th className="text-right">Всего</th><th className="text-right">Откр.</th><th className="text-right">Закр.</th><th className="text-right">SLA✓</th><th className="text-right">SLA✗</th></tr>
                        </thead>
                        <tbody>
                            {data.byManager.map((m: any) => {
                                const slaTotal = (m.sla_met || 0) + (m.sla_breached || 0);
                                return (
                                    <tr key={m.id} className="border-t border-slate-800/60">
                                        <td className="py-1">
                                            <div>{m.full_name} <span className="text-slate-400">{m.login}</span></div>
                                            {!m.active && <span className="text-xs text-red-400">неактивен</span>}
                                        </td>
                                        <td className="text-right">{m.total}</td>
                                        <td className="text-right">{m.open}</td>
                                        <td className="text-right">{m.closed}</td>
                                        <td className="text-right text-emerald-400">{m.sla_met}</td>
                                        <td className={`text-right ${m.sla_breached > 0 ? 'text-red-400 font-medium' : ''}`}>{m.sla_breached}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {t.avgCloseMinutes !== null && (
                <div className="text-sm text-slate-300">
                    Среднее время от получения до закрытия: <strong>{Math.floor(t.avgCloseMinutes / 60)}ч {Math.round(t.avgCloseMinutes % 60)}м</strong>
                </div>
            )}

            {/* Country / University / Event / Study Level breakdowns */}
            <div className="grid md:grid-cols-2 gap-4">
                {data.byCountry && data.byCountry.length > 0 && (
                    <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-4 shadow-sm">
                        <div className="text-xs uppercase tracking-wider font-semibold text-slate-400 mb-3">🌍 По странам</div>
                        <div className="space-y-2.5">
                            {(() => {
                                const max = Math.max(1, ...data.byCountry.map((c: any) => c.total));
                                return data.byCountry.slice(0, 10).map((c: any, i: number) => (
                                    <HBar key={c.country} label={c.country} value={c.total} max={max}
                                        color={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#ef4444', '#64748b'][i % 10]} />
                                ));
                            })()}
                        </div>
                    </div>
                )}

                {data.byUniversity && data.byUniversity.length > 0 && (
                    <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-3">
                        <div className="text-xs uppercase text-slate-400 mb-2">🎓 По университетам</div>
                        <table className="w-full text-xs">
                            <thead className="text-left text-slate-400">
                                <tr><th>Университет</th><th className="text-right">Всего</th><th className="text-right">Won</th></tr>
                            </thead>
                            <tbody>
                                {data.byUniversity.map((u: any) => (
                                    <tr key={u.university} className="border-t border-slate-800/60">
                                        <td className="py-1 truncate max-w-[60%]" title={u.university}>{u.university}</td>
                                        <td className="text-right font-mono">{u.total}</td>
                                        <td className="text-right font-mono text-emerald-300">{u.won}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {data.byStudyLevel && data.byStudyLevel.length > 0 && (
                    <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-3">
                        <div className="text-xs uppercase text-slate-400 mb-2">📚 По уровню программы</div>
                        <div className="space-y-1">
                            {data.byStudyLevel.map((l: any) => (
                                <div key={l.level} className="flex justify-between text-xs py-1 border-t border-slate-800/60">
                                    <span>{l.level}</span>
                                    <span className="font-mono">{l.total}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {data.byEvent && data.byEvent.length > 0 && (
                    <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-xl p-3">
                        <div className="text-xs uppercase text-slate-400 mb-2">🎟 По событиям</div>
                        <table className="w-full text-xs">
                            <thead className="text-left text-slate-400">
                                <tr><th>Событие</th><th className="text-right">Всего</th><th className="text-right">Won</th></tr>
                            </thead>
                            <tbody>
                                {data.byEvent.map((e: any) => (
                                    <tr key={e.event} className="border-t border-slate-800/60">
                                        <td className="py-1 truncate max-w-[60%]">{e.event}</td>
                                        <td className="text-right font-mono">{e.total}</td>
                                        <td className="text-right font-mono text-emerald-300">{e.won}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="border-t border-slate-800 pt-3 mt-3">
                <div className="text-xs uppercase text-slate-400 mb-2">Экспорт CSV</div>
                <div className="flex flex-wrap gap-2 items-center">
                    <label className="text-sm">с
                        <input type="date" className="bg-slate-800/60 text-slate-100 placeholder-slate-500 ml-1 border border-slate-700 px-2 py-1 rounded text-sm" value={from} onChange={e => setFrom(e.target.value)} />
                    </label>
                    <label className="text-sm">по
                        <input type="date" className="bg-slate-800/60 text-slate-100 placeholder-slate-500 ml-1 border border-slate-700 px-2 py-1 rounded text-sm" value={to} onChange={e => setTo(e.target.value)} />
                    </label>
                    <button onClick={exportCsv} className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-1.5 rounded-lg font-medium shadow-sm">
                        📊 Скачать Excel (.xlsx)
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
    const [editing, setEditing] = useState<LeadRec | null>(null);
    const [includeClosed, setIncludeClosed] = useState(false);

    const load = async () => {
        setLoading(true);
        try {
            const leadsUrl = `/api/admin/leads${includeClosed ? '?include_closed=1' : ''}`;
            const [l, s] = await Promise.all([
                fetch(leadsUrl, { headers: { 'X-Admin-Password': password } }).then(r => r.json()),
                fetch('/api/admin/leads/stats', { headers: { 'X-Admin-Password': password } }).then(r => r.json()),
            ]);
            setLeads(l.leads || []);
            setStats(s);
        } finally { setLoading(false); }
    };
    useEffect(() => { load(); }, [includeClosed]);

    const removeLead = async (id: number, name: string) => {
        if (!confirm(`⚠️ Удалить лид #${id} (${name || 'без имени'})?\n\nКомментарии и история тоже будут удалены. Действие НЕОБРАТИМО.`)) return;
        const r = await fetch(`/api/admin/leads/${id}`, {
            method: 'DELETE', headers: { 'X-Admin-Password': password }
        });
        if (!r.ok) {
            const j = await r.json().catch(() => ({}));
            alert('Ошибка: ' + (j.error || r.status));
        } else await load();
    };

    const saveEdit = async () => {
        if (!editing) return;
        const e: any = editing;
        const payload: any = {
            name: e.name, phone: e.phone, email: e.email, country: e.country,
            comment: e.comment, source: e.source,
            desired_university: e.desired_university || '', notes: e.notes || '',
        };
        const r = await fetch(`/api/admin/leads/${editing.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'X-Admin-Password': password },
            body: JSON.stringify(payload),
        });
        if (!r.ok) {
            const j = await r.json().catch(() => ({}));
            alert('Ошибка: ' + (j.error || r.status));
        } else {
            setEditing(null);
            await load();
        }
    };

    if (loading) return <p className="text-slate-400 text-sm">Загрузка...</p>;

    return (
        <div className="space-y-4">
            {stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="bg-slate-800/40 border border-slate-800 rounded-lg p-3">
                        <div className="text-xs text-slate-300 uppercase">Всего лидов</div>
                        <div className="text-2xl font-bold text-slate-50">{stats.total}</div>
                    </div>
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                        <div className="text-xs text-amber-300 uppercase">Открытых</div>
                        <div className="text-2xl font-bold text-amber-300">{stats.open}</div>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                        <div className="text-xs text-red-300 uppercase">SLA просрочен</div>
                        <div className="text-2xl font-bold text-red-300">{stats.slaBreached}</div>
                    </div>
                    <button onClick={load} className="bg-sky-500/10 border border-sky-500/30 rounded-lg p-3 text-sm text-sky-300 font-medium">↻ Обновить</button>
                </div>
            )}

            <div className="flex gap-2 items-center">
                <button onClick={() => setIncludeClosed(!includeClosed)}
                    className={`text-sm px-4 py-2 rounded-lg font-medium border transition-colors ${includeClosed ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200' : 'bg-slate-800/70 border-slate-700 text-slate-200 hover:bg-slate-700'}`}>
                    {includeClosed ? '📂 Показаны: все лиды (включая закрытые)' : '📂 Скрыты закрытые/обработанные лиды'}
                </button>
                <span className="text-xs text-slate-400">Клик чтобы переключить</span>
            </div>

            {stats?.byManager?.length > 0 && (
                <div className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 rounded-lg p-3">
                    <div className="text-xs uppercase text-slate-400 mb-2">По менеджерам</div>
                    <table className="w-full text-sm">
                        <thead className="border-b border-slate-800">
                            <tr><th className="text-left py-1">Менеджер</th><th className="text-right">Всего</th><th className="text-right">Открыто</th><th className="text-right">Закрыто</th></tr>
                        </thead>
                        <tbody>
                            {stats.byManager.map((m: any) => (
                                <tr key={m.id} className="border-b border-slate-800/60">
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

            {editing && (
                <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto"
                    onClick={() => setEditing(null)}>
                    <div className="bg-slate-900/60 backdrop-blur-sm rounded-2xl shadow-2xl border border-slate-800 max-w-2xl w-full my-8"
                        onClick={e => e.stopPropagation()}>
                        <div className="border-b border-slate-800 p-4 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-50">✎ Редактировать лид #{editing.id}</h3>
                            <button onClick={() => setEditing(null)} className="text-slate-400 hover:text-slate-300 text-2xl">×</button>
                        </div>
                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            <label className="block">
                                <span className="block text-xs font-medium text-slate-200 mb-1">Имя</span>
                                <input className="bg-slate-800/60 text-slate-100 placeholder-slate-500 w-full border border-slate-700 rounded-lg px-3 py-2"
                                    value={editing.name || ''}
                                    onChange={e => setEditing(prev => prev ? { ...prev, name: e.target.value } : prev)} />
                            </label>
                            <label className="block">
                                <span className="block text-xs font-medium text-slate-200 mb-1">Телефон</span>
                                <input className="bg-slate-800/60 text-slate-100 placeholder-slate-500 w-full border border-slate-700 rounded-lg px-3 py-2 font-mono"
                                    value={editing.phone || ''}
                                    onChange={e => setEditing(prev => prev ? { ...prev, phone: e.target.value } : prev)} />
                            </label>
                            <label className="block">
                                <span className="block text-xs font-medium text-slate-200 mb-1">Email</span>
                                <input type="email" className="bg-slate-800/60 text-slate-100 placeholder-slate-500 w-full border border-slate-700 rounded-lg px-3 py-2"
                                    value={editing.email || ''}
                                    onChange={e => setEditing(prev => prev ? { ...prev, email: e.target.value } : prev)} />
                            </label>
                            <label className="block">
                                <span className="block text-xs font-medium text-slate-200 mb-1">Страна</span>
                                <input className="bg-slate-800/60 text-slate-100 placeholder-slate-500 w-full border border-slate-700 rounded-lg px-3 py-2"
                                    value={editing.country || ''}
                                    onChange={e => setEditing(prev => prev ? { ...prev, country: e.target.value } : prev)} />
                            </label>
                            <label className="block md:col-span-2">
                                <span className="block text-xs font-medium text-slate-200 mb-1">Желаемый университет</span>
                                <input className="bg-slate-800/60 text-slate-100 placeholder-slate-500 w-full border border-slate-700 rounded-lg px-3 py-2"
                                    value={(editing as any).desired_university || ''}
                                    onChange={e => setEditing(prev => prev ? { ...prev, desired_university: e.target.value } as any : prev)} />
                            </label>
                            <label className="block">
                                <span className="block text-xs font-medium text-slate-200 mb-1">Источник</span>
                                <input className="bg-slate-800/60 text-slate-100 placeholder-slate-500 w-full border border-slate-700 rounded-lg px-3 py-2"
                                    value={editing.source || ''}
                                    onChange={e => setEditing(prev => prev ? { ...prev, source: e.target.value } : prev)} />
                            </label>
                            <label className="block">
                                <span className="block text-xs font-medium text-slate-200 mb-1">Status code</span>
                                <input className="bg-slate-800/60 text-slate-100 placeholder-slate-500 w-full border border-slate-700 rounded-lg px-3 py-2 font-mono"
                                    value={editing.status_code || ''}
                                    onChange={e => setEditing(prev => prev ? { ...prev, status_code: e.target.value } : prev)} />
                            </label>
                            <label className="block md:col-span-2">
                                <span className="block text-xs font-medium text-slate-200 mb-1">Комментарий клиента</span>
                                <textarea rows={2} className="bg-slate-800/60 text-slate-100 placeholder-slate-500 w-full border border-slate-700 rounded-lg px-3 py-2"
                                    value={editing.comment || ''}
                                    onChange={e => setEditing(prev => prev ? { ...prev, comment: e.target.value } : prev)} />
                            </label>
                            <label className="block md:col-span-2">
                                <span className="block text-xs font-medium text-slate-200 mb-1">Заметка менеджера</span>
                                <textarea rows={2} className="bg-slate-800/60 text-slate-100 placeholder-slate-500 w-full border border-slate-700 rounded-lg px-3 py-2"
                                    value={editing.notes || ''}
                                    onChange={e => setEditing(prev => prev ? { ...prev, notes: e.target.value } : prev)} />
                            </label>
                        </div>
                        <div className="border-t border-slate-800 p-4 flex justify-end gap-2">
                            <button onClick={() => setEditing(null)}
                                className="bg-slate-800/70 hover:bg-slate-700 text-slate-200 px-4 py-2 rounded-lg text-sm font-medium">
                                Отмена
                            </button>
                            <button onClick={saveEdit}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-bold">
                                💾 Сохранить
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-slate-800/70">
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
                            <th className="px-2 py-2">Действия</th>
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
                                <tr key={l.id} className="border-b border-slate-800/60 hover:bg-slate-800/40">
                                    <td className="px-2 py-2 text-slate-400 font-mono text-xs">#{l.id}</td>
                                    <td className="px-2 py-2 text-xs text-slate-300">{new Date(l.received_at).toLocaleString('ru-RU', { dateStyle: 'short', timeStyle: 'short' })}</td>
                                    <td className="px-2 py-2">
                                        <span className={`text-[10px] px-2 py-0.5 rounded text-white font-bold ${srcInfo.bg}`} title={l.source}>{srcInfo.label}</span>
                                    </td>
                                    <td className="px-2 py-2 font-medium">{l.name || '—'}</td>
                                    <td className="px-2 py-2 text-xs">
                                        {l.phone && <div>📞 {l.phone}</div>}
                                        {l.email && <div className="text-slate-400">{l.email}</div>}
                                    </td>
                                    <td className="px-2 py-2 text-xs">{l.country}</td>
                                    <td className="px-2 py-2 text-xs">{l.manager_name || <em className="text-slate-400">не назначен</em>}</td>
                                    <td className="px-2 py-2">
                                        <span className="text-xs px-2 py-0.5 rounded text-white font-medium" style={{ backgroundColor: l.status_color || '#94a3b8' }}>{l.status_label || l.status_code}</span>
                                    </td>
                                    <td className="px-2 py-2 text-xs">{sla}</td>
                                    <td className="px-2 py-2 whitespace-nowrap">
                                        <button onClick={() => setEditing(l)}
                                            className="text-xs bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 px-2 py-1 rounded mr-1" title="Редактировать">✎</button>
                                        <button onClick={() => removeLead(l.id, l.name)}
                                            className="text-xs bg-red-500/10 hover:bg-red-100 text-red-300 px-2 py-1 rounded" title="Удалить">🗑</button>
                                    </td>
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
            <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden" style={{ fontFamily: "'Space Grotesk', system-ui", background: 'radial-gradient(ellipse at top, #0f172a 0%, #020617 50%, #000 100%)' }}>
                <div className="absolute inset-0 opacity-20 pointer-events-none" style={{
                    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 32px, rgba(56,189,248,0.15) 32px, rgba(56,189,248,0.15) 33px), repeating-linear-gradient(90deg, transparent, transparent 32px, rgba(56,189,248,0.15) 32px, rgba(56,189,248,0.15) 33px)',
                }} />
                <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] rounded-full opacity-20 pointer-events-none" style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.6) 0%, transparent 70%)' }} />
                <form onSubmit={handleLogin} className={`relative ${A_CARD} p-8 w-full max-w-md text-slate-100`}>
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
                        <img src="/ppp.png" alt="" className="w-12 h-auto" />
                        <div>
                            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-50">Admin</h2>
                            <p className="text-xs font-mono text-sky-400">// AUTH_REQUIRED</p>
                        </div>
                    </div>
                    <label className="block text-xs uppercase tracking-widest font-bold mb-1 text-slate-300">Пароль</label>
                    <input
                        type="password" autoFocus
                        placeholder="••••••••"
                        className={`w-full ${A_BORDER} bg-slate-800/50 text-slate-100 placeholder-slate-500 px-3 py-3 mb-4 font-mono text-base focus:outline-none focus:bg-slate-800 focus:border-sky-500 rounded-lg`}
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                    <button type="submit" className={`w-full bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white border border-sky-400/50 rounded-xl shadow-[0_0_24px_-4px_rgba(56,189,248,0.5)] active:translate-y-[1px] transition-all font-bold uppercase tracking-wider text-sm px-4 py-3`}>→ ВОЙТИ</button>
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
        <div className="min-h-screen relative text-slate-100" style={{ fontFamily: "'Space Grotesk', system-ui", background: 'radial-gradient(ellipse at top, #0f172a 0%, #020617 60%, #000 100%)' }}>
            {/* Admin-configurable background image */}
            {(sc as any).adminBgUrl && (
                <div className="fixed inset-0 pointer-events-none z-0" style={{
                    backgroundImage: `url("${(sc as any).adminBgUrl}")`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    opacity: 0.08,
                }} />
            )}
            {/* Subtle grid background overlay (only when no custom image) */}
            {!((sc as any).adminBgUrl) && (
                <div className="fixed inset-0 pointer-events-none opacity-[0.08] z-0" style={{
                    backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 32px, rgba(56,189,248,0.4) 32px, rgba(56,189,248,0.4) 33px), repeating-linear-gradient(90deg, transparent, transparent 32px, rgba(56,189,248,0.4) 32px, rgba(56,189,248,0.4) 33px)',
                }} />
            )}
            {/* Glow orbs */}
            <div className="fixed top-[10%] -left-[10%] w-[500px] h-[500px] rounded-full opacity-15 pointer-events-none z-0" style={{ background: 'radial-gradient(circle, rgba(56,189,248,0.8) 0%, transparent 70%)' }} />
            <div className="fixed bottom-[10%] -right-[10%] w-[500px] h-[500px] rounded-full opacity-10 pointer-events-none z-0" style={{ background: 'radial-gradient(circle, rgba(168,85,247,0.8) 0%, transparent 70%)' }} />

            {/* Sticky header */}
            <div className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur-xl text-sky-300 border-b border-sky-500/20 shadow-[0_4px_24px_-8px_rgba(56,189,248,0.3)]">
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
                    <h1 className="text-xl font-black uppercase tracking-tight bg-gradient-to-r from-sky-400 via-cyan-300 to-sky-400 bg-clip-text text-transparent">⚙️ ADMIN_PANEL</h1>
                    <div className="flex items-center gap-3">
                        {savedAt && <span className="text-sm font-mono text-emerald-400 flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />SAVED</span>}
                        <ATooltip text="Сохранить все изменения сайта в БД">
                            <button onClick={handleSave} disabled={saving}
                                className={`bg-gradient-to-r from-sky-500 to-cyan-500 hover:from-sky-400 hover:to-cyan-400 text-white border border-sky-400/50 rounded-xl shadow-[0_0_24px_-4px_rgba(56,189,248,0.5)] active:translate-y-[1px] transition-all font-bold uppercase tracking-wider text-sm px-4 py-2 disabled:opacity-50`}>
                                {saving ? '💾 ...' : '💾 СОХРАНИТЬ'}
                            </button>
                        </ATooltip>
                    </div>
                </div>
            </div>

            <div className="relative z-10 max-w-7xl mx-auto p-4">

                <Section title="🚦 Здоровье продаж" subtitle="Светофор: SLA, конверсия, оффлайн-менеджеры, застрявшие лиды" badge="CRM" defaultOpen accent="fuchsia">
                    <SalesHealthWidget password={password} />
                </Section>

                <Section title="📊 Статистика посещений" subtitle="Только публичный сайт (без админки)" accent="cyan">
                    <AnalyticsWidget password={password} />
                </Section>

                <Section title="📈 Дашборд CRM" subtitle="Метрики, конверсия, SLA, экспорт, Sales Forecast" badge="CRM" defaultOpen accent="fuchsia">
                    <CRMDashboard password={password} />
                </Section>

                <Section title="📆 Когортный анализ" subtitle="Удержание и конверсия лидов по месяцам поступления" badge="CRM" accent="cyan">
                    <CohortSection password={password} />
                </Section>

                <Section title="💸 ROI по источникам" subtitle="Cost-per-Lead, бюджет, потрачено, окупаемость" badge="CRM" accent="amber">
                    <SourceRoiSection password={password} />
                </Section>

                <Section title="🧑‍💼 Менеджеры по продажам (CRM)" subtitle="Логин/пароль для входа на /lidy + рабочие часы + увольнение" badge="CRM" accent="fuchsia">
                    <ManagersSection password={password} />
                </Section>

                <Section title="🤖 Авто-распределение лидов" subtitle="Правила: страна / источник / уровень → менеджер" badge="CRM" accent="violet">
                    <RoutingRulesSection password={password} />
                </Section>

                <Section title="🎯 Статусы лидов" subtitle="Что менеджер выбирает в карточке лида" badge="CRM" accent="violet">
                    <StatusesSection password={password} />
                </Section>

                <Section title="🏷 Метки клиентов" subtitle="Цветные ярлыки для категоризации (горячий, VIP, грант и т.д.)" badge="CRM" accent="red">
                    <TagsSection password={password} />
                </Section>

                <Section title="📨 Шаблоны быстрых ответов" subtitle="Готовые сообщения для менеджеров в WhatsApp/Telegram (с плейсхолдерами)" badge="CRM" accent="cyan">
                    <QuickRepliesSection password={password} />
                </Section>

                <Section title="🕒 Журнал аудита" subtitle="Кто что менял в системе — лиды, файлы, статусы, передачи" badge="CRM" accent="amber">
                    <AuditViewer password={password} />
                </Section>

                <Section title="🛠 Утилиты и бэкапы" subtitle="Полный дамп БД + шаринг калькулятора с клиентом" badge="CRM" accent="violet">
                    <BackupAndToolsSection password={password} />
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

                <Section title="🎟 События / ивент-ссылки" subtitle="Отдельный URL на каждое событие — лид получает метку ивента" badge="NEW" accent="fuchsia">
                    <EventsSection password={password} />
                </Section>

                <Section title="📞 Контакты, WhatsApp и график работы" subtitle="Телефон, email, расписание для футера" defaultOpen={false}>
                    <div className="space-y-3">
                        <label className="block text-sm">
                            <span className="block font-medium text-slate-200 mb-1">Телефон (отображается на сайте)</span>
                            <input className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-2 w-full rounded" value={ci.phone || ''}
                                onChange={e => setCI({ phone: e.target.value })} />
                        </label>
                        <label className="block text-sm">
                            <span className="block font-medium text-slate-200 mb-1">Email</span>
                            <input className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-2 w-full rounded" value={ci.email || ''}
                                onChange={e => setCI({ email: e.target.value })} />
                        </label>
                        <label className="block text-sm">
                            <span className="block font-medium text-slate-200 mb-1">Адрес офиса</span>
                            <input className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-2 w-full rounded" value={ci.address || ''}
                                onChange={e => setCI({ address: e.target.value })} />
                        </label>
                        <label className="block text-sm">
                            <span className="block font-medium text-slate-200 mb-1">Ссылка на 2GIS / карты</span>
                            <input className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-2 w-full rounded" value={ci.addressLink || ''}
                                onChange={e => setCI({ addressLink: e.target.value })} />
                        </label>
                        <label className="block text-sm">
                            <span className="block font-medium text-slate-200 mb-1">Instagram</span>
                            <input className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-2 w-full rounded" value={ci.instagram || ''}
                                onChange={e => setCI({ instagram: e.target.value })} />
                        </label>
                        <hr className="my-3" />
                        <h3 className="font-semibold text-slate-100">WhatsApp-кнопка (плавающая зелёная справа)</h3>
                        <label className="block text-sm">
                            <span className="block font-medium text-slate-200 mb-1">Номер телефона (только цифры с кодом страны)</span>
                            <input
                                className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-2 w-full rounded font-mono"
                                placeholder="996999530092"
                                value={ci.whatsappNumber || ''}
                                onChange={e => setCI({ whatsappNumber: e.target.value.replace(/\D/g, '') })}
                            />
                            <span className="text-xs text-slate-400 block mt-1">Например: 996999530092 (без + и пробелов)</span>
                        </label>
                        <label className="block text-sm">
                            <span className="block font-medium text-slate-200 mb-1">Автотекст в окно WhatsApp</span>
                            <textarea
                                className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-2 w-full rounded"
                                rows={2}
                                placeholder="Добрый день! Пишу с сайта GoGlobal!"
                                value={ci.whatsappMessage || ''}
                                onChange={e => setCI({ whatsappMessage: e.target.value })}
                            />
                            <span className="text-xs text-slate-400 block mt-1">Подставляется в текстовое поле когда посетитель открывает виджет</span>
                        </label>

                        <hr className="my-3" />
                        <h3 className="font-semibold text-slate-100">⏰ График работы (показывается в футере сайта)</h3>
                        {((sc.workSchedule as Array<{ day: string; hours: string }>) || [
                            { day: 'Пн–Пт', hours: '09:00 – 18:00' },
                            { day: 'Сб', hours: '10:00 – 15:00' },
                            { day: 'Вс', hours: 'Выходной' },
                        ]).map((row, i, arr) => (
                            <div key={i} className="grid grid-cols-[1fr_2fr_auto] gap-2">
                                <input className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-2 rounded text-sm" placeholder="День (например, Пн–Пт)"
                                    value={row.day}
                                    onChange={e => {
                                        const list = [...arr]; list[i] = { ...row, day: e.target.value };
                                        setSC({ workSchedule: list });
                                    }} />
                                <input className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-2 rounded text-sm" placeholder="Часы (например, 09:00 – 18:00 или Выходной)"
                                    value={row.hours}
                                    onChange={e => {
                                        const list = [...arr]; list[i] = { ...row, hours: e.target.value };
                                        setSC({ workSchedule: list });
                                    }} />
                                <button className="text-red-400 text-sm px-2"
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
                        <span className="block font-medium text-slate-200 mb-1">Тагалайн</span>
                        <input
                            className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-2 w-full rounded"
                            placeholder="Образование за рубежом"
                            value={sc.loaderTagline ?? ''}
                            onChange={e => setSC({ loaderTagline: e.target.value })}
                        />
                    </label>
                </Section>

                <Section title="🎨 Внешний вид админки" subtitle="Фоновое изображение и оформление" accent="violet">
                    <div className="space-y-3">
                        <p className="text-sm text-slate-300">
                            Фоновое изображение применяется только в админке (на главной сайта остаётся брендовое оформление).
                            Картинка отображается с лёгкой полупрозрачностью, чтобы карточки оставались читаемыми.
                        </p>
                        <label className="block">
                            <span className="block text-sm font-medium text-slate-200 mb-1">Фон админки (URL или загрузка)</span>
                            <ImageInput
                                value={(sc as any).adminBgUrl || ''}
                                password={password}
                                onChange={v => setSC({ adminBgUrl: v })}
                                placeholder="URL или загрузите файл"
                            />
                            <span className="block text-xs text-slate-400 mt-1">
                                Оставьте пустым чтобы использовать стандартный градиент. Рекомендую светлые изображения с природой / технологичными узорами.
                            </span>
                        </label>
                        {(sc as any).adminBgUrl && (
                            <button onClick={() => setSC({ adminBgUrl: '' })}
                                className="text-xs text-rose-600 hover:underline">× Убрать фон</button>
                        )}
                    </div>
                </Section>

                <Section title="🧮 Калькулятор стоимости обучения" subtitle="Заголовок, чек-лист, услуги и базовые тексты — отображаются на главной" accent="amber">
                    <CalculatorConfigSection sc={sc} setSC={setSC} />
                </Section>

                <Section title="🖼 Изображения сайта" subtitle="Hero и About">
                    <div className="space-y-4">
                        <label className="block text-sm">
                            <span className="block font-medium text-slate-200 mb-1">Hero — фоновая картинка</span>
                            <ImageInput value={sc.heroImage || ''} password={password}
                                onChange={v => setSC({ heroImage: v })} />
                        </label>
                        <label className="block text-sm">
                            <span className="block font-medium text-slate-200 mb-1">About — картинка 1</span>
                            <ImageInput value={sc.aboutImage1 || ''} password={password}
                                onChange={v => setSC({ aboutImage1: v })} />
                        </label>
                        <label className="block text-sm">
                            <span className="block font-medium text-slate-200 mb-1">About — картинка 2</span>
                            <ImageInput value={sc.aboutImage2 || ''} password={password}
                                onChange={v => setSC({ aboutImage2: v })} />
                        </label>
                    </div>
                </Section>

                <Section title="🎓 Партнёры (плашки в About)" subtitle="Список ВУЗов-партнёров">
                    {(sc.partnerUniversities || []).map((uni: any, index: number) => (
                        <div key={index} className="flex gap-2 mb-2 items-center">
                            <input
                                className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-2 flex-grow rounded"
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
                                className="text-red-400 font-bold px-2"
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
                    <p className="text-xs text-slate-400 mb-3">ID региона должен совпадать с тем, что выбран у каждой страны. Совет: оставить латиницей (Asia, Europe, USA) и менять только Название.</p>
                    {regions.map((r: any, i: number) => (
                        <div key={i} className="flex gap-2 mb-2 items-center">
                            <input
                                className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-2 rounded font-mono text-xs w-24"
                                placeholder="ID"
                                value={r.id}
                                onChange={e => {
                                    const list = [...regions];
                                    list[i] = { ...list[i], id: e.target.value };
                                    setSC({ regions: list });
                                }}
                            />
                            <input
                                className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-2 rounded flex-grow"
                                placeholder="Отображаемое имя (например, Азия)"
                                value={r.name}
                                onChange={e => {
                                    const list = [...regions];
                                    list[i] = { ...list[i], name: e.target.value };
                                    setSC({ regions: list });
                                }}
                            />
                            <button
                                className="text-red-400 font-bold px-2"
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
                        className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded mb-4 font-medium"
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
                        <div key={country.id} className="mb-6 border border-slate-800 p-4 rounded-lg bg-slate-800/40">
                            <div className="flex items-start justify-between mb-3">
                                <input
                                    className="bg-slate-800/60 text-slate-100 placeholder-slate-500 font-bold text-lg border border-slate-700 p-2 rounded flex-grow mr-3"
                                    value={country.name}
                                    onChange={e => {
                                        const list = [...localData.countries];
                                        list[cIndex].name = e.target.value;
                                        setLocalData({ ...localData, countries: list });
                                    }}
                                />
                                <button
                                    className="text-red-400 text-sm hover:underline"
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
                                    <span className="block font-medium text-slate-200 mb-1">Континент / Регион</span>
                                    <select
                                        className="border border-slate-700 p-2 w-full rounded bg-slate-900/60 backdrop-blur-sm"
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
                                    <span className="block font-medium text-slate-200 mb-1">Краткое описание</span>
                                    <input className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-2 w-full rounded" value={country.description}
                                        onChange={e => {
                                            const list = [...localData.countries];
                                            list[cIndex].description = e.target.value;
                                            setLocalData({ ...localData, countries: list });
                                        }}
                                    />
                                </label>
                                <label className="text-sm">
                                    <span className="block font-medium text-slate-200 mb-1">Стоимость обучения min ($)</span>
                                    <input type="number" className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-2 w-full rounded" value={country.costs.tuition.min}
                                        onChange={e => {
                                            const list = [...localData.countries];
                                            list[cIndex].costs.tuition.min = parseInt(e.target.value) || 0;
                                            setLocalData({ ...localData, countries: list });
                                        }} />
                                </label>
                                <label className="text-sm">
                                    <span className="block font-medium text-slate-200 mb-1">Стоимость жизни min ($)</span>
                                    <input type="number" className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-2 w-full rounded" value={country.costs.living.min}
                                        onChange={e => {
                                            const list = [...localData.countries];
                                            list[cIndex].costs.living.min = parseInt(e.target.value) || 0;
                                            setLocalData({ ...localData, countries: list });
                                        }} />
                                </label>
                                <label className="text-sm md:col-span-2">
                                    <span className="block font-medium text-slate-200 mb-1">💼 Услуги GoGlobal для этой страны ($)</span>
                                    <input type="number" className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-2 w-full rounded font-mono" placeholder="оставить пустым = взять глобальное значение"
                                        value={(country as any).servicesCost ?? ''}
                                        onChange={e => {
                                            const list = [...localData.countries];
                                            (list[cIndex] as any).servicesCost = e.target.value === '' ? null : Math.max(0, parseInt(e.target.value) || 0);
                                            setLocalData({ ...localData, countries: list });
                                        }} />
                                    <span className="text-xs text-slate-400 block mt-1">Fallback: если у конкретного университета не задано — используется это значение. Если и здесь пусто — берётся из глобального калькулятор-конфига.</span>
                                </label>
                                <div className="md:col-span-2 text-sm">
                                    <span className="block font-medium text-slate-200 mb-1">Картинка страны</span>
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

                            <div className="mt-3 pt-3 border-t border-slate-800">
                                <h4 className="font-semibold text-sm mb-2">Университеты</h4>
                                {country.universities.map((uni: any, uIndex: number) => (
                                    <div key={uIndex} className="ml-2 mb-3 p-3 border border-slate-800 bg-slate-900/60 backdrop-blur-sm rounded">
                                        <input
                                            className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-1 w-full font-bold mb-2 rounded"
                                            placeholder="Название университета"
                                            value={uni.name}
                                            onChange={e => {
                                                const list = [...localData.countries];
                                                list[cIndex].universities[uIndex].name = e.target.value;
                                                setLocalData({ ...localData, countries: list });
                                            }}
                                        />
                                        <textarea
                                            className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-1 w-full text-sm mb-2 rounded"
                                            placeholder="Описание"
                                            value={uni.description}
                                            onChange={e => {
                                                const list = [...localData.countries];
                                                list[cIndex].universities[uIndex].description = e.target.value;
                                                setLocalData({ ...localData, countries: list });
                                            }}
                                        />
                                        <div className="grid grid-cols-2 gap-2 mb-2">
                                            <label className="text-sm">
                                                <span className="block text-xs text-slate-400 mb-1">💵 Стоимость обучения / год ($)</span>
                                                <input type="number" className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-1.5 w-full rounded text-sm"
                                                    placeholder="20000"
                                                    value={uni.tuition ?? ''}
                                                    onChange={e => {
                                                        const list = [...localData.countries];
                                                        const v = e.target.value === '' ? null : Math.max(0, parseInt(e.target.value) || 0);
                                                        list[cIndex].universities[uIndex].tuition = v;
                                                        setLocalData({ ...localData, countries: list });
                                                    }} />
                                            </label>
                                            <label className="text-sm">
                                                <span className="block text-xs text-slate-400 mb-1">💼 Услуги GoGlobal / год ($)</span>
                                                <input type="number" className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-1.5 w-full rounded text-sm"
                                                    placeholder="взять из страны"
                                                    value={uni.servicesCost ?? ''}
                                                    onChange={e => {
                                                        const list = [...localData.countries];
                                                        const v = e.target.value === '' ? null : Math.max(0, parseInt(e.target.value) || 0);
                                                        list[cIndex].universities[uIndex].servicesCost = v;
                                                        setLocalData({ ...localData, countries: list });
                                                    }} />
                                            </label>
                                            <label className="text-sm flex items-center gap-2 pl-2 col-span-2">
                                                <input type="checkbox" className="accent-emerald-600 w-4 h-4"
                                                    checked={!!uni.grantAvailable}
                                                    onChange={e => {
                                                        const list = [...localData.countries];
                                                        list[cIndex].universities[uIndex].grantAvailable = e.target.checked;
                                                        setLocalData({ ...localData, countries: list });
                                                    }} />
                                                <span className="text-xs">🎁 Есть грант / стипендия</span>
                                            </label>
                                        </div>
                                        {uni.grantAvailable && (
                                            <input
                                                className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-1 w-full text-xs mb-2 rounded"
                                                placeholder="Описание гранта (необязательно)"
                                                value={uni.grantNote || ''}
                                                onChange={e => {
                                                    const list = [...localData.countries];
                                                    list[cIndex].universities[uIndex].grantNote = e.target.value;
                                                    setLocalData({ ...localData, countries: list });
                                                }}
                                            />
                                        )}
                                        <div className="text-xs font-medium text-slate-200 mb-1">Картинки</div>
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
                                            className="text-red-400 text-xs mt-2 hover:underline"
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
                        className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded mb-4 font-medium"
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
                        <div key={t.id} className="mb-4 p-3 border border-slate-800 rounded-lg bg-slate-800/40 grid md:grid-cols-2 gap-2">
                            <label className="text-sm">
                                <span className="block font-medium text-slate-200 mb-1">Имя</span>
                                <input className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-2 w-full rounded"
                                    value={t.name}
                                    onChange={e => {
                                        const list = [...localData.testimonials]; list[i].name = e.target.value;
                                        setLocalData({ ...localData, testimonials: list });
                                    }} />
                            </label>
                            <label className="text-sm">
                                <span className="block font-medium text-slate-200 mb-1">Страна (ID)</span>
                                <select className="border border-slate-700 p-2 w-full rounded bg-slate-900/60 backdrop-blur-sm"
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
                                <span className="block font-medium text-slate-200 mb-1">Университет</span>
                                <input className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-2 w-full rounded"
                                    value={t.university}
                                    onChange={e => {
                                        const list = [...localData.testimonials]; list[i].university = e.target.value;
                                        setLocalData({ ...localData, testimonials: list });
                                    }} />
                            </label>
                            <label className="text-sm md:col-span-2">
                                <span className="block font-medium text-slate-200 mb-1">Цитата (короткая)</span>
                                <input className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-2 w-full rounded"
                                    value={t.quote}
                                    onChange={e => {
                                        const list = [...localData.testimonials]; list[i].quote = e.target.value;
                                        setLocalData({ ...localData, testimonials: list });
                                    }} />
                            </label>
                            <label className="text-sm md:col-span-2">
                                <span className="block font-medium text-slate-200 mb-1">История (полный текст)</span>
                                <textarea className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-2 w-full rounded" rows={3}
                                    value={t.story}
                                    onChange={e => {
                                        const list = [...localData.testimonials]; list[i].story = e.target.value;
                                        setLocalData({ ...localData, testimonials: list });
                                    }} />
                            </label>
                            <div className="md:col-span-2 flex justify-end">
                                <button className="text-red-400 text-sm hover:underline"
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
                        className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-2 rounded mb-4 font-medium"
                        onClick={() => {
                            setLocalData({
                                ...localData,
                                faqs: [...(localData.faqs || []), { question: 'Новый вопрос', answer: 'Ответ' }],
                            });
                        }}
                    >+ Добавить вопрос</button>

                    {(localData.faqs || []).map((q: any, i: number) => (
                        <div key={i} className="mb-3 p-3 border border-slate-800 rounded-lg bg-slate-800/40 space-y-2">
                            <input className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-2 w-full rounded font-medium"
                                placeholder="Вопрос"
                                value={q.question}
                                onChange={e => {
                                    const list = [...localData.faqs]; list[i].question = e.target.value;
                                    setLocalData({ ...localData, faqs: list });
                                }} />
                            <textarea className="bg-slate-800/60 text-slate-100 placeholder-slate-500 border border-slate-700 p-2 w-full rounded" rows={2}
                                placeholder="Ответ"
                                value={q.answer}
                                onChange={e => {
                                    const list = [...localData.faqs]; list[i].answer = e.target.value;
                                    setLocalData({ ...localData, faqs: list });
                                }} />
                            <button className="text-red-400 text-sm hover:underline"
                                onClick={() => {
                                    const list = [...localData.faqs]; list.splice(i, 1);
                                    setLocalData({ ...localData, faqs: list });
                                }}>Удалить</button>
                        </div>
                    ))}
                </Section>

                <Section title="🔔 Telegram-уведомления" subtitle="Бот для нотификаций о лидах (используется в CRM)">
                    <p className="text-sm text-slate-300 mb-3">
                        Чат и токен бота настраиваются через переменные окружения Railway:
                        <code className="bg-slate-800/70 px-1 mx-1 rounded text-xs">TELEGRAM_BOT_TOKEN</code>,
                        <code className="bg-slate-800/70 px-1 mx-1 rounded text-xs">TELEGRAM_CHAT_ID</code>.
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
