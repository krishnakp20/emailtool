import React, { useState, useEffect, useRef } from 'react'
import { EmailTemplate, templatesAPI, ticketsAPI } from '../api/client'
import axios from 'axios'

interface ReplyBoxProps {
  ticketId: number
  onReply: (
    text: string,
    templateId?: number,
    attachments?: File[]
  ) => Promise<void>
  disabled?: boolean
}

const ReplyBox: React.FC<ReplyBoxProps> = ({ ticketId, onReply, disabled = false }) => {
  const [text, setText] = useState('')
  const [templateId, setTemplateId] = useState<number | undefined>()
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(true)
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [isChecking, setIsChecking] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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


  // Function to check grammar in real-time using LanguageTool API
  const checkGrammar = async (inputText: string) => {
    if (!inputText.trim()) {
      setSuggestions([])
      return
    }

    setIsChecking(true)
    try {
      const response = await axios.post(
        'https://api.languagetool.org/v2/check',
        new URLSearchParams({
          text: inputText,
          language: 'en-US',
        }),
        { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
      )
      setSuggestions(response.data.matches || [])
    } catch (error) {
      console.error('Grammar check failed:', error)
    } finally {
      setIsChecking(false)
    }
  }


  // Debounce typing before checking grammar
  useEffect(() => {
    const timeout = setTimeout(() => {
      checkGrammar(text)
    }, 1000)
    return () => clearTimeout(timeout)
  }, [text])


  // Handle text change and smart completions
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newText = e.target.value

    // If user edits text after loading a template, disconnect template link
    if (selectedTemplate && newText !== selectedTemplate.body) {
        setTemplateId(undefined)
    }

    setText(newText)
  }


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!text.trim() || isLoading) return

    setIsLoading(true)
    try {
      await onReply(text.trim(), templateId, attachments)
      setAttachments([])
      if (fileInputRef.current) fileInputRef.current.value = ""
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

      if (!newTemplateId) {
        setSelectedTemplate(null)
        setText('')
        return
      }

      try {
        // Fetch the selected template
        const template = await templatesAPI.get(newTemplateId)
        setSelectedTemplate(template)

        // Fetch the related ticket (using your API client)
        const ticket = await ticketsAPI.get(ticketId)

        // Replace placeholders dynamically in subject & body
        const fillTemplate = (text: string) =>
          text
            .replace(/{ticket_id}/gi, String(ticket.id))
            .replace(/{customer_name}/gi, ticket.customer_name || ticket.customer_email || 'Customer')
            .replace(/{subject}/gi, ticket.subject || '')
            .replace(/{adviser_name}/gi, ticket.assigned_user?.name || 'Support Team')

        const filledBody = fillTemplate(template.body)
        const filledSubject = fillTemplate(template.subject)

        // Update local state
        setText(filledBody)
        setSelectedTemplate({
          ...template,
          subject: filledSubject,
          body: filledBody,
        })
      } catch (error) {
        console.error('Failed to load template or ticket:', error)
        setSelectedTemplate(null)
      }
  }



  const clearTemplate = () => {
    setTemplateId(undefined)
    setSelectedTemplate(null)
    setText('')
  }


  // Auto-correct button — applies first LanguageTool suggestion
  const applyCorrections = () => {
    let corrected = text
    suggestions.forEach((s) => {
      if (s.replacements.length > 0) {
        const wrongText = corrected.substring(s.offset, s.offset + s.length)
        corrected = corrected.replace(wrongText, s.replacements[0].value)
      }
    })
    setText(corrected)
    setSuggestions([])
  }


  const MAX_FILE_SIZE = 25 * 1024 * 1024        // 25MB general max
  const MAX_VIDEO_SIZE = 5 * 1024 * 1024        // 5MB video limit

  const allowedTypes = [
      "image/jpeg", "image/png", "application/pdf", "text/plain",
      "application/msword", "application/vnd.ms-excel", "application/zip",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "video/mp4", "video/webm", "video/ogg"
  ]

  const [attachments, setAttachments] = useState<File[]>([])

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || [])
      const valid: File[] = []

      for (let file of files) {
        // reject invalid type
        if (!allowedTypes.includes(file.type)) {
          alert(`❌ File not allowed → ${file.name}`)
          continue
        }

        // separate rule for video <5MB
        if (file.type.startsWith("video") && file.size > MAX_VIDEO_SIZE) {
          alert(`❌ Video too large → ${file.name}\nMax allowed size is 5MB`)
          continue
        }

        // for all other files max 25MB
        if (!file.type.startsWith("video") && file.size > MAX_FILE_SIZE) {
          alert(`❌ File too large → ${file.name} (max 25MB)`)
          continue
        }

        valid.push(file)
      }
      setAttachments(prev => [...prev, ...valid])
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
                  <p className="text-sm font-medium text-blue-800">
                      Template: <span className="font-semibold">{selectedTemplate.name}</span>
                      <span className="text-blue-700 font-normal ml-2">
                        | Subject: <span className="font-medium">{selectedTemplate.subject}</span>
                      </span>
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
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

            <button
              type="button"
              onClick={applyCorrections}
              disabled={suggestions.length === 0}
              className="text-blue-600 text-sm hover:underline disabled:text-gray-400"
            >
              Apply {suggestions.length} Correction{suggestions.length !== 1 && 's'}
            </button>
          </div>

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
            <span>
              {isChecking
                ? 'Checking grammar...'
                : suggestions.length > 0
                ? `${suggestions.length} issue(s) found`
                : 'No grammar issues detected'}
            </span>

            <div className="flex items-center space-x-3">
              <span>
                {selectedTemplate ? 'Template loaded' : 'Custom message'}
              </span>
            </div>
            <span className="text-xs">
              {text.length} characters
            </span>
          </div>
        </div>

        {/* Attachments Upload  */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Attach Files
          </label>

          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileUpload}
            accept={allowedTypes.join(",")}
            className="block w-full text-sm text-gray-700 border border-gray-300 rounded-lg cursor-pointer bg-white focus:ring-blue-500 focus:border-blue-500 p-2"
          />

          {/* File Preview */}
          {attachments.length > 0 && (
            <div className="mt-3 space-y-2">
              {attachments.map((file, i) => (
                <div key={i} className="flex justify-between items-center bg-gray-100 px-3 py-2 rounded">

                  <span className="text-sm text-gray-800 truncate max-w-[70%]">
                    📎 {file.name} – {(file.size / 1024 / 1024).toFixed(2)}MB
                  </span>

                  <button
                    type="button"
                    onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}
                    className="text-red-500 hover:text-red-700 text-sm"
                  >
                    Remove ✖
                  </button>
                </div>
              ))}
            </div>
          )}
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