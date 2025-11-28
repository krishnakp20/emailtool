import  { useState } from "react"
import { bulkEmailAPI } from "../api/client"   // IMPORT HERE

export default function AdminBulkEmails() {
  const [file, setFile] = useState<File | null>(null)
  const [message, setMessage] = useState("")
  const [status, setStatus] = useState("")
  const [error, setError] = useState("")

  // Upload Excel
  const handleUpload = async () => {
    if (!file) return setError("Please upload an Excel file first")

    setError(""); setMessage("")

    try {
      const res = await bulkEmailAPI.upload(file)
      setMessage(res.data.message)
    } catch (err: any) {
      setError(err.response?.data?.detail || "Upload failed")
    }
  }

  // Download Excel
  const handleDownload = async () => {
    const res = await bulkEmailAPI.download()

    const url = window.URL.createObjectURL(new Blob([res.data]))
    const link = document.createElement("a")
    link.href = url
    link.download = "bulk_emails.xlsx"
    link.click()
  }

  // Send All
  const handleSendAll = async () => {
    try {
      const res = await bulkEmailAPI.sendAll()
      setStatus(`Sent: ${res.data.sent}, Failed: ${res.data.failed}`)
    } catch {
      setError("Sending failed")
    }
  }

  return (
    <div className="space-y-8">

      <h1 className="text-2xl font-bold">📩 Bulk Email Manager</h1>

      {/* Upload */}
      <div className="p-4 bg-white rounded shadow space-y-3">
        <input
          type="file"
          accept=".xlsx,.xls"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />

        <button
          onClick={handleUpload}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Upload Excel
        </button>

        {message && <p className="text-green-600">{message}</p>}
        {error && <p className="text-red-600">{error}</p>}
      </div>

      {/* Download */}
      <div className="p-4 bg-white rounded shadow space-y-3">
        <button
          onClick={handleDownload}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Download Bulk Excel
        </button>
      </div>

      {/* Send */}
      <div className="p-4 bg-white rounded shadow space-y-3">
        <button
          onClick={handleSendAll}
          className="bg-orange-600 text-white px-4 py-2 rounded"
        >
          Send All Pending Emails
        </button>

        {status && <p className="text-blue-700 font-semibold">{status}</p>}
      </div>

    </div>
  )
}
