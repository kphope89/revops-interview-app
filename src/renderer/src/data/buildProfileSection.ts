import { UserProfile } from '../types'

export function buildProfileSection(profile: UserProfile): string {
  // Check if the profile has any meaningful data
  const hasIdentity = profile.name || profile.currentTitle || profile.currentCompany || profile.yearsExperience
  const hasTarget = profile.targetTitle || profile.targetStage || profile.targetIndustry || profile.lookingBecause
  const hasStrengths = profile.topStrengths.length > 0
  const hasMetrics = profile.signatureMetrics.some((m) => m.trim())
  const hasDifferentiator = profile.differentiator.trim()
  const hasResume = profile.resume.trim()

  if (!hasIdentity && !hasTarget && !hasStrengths && !hasMetrics && !hasDifferentiator && !hasResume) {
    return ''
  }

  const lines: string[] = []

  lines.push('## Candidate Profile')
  lines.push('> Treat as authoritative personal context. Reference specific details naturally, as you would in conversation — not as name-drops.')
  lines.push('')

  // Identity
  if (hasIdentity) {
    const roleparts: string[] = []
    if (profile.currentTitle) roleparts.push(profile.currentTitle)
    if (profile.currentCompany) roleparts.push(`at ${profile.currentCompany}`)
    if (profile.yearsExperience) roleparts.push(`(${profile.yearsExperience} experience)`)
    if (roleparts.length > 0) {
      lines.push(`**Current Role:** ${roleparts.join(' ')}`)
    }
  }

  // Target
  if (hasTarget) {
    const targetParts: string[] = []
    if (profile.targetTitle) targetParts.push(profile.targetTitle)
    const stageParts: string[] = []
    if (profile.targetStage) stageParts.push(profile.targetStage)
    if (profile.targetIndustry) stageParts.push(profile.targetIndustry)
    if (stageParts.length > 0) targetParts.push(`at a ${stageParts.join(' ')} company`)
    if (targetParts.length > 0) {
      lines.push(`**Targeting:** ${targetParts.join(' ')}`)
    }
    if (profile.lookingBecause.trim()) {
      lines.push(`**Why making this move:** ${profile.lookingBecause.trim()}`)
    }
  }

  if (hasStrengths) {
    lines.push('')
    lines.push(`**Core Strengths:** ${profile.topStrengths.join(', ')}`)
  }

  const filledMetrics = profile.signatureMetrics.filter((m) => m.trim())
  if (filledMetrics.length > 0) {
    lines.push('')
    lines.push('**Signature Metrics:**')
    filledMetrics.forEach((m) => lines.push(`- ${m.trim()}`))
  }

  if (hasDifferentiator) {
    lines.push('')
    lines.push(`**Differentiator:** ${profile.differentiator.trim()}`)
  }

  if (hasResume) {
    lines.push('')
    lines.push('**Full Background:**')
    lines.push(profile.resume.trim())
  }

  return lines.join('\n')
}
