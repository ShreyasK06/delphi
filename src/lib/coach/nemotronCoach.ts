// Real coach backend: NVIDIA NIM-hosted chat completions, proxied through the
// local FastAPI backend (backend/main.py: POST /api/coach) instead of being
// called directly from the browser.
//
// NVIDIA's API does not return CORS headers on the actual response (only on
// the OPTIONS preflight), so a browser fetch() to it always fails with a
// generic "Failed to fetch" — there is no client-only way to call it. The
// backend holds NVIDIA_API_KEY server-side (backend/.env) and forwards the
// request, which also means the key never ships in the JS bundle.
//
// Run the backend (see backend/README.md):
//   cd backend && uvicorn main:app --reload --port 8000
// and make sure VITE_API_URL in .env.local points at it (defaults to
// http://localhost:8000).

import type { ChatMessage, Profile } from '../../types'
import type { CoachAdapter } from './adapter'
import { fmtMoney, totalDebt, totalExpenses, monthlySurplus } from '../../types'
import { calculateScore } from '../score'
import { mockCoach } from './mockCoach'

const BACKEND_URL = (import.meta.env.VITE_API_URL as string) || 'http://localhost:8000'
const API_URL = `${BACKEND_URL}/api/coach`
const MODEL = 'nvidia/llama-3.3-nemotron-super-49b-v1.5'
// Bound the request size/cost; the DB keeps the full history regardless.
const MAX_HISTORY = 16

function serializeProfile(p: Profile): string {
  const s = calculateScore(p)
  const e = p.monthly_expenses
  return [
    `Monthly income: ${fmtMoney(p.monthly_income)}`,
    `Monthly expenses (${fmtMoney(totalExpenses(e))} total): rent ${fmtMoney(e.rent)}, food ${fmtMoney(e.food)}, transportation ${fmtMoney(e.transportation)}, utilities ${fmtMoney(e.utilities)}, subscriptions ${fmtMoney(e.subscriptions)}, going out ${fmtMoney(e.going_out)}, other ${fmtMoney(e.other)}`,
    `Monthly surplus: ${fmtMoney(monthlySurplus(p))}`,
    `Savings: ${fmtMoney(p.savings)}; emergency fund: ${fmtMoney(p.emergency_fund)}`,
    `Debt: ${
      p.debt_breakdown.length === 0
        ? 'none on file'
        : `${fmtMoney(totalDebt(p))} total — ${p.debt_breakdown.map((d) => `${d.type} (${fmtMoney(d.balance)} at ${d.rate}% APR)`).join(', ')}`
    }`,
    `Goals: ${
      p.goals.length === 0
        ? 'none on file'
        : p.goals.map((g) => `${g.name} (${fmtMoney(g.saved)} of ${fmtMoney(g.amount)}, by ${g.by})`).join('; ')
    }`,
    `School year: ${p.school_year || 'not set'}`,
    `FAFSA filed: ${p.has_fafsa ? 'yes' : 'no'}`,
    `Has a credit card: ${p.has_credit_card ? 'yes' : 'no'}`,
    `Has a retirement account: ${p.has_retirement_account ? 'yes' : 'no'}`,
    `Financial Health Score: ${s.total}/100 (weakest area: ${s.lowest.label})`,
  ].join('\n')
}

function systemPrompt(p: Profile): string {
  return [
    'detailed thinking off',
    "You are the in-app financial coach inside delphi, a budgeting and financial-literacy app built for U.S. college students. You're talking directly to the student in the app's chat panel, not in a separate assistant context.",
    "Your job is to give grounded, specific, actionable money guidance using the student's real data below, not generic advice. Always tie answers back to their actual income, expenses, debt, goals, or score when relevant, and call out the specific delphi page (Budget, Debt Planner, Goals, Invest, Extra Cash, Discounts, Portfolio) that has more depth on the topic.",
    'Formatting rules, follow exactly since the UI renders this literally:\n- Plain text with **double asterisks** for bold emphasis only. No headings, no numbered lists, no code blocks, no markdown tables.\n- Bullet points are lines starting with "• ".\n- Separate distinct ideas with a blank line between paragraphs.\n- Keep it tight: 2 to 5 short paragraphs or bullets. This is a chat widget, not an essay.\n- Output only your final answer. Never show your reasoning or wrap anything in <think> tags.',
    "Boundaries:\n- You are an educational tool, not a licensed financial advisor. Mention that briefly only when the topic is genuinely advice-adjacent (investing, taxes, large debt decisions); don't repeat it every message.\n- If the student describes real financial distress (can't afford food or rent, eviction, homelessness, panic, desperation), lead with campus resources, the financial aid office's emergency grants, the campus food pantry, emergency student funds, before talking numbers.\n- Stay focused on personal finance and college money topics. Politely redirect anything unrelated back to that.\n- Never invent specific numbers the student hasn't given you. Use the profile data below, or ask for what's missing.",
    "Student's current financial data:",
    serializeProfile(p),
  ].join('\n\n')
}

function stripThinking(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim()
}

interface NimResponse {
  choices?: { message?: { content?: string } }[]
}

export class NemotronCoach implements CoachAdapter {
  async send(profile: Profile, history: ChatMessage[], message: string): Promise<string> {
    const trimmedHistory = history.slice(-MAX_HISTORY)
    const messages = [
      { role: 'system', content: systemPrompt(profile) },
      ...trimmedHistory.map((m) => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text })),
    ]

    let res: Response
    try {
      res = await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: MODEL,
          messages,
          temperature: 0.5,
          top_p: 0.9,
          max_tokens: 700,
        }),
      })
    } catch (e) {
      console.error(
        `Nemotron coach: could not reach the backend at ${API_URL}. Is it running (cd backend && uvicorn main:app --reload --port 8000)? Falling back to the offline coach.`,
        e,
      )
      return mockCoach.send(profile, history, message)
    }

    if (!res.ok) {
      let detail = ''
      try {
        detail = JSON.stringify(await res.json())
      } catch {
        // ignore unparsable error body
      }
      console.error(`Nemotron coach: request failed (${res.status} ${res.statusText}) ${detail}, falling back to the offline coach.`)
      return mockCoach.send(profile, history, message)
    }

    let data: NimResponse
    try {
      data = (await res.json()) as NimResponse
    } catch (e) {
      console.error('Nemotron coach: unreadable response, falling back to the offline coach.', e)
      return mockCoach.send(profile, history, message)
    }

    const text = stripThinking(data.choices?.[0]?.message?.content ?? '')
    return text || mockCoach.send(profile, history, message)
  }
}

export const nemotronCoach = new NemotronCoach()
