'use client'

import { useState, useEffect, useCallback } from 'react'

export function MessageInput({ onSend, disabled, retryMessage }: { onSend: (msg: string) => void; disabled?: boolean; retryMessage?: string | null }) {
  const [message, setMessage] = useState(retryMessage || '')

  useEffect(() => {
    if (retryMessage) setMessage(retryMessage)
  }, [retryMessage])

  const handleRetry = useCallback(() => {
    if (retryMessage && !disabled) {
      onSend(retryMessage)
      setMessage('')
    }
  }, [retryMessage, disabled, onSend])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'r' && retryMessage && !disabled) {
        e.preventDefault()
        handleRetry()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [retryMessage, disabled, handleRetry])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!message.trim() || disabled) return
    onSend(message)
    setMessage('')
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (!message.trim() || disabled) return
      onSend(message)
      setMessage('')
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-end gap-2 border-t border-zinc-200/60 dark:border-zinc-700/60 bg-white dark:bg-zinc-800 px-3 py-2 sm:px-4 sm:py-3" style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}>
      <textarea
        value={message}
        onChange={(e) => {
          setMessage(e.target.value)
          e.target.style.height = 'auto'
          e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
        }}
        onKeyDown={handleKeyDown}
        placeholder="Ask anything..."
        aria-label="Message"
        rows={1}
        maxLength={10000}
        className="flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 transition-all duration-150 focus:border-zinc-400 focus:bg-white focus:ring-1 focus:ring-zinc-400/20 resize-none min-h-[36px] max-h-[120px] dark:border-zinc-600 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder-zinc-500 dark:focus:border-zinc-500 dark:focus:bg-zinc-800"
        disabled={disabled}
      />
      {retryMessage && !disabled && (
        <button
          type="button"
          onClick={handleRetry}
          aria-label="Retry failed message"
          className="flex shrink-0 items-center justify-center rounded-xl bg-amber-500 w-9 h-9 transition-all duration-150 hover:bg-amber-400 active:bg-amber-600"
        >
          <svg className="h-4 w-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
          </svg>
        </button>
      )}
      <button
        type="submit"
        disabled={disabled || !message.trim()}
        aria-label={disabled ? 'Sending...' : 'Send message'}
        className="flex shrink-0 items-center justify-center rounded-xl bg-zinc-900 text-white w-9 h-9 transition-all duration-150 hover:bg-zinc-700 active:bg-zinc-950 disabled:opacity-30 disabled:cursor-not-allowed dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {disabled ? (
          <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        ) : (
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
          </svg>
        )}
      </button>
    </form>
  )
}
