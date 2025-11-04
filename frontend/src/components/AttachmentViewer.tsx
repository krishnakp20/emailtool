import React, { useState } from 'react'

interface Attachment {
  filename: string
  mime_type: string
  file_path: string
  size?: number
}

interface AttachmentViewerProps {
  attachmentsJson: string
}

const AttachmentViewer: React.FC<AttachmentViewerProps> = ({ attachmentsJson }) => {
  const [failedFiles, setFailedFiles] = useState<Set<string>>(new Set())

  if (!attachmentsJson) return null

  let attachments: Attachment[] = []
  
  try {
    attachments = JSON.parse(attachmentsJson)
  } catch (error) {
    console.error('Failed to parse attachments JSON:', error)
    return null
  }

  if (!Array.isArray(attachments) || attachments.length === 0) {
    return null
  }

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return ''
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i]
  }

  const handleFileError = (filename: string) => {
    setFailedFiles(prev => new Set(prev).add(filename))
  }

  const renderAttachment = (attachment: Attachment) => {
    const { filename, mime_type, file_path, size } = attachment
    const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    const fileUrl = `${apiBaseUrl}/attachments/${file_path}`

    // Skip rendering if file failed to load
    if (failedFiles.has(filename)) {
      return (
        <div key={filename} className="mb-3">
          <div className="text-sm text-gray-500 italic">
            Failed to load: {filename}
          </div>
        </div>
      )
    }

    // Image files
    if (mime_type.startsWith('image/')) {
      return (
        <div key={filename} className="mb-4">
          <div className="text-sm text-gray-600 mb-2">{filename}</div>
          <img 
            src={fileUrl} 
            alt={filename}
            className="max-w-full rounded border border-gray-200 shadow-sm"
            onError={() => handleFileError(filename)}
          />
          {size && (
            <div className="text-xs text-gray-500 mt-1">{formatFileSize(size)}</div>
          )}
        </div>
      )
    }

    // Video files
    if (mime_type.startsWith('video/')) {
      return (
        <div key={filename} className="mb-4">
          <div className="text-sm text-gray-600 mb-2">{filename}</div>
          <video 
            controls 
            src={fileUrl}
            className="w-full rounded border border-gray-200 shadow-sm"
            onError={() => handleFileError(filename)}
          >
            Your browser does not support the video tag.
          </video>
          {size && (
            <div className="text-xs text-gray-500 mt-1">{formatFileSize(size)}</div>
          )}
        </div>
      )
    }

    // Other files - download link
    return (
      <div key={filename} className="mb-3">
        <a
          href={fileUrl}
          download={filename}
          className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          onClick={() => {
            // Test if file is accessible before download
            fetch(fileUrl, { method: 'HEAD' })
              .then(response => {
                if (!response.ok) {
                  handleFileError(filename)
                }
              })
              .catch(() => handleFileError(filename))
          }}
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          {filename}
          {size && (
            <span className="ml-2 text-xs text-gray-500">({formatFileSize(size)})</span>
          )}
        </a>
      </div>
    )
  }

  return (
    <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
      <div className="text-sm font-medium text-gray-700 mb-3">
        Attachments ({attachments.length})
      </div>
      <div className="space-y-2">
        {attachments.map(renderAttachment)}
      </div>
    </div>
  )
}

export default AttachmentViewer
