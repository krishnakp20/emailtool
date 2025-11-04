import React, { useState, useEffect } from 'react'
import { templatesAPI, EmailTemplate } from '../api/client'

const AdminTemplates: React.FC = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null)

  const [formData, setFormData] = useState({
    name: '',
    subject: '',
    body: ''
  })

  useEffect(() => {
    fetchTemplates()
  }, [])

  const fetchTemplates = async () => {
    try {
      const templatesData = await templatesAPI.list()
      setTemplates(templatesData)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch templates')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingTemplate) {
        await templatesAPI.update(editingTemplate.id, formData)
      } else {
        await templatesAPI.create(formData)
      }
      setShowForm(false)
      setEditingTemplate(null)
      resetForm()
      fetchTemplates()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save template')
    }
  }

  const handleDelete = async (templateId: number) => {
    if (!confirm('Are you sure you want to delete this template?')) return
    
    try {
      await templatesAPI.delete(templateId)
      fetchTemplates()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to delete template')
    }
  }

  const startEdit = (template: EmailTemplate) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      subject: template.subject,
      body: template.body
    })
    setShowForm(true)
  }

  const resetForm = () => {
    setFormData({
      name: '',
      subject: '',
      body: ''
    })
  }

  const cancelForm = () => {
    setShowForm(false)
    setEditingTemplate(null)
    resetForm()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading templates...</div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900">Email Templates</h1>
        <button
          onClick={() => setShowForm(true)}
          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          Add Template
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            {editingTemplate ? 'Edit Template' : 'Create New Template'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Template Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Welcome Response"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Subject Line
              </label>
              <input
                type="text"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g., Thank you for contacting us"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Email Body
              </label>
              <textarea
                rows={6}
                value={formData.body}
                onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                placeholder="Enter your email template content here..."
                required
              />
              <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded-md">
                <p className="text-xs font-medium text-blue-800 mb-1">Available Variables:</p>
                <div className="flex flex-wrap gap-2 text-xs">
                  <code className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded">&#123;ticket_id&#125;</code>
                  <code className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded">&#123;customer_name&#125;</code>
                  <code className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded">&#123;subject&#125;</code>
                  <code className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded">&#123;adviser_name&#125;</code>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                type="submit"
                className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                {editingTemplate ? 'Update' : 'Create'}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="px-3 py-1.5 text-sm bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Templates Table */}
      <div className="bg-white shadow-sm border border-gray-200 overflow-hidden rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                Template
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                Subject
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                Preview
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {templates.map((template) => (
              <tr key={template.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="text-xs font-medium text-gray-900">{template.name}</div>
                </td>
                
                <td className="px-3 py-2">
                  <div className="text-xs text-gray-900 truncate max-w-[200px]" title={template.subject}>
                    {template.subject}
                  </div>
                </td>
                
                <td className="px-3 py-2">
                  <div className="text-xs text-gray-500 truncate max-w-[250px]" title={template.body}>
                    {template.body.substring(0, 80)}...
                  </div>
                </td>
                
                <td className="px-3 py-2 whitespace-nowrap text-xs font-medium space-x-2">
                  <button
                    onClick={() => startEdit(template)}
                    className="text-blue-600 hover:text-blue-900"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(template.id)}
                    className="text-red-600 hover:text-red-900"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {templates.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-500 text-sm">No templates found</div>
            <div className="text-gray-400 text-xs mt-1">
              Create your first email template to get started
            </div>
          </div>
        )}
      </div>

      {/* Template Usage Tips - Compact Version */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
        <h3 className="text-xs font-semibold text-blue-800 mb-2">Template Tips</h3>
        <div className="grid grid-cols-2 gap-2 text-xs text-blue-700">
          <div>• Use {'{ticket_id}'} for ticket reference</div>
          <div>• Use {'{customer_name}'} to personalize</div>
          <div>• Use {'{subject}'} for original subject</div>
          <div>• Keep templates professional and concise</div>
        </div>
      </div>
    </div>
  )
}

export default AdminTemplates
