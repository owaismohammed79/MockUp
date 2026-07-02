import magic
import pymupdf
import docx
import io
from fastapi import UploadFile, HTTPException

MAX_FILE_SIZE = 5*1024*1024
CHUNK_SIZE = 2048

async def parse(file: UploadFile):
    if not file.filename:
        raise HTTPException(status_code=400, detail="No file selected")
    
    # read only the first 2KB
    chunk = await file.read(CHUNK_SIZE)
    if not chunk:
        raise HTTPException(status_code=400, detail="File is empty")

    # verify mimetype
    mime_type = magic.from_buffer(chunk, mime=True)
    is_pdf = mime_type == 'application/pdf'
    
    # So when one reads a docx file, its simply a zip folder of xml files, so when it's read it shows up as a zip or octet stream
    is_docx = (mime_type in ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip', 'application/octet-stream'] and file.filename.lower().endswith('.docx'))
    
    if not(is_pdf or is_docx):
        raise HTTPException(status_code=415, detail=f"File type {mime_type} not allowed! Please upload a PDF or DOCX")

    # stream the rest of the file in increaments of 1mb so that we dont read huge files
    file_bytes = bytearray(chunk)
    while True:
        chunk = await file.read(1024*1024)
        if not chunk:
            break
        file_bytes.extend(chunk)
        if len(file_bytes) > MAX_FILE_SIZE:
            raise HTTPException(status_code=413, detail="File size exceeds the 5MB limit")

    try:
        extracted_text = ""
        
        if is_pdf:
            with pymupdf.open(stream=bytes(file_bytes), filetype="pdf") as doc:
                for page in doc:
                    extracted_text += page.get_text() + "\n"
                    
        elif is_docx:
            # docx reads byte stream using bytes.io
            doc = docx.Document(io.BytesIO(bytes(file_bytes)))
            extracted_text = "\n".join([paragraph.text for paragraph in doc.paragraphs])

        # remove null bytes
        cleaned_text = extracted_text.strip().replace('\x00', '')
        
        if not cleaned_text:
            raise HTTPException(status_code=422, detail="No readable text found in document, please don't upload scanned files")

        return {"filename": file.filename, "text": cleaned_text}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse document: {str(e)}")