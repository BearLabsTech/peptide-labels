import type { ChangeEvent, CSSProperties } from 'react'
import type { LabelModelInput } from '../labelModel'

const inputStyle: CSSProperties = {
    width: '100%', padding: '8px 12px', border: '1px solid #ccc',
    borderRadius: '4px', fontSize: '0.95rem', boxSizing: 'border-box'
}

export const SectionTitle = ({ title }: { title: string }) => (
    <h2 style={{ fontSize: '0.9rem', color: '#222', borderBottom: '2px solid #eee', paddingBottom: 4, marginBottom: 12 }}>{title}</h2>
)

export interface TextInputProps { label: string; value?: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean; }
export function TextInput({ label, value, onChange, placeholder, disabled }: TextInputProps) {
    return (
        <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#555', marginBottom: 4 }}>{label}</label>
            <input value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} style={{ ...inputStyle, backgroundColor: disabled ? '#f1f5f9' : 'white', cursor: disabled ? 'not-allowed' : 'text' }} />
        </div>
    )
}

export interface SelectInputProps { label: string; value: string; onChange: (v: string) => void; options: readonly string[] | string[]; allowNone?: boolean; }
export function SelectInput({ label, value, onChange, options, allowNone }: SelectInputProps) {
    return (
        <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#555', marginBottom: 4 }}>{label}</label>
            <select value={value} onChange={e => onChange(e.target.value)} style={{ ...inputStyle, backgroundColor: 'white', cursor: 'pointer' }}>
                {allowNone && <option value="">(None)</option>}
                {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        </div>
    )
}

export interface ImageUploadProps { label: string; onChange: (base64: string) => void; currentImage?: string; }
export function ImageUploadInput({ label, onChange, currentImage }: ImageUploadProps) {
    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        const reader = new FileReader(); reader.onloadend = () => onChange(reader.result as string);
        reader.readAsDataURL(file);
    }
    return (
        <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#555', marginBottom: 2 }}>{label}</label>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 8 }}>Ideal ratio: 1:2 (Portrait) or 1:1 (Square)</div>
            <input type="file" accept="image/*" onChange={handleFileChange} style={{ ...inputStyle, padding: '4px', cursor: 'pointer', backgroundColor: 'white' }} />
            {currentImage && <button onClick={() => onChange('')} style={{ marginTop: 8, padding: '6px 12px', fontSize: '0.8rem', cursor: 'pointer', backgroundColor: '#fee2e2', color: '#991b1b', border: '1px solid #f87171', borderRadius: '4px' }}>Remove Image</button>}
        </div>
    )
}

export interface DateFieldProps {
    input: any;
    updateField: <K extends keyof LabelModelInput>(field: K, value: any) => void;
    selectedDate: string;
    updateDateFromPicker: (v: string) => void;
    isFreeTextDate: boolean;
    setIsFreeTextDate: (v: boolean) => void;
}

export function DateField({ input, updateField, selectedDate, updateDateFromPicker, isFreeTextDate, setIsFreeTextDate }: DateFieldProps) {
    return (
        <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: '#555' }}>Reconstitution Date</label>
                <label style={{ fontSize: '0.75rem', color: '#666', display: 'flex', alignItems: 'center', cursor: 'pointer' }}><input type="checkbox" checked={isFreeTextDate} onChange={e => setIsFreeTextDate(e.target.checked)} style={{ marginRight: 4 }} /> Free text</label>
            </div>
            {isFreeTextDate ? <input value={input.reconstitutionDate ?? ''} onChange={e => updateField('reconstitutionDate', e.target.value)} placeholder="YYYYMMDD" style={inputStyle} /> : <input type="date" value={selectedDate} onChange={e => updateDateFromPicker(e.target.value)} style={inputStyle} />}
        </div>
    )
}