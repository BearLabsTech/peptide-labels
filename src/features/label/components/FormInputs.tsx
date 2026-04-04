import { useState } from 'react'
import type { ChangeEvent, CSSProperties, ReactNode } from 'react'

const inputStyle: CSSProperties = {
    width: '100%', padding: '10px 12px', border: '1px solid var(--color-border)',
    borderRadius: 'var(--radius-sm)', fontSize: '1rem', boxSizing: 'border-box',
    color: 'var(--color-text-main)', backgroundColor: 'var(--color-surface)'
}

export interface AccordionSectionProps { title: string; children: ReactNode; defaultOpen?: boolean; }
export function AccordionSection({ title, children, defaultOpen = false }: AccordionSectionProps) {
    const [isOpen, setIsOpen] = useState(defaultOpen);
    return (
        <div className="accordion-wrapper">
            <button onClick={() => setIsOpen(!isOpen)} className={`accordion-btn ${isOpen ? 'active' : ''}`}>
                <span className="accordion-title">{title}</span>
                <span className="accordion-icon" style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>▼</span>
            </button>
            {isOpen && <div style={{ padding: '16px 20px 8px 20px', backgroundColor: 'var(--color-surface)' }}>{children}</div>}
        </div>
    )
}

export interface TextInputProps { label: string; value?: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean; }
export function TextInput({ label, value, onChange, placeholder, disabled }: TextInputProps) {
    return (
        <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: 6 }}>{label}</label>
            <input value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} style={{ ...inputStyle, backgroundColor: disabled ? 'var(--color-background)' : 'var(--color-surface)', cursor: disabled ? 'not-allowed' : 'text' }} />
        </div>
    )
}

export interface SelectInputProps { label: string; value: string; onChange: (v: string) => void; options: readonly string[] | string[]; allowNone?: boolean; }
export function SelectInput({ label, value, onChange, options, allowNone }: SelectInputProps) {
    return (
        <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: 6 }}>{label}</label>
            <select value={value} onChange={e => onChange(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                {allowNone && <option value="">(None)</option>}
                {options.map((opt: string) => <option key={opt} value={opt}>{opt}</option>)}
            </select>
        </div>
    )
}

export interface ImageUploadProps { label: string; onChange: (base64: string) => void; currentImage?: string; }
export function ImageUploadInput({ label, onChange, currentImage }: ImageUploadProps) {
    const [fileName, setFileName] = useState<string | null>(null);
    const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]; if (!file) return;
        setFileName(file.name);
        const reader = new FileReader(); reader.onloadend = () => onChange(reader.result as string);
        reader.readAsDataURL(file);
    }
    const handleRemove = () => { setFileName(null); onChange(''); }

    return (
        <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-main)', marginBottom: 8 }}>{label}</label>
            {!currentImage ? (
                <div className="dropzone-container">
                    <input type="file" accept="image/*" onChange={handleFileChange} className="dropzone-input" />
                    <div className="dropzone-text">Click to browse or drop image</div>
                    <div className="dropzone-subtext">Ideal ratio: 1:2 (Portrait) or 1:1 (Square)</div>
                </div>
            ) : (
                <div style={{ border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '16px', backgroundColor: 'var(--color-background)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-main)' }}>Image Selected</div>
                    {fileName && <div className="file-name-badge">{fileName}</div>}
                    <button onClick={handleRemove} style={{ marginTop: 16, padding: '8px 12px', fontSize: '0.85rem', cursor: 'pointer', backgroundColor: 'var(--color-danger-bg)', color: 'var(--color-danger)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-sm)', width: '100%', fontWeight: 600, transition: 'all 0.2s' }}>Remove Image</button>
                </div>
            )}
        </div>
    )
}

// NEW: Highly reusable DateField component
export interface DateFieldProps { label: string; value: string; onChange: (v: string) => void; isFreeText: boolean; onFreeTextToggle: (v: boolean) => void; }
export function DateField({ label, value, onChange, isFreeText, onFreeTextToggle }: DateFieldProps) {
    return (
        <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-main)' }}>{label}</label>
                <label style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                    <input type="checkbox" checked={isFreeText} onChange={e => onFreeTextToggle(e.target.checked)} style={{ marginRight: 4 }} /> Free text
                </label>
            </div>
            {isFreeText ? (
                <input value={value} onChange={e => onChange(e.target.value)} placeholder="e.g. Mixed Jan 1st" style={inputStyle} />
            ) : (
                <input type="date" value={value} onChange={e => onChange(e.target.value)} style={inputStyle} />
            )}
        </div>
    )
}