// pages/api/transcribe-realtime.js
import formidable from 'formidable';
import fs from 'fs';
import { OpenAI } from 'openai';

// Disable default body parser for file uploads
export const config = {
  api: {
    bodyParser: false,
  },
};

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse the form data
    const form = formidable();
    const [fields, files] = await form.parse(req);
    
    const audioFile = files.file[0];
    
    if (!audioFile) {
      return res.status(400).json({ error: 'No audio file provided' });
    }

    // Create a readable stream from the file
    const audioStream = fs.createReadStream(audioFile.filepath);

    // Call OpenAI Whisper API for real-time transcription
    const transcription = await openai.audio.transcriptions.create({
      file: audioStream,
      model: "whisper-1",
      language: "en", // Optional: specify language for better accuracy
      response_format: "json",
      temperature: 0.0, // More consistent results
    });

    // Clean up the temporary file
    fs.unlinkSync(audioFile.filepath);

    res.status(200).json({
      text: transcription.text,
      language: transcription.language,
    });
  } catch (error) {
    console.error('Real-time transcription error:', error);
    
    // Clean up temporary file even on error
    try {
      if (files && files.file && files.file[0]) {
        fs.unlinkSync(files.file[0].filepath);
      }
    } catch (cleanupError) {
      console.error('Cleanup error:', cleanupError);
    }
    
    res.status(500).json({ 
      error: 'Real-time transcription failed',
      details: error.message 
    });
  }
}