import React, { useState, useEffect, useCallback } from 'react';
import {
  Button,
  Badge,
  Modal,
  Spinner,
  TextInput,
  Textarea,
  Select,
  Card,
} from 'flowbite-react';
import {
  HiOutlineRefresh,
  HiOutlinePrinter,
  HiOutlinePlay,
  HiOutlinePause,
  HiOutlineCheckCircle,
  HiOutlineExclamation,
  HiOutlineClock,
  HiOutlineUser,
  HiOutlineTag,
  HiOutlineEye,
  HiOutlineSearch,
  HiOutlineSparkles,
  HiOutlineExclamationCircle,
  HiOutlineFilter,
} from 'react-icons/hi';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import JobCardModal from '../Components/JobCardModal';
import OrderSourceBadge from '../Components/OrderSourceBadge';

const PRESS_MACHINES = [
  'Konica Minolta AccurioPress C4070 (Digital Color)',
  'Heidelberg Speedmaster SM 74 (4-Color Offset)',
  'Roland TrueVIS SG3-540 (Large Format)',
  'Komori Lithrone G40 (Bulk Offset Press)',
  'Polar High-Speed Programmable Cutter',
  'Autobond Thermal Lamination Machine',
];

const ISSUE_CATEGORIES = [
  { value: 'ARTWORK_PROBLEM', label: '🎨 Artwork Problem / Missing Bleed' },
  { value: 'MATERIAL_UNAVAILABLE', label: '📦 Material / Paper Out of Stock' },
  { value: 'MACHINE_ISSUE', label: '⚙️ Machine Breakdown / Maintenance' },
  { value: 'COLOR_MISMATCH', label: '🌈 Color / CMYK Mismatch' },
  { value: 'CUSTOMER_CLARIFICATION', label: '📞 Customer Clarification Required' },
  { value: 'PAYMENT_ISSUE', label: '💳 Payment Verification Needed' },
  { value: 'QUANTITY_MISMATCH', label: '🔢 Quantity / Sheet Count Mismatch' },
  { value: 'DAMAGE', label: '⚠️ Print Damage / Wastage' },
  { value: 'OTHER', label: '📝 Other Operational Problem' },
];

const TABS = [
  { key: 'WAITING', label: 'Waiting to Print', icon: HiOutlineClock },
  { key: 'ASSIGNED', label: 'Assigned', icon: HiOutlineUser },
  { key: 'IN_PROGRESS', label: 'Printing (Press)', icon: HiOutlinePrinter },
  { key: 'ON_HOLD', label: 'On Hold / Paused', icon: HiOutlinePause },
  { key: 'QC_PENDING', label: 'QC / Prepress', icon: HiOutlineSparkles },
  { key: 'COMPLETED', label: 'Completed Today', icon: HiOutlineCheckCircle },
];

export default function AdminProductionQueue() {
  const { adminUser } = useAuth();
  const isSuperAdmin = (adminUser?.role?.name || adminUser?.role || '').toLowerCase().includes('super') || adminUser?.department === 'ALL';

  const [activeTab, setActiveTab] = useState('IN_PROGRESS');
  const [jobs, setJobs] = useState([]);
  const [summary, setSummary] = useState({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [feedback, setFeedback] = useState(null);

  // Modals state
  const [selectedJob, setSelectedJob] = useState(null);
  const [jobCardModalOpen, setJobCardModalOpen] = useState(false);
  const [jobCardId, setJobCardId] = useState(null);

  // Action Modals
  const [startModalOpen, setStartModalOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState(PRESS_MACHINES[0]);
  const [startNotes, setStartNotes] = useState('');

  const [pauseModalOpen, setPauseModalOpen] = useState(false);
  const [pauseReason, setPauseReason] = useState('');

  const [issueModalOpen, setIssueModalOpen] = useState(false);
  const [issueCategory, setIssueCategory] = useState(ISSUE_CATEGORIES[0].value);
  const [issueDesc, setIssueDesc] = useState('');

  const [priorityModalOpen, setPriorityModalOpen] = useState(false);
  const [targetPriority, setTargetPriority] = useState('URGENT');
  const [priorityReason, setPriorityReason] = useState('');

  // Fetch Department Queue
  const fetchQueue = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        department: 'PRODUCTION',
        tab: activeTab,
        ...(priorityFilter !== 'ALL' ? { priority: priorityFilter } : {}),
        ...(searchQuery ? { search: searchQuery } : {}),
      });

      const res = await api.get(`/admin/operations/queue?${params.toString()}`);
      if (res.data?.success) {
        setJobs(res.data.jobs || []);
        setSummary(res.data.summary || {});
      }
    } catch (err) {
      console.error('Failed to load production queue:', err);
      setFeedback({ type: 'error', text: err.response?.data?.message || 'Failed to load production queue.' });
    } finally {
      setLoading(false);
    }
  }, [activeTab, priorityFilter, searchQuery]);

  useEffect(() => {
    fetchQueue();
    const interval = setInterval(fetchQueue, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, [fetchQueue]);

  // Action: Start Job
  const handleStartJob = async () => {
    if (!selectedJob) return;
    try {
      setActionLoading(true);
      const res = await api.post(`/admin/operations/jobs/${selectedJob.id}/start`, {
        machineNumber: selectedMachine,
        notes: startNotes,
      });
      if (res.data?.success) {
        setFeedback({ type: 'success', text: `Job ${selectedJob.jobNumber} started on ${selectedMachine}!` });
        setStartModalOpen(false);
        fetchQueue();
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.message || 'Failed to start press job.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Pause Job
  const handlePauseJob = async () => {
    if (!selectedJob) return;
    try {
      setActionLoading(true);
      const res = await api.post(`/admin/operations/jobs/${selectedJob.id}/pause`, {
        reason: pauseReason || 'Paused by operator',
      });
      if (res.data?.success) {
        setFeedback({ type: 'success', text: `Job ${selectedJob.jobNumber} paused. Workflow status preserved.` });
        setPauseModalOpen(false);
        fetchQueue();
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.message || 'Failed to pause job.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Resume Job
  const handleResumeJob = async (job) => {
    try {
      setActionLoading(true);
      const res = await api.post(`/admin/operations/jobs/${job.id}/resume`);
      if (res.data?.success) {
        setFeedback({ type: 'success', text: `Job ${job.jobNumber} resumed!` });
        fetchQueue();
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.message || 'Failed to resume job.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Complete Printing & Send to Finishing
  const handleCompletePrinting = async (job) => {
    if (!window.confirm(`Mark Job ${job.jobNumber} (${job.productName}, Qty: ${job.quantity}) printing complete and transfer to Finishing?`)) {
      return;
    }
    try {
      setActionLoading(true);
      const res = await api.post(`/admin/operations/jobs/${job.id}/complete-printing`, {
        notes: `Completed printing on ${job.machineNumber || 'Press'}. Operator: ${adminUser?.name || 'Press Operator'}.`,
      });
      if (res.data?.success) {
        setFeedback({ type: 'success', text: `Job ${job.jobNumber} completed printing! Transferred to Finishing desk.` });
        fetchQueue();
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.message || 'Failed to complete printing.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Report Issue
  const handleReportIssue = async () => {
    if (!selectedJob) return;
    try {
      setActionLoading(true);
      const res = await api.post(`/admin/operations/jobs/${selectedJob.id}/report-issue`, {
        issueCategory,
        description: issueDesc,
        isBlocking: true,
      });
      if (res.data?.success) {
        setFeedback({ type: 'success', text: `Issue recorded! Job moved to ON HOLD. Original stage preserved.` });
        setIssueModalOpen(false);
        setIssueDesc('');
        fetchQueue();
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.message || 'Failed to report issue.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Resolve Issue
  const handleResolveIssue = async (issueId) => {
    const notes = window.prompt('Resolution notes:');
    if (!notes) return;
    try {
      setActionLoading(true);
      const res = await api.post(`/admin/operations/issues/${issueId}/resolve`, {
        resolutionNotes: notes,
      });
      if (res.data?.success) {
        setFeedback({ type: 'success', text: 'Issue resolved! Job restored from ON HOLD to active workflow.' });
        fetchQueue();
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.message || 'Failed to resolve issue.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Action: Update Priority
  const handleUpdatePriority = async () => {
    if (!selectedJob) return;
    try {
      setActionLoading(true);
      const res = await api.patch(`/admin/operations/jobs/${selectedJob.id}/priority`, {
        priority: targetPriority,
        reason: priorityReason,
      });
      if (res.data?.success) {
        setFeedback({ type: 'success', text: `Priority updated to ${targetPriority} for job ${selectedJob.jobNumber}.` });
        setPriorityModalOpen(false);
        setPriorityReason('');
        fetchQueue();
      }
    } catch (err) {
      setFeedback({ type: 'error', text: err.response?.data?.message || 'Failed to update priority.' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 bg-white p-5 rounded-2xl shadow-sm border border-gray-200">
        <div>
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-yellow-400 text-black rounded-xl text-2xl shadow-sm">🖨️</span>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">Live Production Queue</h1>
              <p className="text-xs md:text-sm text-gray-500">
                Real-time factory press operations, job cards, machine allocations & hold tracking
              </p>
            </div>
          </div>
        </div>

        {/* Quick Controls */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            size="sm"
            color="light"
            onClick={fetchQueue}
            disabled={loading}
            className="font-bold border-gray-300"
          >
            <HiOutlineRefresh className={`mr-1.5 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Feedback Alert */}
      {feedback && (
        <div
          className={`p-4 mb-6 rounded-xl flex items-center justify-between text-sm font-semibold shadow-sm ${
            feedback.type === 'error'
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'error' ? <HiOutlineExclamationCircle className="h-5 w-5" /> : <HiOutlineCheckCircle className="h-5 w-5" />}
            <span>{feedback.text}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs underline opacity-70 hover:opacity-100">
            Dismiss
          </button>
        </div>
      )}

      {/* Queue Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
        <div
          onClick={() => setActiveTab('WAITING')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'WAITING' ? 'bg-amber-50 border-amber-400 shadow-md ring-2 ring-amber-400/20' : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Waiting</p>
          <p className="text-2xl font-black text-amber-600 mt-0.5">{summary.waiting || 0}</p>
        </div>

        <div
          onClick={() => setActiveTab('ASSIGNED')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'ASSIGNED' ? 'bg-blue-50 border-blue-400 shadow-md ring-2 ring-blue-400/20' : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Assigned</p>
          <p className="text-2xl font-black text-blue-600 mt-0.5">{summary.assignedToMe || 0}</p>
        </div>

        <div
          onClick={() => setActiveTab('IN_PROGRESS')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'IN_PROGRESS' ? 'bg-emerald-50 border-emerald-400 shadow-md ring-2 ring-emerald-400/20' : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Printing</p>
          <p className="text-2xl font-black text-emerald-600 mt-0.5">{summary.inProgress || 0}</p>
        </div>

        <div
          onClick={() => setActiveTab('ON_HOLD')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'ON_HOLD' ? 'bg-rose-50 border-rose-400 shadow-md ring-2 ring-rose-400/20' : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">On Hold</p>
          <p className="text-2xl font-black text-rose-600 mt-0.5">{summary.onHold || 0}</p>
        </div>

        <div
          onClick={() => setActiveTab('QC_PENDING')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'QC_PENDING' ? 'bg-purple-50 border-purple-400 shadow-md ring-2 ring-purple-400/20' : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">QC Pending</p>
          <p className="text-2xl font-black text-purple-600 mt-0.5">{summary.qcPending || 0}</p>
        </div>

        <div
          onClick={() => setActiveTab('COMPLETED')}
          className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
            activeTab === 'COMPLETED' ? 'bg-gray-100 border-gray-400 shadow-md ring-2 ring-gray-400/20' : 'bg-white border-gray-200 hover:border-gray-300'
          }`}
        >
          <p className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Done Today</p>
          <p className="text-2xl font-black text-gray-900 mt-0.5">{summary.completedToday || 0}</p>
        </div>
      </div>

      {/* Filter & Search Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm mb-6 flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-1.5 w-full md:w-auto">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs md:text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-black text-white shadow-sm'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Priority & Search Filters */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Select
            size="sm"
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="w-32"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">🚨 Urgent</option>
            <option value="HIGH">🔥 High</option>
            <option value="NORMAL">Standard</option>
            <option value="LOW">Low</option>
          </Select>

          <div className="relative flex-1 md:w-64">
            <TextInput
              size="sm"
              icon={HiOutlineSearch}
              placeholder="Search job / order / phone..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Job Cards Stream (Mobile-first responsive grid) */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white rounded-2xl border border-gray-200">
          <Spinner size="xl" />
          <p className="mt-3 text-sm font-bold text-gray-500">Loading live production jobs...</p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-dashed border-gray-300">
          <span className="text-4xl">📭</span>
          <h3 className="mt-2 text-base font-bold text-gray-900">No production jobs found</h3>
          <p className="text-xs text-gray-500 mt-1">There are no jobs matching the selected tab and filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {jobs.map((job) => {
            const isUrgent = job.priority === 'URGENT';
            const isDelayed = job.slaStatus === 'DELAYED';
            const isAtRisk = job.slaStatus === 'AT_RISK';
            const isPaused = job.isPaused;

            return (
              <div
                key={job.id}
                className={`bg-white rounded-2xl border transition-all hover:shadow-md flex flex-col justify-between overflow-hidden ${
                  isUrgent
                    ? 'border-red-400 ring-2 ring-red-400/20'
                    : isDelayed
                    ? 'border-rose-300'
                    : isPaused
                    ? 'border-amber-300 bg-amber-50/20'
                    : 'border-gray-200'
                }`}
              >
                {/* Card Top Banner */}
                <div>
                  <div className="p-4 border-b border-gray-100 bg-gray-50/60 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-black text-gray-900 bg-yellow-300 px-2 py-0.5 rounded">
                        {job.jobNumber}
                      </span>
                      <OrderSourceBadge source={job.orderSource} size="xs" />
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Priority Badge */}
                      <span
                        className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                          job.priority === 'URGENT'
                            ? 'bg-red-600 text-white animate-pulse'
                            : job.priority === 'HIGH'
                            ? 'bg-orange-500 text-white'
                            : job.priority === 'LOW'
                            ? 'bg-gray-200 text-gray-700'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {job.priority}
                      </span>

                      {/* SLA Badge */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          isDelayed
                            ? 'bg-red-100 text-red-800 border border-red-200'
                            : isAtRisk
                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {job.slaLabel}
                      </span>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 space-y-3">
                    {/* Product & Order Title */}
                    <div>
                      <div className="flex items-baseline justify-between gap-2">
                        <h3 className="font-black text-gray-900 text-base leading-tight line-clamp-1">
                          {job.productName}
                        </h3>
                        <span className="text-xs font-mono font-bold text-gray-500 whitespace-nowrap">
                          #{job.orderNumber}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 mt-0.5 flex items-center gap-1.5">
                        <HiOutlineUser className="h-3.5 w-3.5 text-gray-400" />
                        <span className="font-semibold">{job.customerName}</span>
                        {job.customerMobile && <span className="text-gray-400">({job.customerMobile})</span>}
                      </p>
                    </div>

                    {/* Operational Specs Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <div>
                        <span className="text-gray-400 block text-[10px] uppercase font-bold">Quantity</span>
                        <span className="font-extrabold text-gray-900 text-sm">{job.quantity.toLocaleString('en-IN')} units</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px] uppercase font-bold">Size</span>
                        <span className="font-semibold text-gray-800">{job.size}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px] uppercase font-bold">Material</span>
                        <span className="font-semibold text-gray-800 line-clamp-1">{job.material}</span>
                      </div>
                      <div>
                        <span className="text-gray-400 block text-[10px] uppercase font-bold">Lamination</span>
                        <span className="font-semibold text-gray-800">{job.lamination}</span>
                      </div>
                      <div className="col-span-2 border-t border-gray-200/60 pt-1.5 mt-0.5 flex items-center justify-between">
                        <span className="text-gray-500 font-medium">Machine:</span>
                        <span className="font-bold text-gray-800">{job.machineNumber || 'Not Allocated'}</span>
                      </div>
                    </div>

                    {/* Operator Attribution */}
                    <div className="flex items-center justify-between text-xs px-1">
                      <span className="text-gray-500 flex items-center gap-1">
                        <HiOutlineUser className="h-3.5 w-3.5 text-gray-400" />
                        Operator: <strong className="text-gray-800">{job.assignedStaffName}</strong>
                      </span>
                      <span className="text-gray-400 text-[11px]">
                        Status: <strong className="text-gray-700">{job.workflowStatus}</strong>
                      </span>
                    </div>

                    {/* Pause Warning if paused */}
                    {isPaused && (
                      <div className="p-2.5 bg-amber-100 border border-amber-300 rounded-lg text-xs text-amber-900 font-semibold flex items-center gap-2">
                        <HiOutlinePause className="h-4 w-4 text-amber-700 flex-shrink-0" />
                        <span className="line-clamp-1">PAUSED: {job.pauseReason || 'Paused by operator'}</span>
                      </div>
                    )}

                    {/* Open Issues Alert */}
                    {job.openIssuesCount > 0 && (
                      <div className="p-2.5 bg-rose-100 border border-rose-300 rounded-lg text-xs text-rose-900 font-semibold flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <HiOutlineExclamationCircle className="h-4 w-4 text-rose-700 flex-shrink-0" />
                          <span>{job.openIssuesCount} OPEN ISSUE(S) REPORTED</span>
                        </div>
                        {job.issues?.[0]?.id && (
                          <button
                            onClick={() => handleResolveIssue(job.issues[0].id)}
                            className="underline text-[11px] font-bold text-rose-800 hover:text-black"
                          >
                            Resolve
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Action Footer (Large touch-friendly buttons) */}
                <div className="p-3 bg-gray-50 border-t border-gray-100 space-y-2">
                  {/* Primary Workflow Actions */}
                  <div className="grid grid-cols-2 gap-2">
                    {/* START PRINTING */}
                    {['QUEUED', 'ASSIGNED', 'WAITING_FOR_DESIGN_APPROVAL'].includes(job.workflowStatus) && (
                      <Button
                        size="sm"
                        color="success"
                        className="w-full font-bold h-11 text-sm shadow-sm"
                        onClick={() => {
                          setSelectedJob(job);
                          setStartModalOpen(true);
                        }}
                        disabled={actionLoading}
                      >
                        <HiOutlinePlay className="mr-1.5 h-4 w-4" />
                        Start Job
                      </Button>
                    )}

                    {/* PAUSE / RESUME */}
                    {job.workflowStatus === 'PRINTING' && (
                      <>
                        {isPaused ? (
                          <Button
                            size="sm"
                            color="success"
                            className="w-full font-bold h-11 text-sm"
                            onClick={() => handleResumeJob(job)}
                            disabled={actionLoading}
                          >
                            <HiOutlinePlay className="mr-1.5 h-4 w-4" />
                            Resume
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            color="warning"
                            className="w-full font-bold h-11 text-sm"
                            onClick={() => {
                              setSelectedJob(job);
                              setPauseModalOpen(true);
                            }}
                            disabled={actionLoading}
                          >
                            <HiOutlinePause className="mr-1.5 h-4 w-4" />
                            Pause
                          </Button>
                        )}

                        <Button
                          size="sm"
                          color="indigo"
                          className="w-full font-bold h-11 text-sm shadow-sm bg-indigo-600 hover:bg-indigo-700 text-white"
                          onClick={() => handleCompletePrinting(job)}
                          disabled={actionLoading}
                        >
                          <HiOutlineCheckCircle className="mr-1.5 h-4 w-4" />
                          To Finishing
                        </Button>
                      </>
                    )}

                    {/* View Job Card */}
                    <Button
                      size="sm"
                      color="light"
                      className="font-bold h-11 text-xs border-gray-300"
                      onClick={() => {
                        setJobCardId(job.id);
                        setJobCardModalOpen(true);
                      }}
                    >
                      <HiOutlineEye className="mr-1 h-3.5 w-3.5" />
                      Job Card
                    </Button>

                    {/* Report Issue */}
                    <Button
                      size="sm"
                      color="failure"
                      outline
                      className="font-bold h-11 text-xs"
                      onClick={() => {
                        setSelectedJob(job);
                        setIssueModalOpen(true);
                      }}
                      disabled={actionLoading}
                    >
                      <HiOutlineExclamation className="mr-1 h-3.5 w-3.5" />
                      Report Issue
                    </Button>
                  </div>

                  {/* Manager Controls: Priority Change */}
                  {isSuperAdmin && (
                    <div className="flex items-center justify-end pt-1">
                      <button
                        onClick={() => {
                          setSelectedJob(job);
                          setTargetPriority(job.priority);
                          setPriorityModalOpen(true);
                        }}
                        className="text-[11px] font-bold text-gray-500 hover:text-black flex items-center gap-1"
                      >
                        <HiOutlineTag className="h-3 w-3" />
                        Change Priority
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* START JOB MODAL */}
      <Modal show={startModalOpen} onClose={() => setStartModalOpen(false)} size="md">
        <Modal.Header>
          <span className="text-base font-black">🖨️ Start Press Run — {selectedJob?.jobNumber}</span>
        </Modal.Header>
        <Modal.Body className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Select Press Machine</label>
            <Select
              value={selectedMachine}
              onChange={(e) => setSelectedMachine(e.target.value)}
            >
              {PRESS_MACHINES.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Operator Notes / Setup Details (Optional)</label>
            <TextInput
              placeholder="e.g. 350 GSM Art Card loaded in tray 2"
              value={startNotes}
              onChange={(e) => setStartNotes(e.target.value)}
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button color="success" onClick={handleStartJob} disabled={actionLoading} className="font-bold">
            {actionLoading ? <Spinner size="sm" /> : 'Confirm & Start Printing'}
          </Button>
          <Button color="gray" onClick={() => setStartModalOpen(false)}>Cancel</Button>
        </Modal.Footer>
      </Modal>

      {/* PAUSE JOB MODAL */}
      <Modal show={pauseModalOpen} onClose={() => setPauseModalOpen(false)} size="md">
        <Modal.Header>
          <span className="text-base font-black">⏸️ Pause Job — {selectedJob?.jobNumber}</span>
        </Modal.Header>
        <Modal.Body className="space-y-4">
          <p className="text-xs text-gray-600">
            Pausing temporarily halts the press run without altering the workflow stage.
          </p>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Reason for Pause</label>
            <TextInput
              placeholder="e.g. Paper jam / Plate replacement / Lunch break"
              value={pauseReason}
              onChange={(e) => setPauseReason(e.target.value)}
            />
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button color="warning" onClick={handlePauseJob} disabled={actionLoading} className="font-bold">
            {actionLoading ? <Spinner size="sm" /> : 'Pause Job'}
          </Button>
          <Button color="gray" onClick={() => setPauseModalOpen(false)}>Cancel</Button>
        </Modal.Footer>
      </Modal>

      {/* REPORT ISSUE / ON HOLD MODAL */}
      <Modal show={issueModalOpen} onClose={() => setIssueModalOpen(false)} size="md">
        <Modal.Header>
          <span className="text-base font-black text-red-600">⚠️ Report Issue & Put On Hold</span>
        </Modal.Header>
        <Modal.Body className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Issue Category</label>
            <Select
              value={issueCategory}
              onChange={(e) => setIssueCategory(e.target.value)}
            >
              {ISSUE_CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Description & Floor Notes</label>
            <Textarea
              rows={3}
              placeholder="Describe the exact problem (e.g. Missing 5mm bleed on artwork / Black ink running thin)..."
              value={issueDesc}
              onChange={(e) => setIssueDesc(e.target.value)}
            />
          </div>
          <p className="text-[11px] text-gray-500">
            Reporting a blocking issue will move the job to <strong>ON HOLD</strong> while strictly preserving its original workflow stage so it can resume once resolved.
          </p>
        </Modal.Body>
        <Modal.Footer>
          <Button color="failure" onClick={handleReportIssue} disabled={actionLoading || !issueDesc.trim()} className="font-bold">
            {actionLoading ? <Spinner size="sm" /> : 'Submit Issue & Put On Hold'}
          </Button>
          <Button color="gray" onClick={() => setIssueModalOpen(false)}>Cancel</Button>
        </Modal.Footer>
      </Modal>

      {/* PRIORITY MODAL */}
      <Modal show={priorityModalOpen} onClose={() => setPriorityModalOpen(false)} size="md">
        <Modal.Header>
          <span className="text-base font-black">🏷️ Update Priority — {selectedJob?.jobNumber}</span>
        </Modal.Header>
        <Modal.Body className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Priority Level</label>
            <Select
              value={targetPriority}
              onChange={(e) => setTargetPriority(e.target.value)}
            >
              <option value="URGENT">🚨 URGENT (Immediate Action)</option>
              <option value="HIGH">🔥 HIGH</option>
              <option value="NORMAL">NORMAL (Standard Turnaround)</option>
              <option value="LOW">LOW</option>
            </Select>
          </div>
          {targetPriority === 'URGENT' && (
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Operational Reason (Mandatory for Urgent)</label>
              <TextInput
                placeholder="e.g. Customer waiting in showroom for same-day flight"
                value={priorityReason}
                onChange={(e) => setPriorityReason(e.target.value)}
              />
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            color="dark"
            onClick={handleUpdatePriority}
            disabled={actionLoading || (targetPriority === 'URGENT' && !priorityReason.trim())}
            className="font-bold"
          >
            {actionLoading ? <Spinner size="sm" /> : 'Save Priority'}
          </Button>
          <Button color="gray" onClick={() => setPriorityModalOpen(false)}>Cancel</Button>
        </Modal.Footer>
      </Modal>

      {/* Full Job Card Modal */}
      <JobCardModal
        isOpen={jobCardModalOpen}
        onClose={() => {
          setJobCardModalOpen(false);
          setJobCardId(null);
        }}
        jobId={jobCardId}
      />
    </div>
  );
}
