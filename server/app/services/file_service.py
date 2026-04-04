import os
import uuid


async def save_file(upload_file, upload_dir):
    try: 
        filename = os.path.basename(upload_file.filename)

        name = f"{uuid.uuid4()}_{filename}"
        file_path = os.path.join(upload_dir, name)

        with open(file_path, "wb") as f:
            while chunk := await upload_file.read(1024):
                f.write(chunk)

        return file_path, name
    except Exception as e:
        print("Error in saving file", str(e))
