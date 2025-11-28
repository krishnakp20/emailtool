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
  const [success, setSuccess] = useState('')
  const [isUpdating, setIsUpdating] = useState(false)
  const [advisers, setAdvisers] = useState<User[]>([])
  const [showReassignModal, setShowReassignModal] = useState(false)
  const [selectedAdviserId, setSelectedAdviserId] = useState<number | null>(null)
  const [isReassigning, setIsReassigning] = useState(false)
//   const [showCloseReplyModal, setShowCloseReplyModal] = useState(false)
//   const [closingReplyText, setClosingReplyText] = useState('')
//   const [isSendingClosingReply, setIsSendingClosingReply] = useState(false)

  const [showNoteModal, setShowNoteModal] = useState(false)
  const [noteText, setNoteText] = useState('')
  const [isSavingNote, setIsSavingNote] = useState(false)
  const [notes, setNotes] = useState<any[]>([])

  useEffect(() => {
    if (id) {
      fetchTicket()
      fetchMessages()
      fetchNotes()
    }
  }, [id])

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      fetchAdvisers()
    }
  }, [currentUser])


  const handleAddNote = async () => {
      if (!noteText.trim()) return
      setIsSavingNote(true)

      try {
        await ticketsAPI.addNote(parseInt(id!), noteText) // <-- backend route needed
        setNoteText('')
        setShowNoteModal(false)
        await fetchNotes()  // refresh notes/messages
        setSuccess("Note added successfully")
        setTimeout(() => setSuccess(''), 3000)
      } catch (err:any){
        setError(err.response?.data?.detail || "Failed to save note")
      } finally {
        setIsSavingNote(false)
      }
  }

  const fetchNotes = async () => {
      try {
        const data = await ticketsAPI.getNotes(parseInt(id!))

        setNotes(data)

      } catch (error) {
        console.log("Fetching failed", error)
      }
  }


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

  const handleReply = async (text: string, templateId?: number, attachments?: File[]) => {
    if (!ticket) return
    
    // Rule: Cannot reply without tags (priority, language, VOC)
    const missingTags = []
    if (!ticket.priority_id) missingTags.push('Priority')
    if (!ticket.language_id) missingTags.push('Language')
    if (!ticket.voc_id) missingTags.push('VOC')
    
    if (missingTags.length > 0) {
      throw new Error(`Cannot reply without tags. Please set: ${missingTags.join(', ')}`)
    }
    
    try {
      await ticketsAPI.reply(Number(id), text, templateId, false, attachments)
      // Refresh messages and ticket after reply
      await fetchMessages()
      await fetchTicket() // Refresh ticket - status may change to Open if it was closed
      
      // Show success message
      if (ticket.status === 'Closed') {
        setSuccess('Reply sent successfully! Ticket has been reopened.')
      } else {
        setSuccess('Reply sent successfully!')
      }
      setTimeout(() => setSuccess(''), 5000)
    } catch (err: any) {
      throw new Error(err.response?.data?.detail || 'Failed to send reply')
    }
  }

  const handleStatusChange = async (newStatus: string) => {
    if (!ticket) return
    
    // Rule: ALWAYS require closing email when closing ticket (no exceptions)
//     if (newStatus === 'Closed') {
//       setShowCloseReplyModal(true)
//       return
//     }
    
    // For Open/Pending, just update normally
    setIsUpdating(true)
    try {
      const updatedTicket = await ticketsAPI.update(parseInt(id!), { status: newStatus as any })
      setTicket(updatedTicket)
      setError('')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update status')
      // Reset dropdown on error
      const statusSelect = document.querySelector('select[class*="border-gray-300"]') as HTMLSelectElement
      if (statusSelect && ticket) {
        statusSelect.value = ticket.status
      }
    } finally {
      setIsUpdating(false)
    }
  }

//   const handleCloseWithReply = async () => {
//     if (!closingReplyText.trim() || !ticket) return
//
//     // Rule: Cannot reply without tags (priority, language, VOC)
//     const missingTags = []
//     if (!ticket.priority_id) missingTags.push('Priority')
//     if (!ticket.language_id) missingTags.push('Language')
//     if (!ticket.voc_id) missingTags.push('VOC')
//
//     if (missingTags.length > 0) {
//       setError(`Cannot close ticket. Please set tags first: ${missingTags.join(', ')}`)
//       return
//     }
//
//     setIsSendingClosingReply(true)
//     setError('')
//
//     try {
//       // Send the closing reply and close in the same request
//       await ticketsAPI.reply(parseInt(id!), closingReplyText, undefined, true)
//
//       // Refresh ticket to get Closed status
//       const updated = await ticketsAPI.get(parseInt(id!))
//       setTicket(updated)
//
//       // Refresh messages
//       await fetchMessages()
//
//       // Close modal and reset
//       setShowCloseReplyModal(false)
//       setClosingReplyText('')
//       setSuccess('Closing email sent successfully! Ticket has been closed.')
//       setTimeout(() => setSuccess(''), 5000)
//     } catch (err: any) {
//       setError(err.response?.data?.detail || 'Failed to send closing email')
//     } finally {
//       setIsSendingClosingReply(false)
//     }
//   }

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
  
  // Check if all required tags are set
  const hasAllTags = ticket && ticket.priority_id && ticket.language_id && ticket.voc_id
  const missingTags = ticket ? [
    !ticket.priority_id && 'Priority',
    !ticket.language_id && 'Language',
    !ticket.voc_id && 'VOC'
  ].filter(Boolean) as string[] : []
  


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
    <div className="space-y-3">
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
      
      {/* Success Alert */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-md flex justify-between items-center">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{success}</span>
          </div>
          <button onClick={() => setSuccess('')} className="text-green-700 hover:text-green-900">
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
      
      {/* Close Ticket with Reply Modal */}
      {/* {showCloseReplyModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Close Ticket with Reply
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                You must send a closing email to the customer before closing this ticket.
              </p>
            </div>

            <div className="px-6 py-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Closing Message *
              </label>
              <textarea
                value={closingReplyText}
                onChange={(e) => setClosingReplyText(e.target.value)}
                rows={8}
                placeholder="Type your closing message to the customer..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                disabled={isSendingClosingReply}
              />
              <p className="text-xs text-gray-500 mt-2">
                This email will be sent to the customer and then the ticket will be closed.
              </p>
            </div>

            <div className="px-6 py-4 bg-gray-50 flex justify-end space-x-3 rounded-b-lg">
              <button
                onClick={() => {
                  setShowCloseReplyModal(false)
                  setClosingReplyText('')
                  // Reset status dropdown to original value
                  if (ticket) {
                    const statusSelect = document.querySelector('select[class*="border-gray-300"]') as HTMLSelectElement
                    if (statusSelect) {
                      statusSelect.value = ticket.status
                    }
                  }
                }}
                disabled={isSendingClosingReply}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleCloseWithReply}
                disabled={!closingReplyText.trim() || isSendingClosingReply || !hasAllTags}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSendingClosingReply ? 'Sending...' : 'Send & Close Ticket'}
              </button>
            </div>

            {!hasAllTags && (
              <div className="px-6 pb-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <p className="text-sm text-red-800">
                    <strong>Cannot close:</strong> Please set Priority, Language, and VOC tags before closing.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )} */}
      
      {/* Header */}
      <div className="bg-white shadow rounded-lg p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <h1 className="text-xl font-semibold text-gray-900">
                  {ticket.subject}
                </h1>

                {/* Open in CRM Icon */}
                <a
                  href={`http://192.168.11.6/agent/OfflineTaggings/home_crm?clientId=478&callingType=offline&ticket_id=${ticket.id}&userid=${currentUser?.emp_code || ''}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800"
                  title="Open in CRM"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-5 h-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4m-6 0l8-8m0 0h-5m5 0v5"
                    />
                  </svg>
                </a>
              </div>

            <div className="flex items-center space-x-3 text-xs text-gray-500 mb-2">
              <span>Ticket #{ticket.id}</span>
              <span>Created: {new Date(ticket.created_at).toLocaleDateString()}</span>
              <span>Updated: {new Date(ticket.updated_at).toLocaleDateString()}</span>
            </div>
            
            {/* Status and Actions */}
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2">
                <span className="text-xs font-medium text-gray-700">Status:</span>
                <select
                  value={ticket.status}
                  onChange={(e) => handleStatusChange(e.target.value)}
                  disabled={isUpdating}
                  className="px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="Open">Open</option>
                  <option value="Pending">Pending</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
            </div>
            
            {/* Warning: Reply required before closing */}
            {ticket.status !== 'Closed' && messages.filter(m => m.direction === 'outbound').length === 0 && (
              <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded p-2">
                <div className="flex items-start">
                  <svg className="w-4 h-4 text-yellow-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.964-1.333-2.732 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <p className="text-xs text-yellow-800">
                    <strong>Important:</strong> When closing this ticket, you must send a closing email to the customer. Select "Closed" to send the closing email.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Add ticket note button */}
          <button
              onClick={() => setShowNoteModal(true)}
              className="flex items-center gap-1 text-xs px-2 py-1 bg-gray-800 text-white rounded hover:bg-black"
          >
              ✏️ Add Note
          </button>
          
          {/* Customer Info */}
          <div className="text-right">
            <div className="text-xs text-gray-500">Customer</div>
            <div className="text-sm font-medium">{ticket.customer_name || ticket.customer_email.split('@')[0]}</div>
            <div className="text-xs text-gray-600">{ticket.customer_email}</div>
            {ticket.assigned_user ? (
              <div className="mt-2">
                <div className="text-xs text-gray-500">Assigned to</div>
                <div className="text-sm font-medium">{ticket.assigned_user.name}</div>
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
                <div className="text-xs text-gray-500">Assigned to</div>
                <div className="text-xs text-red-600">Unassigned</div>
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
        <div className="mt-2">
          <TagPills ticket={ticket} editable={true} onUpdate={handleTagUpdate} />
        </div>
      </div>

      {/* Reply Box - Show if ticket is open OR if closed but has previous reply */}
      {canReply && (ticket.status !== 'Closed' || messages.some(m => m.direction === 'outbound')) && (
        <>
          {!hasAllTags && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <div className="flex items-center text-sm text-red-700">
                <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-1.964-1.333-2.732 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span>
                  Cannot reply: please set tags first — <strong>{missingTags.join(', ')}</strong>.
                </span>
              </div>
            </div>
          )}
        <ReplyBox
          ticketId={ticket.id}
          onReply={(text: string, templateId?: number, attachments?: File[]) =>
            handleReply(text, templateId, attachments)
          }
          disabled={isUpdating || !hasAllTags}
        />
        </>
      )}
      
      {!canReply && ticket.status !== 'Closed' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-yellow-800">
            You can only reply to tickets assigned to you.
          </div>
        </div>
      )}
      
      {/* Info for closed tickets with reply */}
      {ticket.status === 'Closed' && messages.some(m => m.direction === 'outbound') && canReply && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
          <div className="flex items-start">
            <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-blue-800">
              <strong>Note:</strong> This ticket is closed. You can send another reply and it will automatically reopen the ticket.
            </p>
          </div>
        </div>
      )}

      {/* Visual Separator */}
      <div className="flex items-center">
        <div className="flex-1 border-t border-gray-200"></div>
        <div className="px-3 text-xs text-gray-500">Message History</div>
        <div className="flex-1 border-t border-gray-200"></div>
      </div>



      {/* Notes Section — at the top */}
      {notes.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-300 rounded mb-0 p-2">
            <h2 className="text-sm font-semibold text-gray-900">📝 Internal Notes</h2>

            <div className="mt-1 space-y-1">
              {notes.map((note) => (
                <div key={note.id} className="p-1 bg-white border rounded text-sm text-gray-700">
                  <div className="flex justify-between text-xs text-gray-500 mb-0">
                    <span>{note.created_by}</span>
                    <span>{new Date(note.created_at).toLocaleString()}</span>
                  </div>
                  <div className="whitespace-pre-wrap">{note.note}</div>
                </div>
              ))}
            </div>
          </div>
      )}


      {/* Messages Thread */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-4 py-3 border-b border-gray-200">
          <h2 className="text-base font-medium text-gray-900">Conversation History</h2>
          <p className="text-xs text-gray-600 mt-1">All messages in this ticket thread</p>
        </div>
        
        <div className="divide-y divide-gray-200">
          {messages
            .sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime())
            .map((message) => (
            <div key={message.id} className="p-3">
              <div className="flex items-start space-x-3">
                <div className={`w-2 h-2 rounded-full mt-2 ${
                  message.direction === 'inbound' ? 'bg-blue-500' : 'bg-green-500'
                }`} />
                
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1.5">
                    <span className="text-xs font-medium text-gray-900">
                      {message.direction === 'inbound' ? message.from_email : message.to_email}
                    </span>
                    <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${
                      message.direction === 'inbound' 
                        ? 'bg-blue-100 text-blue-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {message.direction === 'inbound' ? 'Inbound' : 'Outbound'}
                    </span>
                    <span className="text-xs text-gray-500">
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


      {/* Add Note Modal */}
      {showNoteModal && (
      <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50">
          <div className="bg-white w-96 p-4 rounded shadow-lg">
            <h2 className="text-sm font-semibold mb-2">Add Internal Note</h2>

            <textarea
              rows={4}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full border rounded p-2 text-sm"
              placeholder="Write internal note here..."
            ></textarea>

            <div className="flex justify-end mt-3 space-x-2">
              <button
                onClick={() => setShowNoteModal(false)}
                className="px-3 py-1 text-xs bg-gray-200 rounded hover:bg-gray-300"
              >
                Cancel
              </button>

              <button
                onClick={handleAddNote}
                disabled={isSavingNote}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {isSavingNote ? "Saving..." : "Save Note"}
              </button>
            </div>
          </div>
      </div>
      )}


    </div>
  )
}

export default TicketView 