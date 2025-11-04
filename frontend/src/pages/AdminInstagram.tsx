import React, { useState, useEffect } from 'react'
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface InstagramConfig {
  id: number
  is_enabled: boolean
  instagram_business_account_id: string | null
  page_id: string | null
  has_access_token: boolean
  app_id: string | null
  has_app_secret: boolean
  webhook_verify_token: string | null
  last_synced_at: string | null
}

const AdminInstagram: React.FC = () => {
  const [config, setConfig] = useState<InstagramConfig | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [formData, setFormData] = useState({
    is_enabled: false,
    instagram_business_account_id: '',
    page_id: '',
    access_token: '',
    app_id: '',
    app_secret: '',
    webhook_verify_token: ''
  })

  useEffect(() => {
    fetchConfig()
  }, [])

  const fetchConfig = async () => {
    try {
      const token = localStorage.getItem('token')
      const response = await axios.get(`${API_BASE_URL}/instagram/config`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      setConfig(response.data)
      setFormData({
        is_enabled: response.data.is_enabled,
        instagram_business_account_id: response.data.instagram_business_account_id || '',
        page_id: response.data.page_id || '',
        access_token: '',
        app_id: response.data.app_id || '',
        app_secret: '',
        webhook_verify_token: response.data.webhook_verify_token || ''
      })
    } catch (err: any) {
      setError('Failed to load Instagram configuration')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    setError('')
    setSuccess('')

    try {
      const token = localStorage.getItem('token')
      await axios.put(`${API_BASE_URL}/instagram/config`, formData, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      setSuccess('Instagram configuration saved successfully!')
      await fetchConfig()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to save configuration')
    } finally {
      setIsSaving(false)
    }
  }

  const handleSync = async () => {
    setIsSyncing(true)
    setError('')
    setSuccess('')

    try {
      const token = localStorage.getItem('token')
      const response = await axios.post(`${API_BASE_URL}/instagram/sync`, {}, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      
      setSuccess(`Synced ${response.data.conversations} conversations with ${response.data.messages} messages!`)
      await fetchConfig()
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to sync messages')
    } finally {
      setIsSyncing(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-4">
            <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Instagram Integration</h1>
            <p className="text-gray-600 text-sm mt-1">
              Manage Instagram Direct Messages and Comments
            </p>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex justify-between items-center">
          <span>{error}</span>
          <button onClick={() => setError('')} className="text-red-700 hover:text-red-900">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex justify-between items-center">
          <span>{success}</span>
          <button onClick={() => setSuccess('')} className="text-green-700 hover:text-green-900">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Status Card */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Integration Status</h2>
          <div className="flex items-center">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              config?.is_enabled 
                ? 'bg-green-100 text-green-800' 
                : 'bg-gray-100 text-gray-800'
            }`}>
              {config?.is_enabled ? '● Enabled' : '○ Disabled'}
            </span>
          </div>
        </div>

        {config?.last_synced_at && (
          <p className="text-sm text-gray-600">
            Last synced: {new Date(config.last_synced_at).toLocaleString()}
          </p>
        )}

        <div className="mt-4">
          <button
            onClick={handleSync}
            disabled={!config?.is_enabled || isSyncing}
            className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
          >
            {isSyncing ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Syncing...
              </>
            ) : (
              <>
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Sync Now
              </>
            )}
          </button>
        </div>
      </div>

      {/* Configuration Form */}
      <div className="bg-white shadow rounded-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Configuration</h2>

        <div className="space-y-4">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <label className="text-sm font-medium text-gray-900">Enable Instagram Integration</label>
              <p className="text-xs text-gray-600 mt-1">Allow the system to receive and send Instagram messages</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={formData.is_enabled}
                onChange={(e) => setFormData({...formData, is_enabled: e.target.checked})}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
            </label>
          </div>

          {/* Instagram Business Account ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Instagram Business Account ID *
            </label>
            <input
              type="text"
              value={formData.instagram_business_account_id}
              onChange={(e) => setFormData({...formData, instagram_business_account_id: e.target.value})}
              placeholder="1234567890123456"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-xs text-gray-500 mt-1">Find this in your Meta Business Suite</p>
          </div>

          {/* Page ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Facebook Page ID
            </label>
            <input
              type="text"
              value={formData.page_id}
              onChange={(e) => setFormData({...formData, page_id: e.target.value})}
              placeholder="1234567890123456"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-xs text-gray-500 mt-1">The Facebook Page connected to your Instagram account</p>
          </div>

          {/* Access Token */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Access Token *
              {config?.has_access_token && (
                <span className="ml-2 text-xs text-green-600">● Configured</span>
              )}
            </label>
            <input
              type="password"
              value={formData.access_token}
              onChange={(e) => setFormData({...formData, access_token: e.target.value})}
              placeholder="Enter new access token or leave blank to keep existing"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-xs text-gray-500 mt-1">Long-lived Page Access Token from Meta for Developers</p>
          </div>

          {/* App ID */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Facebook App ID
            </label>
            <input
              type="text"
              value={formData.app_id}
              onChange={(e) => setFormData({...formData, app_id: e.target.value})}
              placeholder="123456789012345"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* App Secret */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Facebook App Secret
              {config?.has_app_secret && (
                <span className="ml-2 text-xs text-green-600">● Configured</span>
              )}
            </label>
            <input
              type="password"
              value={formData.app_secret}
              onChange={(e) => setFormData({...formData, app_secret: e.target.value})}
              placeholder="Enter new app secret or leave blank to keep existing"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          {/* Webhook Verify Token */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Webhook Verify Token
            </label>
            <input
              type="text"
              value={formData.webhook_verify_token}
              onChange={(e) => setFormData({...formData, webhook_verify_token: e.target.value})}
              placeholder="my_secure_token_123"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Webhook URL: <code className="bg-gray-100 px-2 py-1 rounded">{API_BASE_URL}/instagram/webhook</code>
            </p>
          </div>

          {/* Save Button */}
          <div className="pt-4">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-6 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </div>

      {/* Setup Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Setup Instructions</h3>
        <div className="space-y-3 text-sm text-blue-800">
          <div className="flex">
            <span className="font-bold mr-2">1.</span>
            <span>Create a Facebook App at developers.facebook.com and add Instagram Basic Display & Instagram Messaging products</span>
          </div>
          <div className="flex">
            <span className="font-bold mr-2">2.</span>
            <span>Connect your Instagram Business Account to a Facebook Page</span>
          </div>
          <div className="flex">
            <span className="font-bold mr-2">3.</span>
            <span>Generate a long-lived Page Access Token with instagram_basic, instagram_manage_messages permissions</span>
          </div>
          <div className="flex">
            <span className="font-bold mr-2">4.</span>
            <span>Setup Webhooks in your Facebook App and subscribe to messages, messaging_postbacks, and comments</span>
          </div>
          <div className="flex">
            <span className="font-bold mr-2">5.</span>
            <span>Enter all configuration details above and enable the integration</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminInstagram


