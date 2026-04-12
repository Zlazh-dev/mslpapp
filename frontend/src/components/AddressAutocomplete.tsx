import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronDown, Loader2, MapPin } from 'lucide-react';
import api from '../lib/api';

interface Region {
    id: string;
    name: string;
}

interface AddressAutocompleteProps {
    provinsi: string;
    kotaKabupaten: string;
    kecamatan: string;
    kelurahan: string;
    onChange: (field: 'provinsi' | 'kotaKabupaten' | 'kecamatan' | 'kelurahan', value: string) => void;
}

function AutocompleteInput({
    label,
    value,
    options,
    loading,
    disabled,
    placeholder,
    onChange,
}: {
    label: string;
    value: string;
    options: Region[];
    loading: boolean;
    disabled?: boolean;
    placeholder: string;
    onChange: (name: string, id: string) => void;
}) {
    const [open, setOpen] = useState(false);
    const [filter, setFilter] = useState('');
    const ref = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
        };
        if (open) document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [open]);

    const filtered = filter
        ? options.filter(o => o.name.toLowerCase().includes(filter.toLowerCase()))
        : options;

    const handleSelect = (opt: Region) => {
        onChange(opt.name, opt.id);
        setFilter('');
        setOpen(false);
    };

    const handleInputChange = (val: string) => {
        setFilter(val);
        // If user types manually, try to auto-match an exact option
        const matchedOpt = options.find(o => o.name.toLowerCase() === val.toLowerCase());
        const idToPass = matchedOpt ? matchedOpt.id : '';
        
        onChange(val, idToPass);
        if (!open && val) setOpen(true);
    };

    return (
        <div ref={ref} className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
            <div className="relative">
                <input
                    ref={inputRef}
                    type="text"
                    value={open ? filter || value : value}
                    placeholder={disabled ? 'Pilih di atas dulu' : placeholder}
                    disabled={disabled}
                    onFocus={() => {
                        if (!disabled) {
                            setOpen(true);
                            setFilter('');
                        }
                    }}
                    onChange={e => handleInputChange(e.target.value)}
                    className="form-input pr-8"
                />
                {loading ? (
                    <Loader2 size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" />
                ) : (
                    <ChevronDown size={14} className={`absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
                )}
            </div>
            {open && !disabled && (
                <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg">
                    {loading ? (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 size={16} className="animate-spin text-gray-400" />
                        </div>
                    ) : filtered.length === 0 ? (
                        <div className="px-3 py-3 text-xs text-gray-400 text-center">
                            {options.length === 0 ? 'Memuat data...' : 'Tidak ditemukan'}
                        </div>
                    ) : (
                        filtered.map(opt => (
                            <button
                                key={opt.id}
                                type="button"
                                onClick={() => handleSelect(opt)}
                                className={`w-full text-left px-3 py-2 text-sm hover:bg-emerald-50 hover:text-emerald-700 transition ${
                                    opt.name === value ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-700'
                                }`}
                            >
                                {opt.name}
                            </button>
                        ))
                    )}
                </div>
            )}
        </div>
    );
}

export default function AddressAutocomplete({ provinsi, kotaKabupaten, kecamatan, kelurahan, onChange }: AddressAutocompleteProps) {
    const [provinces, setProvinces] = useState<Region[]>([]);
    const [regencies, setRegencies] = useState<Region[]>([]);
    const [districts, setDistricts] = useState<Region[]>([]);
    const [villages, setVillages] = useState<Region[]>([]);

    const [loadingProv, setLoadingProv] = useState(false);
    const [loadingReg, setLoadingReg] = useState(false);
    const [loadingDist, setLoadingDist] = useState(false);
    const [loadingVil, setLoadingVil] = useState(false);

    // Track selected IDs for cascading
    const [provId, setProvId] = useState('');
    const [regId, setRegId] = useState('');
    const [distId, setDistId] = useState('');

    // Load provinces on mount
    useEffect(() => {
        setLoadingProv(true);
        api.get('/wilayah/provinces')
            .then(r => setProvinces(r.data || []))
            .catch(() => setProvinces([]))
            .finally(() => setLoadingProv(false));
    }, []);

    // Load regencies when province changes
    useEffect(() => {
        if (provId) {
            setLoadingReg(true);
            setRegencies([]);
            setDistricts([]);
            setVillages([]);
            api.get(`/wilayah/regencies/${provId}`)
                .then(r => setRegencies(r.data || []))
                .catch(() => setRegencies([]))
                .finally(() => setLoadingReg(false));
        }
    }, [provId]);

    // Load districts when regency changes
    useEffect(() => {
        if (regId) {
            setLoadingDist(true);
            setDistricts([]);
            setVillages([]);
            api.get(`/wilayah/districts/${regId}`)
                .then(r => setDistricts(r.data || []))
                .catch(() => setDistricts([]))
                .finally(() => setLoadingDist(false));
        }
    }, [regId]);

    // Load villages when district changes
    useEffect(() => {
        if (distId) {
            setLoadingVil(true);
            setVillages([]);
            api.get(`/wilayah/villages/${distId}`)
                .then(r => setVillages(r.data || []))
                .catch(() => setVillages([]))
                .finally(() => setLoadingVil(false));
        }
    }, [distId]);

    const handleProvChange = useCallback((name: string, id: string) => {
        onChange('provinsi', name);
        setProvId(id);
        if (id) {
            // Clear dependent fields
            onChange('kotaKabupaten', '');
            onChange('kecamatan', '');
            onChange('kelurahan', '');
            setRegId('');
            setDistId('');
        }
    }, [onChange]);

    const handleRegChange = useCallback((name: string, id: string) => {
        onChange('kotaKabupaten', name);
        setRegId(id);
        if (id) {
            onChange('kecamatan', '');
            onChange('kelurahan', '');
            setDistId('');
        }
    }, [onChange]);

    const handleDistChange = useCallback((name: string, id: string) => {
        onChange('kecamatan', name);
        setDistId(id);
        if (id) {
            onChange('kelurahan', '');
        }
    }, [onChange]);

    const handleVilChange = useCallback((name: string, _id: string) => {
        onChange('kelurahan', name);
    }, [onChange]);

    return (
        <>
            <AutocompleteInput
                label="Provinsi"
                value={provinsi}
                options={provinces}
                loading={loadingProv}
                placeholder="Pilih provinsi"
                onChange={handleProvChange}
            />
            <AutocompleteInput
                label="Kota / Kabupaten"
                value={kotaKabupaten}
                options={regencies}
                loading={loadingReg}
                disabled={!provinsi}
                placeholder="Pilih kota/kabupaten"
                onChange={handleRegChange}
            />
            <AutocompleteInput
                label="Kecamatan"
                value={kecamatan}
                options={districts}
                loading={loadingDist}
                disabled={!kotaKabupaten}
                placeholder="Pilih kecamatan"
                onChange={handleDistChange}
            />
            <AutocompleteInput
                label="Kelurahan / Desa"
                value={kelurahan}
                options={villages}
                loading={loadingVil}
                disabled={!kecamatan}
                placeholder="Pilih kelurahan/desa"
                onChange={handleVilChange}
            />
        </>
    );
}
