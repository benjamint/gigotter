import { useEffect, useState } from 'react'
import { OTHER } from '../lib/schools'

/** A dropdown with an "Other (not listed)" choice that reveals a text box. */
export default function PickOrOther({ value, onChange, groups, options, placeholder, otherPlaceholder, id }: {
  value: string; onChange: (v: string) => void
  groups?: { country: string; schools: string[] }[]; options?: string[]
  placeholder: string; otherPlaceholder: string; id?: string
}) {
  const all = groups ? groups.flatMap((g) => g.schools) : options ?? []
  const [other, setOther] = useState(!!value && !all.includes(value))
  useEffect(() => { if (value && !all.includes(value)) setOther(true) }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="space-y-2">
      <select id={id} className="input pr-10" value={other ? OTHER : value}
        onChange={(e) => {
          if (e.target.value === OTHER) { setOther(true); onChange('') }
          else { setOther(false); onChange(e.target.value) }
        }}>
        <option value="">{placeholder}</option>
        {groups
          ? groups.map((g) => <optgroup key={g.country} label={g.country}>{g.schools.map((s) => <option key={s} value={s}>{s}</option>)}</optgroup>)
          : all.map((s) => <option key={s} value={s}>{s}</option>)}
        <option value={OTHER}>Other (not listed)</option>
      </select>
      {other && (
        <input autoFocus className="input" maxLength={120} value={value} onChange={(e) => onChange(e.target.value)} placeholder={otherPlaceholder} />
      )}
    </div>
  )
}
