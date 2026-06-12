interface Section {
  id: string
  label: string
}

export default function PageNav({ sections }: { sections: Section[] }) {
  return (
    <nav aria-label="Page sections" className="flex flex-wrap gap-2">
      {sections.map((s) => (
        <a
          key={s.id}
          href={`#${s.id}`}
          className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-xs font-medium text-ink-mid hover:border-brand hover:text-brand transition-colors"
        >
          {s.label}
        </a>
      ))}
    </nav>
  )
}
