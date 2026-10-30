import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldAlert,
  Zap,
  TrendingUp,
  Receipt,
  Users,
  Send,
  Bot,
  Terminal,
  RefreshCw,
  Plus,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
  Copy,
  ExternalLink,
  Percent,
  Sliders,
  DollarSign,
  Search,
  Filter,
  Webhook,
  Activity,
  ArrowRight,
  X,
  CreditCard,
  Building,
  Check,
  MessageSquare
} from 'lucide-react';

interface InvoiceItem {
  name: string;
  quantity: number;
  unit_price: number;
}

interface Invoice {
  id: string;
  invoice_number: string;
  client_name: string;
  client_email: string;
  amount: number;
  original_amount: number;
  currency: string;
  status: 'PAID' | 'SENT' | 'OVERDUE' | 'DRAFT';
  due_date: string;
  issue_date: string;
  days_overdue: number;
  churn_risk: number;
  churn_risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  discount_applied: number;
  items: InvoiceItem[];
  notes?: string;
  paypal_invoice_id?: string;
  paypal_payment_link?: string;
  history: Array<{
    timestamp: string;
    action: string;
    details: string;
  }>;
}

interface SandboxLog {
  id: string;
  timestamp: string;
  method: string;
  url: string;
  status: number;
  latency_ms: number;
  is_simulated: boolean;
  request_headers: Record<string, string>;
  request_body: any;
  response_body: any;
  curl_command: string;
  summary: string;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  toolInvocations?: Array<{ name: string; args: any }>;
  pendingAction?: {
    type: 'SEND_REMINDER' | 'CREATE_INVOICE' | 'EXECUTE_PAYOUT';
    title: string;
    description: string;
    payload: any;
  };
}

export default function App() {
  // State
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [kpis, setKpis] = useState<any>({
    total_revenue: 0,
    pending_receivables: 0,
    at_risk_overdue: 0,
    recovered_via_ai: 0,
    high_risk_clients_count: 0,
    total_invoices_count: 0,
    churn_prevention_rate: '88.4%',
    avg_days_to_settle: '6.2 days',
  });
  const [sandboxMode, setSandboxMode] = useState<any>({ isLiveSandbox: true, usingSimulator: true });
  const [logs, setLogs] = useState<SandboxLog[]>([]);
  const [activeTab, setActiveTab] = useState<'invoices' | 'splits' | 'webhooks'>('invoices');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OVERDUE' | 'SENT' | 'PAID'>('ALL');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'HIGH' | 'MEDIUM' | 'LOW'>('ALL');

  // Copilot Drawer
  const [isCopilotOpen, setIsCopilotOpen] = useState(true);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'init-1',
      role: 'assistant',
      content: `Welcome to **PayPilot AI**! I'm your PayPal revenue copilot. I've analyzed your receivables: you have **3 overdue invoices** totaling **$12,800** with high customer churn risk. You can prompt me to send smart discount reminders, draft PayPal invoices, or orchestrate collaborator payouts.`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [userInput, setUserInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Terminal Drawer
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [selectedLog, setSelectedLog] = useState<SandboxLog | null>(null);

  // Modals
  const [createInvoiceModalOpen, setCreateInvoiceModalOpen] = useState(false);
  const [discountModalOpen, setDiscountModalOpen] = useState(false);
  const [selectedInvoiceForDiscount, setSelectedInvoiceForDiscount] = useState<Invoice | null>(null);
  const [discountPercent, setDiscountPercent] = useState(15);
  const [customDiscountNote, setCustomDiscountNote] = useState('');
  const [webhookModalOpen, setWebhookModalOpen] = useState(false);
  const [selectedWebhookEvent, setSelectedWebhookEvent] = useState('INVOICING.INVOICE.PAID');
  const [targetInvoiceForWebhook, setTargetInvoiceForWebhook] = useState<string>('');

  // Revenue Split Studio State
  const [splitTotal, setSplitTotal] = useState(10000);
  const [collaborators, setCollaborators] = useState([
    { name: 'Alex Rivera', email: 'alex.lead@paypilot.dev', role: 'Lead Architect', percentage: 50 },
    { name: 'Sarah Chen', email: 'sarah.ux@paypilot.dev', role: 'Product Designer', percentage: 30 },
    { name: 'Marcus Vance', email: 'marcus.qa@paypilot.dev', role: 'QA & Operations', percentage: 20 },
  ]);
  const [isExecutingPayout, setIsExecutingPayout] = useState(false);
  const [payoutSuccessMessage, setPayoutSuccessMessage] = useState<string | null>(null);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4500);
  };

  const chatEndRef = useRef<HTMLDivElement>(null);

  // Load Data
  const fetchData = async () => {
    try {
      const [invRes, kpiRes, logsRes] = await Promise.all([
        fetch('/api/invoices').then((r) => r.json()),
        fetch('/api/kpis').then((r) => r.json()),
        fetch('/api/paypal/logs').then((r) => r.json()),
      ]);

      if (invRes.success) setInvoices(invRes.invoices);
      if (kpiRes.success) {
        setKpis(kpiRes.kpis);
        if (kpiRes.mode) setSandboxMode(kpiRes.mode);
      }
      if (logsRes.success) {
        setLogs(logsRes.logs);
        if (!selectedLog && logsRes.logs.length > 0) {
          setSelectedLog(logsRes.logs[0]);
        }
      }
    } catch (e) {
      console.error('Error fetching dashboard data:', e);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 8000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAiLoading]);

  // AI Chat Handler
  const handleSendMessage = async (customPrompt?: string) => {
    const promptToSend = customPrompt || userInput;
    if (!promptToSend.trim() || isAiLoading) return;

    const userMsg: ChatMessage = {
      id: 'usr_' + Date.now(),
      role: 'user',
      content: promptToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setUserInput('');
    setIsAiLoading(true);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: promptToSend,
          history: chatMessages.slice(-6).map((m) => ({ role: m.role, content: m.content })),
        }),
      });

      const data = await res.json();
      if (data.success) {
        const botMsg: ChatMessage = {
          id: 'bot_' + Date.now(),
          role: 'assistant',
          content: data.reply,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          toolInvocations: data.toolInvocations,
          pendingAction: data.pendingAction,
        };
        setChatMessages((prev) => [...prev, botMsg]);
        if (data.kpis) setKpis(data.kpis);
        fetchData(); // Refresh table & logs
      } else {
        showToast('AI request failed: ' + (data.error || 'Unknown error'));
      }
    } catch (e: any) {
      showToast('Network error contacting Gemini AI service');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Execute Pending AI Proposal
  const handleExecutePendingAction = async (action: NonNullable<ChatMessage['pendingAction']>) => {
    setIsAiLoading(true);
    try {
      const res = await fetch('/api/ai/execute-action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action_type: action.type,
          payload: action.payload,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message);
        setChatMessages((prev) => [
          ...prev,
          {
            id: 'bot_act_' + Date.now(),
            role: 'assistant',
            content: `✅ **Executed Action:** ${data.message}`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          },
        ]);
        fetchData();
      } else {
        showToast('Execution error: ' + data.error);
      }
    } catch (e: any) {
      showToast('Action execution failed');
    } finally {
      setIsAiLoading(false);
    }
  };

  // Send Reminder with Discount
  const handleSendDiscountReminder = async () => {
    if (!selectedInvoiceForDiscount) return;
    try {
      const res = await fetch('/api/paypal/send-discount', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoice_id: selectedInvoiceForDiscount.id,
          discount_percentage: discountPercent,
          custom_note: customDiscountNote || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Sent ${discountPercent}% discount reminder to ${selectedInvoiceForDiscount.client_email}`);
        setDiscountModalOpen(false);
        fetchData();
      } else {
        showToast('Failed to send reminder: ' + data.error);
      }
    } catch (e) {
      showToast('Network error');
    }
  };

  // Simulate PayPal Webhook
  const handleTriggerWebhook = async () => {
    try {
      const res = await fetch('/api/paypal/simulate-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event_type: selectedWebhookEvent,
          invoice_id: targetInvoiceForWebhook || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`⚡ Webhook Triggered: ${selectedWebhookEvent}`);
        setWebhookModalOpen(false);
        fetchData();
      }
    } catch (e) {
      showToast('Webhook trigger failed');
    }
  };

  // Trigger Payouts from Studio
  const handleTriggerPayoutStudio = async () => {
    const totalPercentage = collaborators.reduce((s, c) => s + c.percentage, 0);
    if (totalPercentage !== 100) {
      showToast(`Total percentage must equal 100% (currently ${totalPercentage}%)`);
      return;
    }

    setIsExecutingPayout(true);
    setPayoutSuccessMessage(null);
    try {
      const res = await fetch('/api/paypal/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          total_amount: splitTotal,
          collaborators: collaborators,
          currency: 'USD',
          note: 'PayPilot AI Revenue Split Disbursement',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPayoutSuccessMessage(`PayPal Payouts Batch ${data.batch.batch_id} successfully created! Total $${splitTotal.toLocaleString()} disbursed.`);
        showToast(`Payout Disbursed via PayPal Payouts API!`);
        fetchData();
      } else {
        showToast('Payout error: ' + data.error);
      }
    } catch (e) {
      showToast('Network error triggering payout');
    } finally {
      setIsExecutingPayout(false);
    }
  };

  // Filtered Invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.client_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.invoice_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.client_email.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'ALL' || inv.status === statusFilter;
    const matchesRisk =
      riskFilter === 'ALL' ||
      (riskFilter === 'HIGH' && inv.churn_risk >= 70) ||
      (riskFilter === 'MEDIUM' && inv.churn_risk >= 40 && inv.churn_risk < 70) ||
      (riskFilter === 'LOW' && inv.churn_risk < 40);

    return matchesSearch && matchesStatus && matchesRisk;
  });

  return (
    <div className="min-h-screen bg-[#050B14] text-slate-100 flex flex-col font-sans">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-4 right-4 z-50 bg-[#0B1528] border border-[#0070BA] text-white px-4 py-3 rounded-xl shadow-2xl flex items-center space-x-3 transition-all">
          <Zap className="w-5 h-5 text-[#00CFD5] animate-pulse" />
          <span className="text-sm font-medium">{toastMessage}</span>
          <button onClick={() => setToastMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Navigation Bar */}
      <header className="border-b border-[#0F1E36] bg-[#070E1B]/90 backdrop-blur sticky top-0 z-30 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#003087] via-[#0070BA] to-[#00CFD5] p-0.5 flex items-center justify-center shadow-lg shadow-blue-900/30">
            <div className="w-full h-full bg-[#070E1B] rounded-[10px] flex items-center justify-center">
              <span className="font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-[#0070BA] to-[#00CFD5] text-lg tracking-wider">
                P
              </span>
            </div>
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="font-bold text-lg tracking-tight text-white flex items-center">
                PayPilot <span className="text-[#00CFD5] ml-1">AI</span>
              </h1>
              <span className="bg-[#003087]/50 text-[#00CFD5] text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-full border border-[#0070BA]/40">
                PayPal Sandbox v2
              </span>
            </div>
            <p className="text-xs text-slate-400">Smart Invoice & Revenue Copilot • PayPal AI Hackathon</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Mode Pill */}
          <div className="hidden md:flex items-center space-x-2 bg-[#0B1528] border border-[#162746] px-3 py-1.5 rounded-lg text-xs">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300">
              {sandboxMode.usingSimulator ? 'PayPal Sandbox Simulator' : 'Live PayPal Sandbox'}
            </span>
            <span className="text-[10px] text-slate-500">REST API v2</span>
          </div>

          {/* Quick Actions */}
          <button
            onClick={() => setWebhookModalOpen(true)}
            className="flex items-center space-x-1.5 px-3 py-1.5 bg-[#0F1E36] hover:bg-[#162746] text-xs font-medium text-slate-200 border border-[#1E3A66] rounded-lg transition"
            title="Simulate incoming PayPal Webhook (e.g. INVOICE.PAID)"
          >
            <Webhook className="w-3.5 h-3.5 text-[#00CFD5]" />
            <span className="hidden sm:inline">Simulate Webhook</span>
          </button>

          <button
            onClick={() => setCreateInvoiceModalOpen(true)}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-gradient-to-r from-[#0070BA] to-[#00457C] hover:from-[#0082D9] hover:to-[#005599] text-xs font-semibold text-white rounded-lg shadow-md transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Draft Invoice</span>
          </button>

          {/* AI Drawer Toggle */}
          <button
            onClick={() => setIsCopilotOpen(!isCopilotOpen)}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
              isCopilotOpen
                ? 'bg-[#0070BA]/20 border-[#0070BA] text-[#00CFD5]'
                : 'bg-[#0B1528] border-[#162746] text-slate-300 hover:text-white'
            }`}
          >
            <Bot className="w-4 h-4 text-[#00CFD5]" />
            <span>AI Copilot</span>
          </button>

          {/* Terminal Toggle */}
          <button
            onClick={() => setIsTerminalOpen(!isTerminalOpen)}
            className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs border font-mono transition ${
              isTerminalOpen
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-400'
                : 'bg-[#0B1528] border-[#162746] text-slate-400 hover:text-slate-200'
            }`}
            title="PayPal Sandbox Debugger Terminal"
          >
            <Terminal className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logs</span>
            <span className="bg-[#162746] text-slate-300 text-[10px] px-1.5 py-0.2 rounded-full">
              {logs.length}
            </span>
          </button>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left & Center Main Dashboard */}
        <main className="flex-1 overflow-y-auto px-6 py-6 space-y-6 pb-24">
          {/* KPI Header Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Revenue */}
            <div className="bg-[#0B1528] border border-[#162746] rounded-xl p-4 relative overflow-hidden group hover:border-[#0070BA]/60 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Settled Revenue
                </span>
                <div className="p-2 bg-emerald-950/50 border border-emerald-500/30 rounded-lg text-emerald-400">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline space-x-2">
                <span className="text-2xl font-bold text-white tracking-tight">
                  ${kpis.total_revenue?.toLocaleString()}
                </span>
                <span className="text-xs text-emerald-400 font-semibold flex items-center">
                  +18.4%
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                <span>{kpis.paid_invoices_count} Paid via PayPal</span>
                <span className="text-slate-500 font-mono">USD</span>
              </div>
            </div>

            {/* Pending Receivables */}
            <div className="bg-[#0B1528] border border-[#162746] rounded-xl p-4 relative overflow-hidden group hover:border-[#0070BA]/60 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  Pending Receivables
                </span>
                <div className="p-2 bg-blue-950/50 border border-blue-500/30 rounded-lg text-[#00CFD5]">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline space-x-2">
                <span className="text-2xl font-bold text-white tracking-tight">
                  ${kpis.pending_receivables?.toLocaleString()}
                </span>
                <span className="text-xs text-slate-400 font-medium">
                  {kpis.total_invoices_count - kpis.paid_invoices_count - kpis.overdue_invoices_count} pending
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                <span>Avg Settlement: {kpis.avg_days_to_settle}</span>
                <span className="text-blue-400 font-medium">On Track</span>
              </div>
            </div>

            {/* Churn Risk Capital */}
            <div className="bg-[#0B1528] border border-[#162746] rounded-xl p-4 relative overflow-hidden group hover:border-rose-500/50 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  At-Risk Overdue Capital
                </span>
                <div className="p-2 bg-rose-950/50 border border-rose-500/40 rounded-lg text-rose-400">
                  <ShieldAlert className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline space-x-2">
                <span className="text-2xl font-bold text-rose-300 tracking-tight">
                  ${kpis.at_risk_overdue?.toLocaleString()}
                </span>
                <span className="text-xs bg-rose-950 text-rose-400 border border-rose-800/60 px-1.5 py-0.5 rounded font-semibold">
                  {kpis.high_risk_clients_count} Alert
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                <span>{kpis.overdue_invoices_count} Overdue Invoices</span>
                <span className="text-rose-400">Action Required</span>
              </div>
            </div>

            {/* AI Recovered Capital */}
            <div className="bg-[#0B1528] border border-[#162746] rounded-xl p-4 relative overflow-hidden group hover:border-[#00CFD5]/50 transition">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
                  AI Recovered & Retained
                </span>
                <div className="p-2 bg-cyan-950/50 border border-cyan-500/30 rounded-lg text-[#00CFD5]">
                  <Zap className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-2 flex items-baseline space-x-2">
                <span className="text-2xl font-bold text-[#00CFD5] tracking-tight">
                  ${kpis.recovered_via_ai?.toLocaleString()}
                </span>
                <span className="text-xs text-cyan-400 font-medium">Saved</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                <span>Retention Rate: {kpis.churn_prevention_rate}</span>
                <span className="text-[#00CFD5]">PayPal Remind</span>
              </div>
            </div>
          </div>

          {/* AI Autonomous Strategy Banner */}
          <div className="bg-gradient-to-r from-[#003087]/30 via-[#071329] to-[#0B1528] border border-[#0070BA]/40 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-[#0070BA]/20 rounded-lg border border-[#0070BA]/40 text-[#00CFD5]">
                <Bot className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span>PayPilot AI Cashflow Intelligence</span>
                  <span className="text-[10px] bg-rose-950 text-rose-300 border border-rose-800/60 px-2 py-0.2 rounded-full font-mono">
                    3 High-Risk Invoices Detected
                  </span>
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Overdue invoices at Acme Cloud & HyperGrowth have an 88%+ churn probability. Dispatching 15% early-settlement offers secures $9,095 cash within 48h.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0">
              <button
                onClick={() => handleSendMessage('Analyze high churn risk clients and propose early settlement discount strategy')}
                className="px-3.5 py-1.5 bg-[#0070BA] hover:bg-[#0082D9] text-xs font-semibold text-white rounded-lg transition shadow flex items-center space-x-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Run AI Strategy</span>
              </button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="border-b border-[#162746] flex items-center justify-between">
            <div className="flex space-x-6 text-sm font-medium">
              <button
                onClick={() => setActiveTab('invoices')}
                className={`pb-3 flex items-center space-x-2 border-b-2 transition ${
                  activeTab === 'invoices'
                    ? 'border-[#0070BA] text-white font-semibold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Receipt className="w-4 h-4" />
                <span>Invoices & Churn Matrix</span>
                <span className="bg-[#162746] text-xs text-slate-300 px-2 py-0.5 rounded-full">
                  {invoices.length}
                </span>
              </button>

              <button
                onClick={() => setActiveTab('splits')}
                className={`pb-3 flex items-center space-x-2 border-b-2 transition ${
                  activeTab === 'splits'
                    ? 'border-[#0070BA] text-white font-semibold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-4 h-4" />
                <span>Revenue Split & Payouts Studio</span>
                <span className="bg-emerald-950/60 text-emerald-400 text-xs px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Payouts API
                </span>
              </button>

              <button
                onClick={() => setActiveTab('webhooks')}
                className={`pb-3 flex items-center space-x-2 border-b-2 transition ${
                  activeTab === 'webhooks'
                    ? 'border-[#0070BA] text-white font-semibold'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>Live Webhook Events</span>
              </button>
            </div>

            <button
              onClick={fetchData}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-[#0F1E36] transition"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {/* TAB 1: Invoices & Churn Intelligence Matrix */}
          {activeTab === 'invoices' && (
            <div className="space-y-4">
              {/* Filter & Search Bar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-[#0B1528] p-3 rounded-xl border border-[#162746]">
                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search client, email, or invoice #..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#070E1B] border border-[#162746] rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0070BA]"
                  />
                </div>

                <div className="flex items-center space-x-2 w-full sm:w-auto justify-end overflow-x-auto">
                  <span className="text-xs text-slate-400 flex items-center gap-1">
                    <Filter className="w-3.5 h-3.5" /> Status:
                  </span>
                  <select
                    value={statusFilter}
                    onChange={(e: any) => setStatusFilter(e.target.value)}
                    className="bg-[#070E1B] border border-[#162746] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#0070BA]"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="OVERDUE">Overdue Only</option>
                    <option value="SENT">Pending (Sent)</option>
                    <option value="PAID">Paid</option>
                  </select>

                  <span className="text-xs text-slate-400 ml-2">Risk:</span>
                  <select
                    value={riskFilter}
                    onChange={(e: any) => setRiskFilter(e.target.value)}
                    className="bg-[#070E1B] border border-[#162746] rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-[#0070BA]"
                  >
                    <option value="ALL">All Risk Levels</option>
                    <option value="HIGH">High Risk (≥70%)</option>
                    <option value="MEDIUM">Medium Risk (40-69%)</option>
                    <option value="LOW">Low Risk (&lt;40%)</option>
                  </select>
                </div>
              </div>

              {/* Data Table */}
              <div className="bg-[#0B1528] border border-[#162746] rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#070E1B] text-slate-400 font-semibold border-b border-[#162746] uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="px-4 py-3">Client & Scope</th>
                        <th className="px-4 py-3">Invoice Details</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Churn Risk Score</th>
                        <th className="px-4 py-3 text-right">Quick Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#162746]/60">
                      {filteredInvoices.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                            No invoices match current filter criteria.
                          </td>
                        </tr>
                      ) : (
                        filteredInvoices.map((inv) => (
                          <tr key={inv.id} className="hover:bg-[#0F1E36]/50 transition group">
                            {/* Client & Scope */}
                            <td className="px-4 py-3.5">
                              <div className="flex items-center space-x-3">
                                <div className="w-8 h-8 rounded-lg bg-[#0F1E36] border border-[#162746] flex items-center justify-center font-bold text-slate-300">
                                  {inv.client_name.charAt(0)}
                                </div>
                                <div>
                                  <div className="font-semibold text-white group-hover:text-[#00CFD5] transition">
                                    {inv.client_name}
                                  </div>
                                  <div className="text-[11px] text-slate-400 font-mono">
                                    {inv.client_email}
                                  </div>
                                </div>
                              </div>
                            </td>

                            {/* Invoice Details */}
                            <td className="px-4 py-3.5">
                              <div className="font-mono text-slate-200">{inv.invoice_number}</div>
                              <div className="text-[11px] text-slate-400 flex items-center space-x-1 mt-0.5">
                                <span>Due: {inv.due_date}</span>
                                {inv.days_overdue > 0 && (
                                  <span className="text-rose-400 font-semibold">
                                    ({inv.days_overdue}d late)
                                  </span>
                                )}
                              </div>
                            </td>

                            {/* Amount */}
                            <td className="px-4 py-3.5">
                              <div className="font-semibold text-white">
                                ${inv.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                              </div>
                              {inv.discount_applied > 0 && (
                                <div className="text-[10px] text-emerald-400 font-medium">
                                  {inv.discount_applied}% early discount applied
                                </div>
                              )}
                            </td>

                            {/* Status */}
                            <td className="px-4 py-3.5">
                              {inv.status === 'PAID' && (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-500/30">
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>Paid</span>
                                </span>
                              )}
                              {inv.status === 'OVERDUE' && (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-rose-950/60 text-rose-400 border border-rose-500/40">
                                  <AlertCircle className="w-3 h-3" />
                                  <span>Overdue</span>
                                </span>
                              )}
                              {inv.status === 'SENT' && (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-950/60 text-[#00CFD5] border border-blue-500/30">
                                  <Clock className="w-3 h-3" />
                                  <span>Pending</span>
                                </span>
                              )}
                              {inv.status === 'DRAFT' && (
                                <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-800 text-slate-300">
                                  <span>Draft</span>
                                </span>
                              )}
                            </td>

                            {/* Churn Risk */}
                            <td className="px-4 py-3.5">
                              <div className="flex items-center space-x-2">
                                <div className="w-16 bg-[#070E1B] rounded-full h-2 overflow-hidden border border-[#162746]">
                                  <div
                                    className={`h-full rounded-full ${
                                      inv.churn_risk >= 70
                                        ? 'bg-rose-500'
                                        : inv.churn_risk >= 40
                                        ? 'bg-amber-500'
                                        : 'bg-emerald-500'
                                    }`}
                                    style={{ width: `${inv.churn_risk}%` }}
                                  />
                                </div>
                                <span
                                  className={`font-semibold font-mono text-[11px] ${
                                    inv.churn_risk >= 70
                                      ? 'text-rose-400'
                                      : inv.churn_risk >= 40
                                      ? 'text-amber-400'
                                      : 'text-emerald-400'
                                  }`}
                                >
                                  {inv.churn_risk}%
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-500 block mt-0.5">
                                {inv.churn_risk >= 70
                                  ? 'High risk of non-payment'
                                  : inv.churn_risk >= 40
                                  ? 'Medium retention risk'
                                  : 'Healthy relationship'}
                              </span>
                            </td>

                            {/* Quick Actions */}
                            <td className="px-4 py-3.5 text-right space-x-2">
                              {inv.status === 'OVERDUE' ? (
                                <>
                                  <button
                                    onClick={() => {
                                      setSelectedInvoiceForDiscount(inv);
                                      setDiscountPercent(15);
                                      setDiscountModalOpen(true);
                                    }}
                                    className="px-2.5 py-1 bg-gradient-to-r from-[#003087] to-[#0070BA] hover:from-[#0040A8] hover:to-[#0082D9] text-white text-[11px] font-semibold rounded-lg shadow transition"
                                  >
                                    Offer 15% Discount
                                  </button>
                                  <button
                                    onClick={() => {
                                      handleSendMessage(`Send standard overdue payment reminder to ${inv.client_name} for invoice ${inv.invoice_number}`);
                                    }}
                                    className="px-2 py-1 bg-[#0F1E36] hover:bg-[#162746] text-slate-200 text-[11px] font-medium rounded-lg border border-[#1E3A66] transition"
                                    title="Send reminder via AI"
                                  >
                                    Remind
                                  </button>
                                </>
                              ) : inv.status === 'PAID' ? (
                                <a
                                  href={inv.paypal_payment_link || '#'}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center space-x-1 text-slate-400 hover:text-[#00CFD5] text-[11px] font-medium transition"
                                >
                                  <span>PayPal Receipt</span>
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              ) : (
                                <button
                                  onClick={() => {
                                    handleSendMessage(`Send reminder for pending invoice ${inv.invoice_number} to ${inv.client_name}`);
                                  }}
                                  className="px-2.5 py-1 bg-[#0F1E36] hover:bg-[#162746] text-slate-200 text-[11px] font-medium rounded-lg border border-[#1E3A66] transition"
                                >
                                  Send Nudge
                                </button>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: Revenue Split & Collaborator Payouts Studio */}
          {activeTab === 'splits' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Split Configurator */}
              <div className="lg:col-span-2 bg-[#0B1528] border border-[#162746] rounded-xl p-5 space-y-5">
                <div className="flex items-center justify-between border-b border-[#162746] pb-4">
                  <div>
                    <h3 className="font-bold text-white text-base flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#00CFD5]" />
                      PayPal Payouts Revenue Allocator
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Distribute project earnings to freelancers & team members via PayPal Payouts API v1.
                    </p>
                  </div>
                  <span className="text-xs bg-emerald-950 text-emerald-400 border border-emerald-500/30 px-2.5 py-1 rounded-full font-mono">
                    Batch Mode
                  </span>
                </div>

                {/* Total Budget Input */}
                <div className="bg-[#070E1B] p-4 rounded-xl border border-[#162746] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <label className="text-xs text-slate-400 font-medium">Total Project Revenue to Disburse</label>
                    <div className="flex items-center space-x-2 mt-1">
                      <DollarSign className="w-5 h-5 text-emerald-400" />
                      <input
                        type="number"
                        value={splitTotal}
                        onChange={(e) => setSplitTotal(Math.max(10, Number(e.target.value)))}
                        className="bg-transparent text-xl font-bold text-white w-36 focus:outline-none focus:border-b border-[#0070BA]"
                      />
                      <span className="text-xs text-slate-500 font-mono">USD</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-slate-400">PayPal Fee Est. ($0.25/item):</span>
                    <div className="text-sm font-semibold text-slate-300 font-mono">
                      ${(collaborators.length * 0.25).toFixed(2)} USD
                    </div>
                  </div>
                </div>

                {/* Collaborators List */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
                    <span>Collaborator & PayPal Email</span>
                    <span>Allocation Percentage & Payout</span>
                  </div>

                  {collaborators.map((c, idx) => {
                    const share = Number(((splitTotal * c.percentage) / 100).toFixed(2));
                    return (
                      <div
                        key={idx}
                        className="bg-[#070E1B] border border-[#162746] rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <span className="font-semibold text-sm text-white">{c.name}</span>
                            <span className="text-[10px] bg-[#0F1E36] text-slate-300 px-2 py-0.5 rounded border border-[#1E3A66]">
                              {c.role}
                            </span>
                          </div>
                          <div className="text-xs text-slate-400 font-mono">{c.email}</div>
                        </div>

                        <div className="flex items-center space-x-4 w-full sm:w-auto justify-between sm:justify-end">
                          <div className="flex items-center space-x-1.5">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={c.percentage}
                              onChange={(e) => {
                                const newCollabs = [...collaborators];
                                newCollabs[idx].percentage = Number(e.target.value);
                                setCollaborators(newCollabs);
                              }}
                              className="w-16 bg-[#0B1528] border border-[#162746] rounded px-2 py-1 text-xs text-right text-white font-mono"
                            />
                            <span className="text-xs text-slate-400">%</span>
                          </div>
                          <div className="text-right min-w-[90px]">
                            <span className="text-sm font-bold text-emerald-400 font-mono">
                              ${share.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Status Bar & Trigger */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-[#162746]">
                  <div className="text-xs">
                    <span className="text-slate-400">Total Allocation: </span>
                    <span
                      className={`font-bold font-mono ${
                        collaborators.reduce((s, c) => s + c.percentage, 0) === 100
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {collaborators.reduce((s, c) => s + c.percentage, 0)}%
                    </span>
                    <span className="text-slate-500 ml-1">
                      {collaborators.reduce((s, c) => s + c.percentage, 0) === 100
                        ? '(Balanced)'
                        : '(Must equal 100%)'}
                    </span>
                  </div>

                  <button
                    disabled={isExecutingPayout || collaborators.reduce((s, c) => s + c.percentage, 0) !== 100}
                    onClick={handleTriggerPayoutStudio}
                    className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-500 hover:to-teal-600 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-lg shadow-emerald-900/30 transition flex items-center justify-center space-x-2"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{isExecutingPayout ? 'Processing via PayPal...' : 'Trigger PayPal Payouts Batch'}</span>
                  </button>
                </div>

                {payoutSuccessMessage && (
                  <div className="p-3 bg-emerald-950/70 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{payoutSuccessMessage}</span>
                  </div>
                )}
              </div>

              {/* Payout Architecture Info */}
              <div className="bg-[#0B1528] border border-[#162746] rounded-xl p-5 space-y-4">
                <h4 className="font-bold text-white text-sm flex items-center gap-2">
                  <CreditCard className="w-4 h-4 text-[#00CFD5]" />
                  PayPal Payouts REST API v1
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  PayPilot AI constructs compliant batches for the <code className="text-[#00CFD5]">/v1/payments/payouts</code> endpoint. Recipients receive instant balance credits into their PayPal accounts.
                </p>

                <div className="space-y-2 text-xs">
                  <div className="p-2.5 bg-[#070E1B] rounded-lg border border-[#162746]">
                    <span className="text-slate-400 block font-medium">Batch Recipient Type</span>
                    <span className="text-slate-200 font-mono">EMAIL (PayPal Account ID)</span>
                  </div>
                  <div className="p-2.5 bg-[#070E1B] rounded-lg border border-[#162746]">
                    <span className="text-slate-400 block font-medium">Currency</span>
                    <span className="text-slate-200 font-mono">USD ($)</span>
                  </div>
                  <div className="p-2.5 bg-[#070E1B] rounded-lg border border-[#162746]">
                    <span className="text-slate-400 block font-medium">AI Audit Trail</span>
                    <span className="text-slate-200">Automatically logged to Debugger</span>
                  </div>
                </div>

                <div className="p-3 bg-[#0F1E36] rounded-xl border border-[#1E3A66] text-xs">
                  <span className="font-semibold text-[#00CFD5] block mb-1">🤖 AI Copilot Split Prompt:</span>
                  <p className="text-slate-300 italic">
                    "Calculate 50/30/20 revenue split for $15,000 design project between Alex, Sarah, and Marcus."
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: Webhook Events Stream */}
          {activeTab === 'webhooks' && (
            <div className="bg-[#0B1528] border border-[#162746] rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-[#162746] pb-3">
                <div>
                  <h3 className="font-bold text-white text-base flex items-center gap-2">
                    <Webhook className="w-4 h-4 text-[#00CFD5]" />
                    PayPal Webhook Listener & Event Log
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Endpoint: <code className="text-[#00CFD5]">POST /api/paypal/webhook</code> listens for PayPal event signatures.
                  </p>
                </div>
                <button
                  onClick={() => setWebhookModalOpen(true)}
                  className="px-3 py-1.5 bg-[#0070BA] hover:bg-[#0082D9] text-xs font-semibold text-white rounded-lg transition"
                >
                  + Trigger Simulated Webhook
                </button>
              </div>

              <div className="space-y-2">
                <div className="p-4 bg-[#070E1B] rounded-xl border border-[#162746] text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400" />
                      INVOICING.INVOICE.PAID Listener
                    </span>
                    <span className="text-slate-400 font-mono">Signature: HMAC-SHA256</span>
                  </div>
                  <p className="text-slate-400">
                    When an invoice is settled by the client on PayPal, the webhook captures the event, updates the invoice status to <span className="text-emerald-400 font-semibold">PAID</span>, zeroes out the churn risk score, and increments settled cashflow.
                  </p>
                </div>

                <div className="p-4 bg-[#070E1B] rounded-xl border border-[#162746] text-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-white flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-blue-400" />
                      PAYMENT.PAYOUTSBATCH.SUCCESS Listener
                    </span>
                    <span className="text-slate-400 font-mono">Resource: payouts</span>
                  </div>
                  <p className="text-slate-400">
                    Tracks automated partner distributions and dispatches receipts to collaborator emails.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>

        {/* AI Copilot Drawer / Sidebar */}
        <aside
          className={`${
            isCopilotOpen ? 'w-96 border-l' : 'w-0 border-l-0 overflow-hidden'
          } border-[#162746] bg-[#070E1B] flex flex-col transition-all duration-300 z-20 shrink-0`}
        >
          {/* Copilot Header */}
          <div className="px-4 py-3.5 border-b border-[#162746] flex items-center justify-between bg-[#0B1528]">
            <div className="flex items-center space-x-2">
              <div className="p-1.5 bg-[#0070BA]/20 rounded-lg text-[#00CFD5]">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-xs text-white">PayPilot Copilot</h3>
                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Gemini 3.8 Flash • Function Calling
                </span>
              </div>
            </div>
            <button
              onClick={() => setIsCopilotOpen(false)}
              className="p-1 text-slate-400 hover:text-white rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Action Suggestion Chips */}
          <div className="p-3 bg-[#091224] border-b border-[#162746] space-y-1.5">
            <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">
              Suggested AI Actions
            </span>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => handleSendMessage('Find all high churn risk overdue invoices')}
                className="text-[11px] bg-[#0F1E36] hover:bg-[#162746] text-slate-200 border border-[#1E3A66] px-2.5 py-1 rounded-lg text-left transition"
              >
                🚨 Find high churn risk
              </button>
              <button
                onClick={() => handleSendMessage('Send 15% discount reminder to Acme Cloud Dynamics')}
                className="text-[11px] bg-[#0F1E36] hover:bg-[#162746] text-slate-200 border border-[#1E3A66] px-2.5 py-1 rounded-lg text-left transition"
              >
                ⚡ 15% discount to Acme
              </button>
              <button
                onClick={() => handleSendMessage('Draft a $3,500 PayPal invoice for NextGen Media client')}
                className="text-[11px] bg-[#0F1E36] hover:bg-[#162746] text-slate-200 border border-[#1E3A66] px-2.5 py-1 rounded-lg text-left transition"
              >
                📝 Draft $3,500 invoice
              </button>
              <button
                onClick={() => handleSendMessage('Calculate 50/30/20 revenue split for $10,000 project')}
                className="text-[11px] bg-[#0F1E36] hover:bg-[#162746] text-slate-200 border border-[#1E3A66] px-2.5 py-1 rounded-lg text-left transition"
              >
                💸 50/30/20 revenue split
              </button>
            </div>
          </div>

          {/* Chat Message Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
            {chatMessages.map((msg) => (
              <div
                key={msg.id}
                className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
              >
                <div className="flex items-center space-x-1.5 mb-1 px-1">
                  <span className="text-[10px] text-slate-400">{msg.role === 'user' ? 'You' : 'PayPilot AI'}</span>
                  <span className="text-[9px] text-slate-500 font-mono">{msg.timestamp}</span>
                </div>

                <div
                  className={`p-3.5 rounded-2xl max-w-[92%] leading-relaxed ${
                    msg.role === 'user'
                      ? 'bg-gradient-to-r from-[#003087] to-[#0070BA] text-white rounded-tr-none shadow'
                      : 'bg-[#0B1528] border border-[#162746] text-slate-200 rounded-tl-none shadow-sm'
                  }`}
                >
                  {/* Tool execution badge if present */}
                  {msg.toolInvocations && msg.toolInvocations.length > 0 && (
                    <div className="mb-2 space-y-1">
                      {msg.toolInvocations.map((tool, idx) => (
                        <div
                          key={idx}
                          className="bg-[#070E1B] border border-[#0070BA]/40 text-[#00CFD5] text-[10px] px-2 py-0.5 rounded font-mono flex items-center gap-1.5"
                        >
                          <Zap className="w-2.5 h-2.5" />
                          <span>Tool: {tool.name}()</span>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="whitespace-pre-wrap">{msg.content}</div>

                  {/* Pending Action Confirmation Card */}
                  {msg.pendingAction && (
                    <div className="mt-3 p-3 bg-[#070E1B] rounded-xl border border-[#0070BA]/50 space-y-2">
                      <div className="flex items-center space-x-2 text-[#00CFD5] font-semibold text-xs">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>{msg.pendingAction.title}</span>
                      </div>
                      <p className="text-[11px] text-slate-300">{msg.pendingAction.description}</p>
                      <div className="pt-1 flex items-center space-x-2">
                        <button
                          onClick={() => handleExecutePendingAction(msg.pendingAction!)}
                          className="flex-1 py-1.5 bg-[#0070BA] hover:bg-[#0082D9] text-white font-semibold rounded-lg text-center transition text-xs shadow"
                        >
                          Confirm & Dispatch
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isAiLoading && (
              <div className="flex items-center space-x-2 text-slate-400 text-xs p-2">
                <div className="w-2 h-2 rounded-full bg-[#00CFD5] animate-ping" />
                <span>Gemini 3.8 Flash is reasoning & function calling...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="p-3 border-t border-[#162746] bg-[#0B1528]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center space-x-2"
            >
              <input
                type="text"
                placeholder="Ask PayPilot (e.g. 'Draft invoice' or 'Split revenue')..."
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                disabled={isAiLoading}
                className="flex-1 bg-[#070E1B] border border-[#162746] rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0070BA]"
              />
              <button
                type="submit"
                disabled={isAiLoading || !userInput.trim()}
                className="p-2 bg-[#0070BA] hover:bg-[#0082D9] disabled:opacity-40 text-white rounded-xl transition"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </div>
        </aside>
      </div>

      {/* Live PayPal Sandbox Debugger / Terminal (Collapsible Bottom Drawer) */}
      <footer className="border-t border-[#162746] bg-[#070E1B] fixed bottom-0 left-0 right-0 z-40">
        {/* Toggle Bar */}
        <div
          onClick={() => setIsTerminalOpen(!isTerminalOpen)}
          className="px-6 py-2 bg-[#091224] hover:bg-[#0B1528] cursor-pointer flex items-center justify-between text-xs select-none border-b border-[#162746]"
        >
          <div className="flex items-center space-x-3">
            <Terminal className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-slate-200 font-mono">
              PayPal Sandbox REST API Debugger Terminal
            </span>
            <span className="bg-emerald-950 text-emerald-400 border border-emerald-500/30 text-[10px] px-2 py-0.2 rounded font-mono">
              Live Stream ({logs.length} calls)
            </span>
          </div>
          <div className="flex items-center space-x-2 text-slate-400">
            <span className="text-[11px]">Click to {isTerminalOpen ? 'minimize' : 'expand'} inspector</span>
            {isTerminalOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </div>
        </div>

        {/* Terminal Content Body */}
        {isTerminalOpen && (
          <div className="h-72 grid grid-cols-1 md:grid-cols-2 divide-x divide-[#162746] text-xs font-mono bg-[#050B14]">
            {/* Logs List */}
            <div className="overflow-y-auto p-3 space-y-1.5 divide-y divide-[#162746]/40">
              {logs.length === 0 ? (
                <div className="text-slate-500 p-4 text-center">No API calls recorded yet.</div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    onClick={() => setSelectedLog(log)}
                    className={`p-2 rounded cursor-pointer transition flex items-center justify-between ${
                      selectedLog?.id === log.id ? 'bg-[#0F1E36] border border-[#0070BA]/50' : 'hover:bg-[#0B1528]'
                    }`}
                  >
                    <div className="flex items-center space-x-2 truncate">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                          log.method === 'POST' ? 'bg-blue-900 text-blue-200' : 'bg-emerald-900 text-emerald-200'
                        }`}
                      >
                        {log.method}
                      </span>
                      <span
                        className={`text-[10px] px-1 rounded ${
                          log.status >= 200 && log.status < 300
                            ? 'text-emerald-400 bg-emerald-950'
                            : 'text-rose-400 bg-rose-950'
                        }`}
                      >
                        {log.status}
                      </span>
                      <span className="text-slate-300 truncate">{log.url}</span>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0 text-[10px] text-slate-500">
                      <span>{log.latency_ms}ms</span>
                      {log.is_simulated ? (
                        <span className="text-amber-400 bg-amber-950 px-1 rounded">SIM</span>
                      ) : (
                        <span className="text-[#00CFD5] bg-blue-950 px-1 rounded">SANDBOX</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Selected Log Inspector */}
            <div className="overflow-y-auto p-3 space-y-3 bg-[#070E1B]">
              {selectedLog ? (
                <>
                  <div className="flex items-center justify-between border-b border-[#162746] pb-2">
                    <div>
                      <span className="text-slate-400 text-[10px] uppercase block">API Transaction</span>
                      <span className="text-emerald-400 font-bold">{selectedLog.summary}</span>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(selectedLog.curl_command);
                        showToast('cURL command copied to clipboard!');
                      }}
                      className="px-2 py-1 bg-[#0F1E36] hover:bg-[#162746] text-slate-200 rounded border border-[#1E3A66] text-[10px] flex items-center space-x-1"
                    >
                      <Copy className="w-3 h-3" />
                      <span>Copy cURL</span>
                    </button>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">
                      Request Payload:
                    </span>
                    <pre className="p-2 bg-[#050B14] rounded border border-[#162746] text-[11px] text-slate-300 overflow-x-auto">
                      {JSON.stringify(selectedLog.request_body, null, 2)}
                    </pre>
                  </div>

                  <div>
                    <span className="text-slate-400 text-[10px] uppercase font-bold block mb-1">
                      PayPal API Response:
                    </span>
                    <pre className="p-2 bg-[#050B14] rounded border border-[#162746] text-[11px] text-[#00CFD5] overflow-x-auto">
                      {JSON.stringify(selectedLog.response_body, null, 2)}
                    </pre>
                  </div>
                </>
              ) : (
                <div className="text-slate-500 p-4 text-center">Select an API call to inspect payloads.</div>
              )}
            </div>
          </div>
        )}
      </footer>

      {/* MODAL 1: Create PayPal Invoice Draft */}
      {createInvoiceModalOpen && (
        <CreateInvoiceModal
          onClose={() => setCreateInvoiceModalOpen(false)}
          onCreated={(newInv) => {
            setCreateInvoiceModalOpen(false);
            showToast(`Invoice ${newInv.invoice_number} created via PayPal Invoicing API!`);
            fetchData();
          }}
        />
      )}

      {/* MODAL 2: Send Churn Prevention Discount Offer */}
      {discountModalOpen && selectedInvoiceForDiscount && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1528] border border-[#162746] rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#162746] pb-3">
              <div>
                <h3 className="font-bold text-base text-white flex items-center gap-2">
                  <Percent className="w-4 h-4 text-[#00CFD5]" />
                  PayPal Early-Settlement Discount
                </h3>
                <p className="text-xs text-slate-400">Incentivize immediate client payment to eliminate churn risk.</p>
              </div>
              <button
                onClick={() => setDiscountModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-[#070E1B] p-3.5 rounded-xl border border-[#162746] space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Target Client:</span>
                <span className="text-white font-semibold">{selectedInvoiceForDiscount.client_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Original Amount:</span>
                <span className="text-slate-300 font-mono">${selectedInvoiceForDiscount.original_amount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Days Overdue:</span>
                <span className="text-rose-400 font-bold">{selectedInvoiceForDiscount.days_overdue} days</span>
              </div>
            </div>

            {/* Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-300 font-medium">Discount Percentage:</span>
                <span className="text-lg font-bold text-[#00CFD5] font-mono">{discountPercent}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="30"
                step="5"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
                className="w-full accent-[#0070BA] cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>5% ($)</span>
                <span>15% (Recommended)</span>
                <span>30% (Max)</span>
              </div>
            </div>

            {/* Net Recovery Calculation */}
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-xs space-y-1">
              <div className="flex justify-between text-slate-300">
                <span>Client Savings:</span>
                <span className="text-emerald-400 font-mono">
                  -${((selectedInvoiceForDiscount.original_amount * discountPercent) / 100).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-white font-bold pt-1 border-t border-emerald-500/20">
                <span>Recoverable Cashflow:</span>
                <span className="text-emerald-400 font-mono text-sm">
                  ${(selectedInvoiceForDiscount.original_amount * (1 - discountPercent / 100)).toFixed(2)} USD
                </span>
              </div>
            </div>

            {/* Note */}
            <div>
              <label className="text-xs text-slate-300 block mb-1">Custom Message (Included in PayPal notification):</label>
              <textarea
                rows={2}
                value={customDiscountNote}
                onChange={(e) => setCustomDiscountNote(e.target.value)}
                placeholder="e.g. Settle within 48 hours to secure this promotional 15% rate..."
                className="w-full bg-[#070E1B] border border-[#162746] rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#0070BA]"
              />
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setDiscountModalOpen(false)}
                className="flex-1 py-2 bg-[#0F1E36] hover:bg-[#162746] text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSendDiscountReminder}
                className="flex-1 py-2 bg-gradient-to-r from-[#003087] to-[#0070BA] hover:from-[#0040A8] hover:to-[#0082D9] text-white text-xs font-bold rounded-xl shadow-lg transition"
              >
                Dispatch via PayPal Remind API
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Simulate Webhook */}
      {webhookModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0B1528] border border-[#162746] rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#162746] pb-3">
              <div className="flex items-center space-x-2">
                <Webhook className="w-5 h-5 text-[#00CFD5]" />
                <h3 className="font-bold text-base text-white">Simulate PayPal Webhook</h3>
              </div>
              <button onClick={() => setWebhookModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Instantly test how PayPilot AI reacts to asynchronous PayPal webhook notifications.
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-300 font-medium block mb-1">Webhook Event Type:</label>
                <select
                  value={selectedWebhookEvent}
                  onChange={(e) => setSelectedWebhookEvent(e.target.value)}
                  className="w-full bg-[#070E1B] border border-[#162746] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#0070BA]"
                >
                  <option value="INVOICING.INVOICE.PAID">INVOICING.INVOICE.PAID (Client Settles Invoice)</option>
                  <option value="PAYMENT.CAPTURE.COMPLETED">PAYMENT.CAPTURE.COMPLETED (Payment Captured)</option>
                  <option value="PAYMENT.PAYOUTSBATCH.SUCCESS">PAYMENT.PAYOUTSBATCH.SUCCESS (Payout Disbursed)</option>
                </select>
              </div>

              <div>
                <label className="text-slate-300 font-medium block mb-1">Target Overdue Invoice:</label>
                <select
                  value={targetInvoiceForWebhook}
                  onChange={(e) => setTargetInvoiceForWebhook(e.target.value)}
                  className="w-full bg-[#070E1B] border border-[#162746] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#0070BA]"
                >
                  <option value="">Auto-select first overdue invoice</option>
                  {invoices.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.client_name} - {i.invoice_number} (${i.amount.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex space-x-3 pt-2">
              <button
                onClick={() => setWebhookModalOpen(false)}
                className="flex-1 py-2 bg-[#0F1E36] hover:bg-[#162746] text-slate-300 text-xs font-semibold rounded-xl transition"
              >
                Cancel
              </button>
              <button
                onClick={handleTriggerWebhook}
                className="flex-1 py-2 bg-[#0070BA] hover:bg-[#0082D9] text-white text-xs font-bold rounded-xl shadow-lg transition"
              >
                Trigger Webhook Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Modal to Draft and Dispatch Invoice via PayPal Invoicing API v2
 */
function CreateInvoiceModal({ onClose, onCreated }: { onClose: () => void; onCreated: (inv: any) => void }) {
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]
  );
  const [lineItems, setLineItems] = useState<InvoiceItem[]>([
    { name: 'Full-Stack Development & AI Integration', quantity: 1, unit_price: 3500 },
  ]);
  const [notes, setNotes] = useState('Payment due via PayPal within 14 days.');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const total = lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0);

  const handleAddItem = () => {
    setLineItems([...lineItems, { name: 'Consulting Support', quantity: 1, unit_price: 500 }]);
  };

  const handleRemoveItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName || !clientEmail) return;

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/paypal/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_name: clientName,
          client_email: clientEmail,
          due_date: dueDate,
          line_items: lineItems,
          notes: notes,
          auto_send: true,
        }),
      });

      const data = await res.json();
      if (data.success) {
        onCreated(data.invoice);
      } else {
        alert(data.error || 'Failed to create invoice');
      }
    } catch (err) {
      alert('Error creating invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0B1528] border border-[#162746] rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between border-b border-[#162746] pb-3">
          <div>
            <h3 className="font-bold text-base text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-[#00CFD5]" />
              New PayPal Invoicing API v2 Draft
            </h3>
            <p className="text-xs text-slate-400">Generates and dispatches an authentic invoice directly to client.</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-slate-300 font-medium block mb-1">Client / Business Name</label>
              <input
                required
                type="text"
                placeholder="e.g. Acme Innovations Corp"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full bg-[#070E1B] border border-[#162746] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#0070BA]"
              />
            </div>
            <div>
              <label className="text-slate-300 font-medium block mb-1">Billing Email (PayPal Account)</label>
              <input
                required
                type="email"
                placeholder="billing@acme.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
                className="w-full bg-[#070E1B] border border-[#162746] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#0070BA]"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-300 font-medium block mb-1">Due Date</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-[#070E1B] border border-[#162746] rounded-xl px-3 py-2 text-white focus:outline-none focus:border-[#0070BA]"
            />
          </div>

          {/* Line Items */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-slate-300 font-medium">Line Items</label>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-[#00CFD5] hover:underline text-[11px] font-semibold"
              >
                + Add Item
              </button>
            </div>

            {lineItems.map((item, idx) => (
              <div key={idx} className="flex items-center space-x-2 bg-[#070E1B] p-2 rounded-xl border border-[#162746]">
                <input
                  type="text"
                  placeholder="Item description"
                  value={item.name}
                  onChange={(e) => {
                    const updated = [...lineItems];
                    updated[idx].name = e.target.value;
                    setLineItems(updated);
                  }}
                  className="flex-1 bg-transparent text-white focus:outline-none text-xs"
                />
                <input
                  type="number"
                  placeholder="Qty"
                  value={item.quantity}
                  onChange={(e) => {
                    const updated = [...lineItems];
                    updated[idx].quantity = Math.max(1, Number(e.target.value));
                    setLineItems(updated);
                  }}
                  className="w-14 bg-[#0B1528] border border-[#162746] rounded px-1.5 py-1 text-center text-white"
                />
                <input
                  type="number"
                  placeholder="Price"
                  value={item.unit_price}
                  onChange={(e) => {
                    const updated = [...lineItems];
                    updated[idx].unit_price = Math.max(0, Number(e.target.value));
                    setLineItems(updated);
                  }}
                  className="w-20 bg-[#0B1528] border border-[#162746] rounded px-1.5 py-1 text-right text-white"
                />
                {lineItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="p-3 bg-[#070E1B] rounded-xl border border-[#162746] flex items-center justify-between text-xs">
            <span className="text-slate-400">Total Invoice Amount:</span>
            <span className="text-emerald-400 font-bold font-mono text-sm">
              ${total.toLocaleString(undefined, { minimumFractionDigits: 2 })} USD
            </span>
          </div>

          <div>
            <label className="text-slate-300 font-medium block mb-1">Notes / Terms</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#070E1B] border border-[#162746] rounded-xl p-2.5 text-white focus:outline-none focus:border-[#0070BA]"
            />
          </div>

          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-[#0F1E36] hover:bg-[#162746] text-slate-300 font-semibold rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2 bg-gradient-to-r from-[#003087] to-[#0070BA] hover:from-[#0040A8] hover:to-[#0082D9] text-white font-bold rounded-xl shadow-lg transition"
            >
              {isSubmitting ? 'Dispatching via PayPal...' : 'Send Invoice via PayPal v2'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
