import React, { useState } from 'react';
import axios from 'axios';

interface UploadResponse {
  sessionId: string
  message: string
}

const ResumeUpload: React.FC = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [errorMessage, setErrorMessage] = useState<string>('')
  const [isUploading, setIsUploading] = useState<boolean>(false)
  const [uploadSuccess, setUploadSuccess] = useState<boolean>(false)
  const allowedExtensions = ['pdf', 'docx', 'doc']
  const allowedMimeTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/msword']

  const handleFile = (event) => {
    const file = event.target.files?.[0]
    if(!file) return

    const extension = file.name.split('.').pop()?.toLowerCase() || ''
    const isValidType = allowedMimeTypes.includes(file.type) || allowedExtensions.includes(extension)

    if(!isValidType) {
      setSelectedFile(null)
      setErrorMessage('Invalid file type. Please upload resume in PDF or DOCX filetype')
      event.target.value = '' 
      return
    }

    if(file.size > 5*1024*1024) {
      setSelectedFile(null)
      setErrorMessage('File is too large! Maximum allowed size is 5MB')
      event.target.value = ''
      return
    }

    setSelectedFile(file)
    setErrorMessage('')
    setUploadSuccess(false)
  }

  const handleUpload = async () => {
    if(!selectedFile) {
      setErrorMessage('Please select a file!')
      return
    }

    setIsUploading(true)
    setErrorMessage('')

    const formData = new FormData()
    formData.append('resume', selectedFile)

    try {
      const res = await axios.post<UploadResponse>(`${import.meta.env.VITE_API_URL}/resume/parse`, formData)

      setUploadSuccess(true)
      console.log('Upload successful. Data:', res.data);
      
      // proceedToInterview(res.data.sessionId);
    } catch (error) {
      console.error('Upload error:', error)
      if(axios.isAxiosError(error)) {
        const msg = error.response?.data?.message || error.message
        setErrorMessage(`Upload failed: ${msg}`)
      } else {
        setErrorMessage("Some error occured in uploading file")
      }
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="p-5 font-sans">
        <h3 className="text-lg font-semibold text-gray-800 mb-2">Upload your Resume</h3>
        <input type="file" id="resume" name="resume" accept=".pdf,.docx,.doc,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/msword" onChange={handleFile} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100
        cursor-pointer focus:outline-none mb-1" disabled={isUploading} />
        <p className="text-xs text-gray-500">Accepted formats: PDF, DOCX, or DOC.</p>
        {errorMessage && (<p className="text-red-600 font-bold text-sm mt-3">{errorMessage}</p>)}
        {uploadSuccess && (<p className="text-green-600 font-bold text-sm mt-3">Resume uploaded and processed successfully!</p>)}
        
        <button onClick={handleUpload} disabled={isUploading || !selectedFile} className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed">
          {isUploading ? 'Uploading...':'Upload Resume'}
        </button>
    </div>
  )
}

export default ResumeUpload