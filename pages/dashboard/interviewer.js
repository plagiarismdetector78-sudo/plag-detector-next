import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import withAuth from "../../lib/withAuth";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";

function InterviewerDashboard() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [loadingCandidates, setLoadingCandidates] = useState(false);
  const [showCandidatesModal, setShowCandidatesModal] = useState(false);
  const [scheduleDates, setScheduleDates] = useState({});
  const [meetingRoomInputs, setMeetingRoomInputs] = useState({});
  const [scheduledInterviews, setScheduledInterviews] = useState([]);
  const [loadingScheduled, setLoadingScheduled] = useState(false);
  const [savingIdx, setSavingIdx] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [activeTab, setActiveTab] = useState('scheduled');
  const [matchingEngine, setMatchingEngine] = useState('basic');
  const [stats, setStats] = useState({
    total: 0,
    upcoming: 0,
    completed: 0,
    today: 0
  });
  const router = useRouter();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);

    const savedState = localStorage.getItem("sidebarCollapsed");
    if (savedState === "true") setSidebarCollapsed(true);
    fetchScheduledInterviews();

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Calculate stats when scheduledInterviews changes
  useEffect(() => {
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const newStats = {
      total: scheduledInterviews.length,
      upcoming: scheduledInterviews.filter(interview => 
        interview.scheduledAt && new Date(interview.scheduledAt) > now
      ).length,
      completed: scheduledInterviews.filter(interview => 
        interview.status === 'completed'
      ).length,
      today: scheduledInterviews.filter(interview => {
        if (!interview.scheduledAt) return false;
        const interviewDate = new Date(interview.scheduledAt);
        interviewDate.setHours(0, 0, 0, 0);
        return interviewDate.getTime() === today.getTime();
      }).length
    };

    setStats(newStats);
  }, [scheduledInterviews]);

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem("sidebarCollapsed", newState.toString());
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push("/login");
  };

  const fetchCandidates = async () => {
    setLoadingCandidates(true);
    try {
      const userId = localStorage.getItem('userId');
      const res = await fetch(`/api/get-candidates?interviewerId=${userId}`);
      const data = await res.json();
      if (data.success) {
        setCandidates(data.candidates || []);
        setMatchingEngine(data.matchingEngine || 'basic');
        if (isMobile) {
          setActiveTab('candidates');
        } else {
          setShowCandidatesModal(true);
        }
      } else {
        alert("Error: " + (data.error || "Failed to load candidates"));
      }
    } catch (err) {
      console.error(err);
      alert("Network error fetching candidates");
    } finally {
      setLoadingCandidates(false);
    }
  };

  const fetchScheduledInterviews = async () => {
    setLoadingScheduled(true);
    try {
      const res = await fetch("/api/get-scheduled-interviews");
      const data = await res.json();
      if (data.success) setScheduledInterviews(data.interviews || []);
      else alert("Error loading scheduled interviews: " + data.error);
    } catch (err) {
      console.error(err);
      alert("Failed to load scheduled interviews.");
    } finally {
      setLoadingScheduled(false);
    }
  };

  const saveInterview = async (candidate, index) => {
    const dt = scheduleDates[index];
    if (!dt) return alert("Select date & time first");

    const { createRoom, meetingRoomId } = meetingRoomInputs[index] || { createRoom: false, meetingRoomId: '' };

    setSavingIdx(index);
    try {
      const res = await fetch("/api/schedule-interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: candidate.id,
          scheduledAt: new Date(dt).toISOString(),
          meetingRoomId: (meetingRoomId && meetingRoomId.trim()) ? meetingRoomId.trim() : undefined,
          createRoom: !!createRoom
        }),
      });
      const data = await res.json();
      if (data.success) {
        alert(`Interview scheduled for ${candidate.full_name || candidate.email}`);
        if (data.meetingRoomId) {
          alert(`Meeting Room ID: ${data.meetingRoomId}. Share it with the candidate.`);
        }
        await fetchScheduledInterviews();
        // Reset form for this candidate
        setScheduleDates(prev => ({ ...prev, [index]: '' }));
        setMeetingRoomInputs(prev => ({ ...prev, [index]: { createRoom: false, meetingRoomId: '' } }));
      } else {
        alert("Failed to schedule: " + (data.error || "unknown"));
      }
    } catch (err) {
      console.error(err);
      alert("Error scheduling interview");
    } finally {
      setSavingIdx(null);
    }
  };

  const createInstantMeeting = () => {
    const roomId = Math.random().toString(36).slice(2, 12);
    router.push(`/meeting/${roomId}`);
  };

  const copyMeetingLink = (roomId) => {
    const meetingLink = `${window.location.origin}/meeting/${roomId}`;
    navigator.clipboard.writeText(meetingLink);
    alert('Meeting link copied to clipboard!');
  };

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return { date: 'N/A', time: '', full: '' };
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString(),
      time: date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      full: date.toLocaleString()
    };
  };

  // Get status badge color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'completed': return 'bg-green-500/20 text-green-300 border-green-500/30';
      case 'cancelled': return 'bg-red-500/20 text-red-300 border-red-500/30';
      case 'scheduled': return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30';
    }
  };

  // Get AI status badge
  const getAIStatusBadge = () => {
    switch (matchingEngine) {
      case 'gemini-ai':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-500/20 text-green-300 border border-green-500/30">
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Powered by Gemini AI
          </span>
        );
      case 'fallback':
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/30">
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
            Basic Matching
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-500/30">
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Standard Matching
          </span>
        );
    }
  };

  return (
    <>
      <Head>
        <title>Interviewer Dashboard - Skill Scanner</title>
        <meta name="description" content="Manage interviews and candidates on Skill Scanner" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black">
        <Navbar />
        <div className="flex">
          <Sidebar
            sidebarCollapsed={sidebarCollapsed}
            toggleSidebar={toggleSidebar}
            handleLogout={handleLogout}
          />

          {/* Main Content */}
          <div className={`flex-1 transition-all duration-300 ${
            sidebarCollapsed ? 'ml-20' : 'ml-0 md:ml-72'
          } p-4 md:p-6`}>
            
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6 md:mb-8">
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  Interviewer <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-500">Dashboard</span>
                </h1>
                <p className="text-gray-300 text-sm md:text-base">
                  Manage candidates and schedule AI-powered interviews
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <button 
                  onClick={fetchCandidates}
                  disabled={loadingCandidates}
                  className="flex items-center space-x-2 bg-white/10 backdrop-blur-lg border border-white/20 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-white/20 transition-all duration-300 disabled:opacity-50"
                >
                  {loadingCandidates ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  )}
                  <span>{loadingCandidates ? 'Loading...' : 'Candidates'}</span>
                </button>
                
                <button 
                  onClick={fetchScheduledInterviews}
                  className="flex items-center space-x-2 bg-white/10 backdrop-blur-lg border border-white/20 text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-white/20 transition-all duration-300"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Refresh</span>
                </button>
                
                <button 
                  onClick={createInstantMeeting}
                  className="flex items-center space-x-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105 shadow-lg"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Instant Meet</span>
                </button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 md:mb-8">
              <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-4 md:p-6 hover:border-purple-500/30 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Total Interviews</p>
                    <p className="text-2xl font-bold text-white">{stats.total}</p>
                  </div>
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 md:w-6 md:h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-4 md:p-6 hover:border-purple-500/30 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Upcoming</p>
                    <p className="text-2xl font-bold text-white">{stats.upcoming}</p>
                  </div>
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-green-500/20 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 md:w-6 md:h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-4 md:p-6 hover:border-purple-500/30 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Completed</p>
                    <p className="text-2xl font-bold text-white">{stats.completed}</p>
                  </div>
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 md:w-6 md:h-6 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                </div>
              </div>

              <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 p-4 md:p-6 hover:border-purple-500/30 transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-400">Today</p>
                    <p className="text-2xl font-bold text-white">{stats.today}</p>
                  </div>
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-orange-500/20 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 md:w-6 md:h-6 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Tabs */}
            {isMobile && (
              <div className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 mb-6">
                <div className="flex border-b border-white/10">
                  <button
                    onClick={() => setActiveTab('scheduled')}
                    className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${
                      activeTab === 'scheduled'
                        ? 'text-purple-300 border-b-2 border-purple-500'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Scheduled
                  </button>
                  <button
                    onClick={() => setActiveTab('candidates')}
                    className={`flex-1 py-3 text-sm font-medium text-center transition-colors ${
                      activeTab === 'candidates'
                        ? 'text-purple-300 border-b-2 border-purple-500'
                        : 'text-gray-400 hover:text-white'
                    }`}
                  >
                    <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                    Candidates
                  </button>
                </div>
              </div>
            )}

            {/* Scheduled Interviews Section */}
            {(activeTab === 'scheduled' || !isMobile) && (
              <div className="backdrop-blur-xl bg-white/5 rounded-3xl border border-white/10 shadow-2xl p-4 md:p-6 mb-6">
                <div className="flex items-center justify-between mb-4 md:mb-6">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 md:w-6 md:h-6 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl md:text-2xl font-bold text-white">Scheduled Interviews</h2>
                      <p className="text-gray-400 text-sm hidden md:block">
                        View and manage upcoming interviews
                      </p>
                    </div>
                  </div>
                  
                  {/* Mobile counter badge */}
                  {isMobile && scheduledInterviews.length > 0 && (
                    <span className="bg-purple-500/20 text-purple-300 text-xs font-medium px-2.5 py-0.5 rounded-full border border-purple-500/30">
                      {scheduledInterviews.length}
                    </span>
                  )}
                </div>

                {loadingScheduled ? (
                  <div className="flex justify-center items-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                    <span className="ml-3 text-gray-400">Loading interviews...</span>
                  </div>
                ) : scheduledInterviews.length === 0 ? (
                  <div className="text-center py-8 md:py-12">
                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-300 mb-2">
                      No interviews scheduled
                    </h3>
                    <p className="text-gray-400 text-sm max-w-md mx-auto mb-6">
                      Schedule interviews with candidates to see them here.
                    </p>
                    <button
                      onClick={fetchCandidates}
                      className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                      <span>View Candidates</span>
                    </button>
                  </div>
                ) : (
                  <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="min-w-full text-white">
                        <thead>
                          <tr className="border-b border-white/10">
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Candidate</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Date & Time</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Room ID</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Status</th>
                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-300">Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {scheduledInterviews.map((interview) => {
                            const formattedDate = formatDate(interview.scheduledAt);
                            return (
                              <tr key={interview.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                <td className="px-4 py-3">
                                  <div className="text-sm font-medium text-white">
                                    {interview.fullName || interview.email}
                                  </div>
                                  {interview.email && (
                                    <div className="text-xs text-gray-400">{interview.email}</div>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <div className="text-sm font-medium text-white">{formattedDate.date}</div>
                                  <div className="text-xs text-gray-400">{formattedDate.time}</div>
                                </td>
                                <td className="px-4 py-3">
                                  {interview.meetingRoomId ? (
                                    <div className="flex items-center space-x-2">
                                      <code className="text-sm bg-white/10 px-2 py-1 rounded font-mono text-gray-300">
                                        {interview.meetingRoomId}
                                      </code>
                                      <button
                                        onClick={() => copyMeetingLink(interview.meetingRoomId)}
                                        className="text-purple-300 hover:text-purple-200 transition-colors"
                                        title="Copy meeting link"
                                      >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                        </svg>
                                      </button>
                                    </div>
                                  ) : (
                                    <span className="text-gray-500 text-sm">-</span>
                                  )}
                                </td>
                                <td className="px-4 py-3">
                                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(interview.status)}`}>
                                    {interview.status || 'Scheduled'}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  {interview.meetingRoomId && (
                                    <button
                                      onClick={() => router.push(`/meeting/${interview.meetingRoomId}`)}
                                      className="flex items-center space-x-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-300 transform hover:scale-105"
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                      </svg>
                                      <span>Join</span>
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="md:hidden space-y-4">
                      {scheduledInterviews.map((interview) => {
                        const formattedDate = formatDate(interview.scheduledAt);
                        return (
                          <div key={interview.id} className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-4 hover:border-purple-500/30 transition-all duration-300">
                            <div className="flex justify-between items-start mb-3">
                              <div className="flex-1">
                                <h3 className="font-semibold text-white text-sm mb-1">
                                  {interview.fullName || interview.email}
                                </h3>
                                {interview.email && (
                                  <p className="text-xs text-gray-400 mb-2">{interview.email}</p>
                                )}
                                <div className="flex items-center space-x-2 text-xs text-gray-400">
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  <span>{formattedDate.date}</span>
                                  <svg className="w-3 h-3 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span>{formattedDate.time}</span>
                                </div>
                              </div>
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(interview.status)} flex-shrink-0 ml-2`}>
                                {interview.status || 'Scheduled'}
                              </span>
                            </div>
                            
                            {interview.meetingRoomId && (
                              <div className="flex items-center justify-between pt-3 border-t border-white/10">
                                <div className="flex items-center space-x-2">
                                  <code className="text-xs bg-white/10 px-2 py-1 rounded font-mono text-gray-300">
                                    {interview.meetingRoomId}
                                  </code>
                                  <button
                                    onClick={() => copyMeetingLink(interview.meetingRoomId)}
                                    className="text-purple-300 hover:text-purple-200 transition-colors p-1"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                    </svg>
                                  </button>
                                </div>
                                <button
                                  onClick={() => router.push(`/meeting/${interview.meetingRoomId}`)}
                                  className="flex items-center space-x-1 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-3 py-1.5 rounded-xl text-xs font-medium transition-all duration-300 transform hover:scale-105"
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                  </svg>
                                  <span>Join</span>
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            )}

            {/* Candidates Section (Mobile Tab) */}
            {(activeTab === 'candidates' && isMobile) && (
              <div className="backdrop-blur-xl bg-white/5 rounded-3xl border border-white/10 shadow-2xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                      <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Candidates</h2>
                      <p className="text-gray-400 text-sm">Schedule interviews with candidates</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="bg-purple-500/20 text-purple-300 text-xs font-medium px-2.5 py-0.5 rounded-full border border-purple-500/30">
                      {candidates.length}
                    </span>
                    {getAIStatusBadge()}
                  </div>
                </div>

                {candidates.length === 0 ? (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-300 mb-2">
                      No candidates found
                    </h3>
                    <p className="text-gray-400 text-sm">
                      There are no candidates available to schedule.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {candidates.map((candidate, idx) => (
                      <div key={candidate.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-purple-500/30 transition-all duration-300">
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <h3 className="font-semibold text-white text-sm">
                              {candidate.full_name || candidate.email}
                            </h3>
                            {candidate.matchScore && (
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${candidate.compatibilityColor}`}>
                                {candidate.matchScore}/10
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-gray-400 space-y-1">
                            <div className="flex items-center space-x-2">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <span>{candidate.email}</span>
                            </div>
                            {candidate.phone && candidate.phone !== 'N/A' && (
                              <div className="flex items-center space-x-2">
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <span>{candidate.phone}</span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-300 mb-1">
                              Schedule Date & Time
                            </label>
                            <input
                              type="datetime-local"
                              value={scheduleDates[idx] || ""}
                              onChange={(e) => setScheduleDates(prev => ({ ...prev, [idx]: e.target.value }))}
                              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="flex items-center space-x-2 text-xs">
                              <input
                                type="checkbox"
                                checked={!!(meetingRoomInputs[idx]?.createRoom)}
                                onChange={(e) => setMeetingRoomInputs(prev => ({ ...prev, [idx]: { ...(prev[idx]||{}), createRoom: e.target.checked } }))}
                                className="rounded border-white/20 bg-white/10 text-purple-500 focus:ring-purple-500"
                              />
                              <span className="text-gray-300">Create new meeting room</span>
                            </label>
                            
                            <div>
                              <label className="block text-xs font-medium text-gray-300 mb-1">
                                Or use existing Room ID
                              </label>
                              <input
                                type="text"
                                placeholder="Enter room ID"
                                value={(meetingRoomInputs[idx]?.meetingRoomId) || ""}
                                onChange={(e) => setMeetingRoomInputs(prev => ({ ...prev, [idx]: { ...(prev[idx]||{}), meetingRoomId: e.target.value } }))}
                                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm"
                              />
                            </div>
                          </div>

                          <button
                            onClick={() => saveInterview(candidate, idx)}
                            disabled={savingIdx === idx || !scheduleDates[idx]}
                            className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:bg-gray-600 text-white py-2.5 px-4 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105 disabled:transform-none disabled:opacity-50"
                          >
                            {savingIdx === idx ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Scheduling...</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <span>Schedule Interview</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Candidates Modal (Desktop) */}
        {showCandidatesModal && !isMobile && (
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setShowCandidatesModal(false)}
              aria-hidden="true"
            />

            {/* Modal container */}
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="candidates-title"
              className="relative backdrop-blur-xl bg-gray-800/95 rounded-3xl border border-white/10 shadow-2xl w-full max-w-6xl p-6 my-8 overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-purple-500/20 rounded-xl flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 id="candidates-title" className="text-xl font-semibold text-white">AI-Matched Candidates</h3>
                    <div className="flex items-center space-x-2">
                      <p className="text-gray-400 text-sm">Candidates sorted by compatibility with your profile</p>
                      {getAIStatusBadge()}
                    </div>
                  </div>
                </div>

                {/* Close button */}
                <button
                  onClick={() => setShowCandidatesModal(false)}
                  className="text-gray-400 hover:text-white p-2 rounded-xl hover:bg-white/10 transition-colors"
                  aria-label="Close candidates modal"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Body: scrollable list */}
              <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                {candidates.length === 0 ? (
                  <div className="text-center py-8">
                    <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197m13.5-9a2.5 2.5 0 11-5 0 2.5 2.5 0 015 0z" />
                    </svg>
                    <p className="text-gray-400">No candidates found.</p>
                  </div>
                ) : (
                  candidates.map((candidate, idx) => (
                    <div key={candidate.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 hover:border-purple-500/30 transition-all duration-300">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-3 mb-2">
                            <h4 className="font-semibold text-white text-lg truncate">
                              {candidate.full_name || candidate.email}
                            </h4>
                            {candidate.matchScore && (
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${candidate.compatibilityColor}`}>
                                {candidate.compatibilityLevel} Match ({candidate.matchScore}/10)
                              </span>
                            )}
                          </div>
                          
                          <div className="text-sm text-gray-400 space-y-1">
                            <div className="flex items-center space-x-2">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                              </svg>
                              <span>{candidate.email}</span>
                            </div>
                            {candidate.phone && candidate.phone !== 'N/A' && (
                              <div className="flex items-center space-x-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                                </svg>
                                <span>{candidate.phone}</span>
                              </div>
                            )}
                            {candidate.qualification && (
                              <div className="flex items-center space-x-2">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
                                </svg>
                                <span>{candidate.qualification}</span>
                              </div>
                            )}
                          </div>

                          {/* Matching Details */}
                          {candidate.matchingAreas && (
                            <div className="mt-3 space-y-2">
                              <div className="flex items-start space-x-2">
                                <svg className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <div>
                                  <p className="text-green-300 text-sm font-medium">Matching Areas:</p>
                                  <p className="text-green-200 text-xs">{candidate.matchingAreas.join(', ')}</p>
                                </div>
                              </div>
                              
                              {candidate.interviewFocus && (
                                <div className="flex items-start space-x-2">
                                  <svg className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                  </svg>
                                  <div>
                                    <p className="text-blue-300 text-sm font-medium">Suggested Focus:</p>
                                    <p className="text-blue-200 text-xs">{candidate.interviewFocus.join(', ')}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="ml-4 flex-shrink-0">
                          {/* Schedule form */}
                          <div className="flex items-center gap-3">
                            <input
                              type="datetime-local"
                              value={scheduleDates[idx] || ""}
                              onChange={(e) => setScheduleDates(prev => ({ ...prev, [idx]: e.target.value }))}
                              className="bg-white/10 border border-white/20 p-2 rounded-xl text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm"
                            />

                            <div className="flex items-center gap-2">
                              <label className="flex items-center gap-2 text-sm text-gray-300">
                                <input
                                  type="checkbox"
                                  checked={!!(meetingRoomInputs[idx]?.createRoom)}
                                  onChange={(e) => setMeetingRoomInputs(prev => ({ ...prev, [idx]: { ...(prev[idx]||{}), createRoom: e.target.checked } }))}
                                  className="rounded border-white/20 bg-white/10 text-purple-500 focus:ring-purple-500"
                                />
                                <span>Create Room</span>
                              </label>

                              <input
                                type="text"
                                placeholder="Or enter room id"
                                value={(meetingRoomInputs[idx]?.meetingRoomId) || ""}
                                onChange={(e) => setMeetingRoomInputs(prev => ({ ...prev, [idx]: { ...(prev[idx]||{}), meetingRoomId: e.target.value } }))}
                                className="bg-white/10 border border-white/20 p-2 rounded-xl w-32 text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm"
                              />
                            </div>

                            <button
                              onClick={() => saveInterview(candidate, idx)}
                              disabled={savingIdx === idx || !scheduleDates[idx]}
                              className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:bg-gray-600 text-white px-4 py-2 rounded-xl text-sm font-medium transition-all duration-300 transform hover:scale-105 disabled:transform-none disabled:opacity-50"
                            >
                              {savingIdx === idx ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                                  <span>Saving...</span>
                                </>
                              ) : (
                                <>
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                  <span>Schedule</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default withAuth(InterviewerDashboard, "interviewer");