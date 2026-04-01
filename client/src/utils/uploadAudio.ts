async function uploadAudio(blob) {
  const formData = new FormData();
  formData.append("file", blob, "recording.webm");

  const res = await fetch("http://localhost:8000/upload", {
    method: "POST",
    body: formData,
  });

  return res.json();
}

export default uploadAudio