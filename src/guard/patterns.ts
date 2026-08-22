export interface InjectionPattern {
  id: string
  regex: RegExp
}

export interface InjectionFlag {
  docId: string
  blockIndex: number
  page: number
  matchedPattern: string
  excerpt: string
  action: 'quarantined'
}

export const INJECTION_PATTERNS: readonly InjectionPattern[] = [
  {
    id: 'ignore_previous_instructions',
    regex: /ignore\s+(?:all\s+|any\s+)?(?:previous|prior|above|earlier)\s+instructions/i,
  },
  {
    id: 'disregard_directive',
    regex: /disregard\s+(?:your|all|any|previous|the|these)\s+(?:instructions|rules|directives)/i,
  },
  {
    id: 'role_hijack',
    regex: /you\s+are\s+now\s+(?:a|an)\s+/i,
  },
  {
    id: 'approval_command',
    regex: /\b(?:approve|release|pay\s*out|transfer)\s+(?:this|the)\b/i,
  },
  {
    id: 'secret_extraction',
    regex: /\b(?:reveal|print|show|repeat)\s+(?:your\s+)?(?:system\s*prompt|secret|hidden\s+instructions|rules)\b/i,
  },
  {
    id: 'tool_invocation_attempt',
    regex: /\b(?:call|invoke|execute|run)\s+(?:the\s+)?[a-z_-]+\s+tool\b/i,
  },
]
