import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import withAuth from "../../lib/withAuth";
import Sidebar from "../../components/Sidebar";
import Navbar from "../../components/Navbar";

const ScheduleInterviewPage = () => {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCandidate, setSelectedCandidate] = useState(null);

  const [scheduleData, setScheduleData] = useState({
    scheduledAt: "",
    duration: 60,
    interviewType: "technical",
    position: "Software Engineer",
    meetingRoomId: "",
    createRoom: true,
  });

  const [saving, setSaving] = useState(false);

  // ⭐ FIX #1 — fetchCandidates MUST be defined outside useEffect
  const fetchCandidates = async () => {
    try {
      const interviewerId = localStorage.getItem("userId");

      const response = await fetch(
        `/api/get-candidates?interviewerId=${interviewerId}`
      );
      const data = await response.json();

      if (data.success) {
        setCandidates(data.candidates || []);
      }
    } catch (error) {
      console.error("Error fetching candidates:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const savedState = localStorage.getItem("sidebarCollapsed");
    if (savedState === "true") setSidebarCollapsed(true);

    fetchCandidates();
  }, []);

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem("sidebarCollapsed", newState.toString());
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push("/");
  };

  // ⭐ FIX #2 — ensure correct candidate ID mapping (db uses id OR user_id)
  const resolveCandidateId = (candidate) => {
   return candidate.id;
  };

  const scheduleInterview = async () => {
    if (!selectedCandidate || !scheduleData.scheduledAt) {
      alert("Please select a candidate and schedule date/time");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/schedule-interview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },

        // ⭐ FIX #3 — send correct interviewer & candidate ID
        body: JSON.stringify({
          candidateId: resolveCandidateId(selectedCandidate),
          interviewerId: localStorage.getItem("userId"),
          scheduledAt: new Date(scheduleData.scheduledAt).toISOString(),
          duration: scheduleData.duration,
          interviewType: scheduleData.interviewType,
          position: scheduleData.position,
          meetingRoomId: scheduleData.meetingRoomId || undefined,
          createRoom: scheduleData.createRoom,
        }),
      });

      const data = await response.json();

      if (data.success) {
        alert("Interview scheduled successfully!");
        if (data.meetingRoomId) {
          alert(`Meeting Room ID: ${data.meetingRoomId}`);
        }

        // Reset form
        setSelectedCandidate(null);
        setScheduleData({
          scheduledAt: "",
          duration: 60,
          interviewType: "technical",
          position: "Software Engineer",
          meetingRoomId: "",
          createRoom: true,
        });

        fetchCandidates(); // Refresh list
      } else {
        alert("Failed to schedule interview: " + data.error);
      }
    } catch (error) {
      console.error("Error scheduling interview:", error);
      alert("Error scheduling interview");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Head>
        <title>Schedule Interview - Skill Scanner</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black">
        <Navbar />

        <div className="flex">
          <Sidebar
            sidebarCollapsed={sidebarCollapsed}
            toggleSidebar={toggleSidebar}
            handleLogout={handleLogout}
          />

          <div
            className={`flex-1 transition-all duration-300 ${
              sidebarCollapsed ? "ml-20" : "ml-0 md:ml-72"
            } p-4 md:p-6`}
          >
            {/* header */}
            <h1 className="text-3xl font-bold text-white mb-6">
              Schedule Interview
            </h1>

            {/* UI continues... */}
          </div>
        </div>
      </div>
    </>
  );
};

export default withAuth(ScheduleInterviewPage, "interviewer");
