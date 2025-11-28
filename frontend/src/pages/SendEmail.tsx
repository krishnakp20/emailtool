import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { templatesAPI, emailsAPI, EmailTemplate } from '../api/client'

interface SendEmailForm {
  to: string
  cc: string
  bcc: string
  subject: string
  body: string
  templateId?: number
}

const SendEmail: React.FC = () => {
  const navigate = useNavigate()
  const { currentUser } = useAuth()
  
  const [form, setForm] = useState<SendEmailForm>({
    to: '',
    cc: '',
    bcc: '',
    subject: '',
    body: ''
  })
  
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [attachments, setAttachments] = useState<File[]>([]);

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      setIsLoading(true)
      const templatesData = await templatesAPI.list()
      setTemplates(templatesData)
    } catch (err: any) {
      setError('Failed to load templates')
      console.error('Failed to fetch templates:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: keyof SendEmailForm, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
    setError('')
    setSuccess('')
  }

  const handleTemplateChange = async (templateId: number) => {
    if (!templateId) {
      setSelectedTemplate(null)
      setForm(prev => ({ ...prev, body: '', subject: '' }))
      return
    }

    try {
      const template = await templatesAPI.get(templateId)
      setSelectedTemplate(template)
      setForm(prev => ({
        ...prev,
        subject: template.subject,
        body: template.body
      }))
    } catch (err: any) {
      setError('Failed to load template')
    }
  }

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email.trim())
  }

  const validateEmails = (emails: string): boolean => {
    if (!emails.trim()) return true
    const emailList = emails.split(',').map(email => email.trim())
    return emailList.every(email => validateEmail(email))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation
    if (!form.to.trim()) {
      setError('To field is required')
      return
    }
    
    if (!validateEmails(form.to)) {
      setError('Invalid email address in To field')
      return
    }
    
    if (form.cc && !validateEmails(form.cc)) {
      setError('Invalid email address in CC field')
      return
    }
    
    if (form.bcc && !validateEmails(form.bcc)) {
      setError('Invalid email address in BCC field')
      return
    }
    
    if (!form.subject.trim()) {
      setError('Subject is required')
      return
    }
    
    if (!form.body.trim()) {
      setError('Message body is required')
      return
    }

    try {
      setIsSubmitting(true)
      setError('')


      const formData = new FormData();
      formData.append("to", form.to);
      formData.append("cc", form.cc || "");
      formData.append("bcc", form.bcc || "");
      formData.append("subject", form.subject);
      formData.append("body", form.body);

      attachments.forEach((file) => {
        formData.append("attachments", file);
      });

      const response = await emailsAPI.send(formData);

      
//       const response = await emailsAPI.send({
//         to: form.to,
//         cc: form.cc || undefined,
//         bcc: form.bcc || undefined,
//         subject: form.subject,
//         body: form.body,
//         template_id: selectedTemplate?.id
//       })

      setSuccess(`Email sent successfully! Ticket #${response.ticket_id} has been created.`)
      setForm({
        to: '',
        cc: '',
        bcc: '',
        subject: '',
        body: ''
      })
      setSelectedTemplate(null)
      
      // Redirect to tickets list after 2 seconds
      setTimeout(() => {
        navigate('/inbox', { replace: true, state: { refresh: true } })
      }, 2000)
      
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to send email')
    } finally {
      setIsSubmitting(false)
    }
  }

  const clearForm = () => {
    setForm({
      to: '',
      cc: '',
      bcc: '',
      subject: '',
      body: ''
    })
    setSelectedTemplate(null)
    setError('')
    setSuccess('')
  }

  const MAX_FILE_SIZE = 25 * 1024 * 1024;       // 25MB
  const MIN_VIDEO_SIZE = 5 * 1024 * 1024;       // 5MB (warn if smaller)
  const allowedTypes = [
      "image/jpeg", "image/png", "application/pdf", "text/plain",
      "application/msword", "application/vnd.ms-excel", "application/zip",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "video/mp4", "video/mpeg", "video/ogg"
  ];

  // 📌 Handle file selection
  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!e.target.files) return;

      const selectedFiles = Array.from(e.target.files);
      const validFiles: File[] = [];
      let message = "";

      selectedFiles.forEach(file => {

        // ❌ Check type
        if (!allowedTypes.includes(file.type)) {
          message += `Invalid file type: ${file.name}\n`;
          return;
        }

        // ❌ Check size > 25MB
        if (file.size > MAX_FILE_SIZE) {
          message += `File too large (>25MB): ${file.name}\n`;
          return;
        }

        // ⚠ Optional warning for small video (<5MB)
        if (file.type.startsWith("video/") && file.size < MIN_VIDEO_SIZE) {
          message += `Warning: ${file.name} video <5MB\n`;
          validFiles.push(file);
          return;
        }

        validFiles.push(file);
      });

      if (message) setError(message.trim());
      else setError("");

      setAttachments(prev => [...prev, ...validFiles]); // 🆗 Append files
  };


  if (!currentUser) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
        Please log in to send emails
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Send Email</h1>
            <p className="text-sm text-gray-600">Compose and send a new email message</p>
          </div>
        </div>
      </div>

      {/* Email Form */}
      <div className="bg-white shadow rounded-lg">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Template Selection */}
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Email Template (Optional)</h3>
              {selectedTemplate && (
                <button
                  type="button"
                  onClick={() => handleTemplateChange(0)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear Template
                </button>
              )}
            </div>
            <div className="mt-3">
              <select
                value={selectedTemplate?.id || ''}
                onChange={(e) => handleTemplateChange(Number(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              >
                <option value="">Select a template...</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
            {selectedTemplate && (
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="text-sm text-blue-800">
                  <strong>Template:</strong> {selectedTemplate.name}
                </div>
                <div className="text-sm text-blue-700 mt-1">
                  <strong>Subject:</strong> {selectedTemplate.subject}
                </div>
              </div>
            )}
          </div>

          {/* Email Fields */}
          <div className="px-6 space-y-4">
            {/* To Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                To <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={form.to}
                onChange={(e) => handleInputChange('to', e.target.value)}
                placeholder="recipient@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Multiple emails can be separated by commas
              </p>
            </div>

            {/* CC Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                CC
              </label>
              <input
                type="email"
                value={form.cc}
                onChange={(e) => handleInputChange('cc', e.target.value)}
                placeholder="cc@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Multiple emails can be separated by commas
              </p>
            </div>

            {/* BCC Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                BCC
              </label>
              <input
                type="email"
                value={form.bcc}
                onChange={(e) => handleInputChange('bcc', e.target.value)}
                placeholder="bcc@example.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                Multiple emails can be separated by commas
              </p>
            </div>

            {/* Subject Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subject <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={form.subject}
                onChange={(e) => handleInputChange('subject', e.target.value)}
                placeholder="Email subject"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            {/* Body Field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Message <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.body}
                onChange={(e) => handleInputChange('body', e.target.value)}
                placeholder="Type your message here..."
                rows={12}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical"
                required
              />
              <div className="flex justify-between items-center mt-2">
                <p className="text-xs text-gray-500">
                  {form.body.length} characters
                </p>
                <p className="text-xs text-gray-500">
                  Available variables: [CUSTOMER_NAME], [TICKET_ID], [AGENT_NAME]
                </p>
              </div>
            </div>
          </div>

          {/* Error/Success Messages */}
          {error && (
            <div className="px-6">
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
                {error}
              </div>
            </div>
          )}

          {success && (
            <div className="px-6">
              <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md">
                {success}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={clearForm}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Clear Form
              </button>
              <button
                type="button"
                onClick={() => navigate('/inbox')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Cancel
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Attachments</label>

              <input
                  type="file"
                  multiple
                  onChange={handleFiles}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
              />

              {attachments.length > 0 && (
                  <ul className="mt-2 text-sm text-gray-700 space-y-1">
                    {attachments.map((file, index) => (
                      <li key={index} className="flex items-center gap-2">
                        📎 {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        <button
                          className="text-red-500 text-xs hover:underline"
                          onClick={() =>
                            setAttachments(attachments.filter((_, i) => i !== index))
                          }
                        >
                          ❌ Remove
                        </button>
                      </li>
                    ))}
                  </ul>
              )}
            </div>
            
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center space-x-2">
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Sending...</span>
                </div>
              ) : (
                'Send Email'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SendEmail
