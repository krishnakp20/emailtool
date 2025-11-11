import React, { useState, useEffect } from 'react'
import { Ticket, categoriesAPI } from '../api/client'

interface TagPillsProps {
  ticket: Ticket
  onUpdate?: (updates: Partial<Ticket>) => void
  editable?: boolean
}

interface CategoryOption {
  id: number
  name: string
}

const TagPills: React.FC<TagPillsProps> = ({ ticket, onUpdate, editable = false }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [languages, setLanguages] = useState<CategoryOption[]>([])
  const [vocs, setVocs] = useState<CategoryOption[]>([])
  const [priorities, setPriorities] = useState<CategoryOption[]>([])
  const [selectedLanguage, setSelectedLanguage] = useState<number | null>(ticket.language_id || null)
  const [selectedVOC, setSelectedVOC] = useState<number | null>(ticket.voc_id || null)
  const [selectedPriority, setSelectedPriority] = useState<number | null>(ticket.priority_id || null)

  useEffect(() => {
    // Load categories when component mounts
    const loadCategories = async () => {
      try {
        const [langs, vocs, prios] = await Promise.all([
          categoriesAPI.languages.list(),
          categoriesAPI.vocs.list(),
          categoriesAPI.priorities.list()
        ])
        setLanguages(langs)
        setVocs(vocs)
        setPriorities(prios)
      } catch (error) {
        console.error('Failed to load categories:', error)
      }
    }
    loadCategories()
  }, [])

  // Update selected values when ticket changes
  useEffect(() => {
    setSelectedLanguage(ticket.language_id || null)
    setSelectedVOC(ticket.voc_id || null)
    setSelectedPriority(ticket.priority_id || null)
  }, [ticket.language_id, ticket.voc_id, ticket.priority_id])

  const handleTagClick = (_type: 'language' | 'voc' | 'priority') => {
    if (editable && !isEditing) {
      setIsEditing(true)
    }
  }

  const handleSave = () => {
    if (onUpdate) {
      onUpdate({
        language_id: selectedLanguage ?? undefined,
        voc_id: selectedVOC ?? undefined,
        priority_id: selectedPriority ?? undefined,
      })
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    setSelectedLanguage(ticket.language_id || null)
    setSelectedVOC(ticket.voc_id || null)
    setSelectedPriority(ticket.priority_id || null)
    setIsEditing(false)
  }

  const renderTag = (label: string, value: string | undefined, color: string, type: 'language' | 'voc' | 'priority') => {
    if (!value) return null
    
    return (
      <span 
        key={type}
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${color} cursor-pointer hover:opacity-80`}
        onClick={() => handleTagClick(type)}
      >
        {label}: {value}
      </span>
    )
  }

  if (isEditing) {
    return (
      <div className="space-y-3 mt-2">
        <div className="flex flex-wrap gap-2">
          {/* Language Dropdown */}
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-700 mb-1">Language</label>
            <select
              value={selectedLanguage || ''}
              onChange={(e) => setSelectedLanguage(e.target.value ? parseInt(e.target.value) : null)}
              className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select Language</option>
              {languages.map(lang => (
                <option key={lang.id} value={lang.id}>{lang.name}</option>
              ))}
            </select>
          </div>

          {/* VOC Dropdown */}
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-700 mb-1">VOC</label>
            <select
              value={selectedVOC || ''}
              onChange={(e) => setSelectedVOC(e.target.value ? parseInt(e.target.value) : null)}
              className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select VOC</option>
              {vocs.map(voc => (
                <option key={voc.id} value={voc.id}>{voc.name}</option>
              ))}
            </select>
          </div>

          {/* Priority Dropdown */}
          <div className="flex flex-col">
            <label className="text-xs font-medium text-gray-700 mb-1">Priority</label>
            <select
              value={selectedPriority || ''}
              onChange={(e) => setSelectedPriority(e.target.value ? parseInt(e.target.value) : null)}
              className="text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">Select Priority</option>
              {priorities.map(prio => (
                <option key={prio.id} value={prio.id}>{prio.name}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            Save
          </button>
          <button
            onClick={handleCancel}
            className="px-3 py-1 text-xs bg-gray-300 text-gray-700 rounded hover:bg-gray-400 focus:outline-none focus:ring-1 focus:ring-gray-500"
          >
            Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {renderTag('Language', ticket.language?.name, 'bg-blue-100 text-blue-800', 'language')}
      {renderTag('VOC', ticket.voc?.name, 'bg-purple-100 text-purple-800', 'voc')}
      {renderTag('Priority', ticket.priority?.name, 'bg-orange-100 text-orange-800', 'priority')}
      
      {!ticket.language && !ticket.voc && !ticket.priority && (
        <span className="text-xs text-gray-500 italic">No tags assigned</span>
      )}
      
      {editable && (
        <button
          onClick={() => setIsEditing(true)}
          className="text-xs text-blue-600 hover:text-blue-800 underline cursor-pointer"
        >
          Edit Tags
        </button>
      )}
    </div>
  )
}

export default TagPills 