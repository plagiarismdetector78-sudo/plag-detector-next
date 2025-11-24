"use client";
import { useRouter, usePathname } from "next/navigation";
import {
  FaHome,
  FaUser,
  FaUserTie,
  FaUsers,
  FaClipboardList,
  FaCogs,
  FaSignOutAlt,
  FaBars,
  FaQuestionCircle,
  FaChartLine,
  FaSearchPlus,
  FaUserCircle,
  FaVideo,
  FaCalendarAlt,
  FaHistory,
  FaShieldAlt,
  FaRobot,
  FaChevronLeft,
  FaChevronRight,
} from "react-icons/fa";
import Link from "next/link";
import { useEffect, useState } from "react";

const Sidebar = ({ sidebarCollapsed, toggleSidebar, handleLogout }) => {
  const router = useRouter();
  const pathname = usePathname();
  const [role, setRole] = useState(null);
  const [user, setUser] = useState(null);
  const [scrolled, setScrolled] = useState(false);

  // Handle scroll effect to match navbar
  useEffect(() => {
    const handleScroll = () => {
      const isScrolled = window.scrollY > 10;
      setScrolled(isScrolled);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Detect user role and info automatically from localStorage
  useEffect(() => {
    const storedRole = localStorage.getItem("role");
    const userName = localStorage.getItem("name");
    const userEmail = localStorage.getItem("email");
    
    setRole(storedRole || "candidate");
    setUser({ name: userName, email: userEmail });
  }, []);

  if (!role) {
    return (
      <div className={`${sidebarCollapsed ? "w-20" : "w-72"} bg-gray-900/95 backdrop-blur-xl border-r border-purple-500/20 min-h-screen fixed left-0 top-16 z-40 shadow-2xl flex items-center justify-center transition-all duration-500`}>
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  // Sidebar items based on detected role
  const sidebarItems =
    role === "interviewer"
      ? [
          { 
            id: 1, 
            name: "Dashboard", 
            path: "/dashboard/interviewer", 
            icon: <FaHome className="text-lg" />,
            description: "Interview overview"
          },
          { 
            id: 2, 
            name: "Schedule Interview", 
            path: "/dashboard/schedule-interview", 
            icon: <FaCalendarAlt className="text-lg" />,
            description: "Create new interviews"
          },
          { 
            id: 3, 
            name: "AI Analysis", 
            path: "/dashboard/ai-analysis", 
            icon: <FaRobot className="text-lg" />,
            description: "Interview insights"
          },
          { 
            id: 4, 
            name: "Plagiarism Detection", 
            path: "/dashboard/plagiarism-detection", 
            icon: <FaSearchPlus className="text-lg" />,
            description: "AI-powered detection"
          },
          { 
            id: 5, 
            name: "Interview History", 
            path: "/dashboard/interview-history", 
            icon: <FaHistory className="text-lg" />,
            description: "Past interviews"
          },
          { 
            id: 6, 
            name: "Reports", 
            path: "/dashboard/reports", 
            icon: <FaChartLine className="text-lg" />,
            description: "Detailed analytics"
          },
          { 
            id: 7, 
            name: "Profile", 
            path: "/dashboard/profile", 
            icon: <FaUserCircle className="text-lg" />,
            description: "Account settings"
          },
        ]
      : [
          { 
            id: 1, 
            name: "Dashboard", 
            path: "/dashboard/candidate", 
            icon: <FaHome className="text-lg" />,
            description: "Your overview"
          },
          { 
            id: 2, 
            name: "My Interviews", 
            path: "/dashboard/interviews", 
            icon: <FaVideo className="text-lg" />,
            description: "Upcoming & past"
          },
          { 
            id: 4, 
            name: "AI Feedback", 
            path: "/dashboard/feedback", 
            icon: <FaRobot className="text-lg" />,
            description: "Performance insights"
          },
          { 
            id: 5, 
            name: "My Profile", 
            path: "/dashboard/profile", 
            icon: <FaUserTie className="text-lg" />,
            description: "Personal information"
          },
          { 
            id: 6, 
            name: "Security", 
            path: "/dashboard/security", 
            icon: <FaShieldAlt className="text-lg" />,
            description: "Account security"
          },
          { 
            id: 7, 
            name: "Help & Support", 
            path: "/dashboard/help", 
            icon: <FaQuestionCircle className="text-lg" />,
            description: "Get assistance"
          },
        ];

  const isActive = (path) => pathname === path;

  return (
    <div
      className={`${
        sidebarCollapsed ? "w-20" : "w-72"
      } bg-gray-900/95 backdrop-blur-xl border-r border-purple-500/20 transition-all duration-500 min-h-screen fixed left-0 top-16 z-40 shadow-2xl ${
        scrolled ? 'shadow-purple-500/10' : 'shadow-xl'
      }`}
    >
      <div className="p-4 flex flex-col h-full">
        {/* User Info Section */}
        {!sidebarCollapsed && user && (
          <div className="mb-6 p-4 bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-xl border border-purple-500/20 backdrop-blur-lg">
            <div className="flex items-center space-x-3 mb-3">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
                <FaUser className="text-white text-lg" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white truncate">
                  {user.name || "User"}
                </p>
                <p className="text-xs text-gray-300 truncate">
                  {user.email || ""}
                </p>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-500/20 text-purple-300 border border-purple-500/30 capitalize">
                {role}
              </span>
              <span className="text-xs text-gray-400">Active</span>
            </div>
          </div>
        )}

        {/* Collapsed User Info */}
        {sidebarCollapsed && user && (
          <div className="mb-6 flex justify-center">
            <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg">
              <FaUser className="text-white text-lg" />
            </div>
          </div>
        )}

        {/* Toggle Sidebar Button - Matches Navbar Style */}
        <button
          onClick={toggleSidebar}
          className={`w-full flex items-center ${
            sidebarCollapsed ? "justify-center px-2" : "justify-between px-4"
          } py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300 mb-4 group border border-transparent hover:border-white/10 backdrop-blur-sm`}
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {!sidebarCollapsed && (
            <span className="text-sm font-medium text-gray-300">Navigation</span>
          )}
          <div className="flex items-center justify-center w-6 h-6 bg-white/5 rounded-lg border border-white/10 group-hover:border-purple-500/30 transition-colors">
            {sidebarCollapsed ? (
              <FaChevronRight className="text-gray-400 text-xs group-hover:text-purple-400 transition-colors" />
            ) : (
              <FaChevronLeft className="text-gray-400 text-xs group-hover:text-purple-400 transition-colors" />
            )}
          </div>
        </button>

        {/* Navigation Items */}
        <nav className="space-y-1 flex-1">
          {sidebarItems.map((item) => {
            const active = isActive(item.path);
            return (
              <button
                key={item.id}
                onClick={() => router.push(item.path)}
                className={`w-full flex items-center ${
                  sidebarCollapsed ? "justify-center px-2" : "px-4"
                } py-3 text-left rounded-xl transition-all duration-300 group relative backdrop-blur-sm ${
                  active
                    ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/25 border border-purple-500/30"
                    : "text-gray-300 hover:text-white hover:bg-white/5 hover:border hover:border-white/10 border border-transparent"
                }`}
                title={sidebarCollapsed ? item.name : ""}
              >
                <span
                  className={`transition-colors duration-300 ${
                    sidebarCollapsed ? "" : "mr-3 w-6 flex justify-center"
                  } ${
                    active
                      ? "text-white"
                      : "text-gray-400 group-hover:text-purple-400"
                  }`}
                >
                  {item.icon}
                </span>
                
                {!sidebarCollapsed && (
                  <div className="flex-1 min-w-0">
                    <span className="font-medium text-sm block truncate">
                      {item.name}
                    </span>
                    <span
                      className={`text-xs block truncate ${
                        active ? "text-purple-100" : "text-gray-400"
                      }`}
                    >
                      {item.description}
                    </span>
                  </div>
                )}

                {/* Active indicator */}
                {active && !sidebarCollapsed && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2 w-2 h-2 bg-white rounded-full shadow-sm"></div>
                )}
              </button>
            );
          })}
        </nav>

        {/* Settings & Logout */}
        <div className="pt-4 border-t border-purple-500/10 space-y-2">
          {/* Settings */}
          <button
            onClick={() => router.push("/dashboard/settings")}
            className={`w-full flex items-center ${
              sidebarCollapsed ? "justify-center px-2" : "px-4"
            } py-3 text-gray-300 hover:text-white hover:bg-white/5 rounded-xl transition-all duration-300 group border border-transparent hover:border-white/10 backdrop-blur-sm`}
            title={sidebarCollapsed ? "Settings" : ""}
          >
            <FaCogs
              className={`text-lg ${
                sidebarCollapsed ? "" : "mr-3"
              } text-gray-400 group-hover:text-purple-400 transition-colors`}
            />
            {!sidebarCollapsed && (
              <span className="font-medium text-sm">Settings</span>
            )}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            className={`w-full flex items-center ${
              sidebarCollapsed ? "justify-center px-2" : "px-4"
            } py-3 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-xl transition-all duration-300 group border border-red-500/20 hover:border-red-500/30 backdrop-blur-sm`}
            title={sidebarCollapsed ? "Logout" : ""}
          >
            <FaSignOutAlt
              className={`text-lg ${
                sidebarCollapsed ? "" : "mr-3"
              } text-red-400 group-hover:text-red-300 transition-colors`}
            />
            {!sidebarCollapsed && (
              <span className="font-medium text-sm">Logout</span>
            )}
          </button>
        </div>

        {/* Footer */}
        {!sidebarCollapsed && (
          <div className="mt-4 pt-4 border-t border-purple-500/10">
            <div className="text-center">
              <p className="text-gray-400 text-xs mb-3">
                &copy; {new Date().getFullYear()} Skill Scanner
              </p>
              <div className="flex justify-center space-x-4 text-xs text-gray-500">
                <Link href="/privacy" className="hover:text-purple-400 transition-colors">
                  Privacy
                </Link>
                <Link href="/terms" className="hover:text-purple-400 transition-colors">
                  Terms
                </Link>
                <Link href="/contact" className="hover:text-purple-400 transition-colors">
                  Contact
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Mobile overlay when sidebar is open */}
      {!sidebarCollapsed && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/40 z-30 backdrop-blur-sm"
          onClick={toggleSidebar}
        />
      )}
    </div>
  );
};

export default Sidebar;