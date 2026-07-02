from fastapi import APIRouter, UploadFile, File, HTTPException
from ..services.resume_parsing_service import parse

router = APIRouter(prefix="/resume", tags=["Resumes"])

@router.post("/parse")
async def handleUpload(resume: UploadFile = File(...)):
    try: 
        # fastapi makes sure the file is provided because of File(...)
        if not resume.filename:
            raise HTTPException(status_code=400, detail="No file selected")
        
        result = await parse(resume)
        print(f"Successfully parsed {resume.filename}. Extracted {len(result.get('text', ''))} characters.")
        return result

    except HTTPException as err:
        raise err
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in parsing resume: {str(e)}")
    