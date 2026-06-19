export type ResourceType = 'lesson' | 'reference' | 'learning_record'

export type Resource = {
  id: string
  title: string
  type: ResourceType
  content: string
  created_at: string
}

export type Workspace = {
  id: string
  topic: string
  mission?: string
  created_at: string
  lesson_count: number
  ref_count: number
}

export type Attachment = {
  title: string
  html: string
  type: 'lesson' | 'reference' | 'record'
}

export type Message = {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp?: string
  error?: boolean
}

export type RoadmapStepStatus = 'upcoming' | 'in_progress' | 'completed'

export type RoadmapStep = {
  order: number
  title: string
  description: string
  status: RoadmapStepStatus
}

export type Roadmap = {
  id: string
  workspace_id: string
  title: string
  goal: string
  steps: RoadmapStep[]
  created_at: string
  updated_at: string
}
