import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import withAuth from '../../lib/withAuth';
import Sidebar from '../../components/Sidebar';
import Navbar from "../../components/Navbar";

const ReportsPage = () => {
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30d');
  const [reportType, setReportType] = useState('performance');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    const savedState = localStorage.getItem('sidebarCollapsed');
    if (savedState === 'true') setSidebarCollapsed(true);
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch(`/api/get-reports?userId=${userId}`);
      const data = await response.json();
      if (data.success) {
        setReports(data.reports || []);
      }
    } catch (error) {
      console.error('Error fetching reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSidebar = () => {
    const newState = !sidebarCollapsed;
    setSidebarCollapsed(newState);
    localStorage.setItem('sidebarCollapsed', newState.toString());
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  const generateReport = async () => {
    setGenerating(true);
    try {
      const userId = localStorage.getItem('userId');
      const response = await fetch('/api/generate-report', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          reportType,
          timeRange
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert('Report generated successfully!');
        fetchReports();
      } else {
        alert('Failed to generate report: ' + data.error);
      }
    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating report');
    } finally {
      setGenerating(false);
    }
  };

  const downloadReport = (reportId) => {
    // Implement download functionality
    alert(`Downloading report ${reportId}`);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString();
  };

  return (
    <>
      <Head>
        <title>Reports - Skill Scanner</title>
        <meta name="description" content="Detailed analytics and reports" />
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
                <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
                  Detailed <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-pink-500">Analytics</span>
                </h1>
                <p className="text-gray-300 text-sm md:text-base">
                  Comprehensive reports and insights
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              {/* Report Generator */}
              <div className="backdrop-blur-xl bg-white/5 rounded-3xl border border-white/10 shadow-2xl p-6">
                <h2 className="text-xl font-bold text-white mb-4">Generate Report</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Report Type</label>
                    <select
                      value={reportType}
                      onChange={(e) => setReportType(e.target.value)}
                      className="w-full px-4 py-3 bg-black/50 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm"
                    >
                      <option value="performance">Performance Analysis</option>
                      <option value="interview">Interview Statistics</option>
                      <option value="candidate">Candidate Insights</option>
                      <option value="plagiarism">Plagiarism Overview</option>
                      <option value="comprehensive">Comprehensive Report</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Time Range</label>
                    <select
                      value={timeRange}
                      onChange={(e) => setTimeRange(e.target.value)}
                      className="w-full px-4 py-3 bg-black/50 border border-white/20 rounded-xl text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent backdrop-blur-sm"
                    >
                      <option value="7d">Last 7 days</option>
                      <option value="30d">Last 30 days</option>
                      <option value="90d">Last 90 days</option>
                      <option value="1y">Last year</option>
                      <option value="all">All time</option>
                    </select>
                  </div>

                  <button
                    onClick={generateReport}
                    disabled={generating}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 text-white py-3 px-4 rounded-xl font-semibold transition-all duration-300 transform hover:scale-105 disabled:transform-none"
                  >
                    {generating ? (
                      <div className="flex items-center justify-center space-x-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Generating Report...</span>
                      </div>
                    ) : (
                      'Generate Report'
                    )}
                  </button>
                </div>
              </div>

              {/* Quick Stats */}
              <div className="backdrop-blur-xl bg-white/5 rounded-3xl border border-white/10 shadow-2xl p-6 lg:col-span-2">
                <h2 className="text-xl font-bold text-white mb-4">Quick Stats</h2>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Reports', value: reports.length, color: 'blue' },
                    { label: 'This Month', value: reports.filter(r => {
                      const reportDate = new Date(r.generated_at);
                      const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
                      return reportDate >= monthStart;
                    }).length, color: 'green' },
                    { label: 'Performance', value: reports.filter(r => r.report_type === 'performance').length, color: 'purple' },
                    { label: 'Interviews', value: reports.filter(r => r.report_type === 'interview').length, color: 'orange' },
                  ].map((stat, index) => (
                    <div key={index} className="bg-white/5 rounded-2xl p-4 text-center border border-white/10">
                      <div className={`text-2xl font-bold mb-1 ${
                        stat.color === 'blue' ? 'text-blue-400' :
                        stat.color === 'green' ? 'text-green-400' :
                        stat.color === 'purple' ? 'text-purple-400' : 'text-orange-400'
                      }`}>
                        {stat.value}
                      </div>
                      <div className="text-gray-400 text-sm">{stat.label}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-6 p-4 bg-white/5 rounded-2xl border border-white/10">
                  <h3 className="text-white font-semibold mb-2">Report Types</h3>
                  <ul className="text-gray-400 text-sm space-y-1">
                    <li>• <span className="text-blue-400">Performance</span> - Candidate performance metrics</li>
                    <li>• <span className="text-green-400">Interview</span> - Interview statistics and trends</li>
                    <li>• <span className="text-purple-400">Candidate</span> - Candidate insights and patterns</li>
                    <li>• <span className="text-orange-400">Plagiarism</span> - Plagiarism detection overview</li>
                    <li>• <span className="text-pink-400">Comprehensive</span> - Complete analysis report</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Reports List */}
            <div className="backdrop-blur-xl bg-white/5 rounded-3xl border border-white/10 shadow-2xl p-4 md:p-6">
              <h2 className="text-xl font-bold text-white mb-4">Generated Reports</h2>
              
              {loading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                  <span className="ml-3 text-gray-400">Loading reports...</span>
                </div>
              ) : reports.length === 0 ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-gray-300 mb-2">No reports generated yet</h3>
                  <p className="text-gray-400 text-sm">
                    Generate your first report to see analytics and insights.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reports.map((report) => (
                    <div key={report.id} className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-6 hover:border-purple-500/30 transition-all duration-300">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <h3 className="font-semibold text-white text-lg mb-2 capitalize">
                            {report.report_type?.replace(/_/g, ' ')} Report
                          </h3>
                          <div className="flex items-center space-x-4 text-sm text-gray-400">
                            <span>Generated: {formatDate(report.generated_at)}</span>
                            {report.time_range_start && report.time_range_end && (
                              <>
                                <span>•</span>
                                <span>
                                  {new Date(report.time_range_start).toLocaleDateString()} - {new Date(report.time_range_end).toLocaleDateString()}
                                </span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => downloadReport(report.id)}
                            className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl text-sm font-medium transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                            </svg>
                            <span>Download</span>
                          </button>
                          <button className="flex items-center space-x-2 bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-xl text-sm font-medium transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            </svg>
                            <span>View</span>
                          </button>
                        </div>
                      </div>

                      {report.report_data && (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          {Object.entries(report.report_data).slice(0, 4).map(([key, value], index) => (
                            <div key={index} className="text-center">
                              <div className="text-white font-semibold">{value}</div>
                              <div className="text-gray-400 text-xs capitalize">{key.replace(/_/g, ' ')}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default withAuth(ReportsPage, 'interviewer');