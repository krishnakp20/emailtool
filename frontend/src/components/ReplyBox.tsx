import React, { useState, useEffect, useRef } from 'react'
import { EmailTemplate, templatesAPI } from '../api/client'
import {
  analyzeText,
  applyCorrection,
  autoFixText,
  formatProfessionally,
  getCommonSuggestions,
  getSmartCompletions,
  GrammarError,
  TextSuggestion
} from '../services/textEnhancement'

interface ReplyBoxProps {
  ticketId: number
  onReply: (text: string, templateId?: number) => Promise<void>
  disabled?: boolean
}

const ReplyBox: React.FC<ReplyBoxProps> = ({ ticketId, onReply, disabled = false }) => {
  const [text, setText] = useState('')
  const [templateId, setTemplateId] = useState<number | undefined>()
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [grammarErrors, setGrammarErrors] = useState<GrammarError[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [showCompletions, setShowCompletions] = useState(false)
  const [smartCompletions, setSmartCompletions] = useState<string[]>([])
  const [cursorPosition, setCursorPosition] = useState(0)
  const [showEnhancements, setShowEnhancements] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const templatesList = await templatesAPI.list()
        setTemplates(templatesList)
      } catch (error) {
        console.error('Failed to fetch templates:', error)
      } finally {
        setIsLoadingTemplates(false)
      }
    }

    fetchTemplates()
  }, [])

  // Check grammar and spelling when text changes
  useEffect(() => {
    if (text) {
      const errors = analyzeText(text)
      setGrammarErrors(errors)
    } else {
      setGrammarErrors([])
    }
  }, [text])

  // Handle text change and smart completions
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value
    const cursorPos = e.target.selectionStart
    
    setText(newText)
    setCursorPosition(cursorPos)
    
    // Check for smart completions
    const completions = getSmartCompletions(newText, cursorPos)
    if (completions.length > 0) {
      setSmartCompletions(completions)
      setShowCompletions(true)
    } else {
      setShowCompletions(false)
    }
  }

  // Apply a completion suggestion
  const applyCompletion = (completion: string) => {
    if (textareaRef.current) {
      const beforeCursor = text.substring(0, cursorPosition)
      const afterCursor = text.substring(cursorPosition)
      const newText = beforeCursor + completion + afterCursor
      setText(newText)
      setShowCompletions(false)
      
      // Focus back on textarea
      textareaRef.current.focus()
      setTimeout(() => {
        textareaRef.current?.setSelectionRange(
          cursorPosition + completion.length,
          cursorPosition + completion.length
        )
      }, 0)
    }
  }

  // Insert suggestion text
  const insertSuggestion = (suggestion: TextSuggestion) => {
    if (text && !text.endsWith('\n')) {
      setText(text + '\n\n' + suggestion.text)
    } else {
      setText(text + suggestion.text)
    }
    setShowSuggestions(false)
  }

  // Auto-fix all spelling errors
  const handleAutoFix = () => {
    const fixed = autoFixText(text)
    setText(fixed)
  }

  // Format text professionally
  const handleFormatText = () => {
    const formatted = formatProfessionally(text)
    setText(formatted)
  }

  // Apply a specific grammar/spelling correction
  const applySpecificCorrection = (error: GrammarError) => {
    const corrected = applyCorrection(text, error)
    setText(corrected)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || isLoading) return

    setIsLoading(true)
    try {
      await onReply(text.trim(), templateId)
      setText('')
      setTemplateId(undefined)
      setSelectedTemplate(null)
    } catch (error) {
      console.error('Failed to send reply:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleTemplateChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value
    const newTemplateId = value ? parseInt(value) : undefined
    
    setTemplateId(newTemplateId)
    
    if (newTemplateId) {
      try {
        // Fetch the selected template to get its content
        const template = await templatesAPI.get(newTemplateId)
        setSelectedTemplate(template)
        
        // Populate the message body with template content
        // Replace placeholders with actual values if needed
        let templateBody = template.body
        templateBody = templateBody.replace(/\[TICKET_ID\]/g, ticketId.toString())
        
        setText(templateBody)
      } catch (error) {
        console.error('Failed to fetch template:', error)
        setSelectedTemplate(null)
      }
    } else {
      setSelectedTemplate(null)
      setText('')
    }
  }

  const clearTemplate = () => {
    setTemplateId(undefined)
    setSelectedTemplate(null)
    setText('')
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      {/* Header Section - Moved to top */}
      <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h3 className="text-xl font-semibold text-gray-900">Reply to Ticket</h3>
            <p className="text-sm text-gray-600">Send a response to the customer</p>
          </div>
        </div>
      </div>
      
      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* Template Selection */}
        <div>
          <label htmlFor="template" className="block text-sm font-medium text-gray-700 mb-2">
            Email Template
          </label>
          <div className="flex space-x-3">
            <select
              id="template"
              value={templateId || ''}
              onChange={handleTemplateChange}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
              disabled={isLoadingTemplates}
            >
              <option value="">Select a template (optional)</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
            {selectedTemplate && (
              <button
                type="button"
                onClick={clearTemplate}
                className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Clear
              </button>
            )}
          </div>
          
          {/* Template Preview */}
          {selectedTemplate && (
            <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-start space-x-3">
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-800">Template: {selectedTemplate.name}</p>
                  <p className="text-sm text-blue-700 mt-1">
                    <span className="font-medium">Subject:</span> {selectedTemplate.subject}
                  </p>
                  <p className="text-xs text-blue-600 mt-2">
                    Template content will be automatically populated below. You can edit it as needed.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Reply Text */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="reply-text" className="block text-sm font-medium text-gray-700">
              Reply Message
            </label>
            <div className="flex items-center space-x-2">
              {/* Enhancement Tools */}
              <button
                type="button"
                onClick={() => setShowSuggestions(!showSuggestions)}
                className="flex items-center px-2 py-1 text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded transition-colors"
                title="Show suggestions"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                Suggestions
              </button>
              
              <button
                type="button"
                onClick={() => setShowEnhancements(!showEnhancements)}
                className="flex items-center px-2 py-1 text-xs text-purple-600 hover:text-purple-800 hover:bg-purple-50 rounded transition-colors"
                title="Show writing tools"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Tools
              </button>
              
              {grammarErrors.length > 0 && (
                <span className="flex items-center px-2 py-1 text-xs bg-yellow-50 text-yellow-700 rounded">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.964-1.333-2.732 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {grammarErrors.length} issue{grammarErrors.length !== 1 ? 's' : ''}
                </span>
              )}
            </div>
          </div>
          
          {/* Suggestions Panel */}
          {showSuggestions && (
            <div className="mb-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-2">Quick Suggestions</h4>
              <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto">
                {getCommonSuggestions().slice(0, 10).map((suggestion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => insertSuggestion(suggestion)}
                    className="text-left px-3 py-2 text-sm bg-white hover:bg-blue-100 rounded border border-blue-200 transition-colors"
                  >
                    <div className="font-medium text-blue-900">{suggestion.text}</div>
                    <div className="text-xs text-blue-600 mt-0.5">{suggestion.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Writing Tools Panel */}
          {showEnhancements && (
            <div className="mb-3 p-4 bg-purple-50 border border-purple-200 rounded-lg">
              <h4 className="text-sm font-medium text-purple-900 mb-3">Writing Tools</h4>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleAutoFix}
                  disabled={!text || grammarErrors.filter(e => e.type === 'spelling').length === 0}
                  className="px-3 py-1.5 text-sm bg-white hover:bg-purple-100 text-purple-700 rounded border border-purple-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={grammarErrors.filter(e => e.type === 'spelling').length > 0 ? `Fix ${grammarErrors.filter(e => e.type === 'spelling').length} spelling errors` : 'No spelling errors found'}
                >
                  ✓ Auto-Fix Spelling ({grammarErrors.filter(e => e.type === 'spelling').length})
                </button>
                <button
                  type="button"
                  onClick={handleFormatText}
                  disabled={!text}
                  className="px-3 py-1.5 text-sm bg-white hover:bg-purple-100 text-purple-700 rounded border border-purple-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Capitalize sentences, fix spacing, and improve punctuation"
                >
                  ✨ Format Professionally
                </button>
              </div>
              
              {/* Grammar/Spelling Issues */}
              {grammarErrors.length > 0 && (
                <div className="mt-3 space-y-2 max-h-40 overflow-y-auto">
                  <h5 className="text-xs font-medium text-purple-900">Issues Found:</h5>
                  {grammarErrors.slice(0, 5).map((error, idx) => (
                    <div key={idx} className="text-xs bg-white p-2 rounded border border-purple-200">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-xs font-medium mr-2 ${
                            error.type === 'spelling' ? 'bg-red-100 text-red-700' :
                            error.type === 'grammar' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-blue-100 text-blue-700'
                          }`}>
                            {error.type}
                          </span>
                          <span className="text-gray-700">{error.message}</span>
                        </div>
                        {error.replacements.length > 0 && (
                          <button
                            type="button"
                            onClick={() => applySpecificCorrection(error)}
                            className="ml-2 px-2 py-0.5 text-xs bg-purple-600 text-white rounded hover:bg-purple-700"
                          >
                            Fix
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                  {grammarErrors.length > 5 && (
                    <div className="text-xs text-purple-600 text-center">
                      +{grammarErrors.length - 5} more issues
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Smart Completions */}
          {showCompletions && smartCompletions.length > 0 && (
            <div className="mb-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="text-xs font-medium text-green-900 mb-2">
                <svg className="w-3 h-3 inline mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Smart Completions
              </h4>
              <div className="flex flex-wrap gap-2">
                {smartCompletions.map((completion, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => applyCompletion(completion)}
                    className="px-2 py-1 text-xs bg-white hover:bg-green-100 text-green-800 rounded border border-green-300 transition-colors"
                  >
                    {completion}
                  </button>
                ))}
              </div>
            </div>
          )}

          <textarea
            ref={textareaRef}
            id="reply-text"
            rows={8}
            value={text}
            onChange={handleTextChange}
            placeholder={selectedTemplate ? "Template content loaded. Edit as needed..." : "Type your reply message here..."}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-colors"
            disabled={disabled || isLoading}
            spellCheck={true}
            required
          />
          <div className="mt-2 flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center space-x-3">
              <span>
                {selectedTemplate ? 'Template loaded' : 'Custom message'}
              </span>
              {grammarErrors.length > 0 && (
                <button
                  type="button"
                  onClick={() => setShowEnhancements(!showEnhancements)}
                  className="text-xs text-yellow-600 hover:text-yellow-800 underline"
                >
                  View {grammarErrors.length} issue{grammarErrors.length !== 1 ? 's' : ''}
                </button>
              )}
            </div>
            <span className="text-xs">
              {text.length} characters
            </span>
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end pt-4 border-t border-gray-200">
          <button
            type="submit"
            disabled={!text.trim() || isLoading || disabled}
            className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
          >
            {isLoading ? (
              <div className="flex items-center space-x-2">
                <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Sending...</span>
              </div>
            ) : (
              'Send Reply'
            )}
          </button>
        </div>
      </form>
    </div>
  )
}

export default ReplyBox 