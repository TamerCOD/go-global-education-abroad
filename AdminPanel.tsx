import React, { useRef, useState } from 'react';
import { useData } from './DataContext';

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
                className="border p-2 flex-grow rounded text-sm"
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder ?? 'URL или загрузите файл'}
            />
            <input
                ref={inputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleUpload}
            />
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
                        className="border p-1 flex-grow rounded text-xs"
                        value={url}
                        onChange={e => updateAt(i, e.target.value)}
                    />
                    <button
                        type="button"
                        className="text-red-500 text-sm px-2"
                        onClick={() => removeAt(i)}
                        title="Удалить"
                    >✕</button>
                </div>
            ))}
            <div className="flex gap-2 items-center pt-1">
                <input
                    type="text"
                    placeholder="Вставить URL изображения..."
                    className="border p-1 flex-grow rounded text-xs"
                    value={pendingUrl}
                    onChange={e => setPendingUrl(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addUrl(); } }}
                />
                <button
                    type="button"
                    className="text-xs bg-slate-200 px-3 py-1 rounded hover:bg-slate-300"
                    onClick={addUrl}
                >+ URL</button>
                <input
                    ref={inputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={handleFiles}
                />
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

const AdminPanel: React.FC = () => {
    const { data, refresh } = useData();
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState('');
    const [localData, setLocalData] = useState<any>(null);

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
                setLocalData(data);
            } else {
                alert('Invalid credentials');
            }
        } catch (e) {
            console.error(e);
        }
    };

    const handleSave = async () => {
        try {
            const res = await fetch('/api/data', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password, data: localData })
            });
            if (res.ok) {
                alert('Saved successfully!');
                refresh();
            } else {
                alert('Failed to save');
            }
        } catch (e) {
            console.error(e);
        }
    };

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
                <form onSubmit={handleLogin} className="bg-white p-8 rounded-xl shadow-md w-96">
                    <h2 className="text-2xl font-bold mb-4">Admin Login</h2>
                    <input
                        type="password"
                        placeholder="Password"
                        className="w-full p-2 border border-slate-300 rounded mb-4"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                    />
                    <button type="submit" className="w-full bg-brand-600 text-white p-2 rounded">Login</button>
                </form>
            </div>
        );
    }

    if (!localData) return null;

    return (
        <div className="min-h-screen bg-slate-100 p-8">
            <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-md p-8">
                <div className="flex justify-between items-center mb-6">
                    <h1 className="text-3xl font-bold">Admin Panel</h1>
                    <button onClick={handleSave} className="bg-green-600 text-white px-4 py-2 rounded">Save All Changes</button>
                </div>

                <section className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">Loader (анимация при открытии сайта)</h2>
                    <label className="block">
                        <span className="text-sm font-medium block mb-1">Текст под логотипом</span>
                        <input
                            className="border p-2 w-full rounded"
                            placeholder="Образование за рубежом"
                            value={localData.siteConfig?.loaderTagline ?? ''}
                            onChange={e => setLocalData({ ...localData, siteConfig: { ...localData.siteConfig, loaderTagline: e.target.value } })}
                        />
                        <span className="text-xs text-slate-500 mt-1 block">Появляется под логотипом во время загрузочной анимации</span>
                    </label>
                </section>

                <hr className="my-8" />

                <section className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">Site Images</h2>
                    <div className="grid gap-4">
                        <label className="block">
                            <span className="text-sm font-medium block mb-1">Hero Image</span>
                            <ImageInput
                                value={localData.siteConfig?.heroImage || ''}
                                password={password}
                                onChange={v => setLocalData({ ...localData, siteConfig: { ...localData.siteConfig, heroImage: v } })}
                            />
                        </label>
                        <label className="block">
                            <span className="text-sm font-medium block mb-1">About Image 1</span>
                            <ImageInput
                                value={localData.siteConfig?.aboutImage1 || ''}
                                password={password}
                                onChange={v => setLocalData({ ...localData, siteConfig: { ...localData.siteConfig, aboutImage1: v } })}
                            />
                        </label>
                        <label className="block">
                            <span className="text-sm font-medium block mb-1">About Image 2</span>
                            <ImageInput
                                value={localData.siteConfig?.aboutImage2 || ''}
                                password={password}
                                onChange={v => setLocalData({ ...localData, siteConfig: { ...localData.siteConfig, aboutImage2: v } })}
                            />
                        </label>
                    </div>
                </section>

                <hr className="my-8" />

                <section className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">Partner Universities (Top Section)</h2>
                    {(localData.siteConfig?.partnerUniversities || []).map((uni: any, index: number) => (
                        <div key={index} className="flex gap-2 mb-2 items-center">
                            <input
                                className="border p-2 flex-grow rounded"
                                placeholder="University Name"
                                value={uni.name}
                                onChange={e => {
                                    const newPartners = [...(localData.siteConfig.partnerUniversities || [])];
                                    newPartners[index].name = e.target.value;
                                    setLocalData({ ...localData, siteConfig: { ...localData.siteConfig, partnerUniversities: newPartners } });
                                }}
                            />
                            <label className="flex items-center gap-1">
                                <input
                                    type="checkbox"
                                    checked={uni.highlighted || false}
                                    onChange={e => {
                                        const newPartners = [...(localData.siteConfig.partnerUniversities || [])];
                                        newPartners[index].highlighted = e.target.checked;
                                        setLocalData({ ...localData, siteConfig: { ...localData.siteConfig, partnerUniversities: newPartners } });
                                    }}
                                /> Highlight
                            </label>
                            <button
                                className="text-red-500 font-bold"
                                onClick={() => {
                                    const newPartners = [...(localData.siteConfig.partnerUniversities || [])];
                                    newPartners.splice(index, 1);
                                    setLocalData({ ...localData, siteConfig: { ...localData.siteConfig, partnerUniversities: newPartners } });
                                }}
                            >X</button>
                        </div>
                    ))}
                    <button
                        className="text-brand-600 font-bold"
                        onClick={() => {
                            const newPartners = [...(localData.siteConfig?.partnerUniversities || [])];
                            newPartners.push({ name: 'New Partner', highlighted: false });
                            setLocalData({ ...localData, siteConfig: { ...localData.siteConfig, partnerUniversities: newPartners } });
                        }}
                    >+ Add Partner</button>
                </section>

                <hr className="my-8" />

                <section className="mb-8">
                    <h2 className="text-xl font-semibold mb-4">Contact Info</h2>
                    <div className="grid gap-4">
                        <label>Phone
                            <input
                                className="border p-2 w-full rounded"
                                value={localData.contactInfo.phone}
                                onChange={e => setLocalData({ ...localData, contactInfo: { ...localData.contactInfo, phone: e.target.value } })}
                            />
                        </label>
                        <label>Email
                            <input
                                className="border p-2 w-full rounded"
                                value={localData.contactInfo.email}
                                onChange={e => setLocalData({ ...localData, contactInfo: { ...localData.contactInfo, email: e.target.value } })}
                            />
                        </label>
                    </div>
                </section>

                <hr className="my-8" />

                <section>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-semibold mb-4">Countries & Universities</h2>
                        <button
                            className="bg-brand-600 text-white px-3 py-1 rounded"
                            onClick={() => {
                                const newCountries = [...localData.countries];
                                newCountries.push({
                                    id: `new-${Date.now()}`,
                                    name: 'New Country',
                                    region: 'Europe',
                                    description: '',
                                    image: '',
                                    costs: { tuition: { min: 0, max: 0 }, living: { min: 0, max: 0 } },
                                    coordinates: { top: '50%', left: '50%' },
                                    universities: []
                                });
                                setLocalData({ ...localData, countries: newCountries });
                            }}
                        >+ Add Country</button>
                    </div>
                    {localData.countries.map((country: any, cIndex: number) => (
                        <div key={country.id} className="mb-6 border p-4 rounded bg-slate-50 relative">
                            <button
                                className="absolute top-2 right-2 text-red-500 font-bold"
                                onClick={() => {
                                    if (confirm('Are you sure you want to delete this country?')) {
                                        const newCountries = [...localData.countries];
                                        newCountries.splice(cIndex, 1);
                                        setLocalData({ ...localData, countries: newCountries });
                                    }
                                }}
                            >Delete Country</button>
                            <input
                                className="font-bold text-lg mb-2 border p-1 rounded"
                                value={country.name}
                                onChange={e => {
                                    const newCountries = [...localData.countries];
                                    newCountries[cIndex].name = e.target.value;
                                    setLocalData({ ...localData, countries: newCountries });
                                }}
                            />
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <label className="text-sm">Tuition Min
                                    <input type="number" className="border p-1 w-full rounded" value={country.costs.tuition.min} onChange={e => {
                                        const newCountries = [...localData.countries];
                                        newCountries[cIndex].costs.tuition.min = parseInt(e.target.value);
                                        setLocalData({ ...localData, countries: newCountries });
                                    }} />
                                </label>
                                <label className="text-sm">Living Min
                                    <input type="number" className="border p-1 w-full rounded" value={country.costs.living.min} onChange={e => {
                                        const newCountries = [...localData.countries];
                                        newCountries[cIndex].costs.living.min = parseInt(e.target.value);
                                        setLocalData({ ...localData, countries: newCountries });
                                    }} />
                                </label>
                                <div className="text-sm col-span-2">
                                    <span className="block mb-1">Country Image</span>
                                    <ImageInput
                                        value={country.image}
                                        password={password}
                                        onChange={v => {
                                            const newCountries = [...localData.countries];
                                            newCountries[cIndex].image = v;
                                            setLocalData({ ...localData, countries: newCountries });
                                        }}
                                    />
                                </div>
                            </div>
                            <div className="mb-2">
                                <h4 className="font-semibold text-sm">Universities</h4>
                                {country.universities.map((uni: any, uIndex: number) => (
                                    <div key={uIndex} className="ml-4 mb-2 p-3 border bg-white rounded">
                                        <input
                                            className="border p-1 w-full font-bold mb-1"
                                            value={uni.name}
                                            onChange={e => {
                                                const newCountries = [...localData.countries];
                                                newCountries[cIndex].universities[uIndex].name = e.target.value;
                                                setLocalData({ ...localData, countries: newCountries });
                                            }}
                                        />
                                        <textarea
                                            className="border p-1 w-full text-sm mb-2"
                                            value={uni.description}
                                            onChange={e => {
                                                const newCountries = [...localData.countries];
                                                newCountries[cIndex].universities[uIndex].description = e.target.value;
                                                setLocalData({ ...localData, countries: newCountries });
                                            }}
                                        />
                                        <div className="text-xs font-medium mb-1">Images</div>
                                        <ImageListInput
                                            values={uni.images || []}
                                            password={password}
                                            onChange={v => {
                                                const newCountries = [...localData.countries];
                                                newCountries[cIndex].universities[uIndex].images = v;
                                                setLocalData({ ...localData, countries: newCountries });
                                            }}
                                        />
                                        <button
                                            className="text-red-500 text-xs mt-2"
                                            onClick={() => {
                                                const newCountries = [...localData.countries];
                                                newCountries[cIndex].universities.splice(uIndex, 1);
                                                setLocalData({ ...localData, countries: newCountries });
                                            }}
                                        >Remove University</button>
                                    </div>
                                ))}
                                <button
                                    className="text-brand-600 text-sm ml-4"
                                    onClick={() => {
                                        const newCountries = [...localData.countries];
                                        newCountries[cIndex].universities.push({ name: 'New Uni', description: 'desc', images: [] });
                                        setLocalData({ ...localData, countries: newCountries });
                                    }}
                                >+ Add University</button>
                            </div>
                        </div>
                    ))}
                </section>
            </div>
        </div>
    );
};

export default AdminPanel;
