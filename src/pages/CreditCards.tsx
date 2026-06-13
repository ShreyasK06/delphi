import { useState } from 'react'
import Collapsible from '../components/Collapsible'
import {
  creditCardStages,
  quickMatches,
  doList,
  neverList,
  stageOfCard,
  allCardNames,
  cardByName,
  REWARD_TYPE_LABELS,
} from '../lib/creditCards'
import type { CardSpec } from '../lib/creditCards'
import type { CardRewardType } from '../lib/creditCards'
import type { CustomCard } from '../types'
import { useProfile } from '../hooks/useProfile'

function CardGrid({ cards, ownedSet, recommendedName }: { cards: CardSpec[]; ownedSet: Set<string>; recommendedName?: string }) {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      {cards.map((card) => {
        const isOwned = ownedSet.has(card.name)
        const isRecommended = recommendedName === card.name
        return (
          <div
            key={card.name}
            className={`bg-surface-2 rounded-2xl border p-5 hover:border-brand transition-colors relative ${isOwned ? 'border-ok-line' : 'border-line'}`}
          >
            {/* Badges row */}
            {(isOwned || isRecommended) && (
              <div className="flex flex-wrap gap-1.5 mb-2">
                {isOwned && (
                  <span className="bg-ok-soft text-ok-ink rounded-full px-2 py-0.5 text-[11px] font-semibold">
                    You have this
                  </span>
                )}
                {isRecommended && !isOwned && (
                  <span className="bg-brand-soft text-brand-ink rounded-full px-2 py-0.5 text-[11px] font-semibold">
                    Recommended next
                  </span>
                )}
              </div>
            )}
            <h3 className="font-bold text-sm text-ink leading-snug">{card.name}</h3>
            <p className="mt-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Best for</p>
            <p className="text-sm text-brand font-medium">{card.bestFor}</p>
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Why</p>
            <p className="text-sm text-ink-mid leading-relaxed">{card.why}</p>
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">Choose if</p>
            <p className="text-sm text-ink-mid leading-relaxed">{card.chooseIf}</p>
          </div>
        )
      })}
    </div>
  )
}

export default function CreditCards() {
  const { state, update } = useProfile()
  const owned: string[] = state?.profile.owned_cards ?? []
  const customCards: CustomCard[] = state?.profile.custom_cards ?? []

  // Catalog picker state
  const [catalogPickerValue, setCatalogPickerValue] = useState('')
  // Custom card form state
  const [showCustomCardForm, setShowCustomCardForm] = useState(false)
  const [customCardName, setCustomCardName] = useState('')
  const [customCardRewardType, setCustomCardRewardType] = useState<CardRewardType>('cashback')
  const [customCardTier, setCustomCardTier] = useState<number>(1)

  const addCatalogCard = (name: string) => {
    if (!name || !state) return
    const alreadyPresent = owned.some((c) => c.toLowerCase() === name.toLowerCase())
    if (!alreadyPresent) {
      update({ ...state.profile, owned_cards: [...owned, name], has_credit_card: true })
    }
    setCatalogPickerValue('')
  }

  const removeCatalogCard = (cardName: string) => {
    if (!state) return
    const nextOwned = owned.filter((c) => c !== cardName)
    update({ ...state.profile, owned_cards: nextOwned })
  }

  const addCustomCard = () => {
    if (!state) return
    const trimmed = customCardName.trim()
    if (!trimmed) return
    const newCard: CustomCard = {
      id: crypto.randomUUID(),
      name: trimmed,
      rewardType: customCardRewardType,
      tier: customCardTier,
    }
    update({ ...state.profile, custom_cards: [...customCards, newCard], has_credit_card: true })
    setCustomCardName('')
    setCustomCardRewardType('cashback')
    setCustomCardTier(1)
    setShowCustomCardForm(false)
  }

  const removeCustomCard = (id: string) => {
    if (!state) return
    const next = customCards.filter((c) => c.id !== id)
    update({ ...state.profile, custom_cards: next })
  }

  // Personalization computations
  const ownedSet = new Set(owned)
  const hasNoCards = owned.length === 0 && customCards.length === 0

  // Highest stage from catalog cards and tier from custom cards
  const catalogMaxStage = owned.length > 0
    ? Math.max(...owned.map((name) => stageOfCard(name) ?? 0))
    : 0
  const customMaxTier = customCards.length > 0
    ? Math.max(...customCards.map((c) => c.tier))
    : 0
  const highestOwnedStage = Math.max(catalogMaxStage, customMaxTier)
  const nextStageNumber = Math.min(highestOwnedStage + 1, 4)
  const nextStage = creditCardStages.find((s) => s.stageNumber === nextStageNumber)

  // Collect reward types the user already has
  const ownedRewardTypes = new Set<CardRewardType>()
  for (const name of owned) {
    const spec = cardByName(name)
    if (spec) ownedRewardTypes.add(spec.rewardType)
  }
  for (const c of customCards) {
    ownedRewardTypes.add(c.rewardType)
  }

  // Smart recommended card: prefer one that fills a missing reward type
  let recommendedCard = nextStage?.cards[0]
  if (nextStage && owned.length > 0) {
    const gapFiller = nextStage.cards.find((c) => !ownedRewardTypes.has(c.rewardType))
    if (gapFiller) recommendedCard = gapFiller
  }

  // Smart "next move" rationale copy
  function buildRationale(): string {
    if (!recommendedCard || !nextStage) return ''
    const hasTravel = ownedRewardTypes.has('travel')
    const hasCashback = ownedRewardTypes.has('cashback') || ownedRewardTypes.has('flat-cashback')
    const hasBuilder = ownedRewardTypes.has('builder')
    const isStage4Rec = recommendedCard.rewardType === 'travel'

    if (hasBuilder && highestOwnedStage === 1) {
      return `You have started building credit, which is the right first step. ${recommendedCard.name} (${recommendedCard.issuer}) is the natural next card: ${recommendedCard.why}`
    }
    if (hasTravel && hasCashback) {
      return `You already cover travel and everyday cash back. Consider a dining or flat-rate card like ${recommendedCard.name} to fill any remaining gaps.`
    }
    if (!hasTravel && isStage4Rec) {
      return `You have strong everyday rewards covered. Adding ${recommendedCard.name} (${recommendedCard.issuer}) unlocks travel point transfers and premium trip protections. ${recommendedCard.why}`
    }
    if (hasCashback && nextStage.stageNumber >= 2 && !ownedRewardTypes.has('dining')) {
      const dining = nextStage.cards.find((c) => c.rewardType === 'dining')
      if (dining) {
        recommendedCard = dining
        return `You have flat-rate cash back covered. ${dining.name} (${dining.issuer}) adds 3% on dining and groceries, likely your next biggest category.`
      }
    }
    return `${recommendedCard.name} (${recommendedCard.issuer}) is the next logical step. ${recommendedCard.why}`
  }

  // Format owned card list for display
  function formatOwnedList(names: string[]): string {
    if (names.length === 0) return ''
    if (names.length === 1) return names[0]
    return names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1]
  }

  const allOwnedLabels = [
    ...owned,
    ...customCards.map((c) => `${c.name} (${REWARD_TYPE_LABELS[c.rewardType]})`),
  ]

  return (
    <div className="space-y-6">
      <header>
        <p className="text-[11px] font-semibold tracking-wider text-brand uppercase mb-1">BUILD</p>
        <h1 className="font-display text-3xl font-bold tracking-tight text-ink">Credit card roadmap</h1>
        <p className="text-sm text-ink-faint max-w-2xl mt-1">
          A staged guide from your first card to travel rewards, matched to where you are in school.
        </p>
      </header>

      {/* Personalized roadmap card */}
      <div className="rounded-xl bg-brand-soft border border-brand-line px-5 py-4 text-brand-ink">
        {highestOwnedStage >= 4 ? (
          <>
            <p className="font-semibold text-sm mb-1">You are ahead of the game</p>
            <p className="text-sm leading-relaxed">
              You have reached Stage 4. Focus on keeping utilization low and paying your statement balance in full each month. No new card is needed right now.
            </p>
          </>
        ) : hasNoCards ? (
          <>
            <p className="font-semibold text-sm mb-1">Start here</p>
            <p className="text-sm leading-relaxed">
              Your first card to get:{' '}
              <strong>{recommendedCard?.name ?? allCardNames[0]}</strong>.{' '}
              {recommendedCard?.why}
            </p>
            <p className="text-xs mt-2 text-brand-ink/70">
              Once you have your first card and 6 or more months of on-time payments, you will move to Stage 2.
            </p>
          </>
        ) : (
          <>
            <p className="font-semibold text-sm mb-1">Your next move</p>
            <p className="text-sm leading-relaxed">
              You have: <strong>{formatOwnedList(allOwnedLabels)}</strong>.
            </p>
            {recommendedCard && (
              <p className="text-sm leading-relaxed mt-1">
                {buildRationale()}
              </p>
            )}
          </>
        )}
      </div>

      {/* Your cards management */}
      <div className="bg-surface border border-line rounded-2xl p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint mb-2">Your cards</p>

        {hasNoCards ? (
          <p className="text-sm text-ink-faint mb-3">No cards added yet.</p>
        ) : (
          <div className="flex flex-wrap gap-2 mb-3">
            {owned.map((cardName) => {
              const spec = cardByName(cardName)
              return (
                <span
                  key={cardName}
                  className="inline-flex items-center gap-1 text-xs rounded-full px-3 py-1.5 border bg-brand-soft text-brand-ink border-brand-line"
                >
                  {cardName}{spec ? ` · ${spec.issuer}` : ''}
                  <button
                    type="button"
                    aria-label={`Remove ${cardName}`}
                    onClick={() => removeCatalogCard(cardName)}
                    className="ml-0.5 hover:opacity-70 transition-opacity"
                  >
                    &times;
                  </button>
                </span>
              )
            })}
            {customCards.map((card) => (
              <span
                key={card.id}
                className="inline-flex items-center gap-1 text-xs rounded-full px-3 py-1.5 border bg-brand-soft text-brand-ink border-brand-line"
              >
                {card.name} · {REWARD_TYPE_LABELS[card.rewardType]}
                <button
                  type="button"
                  aria-label={`Remove ${card.name}`}
                  onClick={() => removeCustomCard(card.id)}
                  className="ml-0.5 hover:opacity-70 transition-opacity"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Catalog picker */}
        <select
          value={catalogPickerValue}
          onChange={(e) => addCatalogCard(e.target.value)}
          className="w-full rounded-xl border border-line-strong px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
        >
          <option value="">Add a card from our list...</option>
          {creditCardStages.map((stage) => (
            <optgroup key={stage.id} label={`Stage ${stage.stageNumber}`}>
              {stage.cards.map((card) => (
                <option key={card.name} value={card.name}>
                  {card.name} — {card.issuer}
                </option>
              ))}
            </optgroup>
          ))}
        </select>

        {/* "My card isn't listed" toggle */}
        <button
          type="button"
          onClick={() => setShowCustomCardForm((v) => !v)}
          className="mt-2 text-xs text-brand hover:text-brand-strong underline transition-colors"
        >
          {showCustomCardForm ? 'Cancel' : 'My card is not listed'}
        </button>

        {/* Structured custom card form */}
        {showCustomCardForm && (
          <div className="mt-3 space-y-2 bg-surface-2 rounded-xl border border-line p-3">
            <input
              type="text"
              value={customCardName}
              placeholder="Card name"
              onChange={(e) => setCustomCardName(e.target.value)}
              className="w-full rounded-lg border border-line-strong px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
            />
            <select
              value={customCardRewardType}
              onChange={(e) => setCustomCardRewardType(e.target.value as CardRewardType)}
              className="w-full rounded-lg border border-line-strong px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
            >
              {(Object.entries(REWARD_TYPE_LABELS) as [CardRewardType, string][]).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <select
              value={customCardTier}
              onChange={(e) => setCustomCardTier(Number(e.target.value))}
              className="w-full rounded-lg border border-line-strong px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-brand"
            >
              <option value={1}>Starter / first card</option>
              <option value={2}>Building credit / rewards</option>
              <option value={3}>Established rewards</option>
              <option value={4}>Premium / travel</option>
            </select>
            <button
              type="button"
              onClick={addCustomCard}
              disabled={!customCardName.trim()}
              className="w-full rounded-lg bg-brand text-on-brand px-3 py-2 text-sm font-medium hover:bg-brand-strong disabled:opacity-40 transition-colors"
            >
              Add card
            </button>
          </div>
        )}
      </div>

      {/* The one rule -- always visible */}
      <div className="rounded-xl bg-surface-2 border border-line px-4 py-3 text-sm text-ink-mid">
        <strong className="text-ink">The one rule that matters more than which card you pick:</strong> pay the full
        statement balance every month. A student who earns $50 in rewards and pays $0 in interest
        is doing better than a student who earns $300 in rewards but pays interest charges.
      </div>

      {/* Quick match -- reference card */}
      <section id="quick-match" className="bg-surface-2/50 rounded-2xl border-l-2 border-brand-line border border-line p-6 scroll-mt-6">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint mb-3">Quick match</h2>
        <p className="text-xs text-ink-faint mb-4">Find your situation, pick the card.</p>
        <div className="mt-4 space-y-2">
          {quickMatches.map((m) => (
            <div key={m.statement} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 py-2 border-b border-line last:border-0">
              <p className="text-sm text-ink-mid flex-1">{m.statement}</p>
              <p className="text-sm font-semibold text-brand shrink-0">{m.recommendation}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Universal rules -- reference content */}
      <section id="rules" className="scroll-mt-6 grid sm:grid-cols-2 gap-4">
        <div className="rounded-xl bg-ok-soft border border-ok-line p-4">
          <h3 className="font-semibold text-sm text-ok-ink">Do list</h3>
          <ul className="mt-3 space-y-2">
            {doList.map((rule) => (
              <li key={rule} className="flex items-start gap-2 text-sm text-ok-ink">
                <span className="text-ok mt-0.5 shrink-0">&#10003;</span>
                {rule}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl bg-bad-soft border border-bad-line p-4">
          <h3 className="font-semibold text-sm text-bad-ink">Never list</h3>
          <ul className="mt-3 space-y-2">
            {neverList.map((rule) => (
              <li key={rule} className="flex items-start gap-2 text-sm text-bad-ink">
                <span className="mt-0.5 shrink-0">&#10007;</span>
                {rule}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Stages as collapsibles */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-ink-faint px-1 mb-3">The full roadmap</h2>
        {creditCardStages.map((stage) => (
          <div key={stage.id} id={stage.id} className="scroll-mt-6">
            <Collapsible
              title={stage.heading}
              summary={stage.summary}
              defaultOpen={stage.stageNumber === nextStageNumber}
            >
              <div className="space-y-4">
                <p className="text-xs text-ink-faint">{stage.subtitle}</p>
                <CardGrid
                  cards={stage.cards}
                  ownedSet={ownedSet}
                  recommendedName={stage.stageNumber === nextStageNumber ? recommendedCard?.name : undefined}
                />
              </div>
            </Collapsible>
          </div>
        ))}
      </div>

    </div>
  )
}
