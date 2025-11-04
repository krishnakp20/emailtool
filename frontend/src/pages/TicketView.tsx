import React, { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { ticketsAPI, usersAPI, Ticket, TicketMessage, User } from '../api/client'
import { useAuth } from '../hooks/useAuth'
import TagPills from '../components/TagPills'
import ReplyBox from '../components/ReplyBox'
import AttachmentViewer from '../components/AttachmentViewer'

const TicketView: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { currentUser } = useAuth()
  
  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [messages, setMessages] = useState<TicketMessage[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [advisers, setAdvisers] = useState<User[]>([])
  const [showReassignModal, setShowReassignModal] = useState(false)
  const [selectedAdviserId, setSelectedAdviserId] = useState<number | null>(null)
  const [isReassigning, setIsReassigning] = useState(false)

  useEffect(() => {
    if (id) {
      fetchTicket()
      fetchMessages()
    }
  }, [id])

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchAdvisers()
    }
  }, [currentUser])

  const fetchTicket = async () => {
    try {
      const ticketData = await ticketsAPI.get(parseInt(id!))
      setTicket(ticketData)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to fetch ticket')
    }
  }

  const fetchMessages = async () => {
    try {
      const messagesData = await ticketsAPI.getMessages(parseInt(id!))
      setMessages(messagesData)
    } catch (err: any) {
      console.error('Failed to fetch messages:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchAdvisers = async () => {
    try {
      const advisersData = await usersAPI.list({ role: 'adviser', is_active: true })
      setAdvisers(advisersData)
    } catch (err: any) {
      console.error('Failed to fetch advisers:', err)
    }
  }

  const handleReply = async (text: string, templateId?: number) => {
    try {
      await ticketsAPI.reply(parseInt(id!), text, templateId)
      // Refresh messages after reply
      await fetchMessages()
      await fetchTicket() // Refresh ticket to get updated timestamp
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || 'Failed to send reply')
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket) return
    
    setIsUpdating(true)
    try {
      const updatedTicket = await ticketsAPI.update(parseInt(id!), { status: newStatus as any })
      setTicket(updatedTicket)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update status')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleTagUpdate = async (updates: Partial<Ticket>) => {
    if (!ticket) return
    
    setIsUpdating(true)
    try {
      const updatedTicket = await ticketsAPI.update(parseInt(id!), updates)
      setTicket(updatedTicket)
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update tags')
    } finally {
      setIsUpdating(false)
    }
  }

  const handleReassign = async () => {
    if (!selectedAdviserId || !ticket) return
    
    setIsReassigning(true)
    try {
      await ticketsAPI.reassign(parseInt(id!), selectedAdviserId)
      // Refresh ticket to show updated assignment
      await fetchTicket()
      setShowReassignModal(false)
      setSelectedAdviserId(null)
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reassign ticket')
    } finally {
      setIsReassigning(false)
    }
  }

  const openReassignModal = () => {
    setSelectedAdviserId(ticket?.assigned_to || null)
    setShowReassignModal(true)
  }

  const canReply = ticket && (
    currentUser?.role === 'admin' || 
    (currentUser?.role === 'adviser' && ticket.assigned_to === currentUser.id)
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading ticket...</div>
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md">
        {error || 'Ticket not found'}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Error Alert */}
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
      
      {/* Reassign Modal */}
      {showReassignModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                {ticket?.assigned_user ? 'Reassign Ticket' : 'Assign Ticket'}
              </h3>
            </div>
            
            <div className="px-6 py-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Agent
              </label>
              <select
                value={selectedAdviserId || ''}
                onChange={(e) => setSelectedAdviserId(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">-- Select an agent --</option>
                {advisers.map((adviser) => (
                  <option key={adviser.id} value={adviser.id}>
                    {adviser.name} ({adviser.email})
                  </option>
                ))}
              </select>
              
              {ticket?.assigned_user && (
                <div className="mt-3 text-sm text-gray-600">
                  Currently assigned to: <span className="font-medium">{ticket.assigned_user.name}</span>
                </div>
              )}
            </div>
            
            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3 rounded-b-lg">
              <button
                onClick={() => {
                  setShowReassignModal(false)
                  setSelectedAdviserId(null)
                }}
                disabled={isReassigning}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReassign}
                disabled={!selectedAdviserId || isReassigning}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isReassigning ? 'Reassigning...' : ticket?.assigned_user ? 'Reassign' : 'Assign'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {ticket.subject}
            </h1>
            <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
              <span>Ticket #{ticket.id}</span>
              <span>Created: {new Date(ticket.created_at).toLocaleDateString()}</span>
              <span>Updated: {new Date(ticket.updated_at).toLocaleDateString()}</span>
            </div>
            
            {/* Status and Actions */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Status:</span>
                <select
                  value={ticket.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={isUpdating}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Open">Open</option>
                  <option value="Pending">Pending</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
              
              {ticket.status === 'Closed' && (
                <button
                  onClick={() => handleStatusChange('Open')}
                  className="px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700"
                >
                  Reopen
                </button>
              )}
            </div>
          </div>
          
          {/* Customer Info */}
          <div className="text-right">
            <div className="text-sm text-gray-500">Customer</div>
            <div className="font-medium">{ticket.customer_name || ticket.customer_email.split('@')[0]}</div>
            <div className="text-sm text-gray-600">{ticket.customer_email}</div>
            {ticket.assigned_user ? (
              <div className="mt-2">
                <div className="text-sm text-gray-500">Assigned to</div>
                <div className="font-medium">{ticket.assigned_user.name}</div>
                {currentUser?.role === 'admin' && (
                  <button
                    onClick={openReassignModal}
                    className="mt-1 text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Reassign
                  </button>
                )}
              </div>
            ) : (
              <div className="mt-2">
                <div className="text-sm text-gray-500">Assigned to</div>
                <div className="text-sm text-red-600">Unassigned</div>
                {currentUser?.role === 'admin' && (
                  <button
                    onClick={openReassignModal}
                    className="mt-1 text-xs text-blue-600 hover:text-blue-800 underline"
                  >
                    Assign Agent
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
        
        {/* Tags */}
        <div className="mt-4">
          <TagPills ticket={ticket} editable={true} onUpdate={handleTagUpdate} />
        </div>
      </div>

      {/* Reply Box - Moved above Message Thread */}
      {canReply && ticket.status !== 'Closed' && (
        <ReplyBox
          ticketId={ticket.id}
          onReply={handleReply}
          disabled={isUpdating}
        />
      )}
      
      {!canReply && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-yellow-800">
            {ticket.status === 'Closed' 
              ? 'This ticket is closed and cannot be replied to.'
              : 'You can only reply to tickets assigned to you.'
            }
          </div>
        </div>
      )}

      {/* Visual Separator */}
      <div className="flex items-center">
        <div className="flex-1 border-t border-gray-200"></div>
        <div className="px-4 text-sm text-gray-500">Message History</div>
        <div className="flex-1 border-t border-gray-200"></div>
      </div>

      {/* Messages Thread */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Conversation History</h2>
          <p className="text-sm text-gray-600 mt-1">All messages in this ticket thread</p>
        </div>
        
        <div className="divide-y divide-gray-200">
          {messages
            .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())
            .map((message) => (
            <div key={message.id} className="p-6">
              <div className="flex items-start space-x-3">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  message.direction === 'inbound' ? 'bg-blue-500' : 'bg-green-500'
                }`} />
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-sm font-medium text-gray-900">
                      {message.direction === 'inbound' ? message.from_email : message.to_email}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${
                      message.direction === 'inbound' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {message.direction === 'inbound' ? 'Inbound' : 'Outbound'}
                    </span>
                    <span className="text-sm text-gray-500">
                      {new Date(message.sent_at).toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="text-sm text-gray-700 whitespace-pre-wrap">
                    {message.body}
                  </div>
                  
                  {/* Attachments */}
                  {message.attachments_json && (
                    <AttachmentViewer attachmentsJson={message.attachments_json} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default TicketView 