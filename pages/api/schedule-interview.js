// pages/api/schedule-interview.js
import { query } from "../../lib/db";

export default async function handler(req, res) {
  // Allow only POST
  if (req.method !== "POST") {
    return res.status(405).json({
      success: false,
      error: "Method not allowed. Use POST.",
    });
  }

  try {
    const { 
      candidateId, 
      interviewerId, 
      scheduledAt, 
      meetingRoomId, 
      createRoom 
    } = req.body;

    // Validate required fields
    if (!candidateId || !interviewerId || !scheduledAt) {
      return res.status(400).json({
        success: false,
        error: "Missing required fields",
      });
    }

    // Generate or keep room ID
    let finalRoomId = meetingRoomId;
    if (createRoom || !meetingRoomId) {
      finalRoomId = Math.random().toString(36).substring(2, 12);
    }

    // Insert into DB
    const result = await query(
      `
      INSERT INTO scheduled_interviews 
      (candidate_id, interviewer_id, scheduled_at, meeting_room_id, status)
      VALUES ($1, $2, $3, $4, 'Scheduled')
      RETURNING id, meeting_room_id
      `,
      [candidateId, interviewerId, scheduledAt, finalRoomId]
    );

    return res.status(200).json({
      success: true,
      message: "Interview scheduled successfully",
      interviewId: result.rows[0].id,
      meetingRoomId: result.rows[0].meeting_room_id,
    });

  } catch (err) {
    console.error("SCHEDULE ERROR:", err);
    return res.status(500).json({
      success: false,
      error: "Server error scheduling interview",
    });
  }
}
