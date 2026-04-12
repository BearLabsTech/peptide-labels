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

// FIX: Added minHeight to guarantee alignment across flex rows
interface FieldHeaderProps { label: string; printToggle?: { visible: boolean; onChange: (v: boolean) => void; disabled?: boolean }; rightContent?: ReactNode; }
function FieldHeader({ label, printToggle, rightContent }: FieldHeaderProps) {
    return (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6, minHeight: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--color-text-main)', opacity: printToggle?.disabled ? 0.5 : 1 }}>{label}</label>
                {printToggle && (
                    <label style={{ fontSize: '0.7rem', color: printToggle.disabled ? 'var(--color-text-muted)' : 'var(--color-primary)', display: 'flex', alignItems: 'center', cursor: printToggle.disabled ? 'not-allowed' : 'pointer', background: 'var(--color-background)', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--color-border)', opacity: printToggle.disabled ? 0.5 : 1 }}>
                        <input type="checkbox" checked={printToggle.visible !== false} onChange={e => printToggle.onChange(e.target.checked)} disabled={printToggle.disabled} style={{ marginRight: 4, cursor: printToggle.disabled ? 'not-allowed' : 'pointer' }} /> Print
                    </label>
                )}
            </div>
            {rightContent && <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center' }}>{rightContent}</div>}
        </div>
    )
}

export interface TextInputProps { label: string; value?: string; onChange: (v: string) => void; placeholder?: string; disabled?: boolean; printToggle?: { visible: boolean; onChange: (v: boolean) => void; disabled?: boolean }; }
export function TextInput({ label, value, onChange, placeholder, disabled, printToggle }: TextInputProps) {
    return (
        <div style={{ marginBottom: 16 }}>
            <FieldHeader label={label} printToggle={printToggle} />
            <input value={value ?? ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} disabled={disabled} style={{ ...inputStyle, backgroundColor: disabled ? 'var(--color-background)' : 'var(--color-surface)', cursor: disabled ? 'not-allowed' : 'text' }} />
        </div>
    )
}

export interface SelectInputProps { label: string; value: string; onChange: (v: string) => void; options: readonly string[] | string[]; allowNone?: boolean; printToggle?: { visible: boolean; onChange: (v: boolean) => void; disabled?: boolean }; }
export function SelectInput({ label, value, onChange, options, allowNone, printToggle }: SelectInputProps) {
    return (
        <div style={{ marginBottom: 16 }}>
            <FieldHeader label={label} printToggle={printToggle} />
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
            <FieldHeader label={label} />
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

export interface DateFieldProps { label: string; value: string; onChange: (v: string) => void; isFreeText: boolean; onFreeTextToggle: (v: boolean) => void; printToggle?: { visible: boolean; onChange: (v: boolean) => void; disabled?: boolean }; }
export function DateField({ label, value, onChange, isFreeText, onFreeTextToggle, printToggle }: DateFieldProps) {
    const rightSide = (
        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
            <input type="checkbox" checked={isFreeText} onChange={e => onFreeTextToggle(e.target.checked)} style={{ marginRight: 4 }} /> Free text
        </label>
    );

    return (
        <div style={{ marginBottom: 16 }}>
            <FieldHeader label={label} printToggle={printToggle} rightContent={rightSide} />
            {isFreeText ? (
                <input value={value} onChange={e => onChange(e.target.value)} placeholder="e.g. Mixed Jan 1st" style={inputStyle} />
            ) : (
                <input type="date" value={value} onChange={e => onChange(e.target.value)} style={inputStyle} />
            )}
        </div>
    )
}

export interface ToggleInputProps { label: string; checked: boolean; onChange: (v: boolean) => void; }
export function ToggleInput({ label, checked, onChange }: ToggleInputProps) {
    return (
        <div
            style={{ display: 'flex', alignItems: 'center', marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}
            onClick={() => onChange(!checked)}
        >
            <input type="checkbox" checked={checked} onChange={() => { }} style={{ marginRight: 10, cursor: 'pointer', transform: 'scale(1.1)' }} />
            <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--color-primary)', cursor: 'pointer' }}>{label}</label>
        </div>
    )
}