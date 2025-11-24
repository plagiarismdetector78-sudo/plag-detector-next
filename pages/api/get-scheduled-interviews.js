// pages/api/get-scheduled-interviews.js
import { query } from '../../lib/db';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ success: false, error: 'Method not allowed' });
  try {
    const rows = (await query(
      `SELECT id, user_id, full_name, email, phone, scheduled_at, COALESCE(status,'Scheduled') as status, meeting_room_id
       FROM scheduled_interviews`
    )).rows;

    const interviews = rows.map(r => ({
      id: r.id,
      userId: r.user_id,
      fullName: r.full_name,
      email: r.email,
      phone: r.phone,
      scheduledAt: r.scheduled_at ? r.scheduled_at.toISOString() : null,
      status: r.status,
      meetingRoomId: r.meeting_room_id || null
    }));

    return res.json({ success: true, interviews });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: err.message });
  }
}
