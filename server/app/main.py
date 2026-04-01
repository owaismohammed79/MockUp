from fastapi import FastAPI, UploadFile, File 
import uvicorn
from fastapi.middleware.cors import CORSMiddleware


app = FastAPI() 

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health") 
def handleHome(): 
        return {"data": "Server is running"} 

@app.post("/upload") 
async def handleUpload(file: UploadFile = File(...)): 
    contents = await file.read() 
    with open(f"temp_{file.filename}", "wb") as f: 
        f.write(contents) 
    return { "filename": file.filename, "content_type": file.content_type } 

uvicorn.run(app)