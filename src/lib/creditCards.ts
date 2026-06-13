import type { CardRewardType } from '../types'

export type { CardRewardType }

export const REWARD_TYPE_LABELS: Record<CardRewardType, string> = {
  cashback: 'Cash back',
  'flat-cashback': 'Flat cash back',
  dining: 'Dining & groceries',
  travel: 'Travel',
  builder: 'Credit builder',
}

export interface CardSpec {
  name: string
  issuer: string
  rewardType: CardRewardType
  bestFor: string
  why: string
  chooseIf: string
}

export interface Stage {
  id: string
  stageNumber: number
  heading: string
  subtitle: string
  summary: string
  cards: CardSpec[]
}

export interface QuickMatch {
  statement: string
  recommendation: string
}

export const creditCardStages: Stage[] = [
  {
    id: 'stage-1',
    stageNumber: 1,
    heading: 'Stage 1: Getting your first credit card',
    subtitle: 'For little or no credit history.',
    summary: 'Start here. Discover it Student Cash Back is the default recommendation.',
    cards: [
      {
        name: 'Discover it Student Cash Back',
        issuer: 'Discover',
        rewardType: 'cashback',
        bestFor: 'Most students',
        why: 'Easy approval, no annual fee, 5% rotating categories, Cashback Match after year 1, strong rewards while building credit.',
        chooseIf: 'You want the safest recommendation, have no credit history, and want good rewards without complexity.',
      },
      {
        name: 'Discover it Student Chrome',
        issuer: 'Discover',
        rewardType: 'cashback',
        bestFor: 'Gas and dining spenders',
        why: '2% at restaurants and gas stations, no category activation, easier to manage.',
        chooseIf: 'You drive regularly, want a simple card, and do not want to track rotating categories.',
      },
      {
        name: 'Chase Freedom Rise',
        issuer: 'Chase',
        rewardType: 'flat-cashback',
        bestFor: 'Students interested in Chase long-term',
        why: '1.5% on everything, designed for beginners, builds a Chase relationship for future premium cards.',
        chooseIf: 'You bank with Chase, want the Sapphire Preferred later, or care about long-term ecosystem value.',
      },
      {
        name: 'Current Build Card',
        issuer: 'Current',
        rewardType: 'builder',
        bestFor: 'Students unable to qualify elsewhere',
        why: 'No credit history required, no hard credit check, reports to all three major bureaus.',
        chooseIf: 'You are an international student or are having difficulty getting traditional credit.',
      },
    ],
  },
  {
    id: 'stage-2',
    stageNumber: 2,
    heading: 'Stage 2: Building your credit profile',
    subtitle: 'After 6 to 12 months of on-time payments.',
    summary: 'Add a card with better category rewards once your score is established.',
    cards: [
      {
        name: 'Capital One Savor Student',
        issuer: 'Capital One',
        rewardType: 'dining',
        bestFor: 'Dining, entertainment, and social spending',
        why: '3% dining, 3% groceries, 3% entertainment, no foreign transaction fee.',
        chooseIf: 'Food is your biggest expense, you attend events regularly, or you study abroad.',
      },
      {
        name: 'Capital One Quicksilver Student',
        issuer: 'Capital One',
        rewardType: 'flat-cashback',
        bestFor: 'Simplicity',
        why: '1.5% on everything, no category tracking required.',
        chooseIf: 'You spend across many categories and want one flat rate on all purchases.',
      },
    ],
  },
  {
    id: 'stage-3',
    stageNumber: 3,
    heading: 'Stage 3: Expanding credit and rewards',
    subtitle: 'Goal: more available credit, low utilization, better rewards.',
    summary: 'A second non-student card to lower utilization and improve your profile.',
    cards: [
      {
        name: 'Chase Freedom Unlimited',
        issuer: 'Chase',
        rewardType: 'cashback',
        bestFor: 'Long-term flexibility',
        why: '3% dining, 1.5% on everything else, strong welcome bonus, pairs with Sapphire Preferred later.',
        chooseIf: 'You want a card that gets more valuable once you add a Chase travel card.',
      },
      {
        name: 'Citi Double Cash',
        issuer: 'Citi',
        rewardType: 'flat-cashback',
        bestFor: 'Pure cashback',
        why: 'Earns on purchases and then again on payments, simple structure with no categories.',
        chooseIf: 'You want the highest flat cashback rate and no category management.',
      },
    ],
  },
  {
    id: 'stage-4',
    stageNumber: 4,
    heading: 'Stage 4: Travel and premium rewards',
    subtitle: 'For established credit and consistent income.',
    summary: 'First travel card after graduation, once you have steady income.',
    cards: [
      {
        name: 'Chase Sapphire Preferred',
        issuer: 'Chase',
        rewardType: 'travel',
        bestFor: 'Travelers',
        why: 'Points transfer to airlines and hotels, strong travel protections, valuable welcome bonus.',
        chooseIf: 'You travel regularly and want maximum flexibility redeeming points.',
      },
      {
        name: 'Capital One Venture Rewards',
        issuer: 'Capital One',
        rewardType: 'travel',
        bestFor: 'Simpler travel rewards',
        why: 'Straightforward earning rate, easy redemption against any travel purchase.',
        chooseIf: 'You want travel rewards without the complexity of transfer partners.',
      },
    ],
  },
]

export const quickMatches: QuickMatch[] = [
  { statement: 'I just want my first credit card', recommendation: 'Discover it Student Cash Back' },
  { statement: 'I spend most of my money on food', recommendation: 'Capital One Savor Student' },
  { statement: 'I want travel cards later', recommendation: 'Chase Freedom Rise' },
  { statement: 'I already bank with Chase', recommendation: 'Chase Freedom Rise' },
  { statement: 'I study abroad', recommendation: 'Capital One Savor Student' },
  { statement: 'I want the simplest card possible', recommendation: 'Capital One Quicksilver Student' },
  { statement: 'I only care about cashback', recommendation: 'Discover it Student Cash Back or Citi Double Cash' },
  { statement: 'I travel frequently', recommendation: 'Chase Sapphire Preferred' },
]

export const doList: string[] = [
  'Pay the statement balance in full every month',
  'Enable autopay immediately after opening the card',
  'Keep utilization below 10% of your credit limit',
  'Never miss a payment, even if it is just the minimum',
  'Keep your oldest card open, even after upgrading',
]

export const neverList: string[] = [
  'Carry a balance thinking it will build credit faster',
  'Max out your card or get close to the limit',
  'Apply for multiple cards at the same time',
  'Spend money you cannot immediately repay',
]

export const allCardNames: string[] = creditCardStages.flatMap((s) => s.cards.map((c) => c.name))

/** Returns the stage number (1-4) of the card whose name matches, or null. */
export function stageOfCard(name: string): number | null {
  for (const stage of creditCardStages) {
    if (stage.cards.some((c) => c.name === name)) {
      return stage.stageNumber
    }
  }
  return null
}

/** Returns the CardSpec for the given name (case-insensitive), or undefined. */
export function cardByName(name: string): CardSpec | undefined {
  const lower = name.toLowerCase()
  for (const stage of creditCardStages) {
    const found = stage.cards.find((c) => c.name.toLowerCase() === lower)
    if (found) return found
  }
  return undefined
}
