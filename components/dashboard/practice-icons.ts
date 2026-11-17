import { BookOpen, Brain, Mic2, MessageSquareText, Music, PenLine, Play, SpellCheck, Target, Volume2 } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import type { PracticeIcon } from "./data"

export const practiceIcons: Record<PracticeIcon, LucideIcon> = {
  voice: Mic2,
  video: Play,
  story: BookOpen,
  thought: MessageSquareText,
  grammar: SpellCheck,
  reading: Volume2,
  pen: PenLine,
  brain: Brain,
  music: Music,
  target: Target,
}
