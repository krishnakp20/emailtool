import React, { useState, useEffect } from 'react'
import { blockedSendersAPI, BlockedSender } from '../api/client'

const AdminBlockedSenders: React.FC = () => {
  const [blockedSenders, setBlockedSenders] = useState<BlockedSender[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)

  const [formData, setFormData] = useState({
    email: '',
    reason: ''
  })

  useEffect(() => {
    fetchBlockedSenders()
  }, [])

  const fetchBlockedSenders = async () => {
    try {
      const data = await blockedSendersAPI.list()
      setBlockedSenders(data)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch blocked senders')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await blockedSendersAPI.create(formData)
      setShowForm(false)
      resetForm()
      fetchBlockedSenders()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to block sender')
    }
  }

  const handleUnblock = async (id: number) => {
    if (!confirm('Are you sure you want to unblock this sender?')) return
    
    try {
      await blockedSendersAPI.delete(id)
      fetchBlockedSenders()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to unblock sender')
    }
  }

  const resetForm = () => {
    setFormData({
      email: '',
      reason: ''
    })
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading blocked senders...</div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Blocked Senders</h1>
          <p className="text-xs text-gray-500 mt-1">
            Emails from blocked addresses will be automatically skipped
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
        >
          Block Sender
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
          {error}
        </div>
      )}

      {/* Add Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">
            Block Email Address
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="spammer@example.com"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Reason (Optional)
              </label>
              <input
                type="text"
                value={formData.reason}
                onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Spam, abuse, etc."
              />
            </div>
            
            <div className="flex space-x-2">
              <button
                type="submit"
                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Block Sender
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  resetForm()
                }}
                className="px-3 py-1.5 text-sm bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Blocked Senders Table */}
      <div className="bg-white shadow-sm border border-gray-200 overflow-hidden rounded-lg">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                Email Address
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                Reason
              </th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {blockedSenders.map((blocked) => (
              <tr key={blocked.id} className="hover:bg-gray-50">
                <td className="px-3 py-2 whitespace-nowrap">
                  <div className="text-xs font-medium text-gray-900">{blocked.email}</div>
                </td>
                
                <td className="px-3 py-2">
                  <div className="text-xs text-gray-600">
                    {blocked.reason || <span className="italic text-gray-400">No reason provided</span>}
                  </div>
                </td>
                
                <td className="px-3 py-2 whitespace-nowrap text-xs font-medium">
                  <button
                    onClick={() => handleUnblock(blocked.id)}
                    className="text-green-600 hover:text-green-900"
                  >
                    Unblock
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {blockedSenders.length === 0 && (
          <div className="text-center py-8">
            <div className="text-gray-500 text-sm">No blocked senders</div>
            <div className="text-gray-400 text-xs mt-1">
              Block email addresses to prevent them from creating tickets
            </div>
          </div>
        )}
      </div>

      {/* Info Box */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
        <h3 className="text-xs font-semibold text-yellow-800 mb-2">How It Works</h3>
        <ul className="text-xs text-yellow-700 space-y-1">
          <li>• Blocked emails will not create new tickets</li>
          <li>• The IMAP worker marks them as "skipped" in email_ingest table</li>
          <li>• Existing tickets from blocked senders remain accessible</li>
          <li>• Block/unblock takes effect immediately</li>
        </ul>
      </div>
    </div>
  )
}

export default AdminBlockedSenders



