import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import withAuth from '../../lib/withAuth';
import Sidebar from '../../components/Sidebar';
import Navbar from "../../components/Navbar";

const ScheduleInterviewPage = () => {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState(null);
  const [scheduleData, setScheduleData] = useState({
    scheduledAt: '',
    duration: 60,
    interviewType: 'technical',
    position: 'Software Engineer',
    meetingRoomId: '',
    createRoom: true
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState === 'true') setSidebarCollapsed(true);
    fetchCandidates();
  }, []);

  // In the ScheduleInterviewPage component, update the fetchCandidates function:

const fetchCandidates = async () => {
  try {
    const userId = localStorage.getItem('userId');
    const response = await fetch(`/api/get-candidates?interviewerId=${userId}`);
    const data = await response.json();
    if (data.success) {
      setCandidates(data.candidates || []);
    }
  } catch (error) {
    console.error('Error fetching candidates:', error);
  } finally {
    setLoading(false);
  }
};

// Update the candidate selection UI to show match scores:

{candidates.map((candidate) => (
  <div
    key={candidate.id}
    className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 ${
      selectedCandidate?.id === candidate.id
        ? 'bg-purple-500/20 border-purple-500/50'
        : 'bg-white/5 border-white/10 hover:border-purple-500/30'
    }`}
    onClick={() => setSelectedCandidate(candidate)}
  >
    <div className="flex items-center justify-between mb-2">
      <h3 className="font-semibold text-white">{candidate.full_name || candidate.email}</h3>
      {candidate.matchScore && (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${candidate.compatibilityColor}`}>
          {candidate.matchScore}/10
        </span>
      )}
    </div>
    <p className="text-gray-400 text-sm mt-1">{candidate.email}</p>
    {candidate.phone && candidate.phone !== 'N/A' && (
      <p className="text-gray-400 text-sm">{candidate.phone}</p>
    )}
    {candidate.qualification && (
      <p className="text-blue-300 text-sm mt-1">{candidate.qualification}</p>
    )}
    {candidate.matchingAreas && (
      <p className="text-green-300 text-xs mt-1">
        Matches: {candidate.matchingAreas.slice(0, 3).join(', ')}
      </p>
    )}
  </div>
))}

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', newState.toString());
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  const scheduleInterview = async () => {
    if (!selectedCandidate || !scheduleData.scheduledAt) {
      alert('Please select a candidate and schedule date/time');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch('/api/schedule-interview', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: selectedCandidate.id,
          scheduledAt: new Date(scheduleData.scheduledAt).toISOString(),
          duration: scheduleData.duration,
          interviewType: scheduleData.interviewType,
          position: scheduleData.position,
          meetingRoomId: scheduleData.meetingRoomId || undefined,
          createRoom: scheduleData.createRoom
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert('Interview scheduled successfully!');
        if (data.meetingRoomId) {
          alert(`Meeting Room ID: ${data.meetingRoomId}`);
        }
        // Reset form
        setSelectedCandidate(null);
        setScheduleData({
          scheduledAt: '',
          duration: 60,
          interviewType: 'technical',
          position: 'Software Engineer',
          meetingRoomId: '',
          createRoom: true
        });
      } else {
        alert('Failed to schedule interview: ' + data.error);
      }
    } catch (error) {
      console.error('Error scheduling interview:', error);
      alert('Error scheduling interview');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Head>
        <title>Schedule Interview - Skill Scanner</title>
        <meta name="description" content="Schedule new interviews with candidates" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black">
        <Navbar />
        <div className="flex">
          <Sidebar
            sidebarCollapsed={sidebarCollapsed}
            toggleSidebar={toggleSidebar}
            handleLogout={handleLogout}
          />

          <div className={`flex-1 transition-all duration-300 ${
            sidebarCollapsed ? 'ml-20' : 'ml-0 md:ml-72'
          } p-4 md:p-6`}>
            
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6 md:mb-8">
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Schedule Interview</h1>
                <p className="text-gray-300 text-sm md:text-base">
                  Create new interviews with candidates
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Candidate Selection */}
              <div className="backdrop-blur-xl bg-white/5 rounded-3xl border border-white/10 shadow-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Select Candidate</h2>
                
                {loading ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                    <span className="ml-3 text-gray-400">Loading candidates...</span>
                  </div>
                ) : candidates.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-300 mb-2">No candidates found</h3>
                    <p className="text-gray-400 text-sm">
                      There are no candidates available to schedule interviews with.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {candidates.map((candidate) => (
                      <div
                        key={candidate.id}
                        className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 ${
                          selectedCandidate?.id === candidate.id
                            ? 'bg-purple-500/20 border-purple-500/50'
                            : 'bg-white/5 border-white/10 hover:border-purple-500/30'
                        }`}
                        onClick={() => setSelectedCandidate(candidate)}
                      >
                        <h3 className="font-semibold text-white">{candidate.full_name || candidate.email}</h3>
                        <p className="text-gray-400 text-sm mt-1">{candidate.email}</p>
                        {candidate.phone && (
                          <p className="text-gray-400 text-sm">{candidate.phone}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Schedule Form */}
              <div className="backdrop-blur-xl bg-white/5 rounded-3xl border border-white/10 shadow-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Interview Details</h2>
                
                {selectedCandidate ? (
                  <div className="space-y-4">
                    <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                      <h3 className="font-semibold text-white mb-2">Selected Candidate</h3>
                      <p className="text-gray-300">{selectedCandidate.full_name || selectedCandidate.email}</p>
                      <p className="text-gray-400 text-sm">{selectedCandidate.email}</p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Date & Time</label>
                      <input
                        type="datetime-local"
                        value={scheduleData.scheduledAt}
                        onChange={(e) => setScheduleData({...scheduleData, scheduledAt: e.target.value})}
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Duration (minutes)</label>
                        <select
                          value={scheduleData.duration}
                          onChange={(e) => setScheduleData({...scheduleData, duration: parseInt(e.target.value)})}
                          className="w-full px-4 py-3 bg-black/50 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm"
                        >
                          <option value="30">30 minutes</option>
                          <option value="45">45 minutes</option>
                          <option value="60">60 minutes</option>
                          <option value="90">90 minutes</option>
                          <option value="120">120 minutes</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-300 mb-2">Interview Type</label>
                        <select
                          value={scheduleData.interviewType}
                          onChange={(e) => setScheduleData({...scheduleData, interviewType: e.target.value})}
                          className="w-full px-4 py-3 bg-black/50 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm"
                        >
                          <option value="technical">Technical</option>
                          <option value="behavioral">Behavioral</option>
                          <option value="system_design">System Design</option>
                          <option value="coding">Coding</option>
                          <option value="mixed">Mixed</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Position</label>
                      <input
                        type="text"
                        value={scheduleData.position}
                        onChange={(e) => setScheduleData({...scheduleData, position: e.target.value})}
                        placeholder="e.g., Software Engineer, Frontend Developer"
                        className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm"
                      />
                    </div>

                    <div className="space-y-3">
                      <label className="flex items-center space-x-2">
                        <input
                          type="checkbox"
                          checked={scheduleData.createRoom}
                          onChange={(e) => setScheduleData({...scheduleData, createRoom: e.target.checked})}
                          className="rounded border-white/20 bg-white/10 text-purple-500 focus:ring-purple-500"
                        />
                        <span className="text-gray-300 text-sm">Create new meeting room</span>
                      </label>
                      
                      {!scheduleData.createRoom && (
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">Existing Room ID</label>
                          <input
                            type="text"
                            value={scheduleData.meetingRoomId}
                            onChange={(e) => setScheduleData({...scheduleData, meetingRoomId: e.target.value})}
                            placeholder="Enter existing room ID"
                            className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm"
                          />
                        </div>
                      )}
                    </div>

                    <button
                      onClick={scheduleInterview}
                      disabled={saving || !scheduleData.scheduledAt}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 disabled:transform-none"
                    >
                      {saving ? (
                        <div className="flex items-center justify-center space-x-2">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          <span>Scheduling Interview...</span>
                        </div>
                      ) : (
                        'Schedule Interview'
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-300 mb-2">Select a Candidate</h3>
                    <p className="text-gray-400 text-sm">
                      Please select a candidate from the left panel to schedule an interview.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default withAuth(ScheduleInterviewPage, 'interviewer');