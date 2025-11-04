import React, { useState, useEffect } from 'react'
import { categoriesAPI, CategoryLanguage, CategoryVOC, CategoryPriority } from '../api/client'

const AdminCategories: React.FC = () => {
  const [languages, setLanguages] = useState<CategoryLanguage[]>([])
  const [vocs, setVocs] = useState<CategoryVOC[]>([])
  const [priorities, setPriorities] = useState<CategoryPriority[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // Form states
  const [showLanguageForm, setShowLanguageForm] = useState(false)
  const [showVOCForm, setShowVOCForm] = useState(false)
  const [showPriorityForm, setShowPriorityForm] = useState(false)
  
  const [editingLanguage, setEditingLanguage] = useState<CategoryLanguage | null>(null)
  const [editingVOC, setEditingVOC] = useState<CategoryVOC | null>(null)
  const [editingPriority, setEditingPriority] = useState<CategoryPriority | null>(null)

  const [languageForm, setLanguageForm] = useState({ name: '', is_active: true })
  const [vocForm, setVocForm] = useState({ name: '', is_active: true })
  const [priorityForm, setPriorityForm] = useState({ name: '', weight: 0, is_active: true })

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const [languagesData, vocsData, prioritiesData] = await Promise.all([
        categoriesAPI.languages.list(),
        categoriesAPI.vocs.list(),
        categoriesAPI.priorities.list()
      ])
      
      setLanguages(languagesData)
      setVocs(vocsData)
      setPriorities(prioritiesData)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch categories')
    } finally {
      setIsLoading(false)
    }
  }

  // Language handlers
  const handleLanguageSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingLanguage) {
        await categoriesAPI.languages.update(editingLanguage.id, languageForm)
      } else {
        await categoriesAPI.languages.create(languageForm)
      }
      setShowLanguageForm(false)
      setEditingLanguage(null)
      resetLanguageForm()
      fetchCategories()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save language')
    }
  }

  const startEditLanguage = (language: CategoryLanguage) => {
    setEditingLanguage(language)
    setLanguageForm({ name: language.name, is_active: language.is_active })
    setShowLanguageForm(true)
  }

  const resetLanguageForm = () => {
    setLanguageForm({ name: '', is_active: true })
  }

  // VOC handlers
  const handleVOCSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingVOC) {
        await categoriesAPI.vocs.update(editingVOC.id, vocForm)
      } else {
        await categoriesAPI.vocs.create(vocForm)
      }
      setShowVOCForm(false)
      setEditingVOC(null)
      resetVOCForm()
      fetchCategories()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save VOC')
    }
  }

  const startEditVOC = (voc: CategoryVOC) => {
    setEditingVOC(voc)
    setVocForm({ name: voc.name, is_active: voc.is_active })
    setShowVOCForm(true)
  }

  const resetVOCForm = () => {
    setVocForm({ name: '', is_active: true })
  }

  // Priority handlers
  const handlePrioritySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      if (editingPriority) {
        await categoriesAPI.priorities.update(editingPriority.id, priorityForm)
      } else {
        await categoriesAPI.priorities.create(priorityForm)
      }
      setShowPriorityForm(false)
      setEditingPriority(null)
      resetPriorityForm()
      fetchCategories()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save priority')
    }
  }

  const startEditPriority = (priority: CategoryPriority) => {
    setEditingPriority(priority)
    setPriorityForm({ name: priority.name, weight: priority.weight, is_active: priority.is_active })
    setShowPriorityForm(true)
  }

  const resetPriorityForm = () => {
    setPriorityForm({ name: '', weight: 0, is_active: true })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading categories...</div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold text-gray-900">Category Management</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Languages Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Languages</h2>
          <button
            onClick={() => setShowLanguageForm(true)}
            className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
          >
            Add
          </button>
        </div>
        
        {showLanguageForm && (
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <form onSubmit={handleLanguageSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={languageForm.name}
                    onChange={(e) => setLanguageForm({ ...languageForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="lang_active"
                    checked={languageForm.is_active}
                    onChange={(e) => setLanguageForm({ ...languageForm, is_active: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="lang_active" className="ml-2 text-sm text-gray-700">Active</label>
                </div>
              </div>
              <div className="flex space-x-3">
                <button type="submit" className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
                  {editingLanguage ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowLanguageForm(false)
                    setEditingLanguage(null)
                    resetLanguageForm()
                  }}
                  className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
        
        <div className="divide-y divide-gray-200">
          {languages.map((language) => (
            <div key={language.id} className="px-4 py-2 flex items-center justify-between hover:bg-gray-50">
              <div>
                <span className="text-xs font-medium text-gray-900">{language.name}</span>
                <span className={`ml-2 px-2 py-0.5 text-xs rounded ${
                  language.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {language.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <button
                onClick={() => startEditLanguage(language)}
                className="text-blue-600 hover:text-blue-900 text-xs"
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* VOC Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Voice of Customer (VOC)</h2>
          <button
            onClick={() => setShowVOCForm(true)}
            className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
          >
            Add
          </button>
        </div>
        
        {showVOCForm && (
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <form onSubmit={handleVOCSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={vocForm.name}
                    onChange={(e) => setVocForm({ ...vocForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="voc_active"
                    checked={vocForm.is_active}
                    onChange={(e) => setVocForm({ ...vocForm, is_active: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="voc_active" className="ml-2 text-sm text-gray-700">Active</label>
                </div>
              </div>
              <div className="flex space-x-3">
                <button type="submit" className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
                  {editingVOC ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowVOCForm(false)
                    setEditingVOC(null)
                    resetVOCForm()
                  }}
                  className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
        
        <div className="divide-y divide-gray-200">
          {vocs.map((voc) => (
            <div key={voc.id} className="px-4 py-2 flex items-center justify-between hover:bg-gray-50">
              <div>
                <span className="text-xs font-medium text-gray-900">{voc.name}</span>
                <span className={`ml-2 px-2 py-0.5 text-xs rounded ${
                  voc.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {voc.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <button
                onClick={() => startEditVOC(voc)}
                className="text-blue-600 hover:text-blue-900 text-xs"
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Priorities Section */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-4 py-2 border-b border-gray-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">Priorities</h2>
          <button
            onClick={() => setShowPriorityForm(true)}
            className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
          >
            Add
          </button>
        </div>
        
        {showPriorityForm && (
          <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
            <form onSubmit={handlePrioritySubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                  <input
                    type="text"
                    value={priorityForm.name}
                    onChange={(e) => setPriorityForm({ ...priorityForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Weight</label>
                  <input
                    type="number"
                    value={priorityForm.weight}
                    onChange={(e) => setPriorityForm({ ...priorityForm, weight: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="priority_active"
                    checked={priorityForm.is_active}
                    onChange={(e) => setPriorityForm({ ...priorityForm, is_active: e.target.checked })}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="priority_active" className="ml-2 text-sm text-gray-700">Active</label>
                </div>
              </div>
              <div className="flex space-x-3">
                <button type="submit" className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">
                  {editingPriority ? 'Update' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPriorityForm(false)
                    setEditingPriority(null)
                    resetPriorityForm()
                  }}
                  className="px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded-md hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
        
        <div className="divide-y divide-gray-200">
          {priorities.map((priority) => (
            <div key={priority.id} className="px-4 py-2 flex items-center justify-between hover:bg-gray-50">
              <div>
                <span className="text-xs font-medium text-gray-900">{priority.name}</span>
                <span className="ml-2 text-xs text-gray-500">(W: {priority.weight})</span>
                <span className={`ml-2 px-2 py-0.5 text-xs rounded ${
                  priority.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {priority.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <button
                onClick={() => startEditPriority(priority)}
                className="text-blue-600 hover:text-blue-900 text-xs"
              >
                Edit
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AdminCategories 