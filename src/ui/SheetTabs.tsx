import type { SheetModel } from '../core/types'

interface Props {
  sheets: readonly SheetModel[]
  active: number
  onSelect: (i: number) => void
}

export function SheetTabs({ sheets, active, onSelect }: Props) {
  return (
    <div className="tabs" role="tablist" aria-label="Daftar sheet">
      {sheets.map((s, i) => (
        <button
          key={s.name}
          type="button"
          role="tab"
          aria-selected={i === active}
          className={`tab ${i === active ? 'is-active' : ''}`}
          onClick={() => onSelect(i)}
          title={`${s.name} — ${s.rows.length} baris`}
        >
          <span className="tab-dot" style={{ background: `#${s.tabColor}` }} />
          <span className="tab-name">{s.name}</span>
          <span className="tab-count">{s.rows.length}</span>
        </button>
      ))}
    </div>
  )
}
