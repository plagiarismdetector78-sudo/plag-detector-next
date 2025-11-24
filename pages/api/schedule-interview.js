// pages/api/schedule-interview.js
import { query } from '../../lib/db';
import { io as Client } from 'socket.io-client';

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ success: false, error: 'Method not allowed' });

  try {
    const { userId, scheduledAt, meetingRoomId, createRoom } = req.body || {};
    if (!userId || !scheduledAt)
      return res.status(400).json({ success: false, error: 'Missing fields: userId and scheduledAt required' });

    // Optionally generate a meetingRoomId on server if requested
    let roomId = meetingRoomId ?? null;
    if (createRoom && !roomId) {
      roomId = Math.random().toString(36).substring(2, 12);
    }

    // Check whether already scheduled (existing behaviour)
    const exists = parseInt((await query('SELECT COUNT(*) FROM scheduled_interviews WHERE user_id = $1', [userId])).rows[0].count, 10);
    if (exists > 0) return res.status(400).json({ success: false, error: 'Interview already scheduled' });

    // Fetch user details
    const row = (await query(
      `SELECT u.email, COALESCE(NULLIF(p.full_name,''),'Unnamed') as full_name, COALESCE(NULLIF(p.phone,''),'N/A') as phone
       FROM users u LEFT JOIN user_profiles p ON u.id=p.user_id WHERE u.id=$1`,
      [userId]
    )).rows[0];

    if (!row) return res.status(404).json({ success: false, error: 'Candidate not found' });

    // Insert including meeting_room_id (may be null)
    await query(
      `INSERT INTO scheduled_interviews (user_id, full_name, email, phone, scheduled_at, status, meeting_room_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [userId, row.full_name, row.email, row.phone, scheduledAt, 'Scheduled', roomId]
    );

    // Optional: notify via signaling server (if you want real-time notify)
    if (process.env.SIGNALING_SERVER_URL) {
      try {
        const socket = Client(process.env.SIGNALING_SERVER_URL, { transports: ['websocket'], reconnection: false });
        socket.emit('scheduled-interview', { userId, meetingRoomId: roomId, scheduledAt });
        socket.disconnect();
      } catch (err) {
        console.warn('Could not notify signaling server:', err.message);
      }
    }

    return res.json({ success: true, meetingRoomId: roomId });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
