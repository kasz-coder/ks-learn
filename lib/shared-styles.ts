const SHARED_STYLES = `/* TeachFlow Shared Lesson Styles */
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: 'Georgia', serif; max-width: 720px; margin: 0 auto; padding: 2rem 1rem; line-height: 1.8; color: #1a1a1a; background: #fafafa; }
h1 { font-size: 1.75rem; border-bottom: 2px solid #1a1a1a; padding-bottom: 0.5rem; margin-bottom: 1.5rem; }
h2 { font-size: 1.25rem; margin-top: 2rem; margin-bottom: 0.75rem; color: #111; }
p { margin-bottom: 1rem; }
.meta { font-size: 0.85rem; color: #666; margin-bottom: 1.5rem; }
.insight { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 1rem 1.25rem; margin: 1.5rem 0; border-radius: 0 8px 8px 0; font-style: italic; }
.compare { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin: 1.5rem 0; }
.compare div { padding: 1rem; border-radius: 8px; }
.bad { background: #fef2f2; border: 1px solid #fecaca; }
.good { background: #f0fdf4; border: 1px solid #bbf7d0; }
.lbl { font-weight: 700; font-size: 0.8rem; text-transform: uppercase; margin-bottom: 0.5rem; color: #555; }
ul, ol { margin: 1rem 0; padding-left: 1.5rem; }
li { margin: 0.3rem 0; }
code { background: #f1f5f9; padding: 0.15rem 0.4rem; border-radius: 4px; font-size: 0.9em; }
pre { background: #1e293b; color: #e2e8f0; padding: 1rem; border-radius: 8px; overflow-x: auto; margin: 1rem 0; }
pre code { background: none; padding: 0; color: inherit; }
blockquote { border-left: 3px solid #3b82f6; padding: 0.75rem 1rem; margin: 1rem 0; background: #f8fafc; border-radius: 0 6px 6px 0; }
a { color: #2563eb; }
.quiz { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 1.25rem; margin: 1.5rem 0; }
.quiz h3 { font-size: 1rem; margin-bottom: 0.75rem; }
.q { padding: 0.6rem 0.9rem; border: 1px solid #d1d5db; border-radius: 6px; margin: 0.4rem 0; cursor: pointer; background: white; font-size: 0.9rem; }
.q:hover { border-color: #3b82f6; background: #eff6ff; }
.next { background: #f1f5f9; border-radius: 8px; padding: 1.25rem; margin-top: 2rem; }
.next h2 { margin-top: 0; }
.term { margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid #e5e7eb; }
.term:last-child { border: none; }
.name { font-weight: 700; color: #2563eb; font-size: 1.1rem; }
.def { color: #374151; margin-top: 0.25rem; }`

export function injectSharedStyles(html: string): string {
  if (!html) return html

  if (/<head[\s>]/i.test(html)) {
    return html.replace(/<head([\s>])/, `<head$1<style>${SHARED_STYLES}</style>`)
  }

  if (/<html[\s>]/i.test(html)) {
    return html.replace(/<html([\s>])/, `<html$1<head><style>${SHARED_STYLES}</style></head>`)
  }

  if (/<body[\s>]/i.test(html)) {
    return html.replace(/<body([\s>])/, `<body$1<style>${SHARED_STYLES}</style>`)
  }

  if (/<style[\s>]/i.test(html)) {
    return html.replace(/<style([\s>])/, `<style>${SHARED_STYLES}</style><style data-original="true"$1`)
  }

  return `<!DOCTYPE html><html><head><style>${SHARED_STYLES}</style></head><body>${html}</body></html>`
}

export function stripInlineStyles(html: string): string {
  return html.replace(/<style[\s\S]*?<\/style>/gi, '')
}
