import type { VideoModule } from '../lib/videos'
import { PlayIcon } from './icons'

export default function VideoModuleCard({ video }: { video: VideoModule }) {
  return (
    <div className="bg-surface rounded-xl border border-line p-4 flex gap-3 items-start hover:border-brand transition-colors">
      <div className="shrink-0 w-11 h-11 rounded-lg bg-brand-soft text-brand flex items-center justify-center">
        <PlayIcon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm text-ink truncate">{video.title}</h3>
          <span className="shrink-0 text-[11px] text-ink-faint bg-surface-2 rounded-full px-2 py-0.5">
            {video.duration}
          </span>
        </div>
        <p className="mt-0.5 text-xs text-ink-faint leading-snug">{video.blurb}</p>
        <button
          type="button"
          className="mt-1.5 text-xs font-medium text-brand hover:text-brand-strong"
          onClick={() => alert(`"${video.title}", video module coming soon!`)}
        >
          Watch explainer →
        </button>
      </div>
    </div>
  )
}
