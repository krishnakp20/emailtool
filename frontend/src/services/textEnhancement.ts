// Text Enhancement Service for grammar, spelling, and suggestions

export interface GrammarError {
  message: string
  offset: number
  length: number
  replacements: string[]
  type: 'spelling' | 'grammar' | 'style'
}

export interface TextSuggestion {
  text: string
  category: string
  description: string
}

// Common email reply suggestions
export const getCommonSuggestions = (): TextSuggestion[] => {
  const suggestions: TextSuggestion[] = [
    // Greetings
    { text: "Thank you for contacting us.", category: "greeting", description: "Thank customer" },
    { text: "Thank you for reaching out to us.", category: "greeting", description: "Polite opening" },
    { text: "I hope this message finds you well.", category: "greeting", description: "Friendly opening" },
    { text: "Thank you for your patience.", category: "greeting", description: "Acknowledge waiting" },
    
    // Problem acknowledgment
    { text: "I understand your concern about this issue.", category: "acknowledgment", description: "Show understanding" },
    { text: "I apologize for any inconvenience this may have caused.", category: "acknowledgment", description: "Apologize" },
    { text: "We appreciate you bringing this to our attention.", category: "acknowledgment", description: "Thank for feedback" },
    { text: "I can see how frustrating this must be.", category: "acknowledgment", description: "Show empathy" },
    
    // Solutions
    { text: "I'd be happy to help you with this.", category: "solution", description: "Offer help" },
    { text: "Let me look into this for you.", category: "solution", description: "Take action" },
    { text: "Here's what we can do to resolve this:", category: "solution", description: "Provide solution" },
    { text: "I've checked your account and found that", category: "solution", description: "Share findings" },
    
    // Closing
    { text: "Please let me know if you need any further assistance.", category: "closing", description: "Offer more help" },
    { text: "Feel free to reach out if you have any questions.", category: "closing", description: "Invite follow-up" },
    { text: "We're here to help if you need anything else.", category: "closing", description: "Reassure availability" },
    { text: "Thank you for your understanding.", category: "closing", description: "Thank customer" },
    { text: "Have a great day!", category: "closing", description: "Friendly ending" },
    
    // Follow-up
    { text: "I'll follow up with you once this is resolved.", category: "follow-up", description: "Promise update" },
    { text: "I'll keep you updated on the progress.", category: "follow-up", description: "Promise updates" },
    { text: "You should see the changes within 24-48 hours.", category: "follow-up", description: "Set timeframe" },
  ]
  
  return suggestions
}

// Smart text completion based on context
export const getSmartCompletions = (text: string, cursorPosition: number): string[] => {
  const beforeCursor = text.substring(0, cursorPosition).toLowerCase()
  const completions: string[] = []
  
  // Pattern-based completions
  if (beforeCursor.endsWith('thank you for ')) {
    completions.push(
      'your patience',
      'contacting us',
      'reaching out',
      'your email',
      'bringing this to our attention'
    )
  }
  
  if (beforeCursor.endsWith('i apologize for ')) {
    completions.push(
      'any inconvenience',
      'the delay',
      'this issue',
      'the confusion',
      'any frustration this may have caused'
    )
  }
  
  if (beforeCursor.endsWith('please ')) {
    completions.push(
      'let me know',
      'feel free to',
      'don\'t hesitate to',
      'contact us if',
      'reach out if'
    )
  }
  
  if (beforeCursor.endsWith('i will ')) {
    completions.push(
      'look into this',
      'investigate this issue',
      'get back to you',
      'follow up with you',
      'resolve this as soon as possible'
    )
  }
  
  if (beforeCursor.endsWith('we ')) {
    completions.push(
      'appreciate your patience',
      'are here to help',
      'value your feedback',
      'apologize for the inconvenience',
      'will resolve this issue'
    )
  }
  
  return completions
}

// Check for common spelling errors
export const checkSpelling = (text: string): GrammarError[] => {
  const errors: GrammarError[] = []
  
  const commonMisspellings: Record<string, string> = {
    'recieve': 'receive',
    'occured': 'occurred',
    'occurance': 'occurrence',
    'seperete': 'separate',
    'definately': 'definitely',
    'acommodate': 'accommodate',
    'occassion': 'occasion',
    'untill': 'until',
    'tommorow': 'tomorrow',
    'begining': 'beginning',
    'writting': 'writing',
    'sucessful': 'successful',
    'necesary': 'necessary',
    'recomend': 'recommend',
    'referal': 'referral',
    'refering': 'referring',
    'priviledge': 'privilege',
    'maintainance': 'maintenance',
    'enviroment': 'environment',
    'basicly': 'basically',
    'finaly': 'finally',
    'generaly': 'generally',
    'imediately': 'immediately',
    'kindly': 'kindly',
    'usefull': 'useful',
    'greatful': 'grateful',
    'sincerely': 'sincerely',
  }
  
  const words = text.split(/\b/)
  let offset = 0
  
  for (const word of words) {
    const lowerWord = word.toLowerCase()
    if (commonMisspellings[lowerWord]) {
      errors.push({
        message: `Possible spelling error: "${word}" → "${commonMisspellings[lowerWord]}"`,
        offset,
        length: word.length,
        replacements: [commonMisspellings[lowerWord]],
        type: 'spelling'
      })
    }
    offset += word.length
  }
  
  return errors
}

// Check for common grammar issues
export const checkGrammar = (text: string): GrammarError[] => {
  const errors: GrammarError[] = []
  
  // Check for common grammar patterns
  const patterns = [
    {
      regex: /\b(your|you're)\s+welcome\b/gi,
      check: (match: string) => match.toLowerCase().startsWith("your"),
      message: 'Did you mean "you\'re welcome" (you are welcome)?',
      replacement: "you're welcome"
    },
    {
      regex: /\b(its|it's)\s+(a|an|the|going|been)\b/gi,
      check: (match: string) => match.toLowerCase().startsWith("its "),
      message: 'Did you mean "it\'s" (it is/it has)?',
      replacement: "it's"
    },
    {
      regex: /\b(their|there|they're)\s+(are|is|was|were)\b/gi,
      check: (match: string) => {
        const lower = match.toLowerCase()
        return lower.startsWith("their ") || lower.startsWith("they're ")
      },
      message: 'Consider using "there" for location/existence',
      replacement: "there"
    },
    {
      regex: /\bcould\s+of\b/gi,
      message: 'Did you mean "could have" or "could\'ve"?',
      replacement: "could have"
    },
    {
      regex: /\bshould\s+of\b/gi,
      message: 'Did you mean "should have" or "should\'ve"?',
      replacement: "should have"
    },
    {
      regex: /\bwould\s+of\b/gi,
      message: 'Did you mean "would have" or "would\'ve"?',
      replacement: "would have"
    },
  ]
  
  for (const pattern of patterns) {
    let match
    const regex = new RegExp(pattern.regex)
    while ((match = regex.exec(text)) !== null) {
      if (!pattern.check || pattern.check(match[0])) {
        errors.push({
          message: pattern.message,
          offset: match.index,
          length: match[0].length,
          replacements: [pattern.replacement],
          type: 'grammar'
        })
      }
    }
  }
  
  return errors
}

// Check for style improvements
export const checkStyle = (text: string): GrammarError[] => {
  const errors: GrammarError[] = []
  
  // Check for redundant phrases
  const redundancies: Record<string, string> = {
    'absolutely essential': 'essential',
    'advance planning': 'planning',
    'basic fundamentals': 'fundamentals',
    'close proximity': 'proximity',
    'end result': 'result',
    'free gift': 'gift',
    'future plans': 'plans',
    'past history': 'history',
    'please kindly': 'please',
    'repeat again': 'repeat',
    'true fact': 'fact',
  }
  
  const lowerText = text.toLowerCase()
  for (const [redundant, better] of Object.entries(redundancies)) {
    const index = lowerText.indexOf(redundant)
    if (index !== -1) {
      errors.push({
        message: `Consider simplifying: "${redundant}" → "${better}"`,
        offset: index,
        length: redundant.length,
        replacements: [better],
        type: 'style'
      })
    }
  }
  
  // Check for overly long sentences (>40 words)
  const sentences = text.split(/[.!?]+/)
  let offset = 0
  for (const sentence of sentences) {
    const wordCount = sentence.trim().split(/\s+/).length
    if (wordCount > 40) {
      errors.push({
        message: 'This sentence is quite long. Consider breaking it into shorter sentences.',
        offset,
        length: sentence.length,
        replacements: [],
        type: 'style'
      })
    }
    offset += sentence.length + 1
  }
  
  return errors
}

// Get all text issues
export const analyzeText = (text: string): GrammarError[] => {
  const spelling = checkSpelling(text)
  const grammar = checkGrammar(text)
  const style = checkStyle(text)
  
  return [...spelling, ...grammar, ...style]
}

// Apply a correction to text
export const applyCorrection = (text: string, error: GrammarError, replacementIndex = 0): string => {
  if (error.replacements.length === 0) return text
  
  const before = text.substring(0, error.offset)
  const after = text.substring(error.offset + error.length)
  const replacement = error.replacements[replacementIndex]
  
  return before + replacement + after
}

// Auto-fix all issues
export const autoFixText = (text: string): string => {
  let fixedText = text
  const errors = analyzeText(text)
  
  // Sort errors by offset in descending order to avoid offset shifts
  errors.sort((a, b) => b.offset - a.offset)
  
  for (const error of errors) {
    if (error.replacements.length > 0 && error.type === 'spelling') {
      fixedText = applyCorrection(fixedText, error)
    }
  }
  
  return fixedText
}

// Format text professionally
export const formatProfessionally = (text: string): string => {
  let formatted = text.trim()
  
  // Capitalize first letter of sentences
  formatted = formatted.replace(/(^\w|[.!?]\s+\w)/g, match => match.toUpperCase())
  
  // Remove multiple spaces
  formatted = formatted.replace(/\s+/g, ' ')
  
  // Remove multiple line breaks (max 2)
  formatted = formatted.replace(/\n{3,}/g, '\n\n')
  
  // Ensure proper spacing after punctuation
  formatted = formatted.replace(/([.!?,;:])(\w)/g, '$1 $2')
  
  return formatted
}

