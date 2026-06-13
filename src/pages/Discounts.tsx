import { useMemo, useState } from 'react'
import { SearchIcon, TagIcon } from '../components/icons'
import Collapsible from '../components/Collapsible'

interface Discount {
  name: string
  deal: string
  how: string
  via?: string
}

interface DiscountGroup {
  category: string
  blurb: string
  items: Discount[]
}

interface Aggregator {
  name: string
  url: string
  description: string
  badge: string
  brands: string[]
}

const aggregators: Aggregator[] = [
  {
    name: 'UNiDAYS',
    url: 'myunidays.com',
    description: 'The largest student discount platform globally. Requires .edu email verification.',
    badge: 'Most brands',
    brands: ['Apple', 'Nike', 'Spotify', 'Gymshark', 'Samsung'],
  },
  {
    name: 'Student Beans',
    url: 'studentbeans.com',
    description: 'Strong on fashion, tech, and food. Some exclusive deals not on UNiDAYS.',
    badge: 'Exclusive deals',
    brands: ['ASOS', 'Dominos', 'Dell', 'Spotify', "Levi's"],
  },
  {
    name: 'ID.me',
    url: 'id.me',
    description: 'Verification service accepted by hundreds of brands. One verification unlocks all partner discounts.',
    badge: 'One verification',
    brands: ['Dell', 'HP', 'Under Armour', 'T-Mobile', 'Verizon'],
  },
]

const groups: DiscountGroup[] = [
  {
    category: 'Streaming and music',
    blurb: 'The classics. Each one verifies your student status with your .edu email.',
    items: [
      { name: 'Spotify + Hulu + Showtime', deal: '$5.99/mo, three services bundled', how: 'Verify through SheerID at spotify.com/student', via: 'SheerID' },
      { name: 'Apple Music Student', deal: '$5.99/mo, includes Apple TV+', how: 'Verify with UNiDAYS in the Music app', via: 'UNiDAYS' },
      { name: 'YouTube Premium Student', deal: '$7.99/mo, ad-free plus YouTube Music', how: 'Verify with SheerID at youtube.com/premium', via: 'SheerID' },
      { name: 'Amazon Prime Student', deal: '6 months free, then 50% off', how: 'Sign up with your .edu email at amazon.com/joinstudent', via: '.edu email' },
    ],
  },
  {
    category: 'Software and tools',
    blurb: 'Worth setting up in your first week. Several of these are completely free while enrolled.',
    items: [
      { name: 'GitHub Student Developer Pack', deal: 'Free, $200K+ worth of dev tools and cloud credits', how: 'Apply at education.github.com with your .edu email', via: '.edu email' },
      { name: 'Notion', deal: 'Free Plus plan for students', how: 'Sign up with your .edu email at notion.so', via: '.edu email' },
      { name: 'Figma', deal: 'Free Professional plan', how: 'Verify at figma.com/education', via: '.edu email' },
      { name: 'Microsoft 365', deal: 'Often completely free through your school', how: 'Check office.com/getoffice365 with your school email', via: '.edu email' },
      { name: 'Adobe Creative Cloud', deal: 'Around 60% off the full suite', how: 'Buy through adobe.com/students', via: 'Direct' },
      { name: 'Chegg, Coursera, Skillshare', deal: 'Deep discounts on learning platforms', how: 'Verify student status on each platform', via: '.edu email' },
    ],
  },
  {
    category: 'Shopping and food',
    blurb: 'Sign up for the two verification hubs once and a lot of brand discounts unlock automatically.',
    items: [
      { name: 'Nike Student Discount', deal: '10% off', how: 'Verify through UNiDAYS at nike.com', via: 'UNiDAYS' },
      { name: 'Adidas Student Discount', deal: '15% off', how: 'Verify through Student Beans', via: 'Student Beans' },
      { name: 'Target Circle College', deal: 'Seasonal college deals and welcome discount', how: 'Join Target Circle with student verification', via: 'Direct' },
      { name: 'DoorDash DashPass for Students', deal: 'Half-price DashPass', how: 'Verify with SheerID at doordash.com/students', via: 'SheerID' },
    ],
  },
  {
    category: 'Travel and transit',
    blurb: 'Getting home for break should not eat your food budget.',
    items: [
      { name: 'Amtrak Student Discount', deal: '15% off most routes', how: 'Book with the student fare option at amtrak.com', via: 'Direct' },
      { name: 'Greyhound', deal: '10% off with Student Advantage', how: 'Buy a Student Advantage card or verify online', via: 'Direct' },
      { name: 'Local transit passes', deal: 'Many cities offer discounted or free semester passes', how: 'Ask your campus services office', via: 'Campus' },
    ],
  },
  {
    category: 'Tech and devices',
    blurb: 'Buying a laptop or phone? Always check the student storefront first.',
    items: [
      { name: 'Apple Education Store', deal: 'Discounts on Mac and iPad, free AirPods periodically with Mac', how: 'Shop at apple.com/education with .edu email', via: '.edu email' },
      { name: 'Dell University', deal: 'Dedicated student storefront with regular laptop discounts', how: 'Shop at dell.com/university', via: 'Direct' },
      { name: 'HP Academy', deal: 'Student pricing on laptops and accessories', how: 'Shop at hp.com/us-en/shop/cv/hpacademy', via: 'Direct' },
      { name: 'Samsung Education Discount', deal: 'Up to 30% off phones, tablets, and monitors', how: 'Verify through the Samsung education store', via: 'UNiDAYS' },
    ],
  },
]

const strategies = [
  { step: 1, action: 'Verify once, use everywhere', detail: 'Set up UNiDAYS, Student Beans, and ID.me in your first week. One-time verification unlocks ongoing access without re-applying per brand.' },
  { step: 2, action: 'Always check before you buy', detail: 'Before any purchase over $20, spend 30 seconds searching "[brand name] student discount." Most major retailers have one and do not advertise it prominently.' },
  { step: 3, action: 'Use your .edu email strategically', detail: 'Many discounts bypass aggregators entirely and just need a .edu email at checkout. Keep that email active even after graduation for as long as your school allows.' },
  { step: 4, action: 'Stack discounts when possible', detail: 'Some platforms allow combining a student discount with a sale or cashback portal like Rakuten. Example: Adobe at 60% off through the student store, paid on a cashback credit card.' },
  { step: 5, action: 'Check your university portal first', detail: 'Most schools have negotiated software licenses directly. Microsoft 365, AutoCAD, MATLAB, antivirus. Completely free through IT. Students routinely pay for things their school already provides.' },
  { step: 6, action: 'Set a calendar reminder to re-verify', detail: 'UNiDAYS and Student Beans require annual re-verification. Students lose access and assume the discount expired when they just need to re-confirm enrollment.' },
]

/** Teaser string showing first few discount names for the collapsed summary */
function groupSummary(g: DiscountGroup): string {
  const preview = g.items
    .slice(0, 3)
    .map((d) => d.name.split(' ').slice(0, 2).join(' '))
    .join(', ')
  const more = g.items.length > 3 ? ` +${g.items.length - 3} more` : ''
  return `${g.items.length} discounts: ${preview}${more}`
}

export default function Discounts() {
  const [query, setQuery] = useState('')
  const q = query.trim().toLowerCase()

  const matchedAggregators = useMemo(
    () =>
      q === ''
        ? aggregators
        : aggregators.filter((a) =>
            [a.name, a.description, a.badge, ...a.brands].some((s) => s.toLowerCase().includes(q)),
          ),
    [q],
  )

  const matchedGroups = useMemo(
    () =>
      q === ''
        ? groups
        : groups
            .map((g) => ({
              ...g,
              items: g.items.filter((d) =>
                [d.name, d.deal, d.how, d.via ?? '', g.category].some((s) => s.toLowerCase().includes(q)),
              ),
            }))
            .filter((g) => g.items.length > 0),
    [q],
  )

  const resultCount =
    matchedGroups.reduce((sum, g) => sum + g.items.length, 0) + matchedAggregators.length
  const searching = q !== ''

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-semibold tracking-wider text-brand uppercase mb-1">FREE MONEY</p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Student discounts</h1>
        <p className="text-sm text-ink-faint max-w-2xl mt-1">
          Your .edu email is worth real money. Set these up once and save every month, no budgeting willpower required.
        </p>
      </header>

      {/* Search -- primary interactive element, always at top */}
      <div className="relative">
        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint">
          <SearchIcon className="w-4 h-4" />
        </span>
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search discounts by brand, deal, or category"
          aria-label="Search discounts"
          className="w-full rounded-xl border border-line-strong bg-surface pl-10 pr-20 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
        />
        {searching && (
          <button
            onClick={() => setQuery('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-medium text-ink-faint hover:text-ink transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {searching && (
        <p className="text-xs text-ink-faint">
          {resultCount === 0
            ? `Nothing matches "${query}".`
            : `${resultCount} ${resultCount === 1 ? 'match' : 'matches'} for "${query}".`}
        </p>
      )}

      {searching && resultCount === 0 && (
        <div className="bg-surface rounded-2xl border border-line p-8 text-center">
          <p className="text-sm font-semibold text-ink">No discounts found</p>
          <p className="mt-1 text-sm text-ink-mid">
            Try a broader term like "streaming" or a brand name. And remember the 30-second rule:
            search "[brand name] student discount" before any purchase over $20. Most retailers have
            one and do not advertise it.
          </p>
        </div>
      )}

      {!searching && (
        <div className="rounded-xl bg-brand-soft border border-brand-line px-4 py-3 text-sm text-brand-ink">
          Quick setup: most verifications run through SheerID or UNiDAYS and take under two minutes.
          Set a calendar reminder to re-verify annually so you do not lose access without realizing it.
        </div>
      )}

      {/* Aggregator platforms -- always visible */}
      {matchedAggregators.length > 0 && (
        <section id="aggregators" className="scroll-mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint mb-3">Start with these three platforms</h2>
          <p className="text-xs text-ink-faint mb-3">Set these up first. A single verification unlocks hundreds of brands at once.</p>
          <div className="mt-3 grid sm:grid-cols-3 gap-3">
            {matchedAggregators.map((a) => (
              <div key={a.name} className="bg-surface rounded-2xl border border-line p-5 hover:border-brand transition-colors">
                <div className="flex items-start justify-between">
                  <div className="w-10 h-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center font-bold text-sm">
                    {a.name[0]}
                  </div>
                  <span className="text-[11px] font-semibold bg-brand-line text-brand-ink rounded-full px-2 py-0.5">
                    {a.badge}
                  </span>
                </div>
                <h3 className="mt-3 font-bold text-sm text-ink">{a.name}</h3>
                <p className="text-xs text-ink-faint mt-0.5">{a.description}</p>
                <div className="mt-3 flex flex-wrap gap-1">
                  {a.brands.map((b) => (
                    <span key={b} className="text-[10px] bg-surface-2 border border-line rounded-full px-2 py-0.5 text-ink-mid">
                      {b}
                    </span>
                  ))}
                </div>
                <p className="mt-3 text-xs text-brand font-medium">{a.url}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Discount categories */}
      <div id="categories" className="scroll-mt-6 space-y-2">
        {matchedGroups.map((group, i) => {
          const itemGrid = (
            <div className="grid sm:grid-cols-2 gap-3">
              {group.items.map((d) => (
                <div key={d.name} className="bg-surface-2 rounded-xl border border-line p-4 flex gap-3 items-start hover:border-brand transition-colors">
                  <div className="shrink-0 w-9 h-9 rounded-lg bg-brand-soft text-brand flex items-center justify-center">
                    <TagIcon />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-medium text-sm text-ink">{d.name}</h3>
                    <p className="text-sm text-brand font-medium">{d.deal}</p>
                    <p className="mt-0.5 text-xs text-ink-faint">{d.how}</p>
                    {d.via && (
                      <span className="mt-1 inline-block text-[10px] bg-surface-2 border border-line rounded-full px-2 py-0.5 text-ink-mid">
                        via {d.via}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )

          if (searching) {
            // Bypass collapsibles when searching -- show all matching results expanded
            return (
              <section key={group.category}>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint mb-2">{group.category}</h2>
                {itemGrid}
              </section>
            )
          }

          return (
            <Collapsible
              key={group.category}
              title={group.category}
              summary={groupSummary(group)}
              defaultOpen={i === 0}
            >
              <div className="space-y-3">
                <p className="text-xs text-ink-faint">{group.blurb}</p>
                {itemGrid}
              </div>
            </Collapsible>
          )
        })}
      </div>

      {/* How to maximize -- always visible */}
      {!searching && (
        <section id="strategy" className="bg-surface rounded-2xl border border-line p-6 scroll-mt-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint mb-3">How to actually get the most out of these</h2>
          <p className="text-xs text-ink-faint mb-4">Six strategies that separate students who save a few dollars from students who save hundreds per year.</p>
          <div className="mt-4 space-y-3">
            {strategies.map((s) => (
              <div key={s.step} className="flex gap-3">
                <span className="shrink-0 w-6 h-6 rounded-full bg-brand-soft text-brand text-xs font-bold flex items-center justify-center mt-0.5">
                  {s.step}
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink">{s.action}</p>
                  <p className="text-sm text-ink-mid leading-relaxed">{s.detail}</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  )
}
