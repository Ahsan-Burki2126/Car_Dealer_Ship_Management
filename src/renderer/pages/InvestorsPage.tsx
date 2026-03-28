import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import { toast } from "react-toastify";
import {
  FiPlus, FiTrash2, FiEdit2, FiX, FiCheck, FiTrendingUp,
  FiCamera, FiUser, FiDollarSign, FiArrowDownCircle, FiEye, FiChevronDown, FiChevronUp,
} from "react-icons/fi";
import { useSuperadminAuth } from "../components/SuperadminPasswordModal";
import { toFileUrl } from "../utils/filePaths";

interface Investor {
  id: string;
  name: string;
  contact: string;
  investment_amount: number;
  total_withdrawn: number;
  notes: string;
  address: string;
  photo_path: string;
  cnic_photo_front_path: string;
  cnic_photo_back_path: string;
  created_at: string;
}

interface Withdrawal {
  id: string;
  investor_id: string;
  amount: number;
  date: string;
  reason: string;
  notes: string;
  created_at: string;
}

const emptyForm = {
  name: "",
  contact: "",
  investment_amount: "",
  notes: "",
  address: "",
  photo_path: "",
  cnic_photo_front_path: "",
  cnic_photo_back_path: "",
};

const emptyWithdrawal = {
  amount: "",
  date: new Date().toISOString().split("T")[0],
  reason: "",
  notes: "",
};

export default function InvestorsPage() {
  const { user } = useSelector((state: RootState) => state.auth);
  const { requestAuth, PasswordModal } = useSuperadminAuth();
  const [investors, setInvestors] = useState<Investor[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ ...emptyForm });

  // Withdrawal modal
  const [withdrawalInvestor, setWithdrawalInvestor] = useState<Investor | null>(null);
  const [withdrawalForm, setWithdrawalForm] = useState({ ...emptyWithdrawal });
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loadingWithdrawals, setLoadingWithdrawals] = useState(false);

  // Inline expand panel
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [inlineWithdrawals, setInlineWithdrawals] = useState<Record<string, Withdrawal[]>>({});
  const [loadingInline, setLoadingInline] = useState<Record<string, boolean>>({});

  // ROI Calculator
  const [calcProfit, setCalcProfit] = useState("");
  const [calcInvestment, setCalcInvestment] = useState("");
  const [calcResult, setCalcResult] = useState<number | null>(null);

  useEffect(() => {
    loadInvestors();
  }, [user?.id]);

  const loadInvestors = async () => {
    if (!user) return;
    setLoading(true);
    const result = await (window.api as any).getInvestors(user.id);
    if (result.success) setInvestors(result.data || []);
    setLoading(false);
  };

  // ---- Photo upload helpers ----
  const pickPhoto = async (field: keyof typeof form) => {
    const path = await (window.api as any).selectImage();
    if (path) {
      const saved = await (window.api as any).saveImage(path, "investors");
      if (saved?.success) {
        setForm((p) => ({ ...p, [field]: saved.path }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Investor name is required"); return; }
    if (!form.contact.trim()) { toast.error("Contact is required"); return; }
    if (!form.address.trim()) { toast.error("Address is required"); return; }
    const amount = parseFloat(form.investment_amount);
    if (isNaN(amount) || amount < 0) { toast.error("Enter a valid investment amount"); return; }

    const payload = {
      name: form.name.trim(),
      contact: form.contact.trim(),
      investment_amount: amount,
      notes: form.notes.trim(),
      address: form.address.trim(),
      photo_path: form.photo_path,
      cnic_photo_front_path: form.cnic_photo_front_path,
      cnic_photo_back_path: form.cnic_photo_back_path,
    };

    let result;
    if (editingId) {
      result = await (window.api as any).updateInvestor(user!.id, editingId, payload);
    } else {
      result = await (window.api as any).addInvestor(user!.id, payload);
    }

    if (result.success) {
      toast.success(editingId ? "Investor updated" : "Investor added");
      resetForm();
      loadInvestors();
    } else {
      toast.error(result.error || "Operation failed");
    }
  };

  const startEdit = (inv: Investor) => {
    setEditingId(inv.id);
    setForm({
      name: inv.name,
      contact: inv.contact || "",
      investment_amount: String(inv.investment_amount),
      notes: inv.notes || "",
      address: inv.address || "",
      photo_path: inv.photo_path || "",
      cnic_photo_front_path: inv.cnic_photo_front_path || "",
      cnic_photo_back_path: inv.cnic_photo_back_path || "",
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Remove this investor?")) return;
    const result = await (window.api as any).deleteInvestor(user!.id, id);
    if (result.success) {
      toast.success("Investor removed");
      loadInvestors();
    } else {
      toast.error(result.error || "Failed to remove investor");
    }
  };

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
    setShowForm(false);
  };

  // ---- Inline expand ----
  const toggleExpand = async (invId: string) => {
    if (expandedId === invId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(invId);
    if (!inlineWithdrawals[invId]) {
      setLoadingInline((p) => ({ ...p, [invId]: true }));
      const result = await (window.api as any).getInvestorWithdrawals(user!.id, invId);
      if (result.success) setInlineWithdrawals((p) => ({ ...p, [invId]: result.data || [] }));
      setLoadingInline((p) => ({ ...p, [invId]: false }));
    }
  };

  const refreshInline = async (invId: string) => {
    const result = await (window.api as any).getInvestorWithdrawals(user!.id, invId);
    if (result.success) setInlineWithdrawals((p) => ({ ...p, [invId]: result.data || [] }));
  };

  // ---- Withdrawals ----
  const openWithdrawals = async (inv: Investor) => {
    setWithdrawalInvestor(inv);
    setWithdrawalForm({ ...emptyWithdrawal });
    setLoadingWithdrawals(true);
    const result = await (window.api as any).getInvestorWithdrawals(user!.id, inv.id);
    if (result.success) setWithdrawals(result.data || []);
    setLoadingWithdrawals(false);
  };

  const handleAddWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawalInvestor) return;
    const amount = parseFloat(withdrawalForm.amount);
    if (isNaN(amount) || amount <= 0) { toast.error("Enter a valid withdrawal amount"); return; }
    if (!withdrawalForm.reason.trim()) { toast.error("Reason is required"); return; }
    if (!withdrawalForm.date) { toast.error("Date is required"); return; }

    const netInvestment = withdrawalInvestor.investment_amount - withdrawalInvestor.total_withdrawn;
    if (amount > netInvestment) {
      toast.error(`Cannot withdraw more than net investment (PKR ${netInvestment.toLocaleString()})`);
      return;
    }

    const result = await (window.api as any).addInvestorWithdrawal(user!.id, {
      investor_id: withdrawalInvestor.id,
      amount,
      date: withdrawalForm.date,
      reason: withdrawalForm.reason.trim(),
      notes: withdrawalForm.notes.trim(),
    });

    if (result.success) {
      toast.success("Withdrawal recorded");
      setWithdrawalForm({ ...emptyWithdrawal });
      const refreshed = await (window.api as any).getInvestorWithdrawals(user!.id, withdrawalInvestor.id);
      if (refreshed.success) setWithdrawals(refreshed.data || []);
      refreshInline(withdrawalInvestor.id);
      loadInvestors(); // refresh net totals
    } else {
      toast.error(result.error || "Failed to record withdrawal");
    }
  };

  const handleDeleteWithdrawal = async (wId: string) => {
    if (!withdrawalInvestor) return;
    if (!window.confirm("Delete this withdrawal record?")) return;
    const result = await (window.api as any).deleteInvestorWithdrawal(user!.id, wId);
    if (result.success) {
      toast.success("Withdrawal deleted");
      const refreshed = await (window.api as any).getInvestorWithdrawals(user!.id, withdrawalInvestor.id);
      if (refreshed.success) setWithdrawals(refreshed.data || []);
      refreshInline(withdrawalInvestor.id);
      loadInvestors();
    } else {
      toast.error(result.error || "Failed to delete withdrawal");
    }
  };

  const handleCalculate = () => {
    const profit = parseFloat(calcProfit);
    const investment = parseFloat(calcInvestment);
    if (isNaN(profit) || isNaN(investment) || investment === 0) {
      toast.error("Enter valid profit and investment values (investment cannot be zero)");
      return;
    }
    setCalcResult((profit / investment) * 100);
  };

  const fmt = (v: number) => `PKR ${v?.toLocaleString() || "0"}`;
  const totalInvestment = investors.reduce((s, i) => s + i.investment_amount, 0);
  const totalWithdrawn = investors.reduce((s, i) => s + (i.total_withdrawn || 0), 0);
  const netInvestment = totalInvestment - totalWithdrawn;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FiTrendingUp className="text-primary-600" size={24} />
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Investors</h1>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="btn-primary flex items-center gap-2"
        >
          <FiPlus size={16} /> Add Investor
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card text-center">
          <p className="text-3xl font-bold text-primary-600">{investors.length}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total Investors</p>
        </div>
        <div className="card text-center">
          <p className="text-xl font-bold text-blue-600">{fmt(totalInvestment)}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Total Investment</p>
          {totalWithdrawn > 0 && (
            <p className="text-xs text-red-500 mt-0.5">− {fmt(totalWithdrawn)} withdrawn</p>
          )}
        </div>
        <div className="card text-center">
          <p className="text-xl font-bold text-green-600">{fmt(netInvestment)}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Net Investment</p>
        </div>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white text-lg">
              {editingId ? "Edit Investor" : "New Investor"}
            </h3>
            <button onClick={resetForm} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
              <FiX size={18} />
            </button>
          </div>
          <form onSubmit={handleSubmit}>
            {/* Basic info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  className="input-field"
                  placeholder="Investor full name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact *</label>
                <input
                  type="text"
                  value={form.contact}
                  onChange={(e) => setForm((p) => ({ ...p, contact: e.target.value }))}
                  className="input-field"
                  placeholder="Phone / Email"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Investment Amount (PKR) *</label>
                <input
                  type="number"
                  value={form.investment_amount}
                  onChange={(e) => setForm((p) => ({ ...p, investment_amount: e.target.value }))}
                  className="input-field"
                  placeholder="0"
                  min={0}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address *</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
                  className="input-field"
                  placeholder="Full address"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
                <input
                  type="text"
                  value={form.notes}
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  className="input-field"
                  placeholder="Optional notes"
                />
              </div>
            </div>

            {/* Photo uploads */}
            <div className="mt-5">
              <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Photos & Documents</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Investor Photo */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Investor Photo</label>
                  <div
                    className="relative w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden cursor-pointer hover:border-primary-400 transition-colors flex flex-col items-center justify-center gap-1 bg-gray-50 dark:bg-gray-800"
                    onClick={() => pickPhoto("photo_path")}
                  >
                    {form.photo_path ? (
                      <img src={toFileUrl(form.photo_path)} className="absolute inset-0 w-full h-full object-cover" alt="Investor" />
                    ) : (
                      <>
                        <FiUser size={24} className="text-gray-400" />
                        <span className="text-xs text-gray-400">Click to upload</span>
                      </>
                    )}
                    <div className="absolute bottom-1 right-1 bg-white dark:bg-gray-700 rounded-full p-1 shadow">
                      <FiCamera size={12} className="text-gray-600 dark:text-gray-300" />
                    </div>
                  </div>
                </div>

                {/* CNIC Front */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">CNIC Front</label>
                  <div
                    className="relative w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden cursor-pointer hover:border-primary-400 transition-colors flex flex-col items-center justify-center gap-1 bg-gray-50 dark:bg-gray-800"
                    onClick={() => pickPhoto("cnic_photo_front_path")}
                  >
                    {form.cnic_photo_front_path ? (
                      <img src={toFileUrl(form.cnic_photo_front_path)} className="absolute inset-0 w-full h-full object-cover" alt="CNIC Front" />
                    ) : (
                      <>
                        <FiCamera size={24} className="text-gray-400" />
                        <span className="text-xs text-gray-400">Front side</span>
                      </>
                    )}
                    {form.cnic_photo_front_path && (
                      <div className="absolute bottom-1 right-1 bg-white dark:bg-gray-700 rounded-full p-1 shadow">
                        <FiCamera size={12} className="text-gray-600 dark:text-gray-300" />
                      </div>
                    )}
                  </div>
                </div>

                {/* CNIC Back */}
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">CNIC Back</label>
                  <div
                    className="relative w-full h-32 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden cursor-pointer hover:border-primary-400 transition-colors flex flex-col items-center justify-center gap-1 bg-gray-50 dark:bg-gray-800"
                    onClick={() => pickPhoto("cnic_photo_back_path")}
                  >
                    {form.cnic_photo_back_path ? (
                      <img src={toFileUrl(form.cnic_photo_back_path)} className="absolute inset-0 w-full h-full object-cover" alt="CNIC Back" />
                    ) : (
                      <>
                        <FiCamera size={24} className="text-gray-400" />
                        <span className="text-xs text-gray-400">Back side</span>
                      </>
                    )}
                    {form.cnic_photo_back_path && (
                      <div className="absolute bottom-1 right-1 bg-white dark:bg-gray-700 rounded-full p-1 shadow">
                        <FiCamera size={12} className="text-gray-600 dark:text-gray-300" />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button type="button" onClick={resetForm} className="btn-secondary">Cancel</button>
              <button type="submit" className="btn-primary flex items-center gap-2">
                <FiCheck size={16} /> {editingId ? "Update" : "Save Investor"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Investors Table */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Investor List</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr>
                <th className="table-header">Investor</th>
                <th className="table-header">Contact</th>
                <th className="table-header">Address</th>
                <th className="table-header text-right">Investment</th>
                <th className="table-header text-right">Withdrawn</th>
                <th className="table-header text-right">Net</th>
                <th className="table-header">Added</th>
                <th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {loading ? (
                <tr><td colSpan={8} className="table-cell text-center py-8 text-gray-400">Loading...</td></tr>
              ) : investors.length === 0 ? (
                <tr><td colSpan={8} className="table-cell text-center py-8 text-gray-400">No investors added yet</td></tr>
              ) : (
                investors.map((inv) => {
                  const net = inv.investment_amount - (inv.total_withdrawn || 0);
                  return (
                    <React.Fragment key={inv.id}>
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="table-cell">
                          <div className="flex items-center gap-2">
                            {inv.photo_path ? (
                              <img src={toFileUrl(inv.photo_path)} className="w-8 h-8 rounded-full object-cover border border-gray-200 dark:border-gray-600" alt={inv.name} />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                                <FiUser size={14} className="text-primary-600" />
                              </div>
                            )}
                            <span className="font-medium text-gray-900 dark:text-white">{inv.name}</span>
                          </div>
                        </td>
                        <td className="table-cell text-gray-500 text-sm">{inv.contact || "-"}</td>
                        <td className="table-cell text-gray-500 text-sm max-w-[150px] truncate">{inv.address || "-"}</td>
                        <td className="table-cell text-right font-semibold text-blue-600">{fmt(inv.investment_amount)}</td>
                        <td className="table-cell text-right font-semibold text-red-500">
                          {inv.total_withdrawn ? fmt(inv.total_withdrawn) : "-"}
                        </td>
                        <td className="table-cell text-right font-bold text-green-600">{fmt(net)}</td>
                        <td className="table-cell text-gray-400 text-xs">{new Date(inv.created_at).toLocaleDateString()}</td>
                        <td className="table-cell">
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => toggleExpand(inv.id)}
                              className="p-1.5 text-purple-600 hover:bg-purple-50 dark:hover:bg-purple-900/20 rounded"
                              title="View details & withdrawals"
                            >
                              {expandedId === inv.id ? <FiChevronUp size={15} /> : <FiChevronDown size={15} />}
                            </button>
                            <button
                              onClick={() => openWithdrawals(inv)}
                              className="p-1.5 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded"
                              title="Record withdrawal"
                            >
                              <FiArrowDownCircle size={15} />
                            </button>
                            <button
                              onClick={() => requestAuth(() => startEdit(inv))}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                              title="Edit"
                            >
                              <FiEdit2 size={15} />
                            </button>
                            <button
                              onClick={() => requestAuth(() => handleDelete(inv.id))}
                              className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                              title="Remove"
                            >
                              <FiTrash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {expandedId === inv.id && (
                        <tr>
                          <td colSpan={8} className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                            <div className="px-5 py-4 space-y-5">

                              {/* Top: Photos + Details */}
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Photos */}
                                <div>
                                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">Photos & Documents</p>
                                  <div className="flex gap-3">
                                    <div className="text-center">
                                      {inv.photo_path
                                        ? <img src={toFileUrl(inv.photo_path)} className="w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-600" alt="Photo" />
                                        : <div className="w-20 h-20 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center bg-white dark:bg-gray-700"><FiUser className="text-gray-300" size={22} /></div>}
                                      <span className="text-xs text-gray-400 mt-1 block">Photo</span>
                                    </div>
                                    <div className="text-center">
                                      {inv.cnic_photo_front_path
                                        ? <img src={toFileUrl(inv.cnic_photo_front_path)} className="w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-600" alt="CNIC Front" />
                                        : <div className="w-20 h-20 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center bg-white dark:bg-gray-700"><span className="text-xs text-gray-300">No img</span></div>}
                                      <span className="text-xs text-gray-400 mt-1 block">CNIC Front</span>
                                    </div>
                                    <div className="text-center">
                                      {inv.cnic_photo_back_path
                                        ? <img src={toFileUrl(inv.cnic_photo_back_path)} className="w-20 h-20 object-cover rounded-lg border border-gray-200 dark:border-gray-600" alt="CNIC Back" />
                                        : <div className="w-20 h-20 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center bg-white dark:bg-gray-700"><span className="text-xs text-gray-300">No img</span></div>}
                                      <span className="text-xs text-gray-400 mt-1 block">CNIC Back</span>
                                    </div>
                                  </div>
                                </div>
                                {/* Info */}
                                <div>
                                  <p className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-2">Details</p>
                                  <p className="text-sm text-gray-700 dark:text-gray-300"><span className="font-semibold">Address:</span> {inv.address || "—"}</p>
                                  <p className="text-sm text-gray-700 dark:text-gray-300 mt-1"><span className="font-semibold">Notes:</span> {inv.notes || "—"}</p>
                                </div>
                              </div>

                              {/* Withdrawal History */}
                              <div>
                                <p className="text-xs font-bold uppercase tracking-wide text-gray-400 dark:text-gray-500 mb-3">
                                  Withdrawal History
                                </p>
                                {loadingInline[inv.id] ? (
                                  <p className="text-sm text-gray-400 py-2">Loading...</p>
                                ) : !inlineWithdrawals[inv.id] || inlineWithdrawals[inv.id].length === 0 ? (
                                  <p className="text-sm text-gray-400 italic py-2">No withdrawals recorded for this investor.</p>
                                ) : (
                                  <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                                    <table className="min-w-full text-sm">
                                      <thead className="bg-gray-100 dark:bg-gray-700">
                                        <tr>
                                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">#</th>
                                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Date</th>
                                          <th className="px-3 py-2 text-right text-xs font-semibold text-gray-500 dark:text-gray-400">Amount</th>
                                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Reason</th>
                                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-500 dark:text-gray-400">Notes</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-gray-100 dark:divide-gray-700 bg-white dark:bg-gray-800">
                                        {inlineWithdrawals[inv.id].map((w, idx) => (
                                          <tr key={w.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                                            <td className="px-3 py-2 text-gray-400 text-xs">{idx + 1}</td>
                                            <td className="px-3 py-2 text-gray-600 dark:text-gray-300 whitespace-nowrap">
                                              {new Date(w.date).toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })}
                                            </td>
                                            <td className="px-3 py-2 text-right font-semibold text-red-500 whitespace-nowrap">
                                              − {fmt(w.amount)}
                                            </td>
                                            <td className="px-3 py-2 text-gray-700 dark:text-gray-200">{w.reason}</td>
                                            <td className="px-3 py-2 text-gray-400 dark:text-gray-500 italic">{w.notes || "—"}</td>
                                          </tr>
                                        ))}
                                        {/* Total row */}
                                        <tr className="bg-red-50 dark:bg-red-900/20 font-semibold">
                                          <td colSpan={2} className="px-3 py-2 text-xs text-gray-500 dark:text-gray-400">Total Withdrawn</td>
                                          <td className="px-3 py-2 text-right text-red-600">
                                            − {fmt(inlineWithdrawals[inv.id].reduce((s, w) => s + w.amount, 0))}
                                          </td>
                                          <td colSpan={2} />
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Withdrawal Modal */}
      {withdrawalInvestor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-5">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                    <FiArrowDownCircle className="text-orange-600" />
                    Withdrawals — {withdrawalInvestor.name}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    Net available: <span className="font-semibold text-green-600">{fmt(withdrawalInvestor.investment_amount - (withdrawalInvestor.total_withdrawn || 0))}</span>
                  </p>
                </div>
                <button onClick={() => setWithdrawalInvestor(null)} className="p-1.5 rounded hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
                  <FiX size={18} />
                </button>
              </div>

              {/* Add withdrawal form */}
              <form onSubmit={handleAddWithdrawal} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 mb-4">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Record New Withdrawal</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Amount (PKR) *</label>
                    <input
                      type="number"
                      value={withdrawalForm.amount}
                      onChange={(e) => setWithdrawalForm((p) => ({ ...p, amount: e.target.value }))}
                      className="input-field text-sm"
                      placeholder="0"
                      min={1}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Date *</label>
                    <input
                      type="date"
                      value={withdrawalForm.date}
                      onChange={(e) => setWithdrawalForm((p) => ({ ...p, date: e.target.value }))}
                      className="input-field text-sm"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Reason *</label>
                    <input
                      type="text"
                      value={withdrawalForm.reason}
                      onChange={(e) => setWithdrawalForm((p) => ({ ...p, reason: e.target.value }))}
                      className="input-field text-sm"
                      placeholder="Why is the money being withdrawn?"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Notes</label>
                    <input
                      type="text"
                      value={withdrawalForm.notes}
                      onChange={(e) => setWithdrawalForm((p) => ({ ...p, notes: e.target.value }))}
                      className="input-field text-sm"
                      placeholder="Optional details"
                    />
                  </div>
                </div>
                <div className="flex justify-end mt-3">
                  <button type="submit" className="btn-primary flex items-center gap-2 text-sm">
                    <FiCheck size={14} /> Record Withdrawal
                  </button>
                </div>
              </form>

              {/* Withdrawal history */}
              <div>
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Withdrawal History</p>
                {loadingWithdrawals ? (
                  <p className="text-sm text-gray-400 text-center py-4">Loading...</p>
                ) : withdrawals.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-4">No withdrawals recorded yet</p>
                ) : (
                  <div className="space-y-2">
                    {withdrawals.map((w) => (
                      <div key={w.id} className="flex items-start justify-between bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-lg px-3 py-2.5">
                        <div>
                          <p className="text-sm font-semibold text-red-600">− {fmt(w.amount)}</p>
                          <p className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">{w.reason}</p>
                          {w.notes && <p className="text-xs text-gray-400 mt-0.5">{w.notes}</p>}
                          <p className="text-xs text-gray-400 mt-0.5">{new Date(w.date).toLocaleDateString()}</p>
                        </div>
                        <button
                          onClick={() => requestAuth(() => handleDeleteWithdrawal(w.id))}
                          className="p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded ml-2 flex-shrink-0"
                          title="Delete"
                        >
                          <FiTrash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ROI Calculator */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1 flex items-center gap-2">
          <FiTrendingUp className="text-green-600" />
          ROI Calculator
        </h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Formula: (Profit ÷ Investment) × 100 = ROI %
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Profit (PKR)</label>
            <input
              type="number"
              value={calcProfit}
              onChange={(e) => { setCalcProfit(e.target.value); setCalcResult(null); }}
              className="input-field"
              placeholder="Enter profit amount"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Investment (PKR)</label>
            <input
              type="number"
              value={calcInvestment}
              onChange={(e) => { setCalcInvestment(e.target.value); setCalcResult(null); }}
              className="input-field"
              placeholder="Enter investment amount"
            />
          </div>
          <div>
            <button onClick={handleCalculate} className="btn-primary w-full">
              Calculate ROI
            </button>
          </div>
        </div>

        {calcResult !== null && (
          <div className={`mt-4 p-4 rounded-xl text-center border-2 ${calcResult >= 0 ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" : "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"}`}>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Return on Investment</p>
            <p className={`text-4xl font-bold ${calcResult >= 0 ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {calcResult.toFixed(2)}%
            </p>
            <p className="text-xs text-gray-400 mt-1">
              PKR {parseFloat(calcProfit || "0").toLocaleString()} profit on PKR {parseFloat(calcInvestment || "0").toLocaleString()} investment
            </p>
          </div>
        )}
      </div>

      <PasswordModal />
    </div>
  );
}
