import { z } from 'zod'

const clientEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_URL is required'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
})

const serverEnvSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  OPENAI_BASE_URL: z.string().optional(),
  OPENAI_MODEL: z.string().optional(),
  TAVILY_API_KEY: z.string().optional(),
})

let clientValidated = false
let serverValidated = false

export function validateEnv() {
  if (clientValidated && serverValidated) return
  const isServer = typeof window === 'undefined'

  if (!clientValidated) {
    const result = clientEnvSchema.safeParse(process.env)
    if (!result.success) {
      const missing = result.error.issues.map(i => i.path.join('.')).join(', ')
      throw new Error(`Missing required environment variables: ${missing}`)
    }
    clientValidated = true
  }

  if (isServer && !serverValidated) {
    const result = serverEnvSchema.safeParse(process.env)
    if (!result.success) {
      const missing = result.error.issues.map(i => i.path.join('.')).join(', ')
      throw new Error(`Missing required environment variables: ${missing}`)
    }
    serverValidated = true
  }
}
