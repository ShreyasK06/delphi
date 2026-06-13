import { useState, useEffect, useRef, useCallback } from 'react'
import { ShareIcon, CloseIcon } from './icons'
import { scoreDescription } from '../lib/score'

interface Props {
  score: number
  label: string
  topCategory?: string
}

// Draw a 1080x1080 branded PNG on an offscreen canvas.
// Canvas cannot read CSS variables so explicit hex colors are used here (see STYLEGUIDE.md exception).
function buildCanvas(score: number, label: string): HTMLCanvasElement {
  const size = 1080
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')!

  // Background gradient: deep green
  const grad = ctx.createLinearGradient(0, 0, size, size)
  grad.addColorStop(0, '#03201a')
  grad.addColorStop(1, '#06302a')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)

  // Subtle circle accent (top-right)
  ctx.save()
  ctx.globalAlpha = 0.06
  ctx.fillStyle = '#34d399'
  ctx.beginPath()
  ctx.arc(size * 0.85, size * 0.15, 340, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()

  // Wordmark: "delphi."
  ctx.font = '600 52px "Space Grotesk", Inter, sans-serif'
  ctx.fillStyle = '#ffffff'
  ctx.fillText('delphi', 90, 130)
  const wordWidth = ctx.measureText('delphi').width
  ctx.fillStyle = '#34d399'
  ctx.fillText('.', 90 + wordWidth, 130)

  // Divider line
  ctx.strokeStyle = 'rgba(52,211,153,0.25)'
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(90, 160)
  ctx.lineTo(size - 90, 160)
  ctx.stroke()

  // Section label
  ctx.font = '500 38px "Space Grotesk", Inter, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.65)'
  ctx.fillText('My Financial Health Score', 90, 300)

  // Big score number
  ctx.font = 'bold 260px "Space Grotesk", Inter, sans-serif'
  ctx.fillStyle = '#34d399'
  ctx.fillText(String(score), 90, 620)

  // /100 suffix
  const numWidth = ctx.measureText(String(score)).width
  ctx.font = '500 72px "Space Grotesk", Inter, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.4)'
  ctx.fillText('/100', 90 + numWidth + 16, 620)

  // Band label pill
  ctx.font = '600 44px "Space Grotesk", Inter, sans-serif'
  const bandW = ctx.measureText(label).width
  const pillPadX = 36
  const pillPadY = 22
  const pillX = 90
  const pillY = 660
  const pillW = bandW + pillPadX * 2
  const pillH = 44 + pillPadY * 2
  const pillR = pillH / 2

  ctx.save()
  ctx.fillStyle = 'rgba(52,211,153,0.18)'
  ctx.strokeStyle = 'rgba(52,211,153,0.35)'
  ctx.lineWidth = 1.5
  roundRect(ctx, pillX, pillY, pillW, pillH, pillR)
  ctx.fill()
  ctx.stroke()
  ctx.restore()
  ctx.fillStyle = '#34d399'
  ctx.font = '600 44px "Space Grotesk", Inter, sans-serif'
  ctx.fillText(label, pillX + pillPadX, pillY + pillPadY + 38)

  // Description line
  ctx.font = '400 34px Inter, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.fillText(scoreDescription(score), 90, 830)

  // Bottom CTA
  ctx.font = '500 30px Inter, sans-serif'
  ctx.fillStyle = 'rgba(255,255,255,0.3)'
  ctx.fillText('Track yours at ' + location.origin, 90, size - 80)

  return c
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.lineTo(x + w - r, y)
  ctx.arcTo(x + w, y, x + w, y + r, r)
  ctx.lineTo(x + w, y + h - r)
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
  ctx.lineTo(x + r, y + h)
  ctx.arcTo(x, y + h, x, y + h - r, r)
  ctx.lineTo(x, y + r)
  ctx.arcTo(x, y, x + r, y, r)
  ctx.closePath()
}

async function buildPngFile(score: number, label: string): Promise<File> {
  return new Promise((resolve, reject) => {
    const canvas = buildCanvas(score, label)
    canvas.toBlob((blob) => {
      if (!blob) { reject(new Error('canvas toBlob failed')); return }
      resolve(new File([blob], 'delphi-score.png', { type: 'image/png' }))
    }, 'image/png')
  })
}

export default function ShareScore({ score, label, topCategory }: Props) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [pngUrl, setPngUrl] = useState<string | null>(null)
  const [pngFile, setPngFile] = useState<File | null>(null)
  const [generating, setGenerating] = useState(false)
  const [shareUnsupported, setShareUnsupported] = useState(false)
  const modalRef = useRef<HTMLDivElement>(null)
  const urlRef = useRef<string | null>(null)

  const shareText = `My delphi Financial Health Score is ${score}/100 (${label}). Track yours: ${location.origin}`
  const shareTitle = 'My delphi Financial Health Score'

  // Generate PNG when modal opens
  useEffect(() => {
    if (!open) return
    let cancelled = false
    setGenerating(true)
    buildPngFile(score, label).then((file) => {
      if (cancelled) return
      const url = URL.createObjectURL(file)
      urlRef.current = url
      setPngUrl(url)
      setPngFile(file)
      setGenerating(false)
    }).catch(() => {
      if (!cancelled) setGenerating(false)
    })
    return () => { cancelled = true }
  }, [open, score, label])

  // Revoke object URL when modal closes
  useEffect(() => {
    if (!open && urlRef.current) {
      URL.revokeObjectURL(urlRef.current)
      urlRef.current = null
      setPngUrl(null)
      setPngFile(null)
    }
  }, [open])

  // Revoke on unmount
  useEffect(() => {
    return () => {
      if (urlRef.current) URL.revokeObjectURL(urlRef.current)
    }
  }, [])

  // Escape key closes modal
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open])

  // Focus modal when it opens
  useEffect(() => {
    if (open) {
      setTimeout(() => modalRef.current?.focus(), 0)
    }
  }, [open])

  const handleShare = useCallback(async () => {
    const nav = navigator as Navigator & { canShare?: (data: ShareData) => boolean }
    if (!nav.share) {
      setShareUnsupported(true)
      return
    }
    try {
      if (pngFile && nav.canShare?.({ files: [pngFile] })) {
        await nav.share({ files: [pngFile], title: shareTitle, text: shareText })
      } else {
        await nav.share({ title: shareTitle, text: shareText, url: location.origin })
      }
    } catch {
      // User cancelled or share failed
    }
  }, [pngFile, shareTitle, shareText])

  const handleDownload = useCallback(() => {
    if (!pngUrl) return
    const a = document.createElement('a')
    a.href = pngUrl
    a.download = 'delphi-score.png'
    a.click()
  }, [pngUrl])

  const handleCopy = useCallback(async () => {
    if (!navigator.clipboard) return
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard access denied
    }
  }, [shareText])

  const hasShare = typeof navigator !== 'undefined' && 'share' in navigator
  const hasClipboard = typeof navigator !== 'undefined' && 'clipboard' in navigator

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => { setOpen(true); setShareUnsupported(false) }}
        className="flex items-center gap-2 rounded-xl bg-brand text-on-brand px-4 py-2 text-sm font-semibold hover:bg-brand-strong transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        aria-label="Share my score"
      >
        <ShareIcon className="w-4 h-4" />
        Share my score
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false) }}
          role="presentation"
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-[rgba(0,0,0,0.55)]" aria-hidden="true" />

          {/* Dialog card */}
          <div
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-label="Share your Financial Health Score"
            tabIndex={-1}
            className="relative bg-surface border border-line rounded-2xl shadow-2xl w-full max-w-sm p-6 outline-none animate-pop"
          >
            {/* Close button */}
            <button
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-ink-faint hover:text-ink hover:bg-surface-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              aria-label="Close"
            >
              <CloseIcon className="w-4 h-4" />
            </button>

            {/* Score preview */}
            <div className="rounded-xl p-5 mb-5" style={{ background: 'linear-gradient(135deg, #03201a, #06302a)' }}>
              <div className="text-[11px] font-semibold tracking-widest mb-3">
                <span style={{ color: 'rgba(255,255,255,0.55)' }}>delphi</span>
                <span style={{ color: '#34d399' }}>.</span>
              </div>
              <div className="text-[11px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>
                My Financial Health Score
              </div>
              <div className="flex items-baseline gap-2 mt-1">
                <span className="font-display text-5xl font-bold tabular-nums leading-none" style={{ color: '#34d399' }}>
                  {score}
                </span>
                <span className="text-base" style={{ color: 'rgba(255,255,255,0.4)' }}>/100</span>
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-semibold"
                  style={{ background: 'rgba(52,211,153,0.18)', color: '#34d399', border: '1px solid rgba(52,211,153,0.3)' }}
                >
                  {label}
                </span>
              </div>
              <p className="mt-2 text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {scoreDescription(score)}
              </p>
              {topCategory && (
                <p className="mt-1.5 text-xs" style={{ color: 'rgba(52,211,153,0.75)' }}>
                  Top strength: {topCategory}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="space-y-2.5">
              {hasShare && !shareUnsupported ? (
                <button
                  onClick={handleShare}
                  disabled={generating}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand text-on-brand px-4 py-2.5 text-sm font-semibold hover:bg-brand-strong disabled:opacity-60 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  <ShareIcon className="w-4 h-4" />
                  {generating ? 'Preparing...' : 'Share'}
                </button>
              ) : (
                <p className="text-xs text-ink-faint text-center py-1">
                  Web Share is not available on this browser. Download the image or copy the text below.
                </p>
              )}

              <button
                onClick={handleDownload}
                disabled={!pngUrl}
                className="w-full flex items-center justify-center gap-2 rounded-xl border border-line-strong bg-surface px-4 py-2.5 text-sm font-medium text-ink-mid hover:border-brand hover:text-brand disabled:opacity-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
              >
                {generating ? 'Preparing image...' : 'Download image'}
              </button>

              {hasClipboard && (
                <button
                  onClick={handleCopy}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-ink-mid hover:border-brand hover:text-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand"
                >
                  {copied ? 'Copied!' : 'Copy text'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
