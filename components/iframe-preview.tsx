'use client'

import { useMemo } from 'react'
import { injectQuizScript } from '@/lib/quiz-inject'
import { injectSharedStyles } from '@/lib/shared-styles'

export function IframePreview({
  html,
  title,
  className = '',
  scale = 3,
}: {
  html: string
  title?: string
  className?: string
  scale?: number
}) {
  const pct = `${scale * 100}%`
  const inv = 1 / scale
  const safeHtml = useMemo(() => injectQuizScript(injectSharedStyles(html)), [html])
  return (
    <iframe
      srcDoc={safeHtml}
      title={title}
      sandbox="allow-scripts allow-same-origin"
      className={`absolute top-0 left-0 border-0 ${className}`}
      style={{ width: pct, height: pct, transform: `scale(${inv})`, transformOrigin: 'top left' }}
    />
  )
}
