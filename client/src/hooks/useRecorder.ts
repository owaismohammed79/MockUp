import { useRef } from "react";

function useRecorder() {
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    audioChunksRef.current = [];

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    const recorder = new MediaRecorder(stream);
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      audioChunksRef.current.push(e.data);
    };

    recorder.start();
  };

  const stopRecording = async () => {
    return new Promise((resolve) => {
      const recorder = mediaRecorderRef.current;

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, {
          type: "audio/webm",
        });
        resolve(blob);
      };

      recorder.stop();
    });
  };

  return { startRecording, stopRecording };
}

export default useRecorder