import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useSelector } from "react-redux";
import { addDays, addMonths, addYears, format } from "date-fns";
import type { RootState } from "../store";
import {
  PAYMENT_TYPES,
  CASH_PAYMENT_METHODS,
  INSTALLMENT_DURATION_TYPES,
} from "../../shared/constants";
import { toast } from "react-toastify";
import { FiArrowLeft, FiSave } from "react-icons/fi";
import { toFileUrl } from "../utils/filePaths";

interface VehicleOption {
  id: string;
  make: string;
  model: string;
  year: number;
  registration_number: string;
  selling_price?: number;
  total_cost?: number;
  purchase_price?: number;
}

interface CustomerOption {
  id: string;
  name: string;
  cnic: string;
}

interface BankAccountOption {
  id: string;
  name: string;
  account_title?: string;
  account_number?: string;
}

interface InstallmentDraft {
  installment_number: number;
  due_date: string;
  amount: string;
}

const today = format(new Date(), "yyyy-MM-dd");

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function buildSchedule(
  remaining: number,
  count: number,
  startDate: string,
  durationType: "days" | "months" | "years",
): InstallmentDraft[] {
  const safeCount = Math.max(1, count);
  const baseAmount = round2(remaining / safeCount);
  const start = new Date(startDate);
  const rows: InstallmentDraft[] = [];

  for (let index = 1; index <= safeCount; index++) {
    let dueDate = start;
    if (durationType === "days") dueDate = addDays(start, index - 1);
    if (durationType === "months") dueDate = addMonths(start, index - 1);
    if (durationType === "years") dueDate = addYears(start, index - 1);

    const amount =
      index === safeCount
        ? round2(remaining - baseAmount * (safeCount - 1))
        : baseAmount;

    rows.push({
      installment_number: index,
      due_date: format(dueDate, "yyyy-MM-dd"),
      amount: String(amount),
    });
  }

  return rows;
}

export default function SaleFormPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountOption[]>([]);
  const [installmentSchedule, setInstallmentSchedule] = useState<
    InstallmentDraft[]
  >([]);
  const [scheduleLocked, setScheduleLocked] = useState(false);

  const [form, setForm] = useState({
    vehicle_id: "",
    customer_id: "",
    sale_price: "",
    payment_type: "cash",
    cash_payment_method: "hard_cash",
    bank_account_id: "",
    down_payment: "",
    installment_count: "12",
    installment_duration_type: "months",
    installment_start_date: today,
    witness_required: false,
    witness_name: "",
    witness_father_name: "",
    witness_cnic: "",
    witness_phone: "",
    witness_cnic_photo_path: "",
    notes: "",
  });

  const selectedVehicle = vehicles.find((vehicle) => vehicle.id === form.vehicle_id);
  const suggestedPrice = selectedVehicle
    ? selectedVehicle.selling_price ||
      selectedVehicle.total_cost ||
      selectedVehicle.purchase_price ||
      0
    : 0;

  const remainingAmount = useMemo(
    () =>
      Math.max(
        0,
        round2((parseFloat(form.sale_price) || 0) - (parseFloat(form.down_payment) || 0)),
      ),
    [form.sale_price, form.down_payment],
  );

  const scheduleTotal = useMemo(
    () =>
      round2(
        installmentSchedule.reduce(
          (sum, row) => sum + (parseFloat(row.amount) || 0),
          0,
        ),
      ),
    [installmentSchedule],
  );

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      await Promise.all([loadVehicles(), loadCustomers(), loadBankAccounts()]);
      if (isEdit && id) {
        await loadSale(id);
      }
    };
    void load();
  }, [user?.id, id]);

  useEffect(() => {
    if (form.payment_type !== "installment") {
      setInstallmentSchedule([]);
      setScheduleLocked(false);
      return;
    }
    if (scheduleLocked) return;
    const count = parseInt(form.installment_count) || 1;
    setInstallmentSchedule(
      buildSchedule(
        remainingAmount,
        count,
        form.installment_start_date,
        form.installment_duration_type as "days" | "months" | "years",
      ),
    );
  }, [
    form.payment_type,
    form.installment_count,
    form.installment_duration_type,
    form.installment_start_date,
    remainingAmount,
    scheduleLocked,
  ]);

  const loadSale = async (saleId: string) => {
    if (!user) return;
    const result = await window.api.getSaleById(user.id, saleId);
    if (!result.success || !result.data) {
      toast.error(result.error || "Failed to load sale");
      return;
    }

    const sale = result.data;
    await loadVehicles(sale.vehicle_id);

    const witnessName = sale.customer?.witness_name || "";
    const witnessFatherName = sale.customer?.witness_father_name || "";
    const witnessCnic = sale.customer?.witness_cnic || "";
    const witnessPhone = sale.customer?.witness_phone || "";
    const witnessCnicPhoto = sale.customer?.witness_cnic_photo_path || "";
    const hasWitness = Boolean(
      witnessName ||
        witnessFatherName ||
        witnessCnic ||
        witnessPhone ||
        witnessCnicPhoto,
    );

    const firstInstallmentDate =
      sale.installment_schedule?.[0]?.due_date || sale.date || today;

    setForm({
      vehicle_id: sale.vehicle_id || "",
      customer_id: sale.customer_id || "",
      sale_price: String(sale.sale_price || sale.vehicle_price || 0),
      payment_type: sale.payment_type || "cash",
      cash_payment_method: sale.cash_payment_method || "hard_cash",
      bank_account_id: sale.bank_account_id || "",
      down_payment: String(sale.down_payment || 0),
      installment_count: String(
        sale.installment_count || sale.installment_schedule?.length || 12,
      ),
      installment_duration_type:
        sale.installment_duration_type ||
        sale.installment_frequency ||
        "months",
      installment_start_date: firstInstallmentDate,
      witness_required: hasWitness,
      witness_name: witnessName,
      witness_father_name: witnessFatherName,
      witness_cnic: witnessCnic,
      witness_phone: witnessPhone,
      witness_cnic_photo_path: witnessCnicPhoto,
      notes: sale.notes || "",
    });

    if (sale.installment_schedule?.length) {
      setInstallmentSchedule(
        sale.installment_schedule.map((entry: any) => ({
          installment_number: entry.installment_number,
          due_date: entry.due_date,
          amount: String(entry.amount),
        })),
      );
      setScheduleLocked(true);
    }
  };

  const loadVehicles = async (includeVehicleId?: string) => {
    const result = await window.api.getVehicles({
      status: "in_stock",
      page: 1,
      limit: 500,
    });
    if (!result.success) {
      toast.error(result.error || "Failed to load vehicles");
      return;
    }

    const list = result.data.data || [];
    if (
      includeVehicleId &&
      !list.some((vehicle: VehicleOption) => vehicle.id === includeVehicleId)
    ) {
      const selected = await window.api.getVehicleById(includeVehicleId);
      if (selected.success && selected.data) {
        list.unshift(selected.data);
      }
    }
    setVehicles(list);
  };

  const loadCustomers = async () => {
    const result = await window.api.getCustomers({ page: 1, limit: 500 });
    if (!result.success) {
      toast.error(result.error || "Failed to load customers");
      return;
    }
    setCustomers(result.data.data || []);
  };

  const loadBankAccounts = async () => {
    if (!user) return;
    const result = await window.api.getBankAccounts(user.id);
    if (!result.success) {
      toast.error(result.error || "Failed to load bank accounts");
      return;
    }
    setBankAccounts(result.data || []);
  };

  const update = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (
      [
        "installment_count",
        "installment_duration_type",
        "installment_start_date",
        "down_payment",
        "sale_price",
        "payment_type",
      ].includes(field)
    ) {
      setScheduleLocked(false);
    }
  };

  const updateInstallment = (
    installmentNumber: number,
    field: "due_date" | "amount",
    value: string,
  ) => {
    setScheduleLocked(true);
    setInstallmentSchedule((prev) =>
      prev.map((row) =>
        row.installment_number === installmentNumber
          ? { ...row, [field]: value }
          : row,
      ),
    );
  };

  const handleWitnessCnicImageSelect = async () => {
    const selected = await window.api.selectImage();
    if (!selected.success || !selected.data) return;

    const saved = await window.api.saveImage(selected.data, "witness-cnic");
    if (!saved.success || !saved.data) {
      toast.error(saved.error || "Failed to save witness CNIC image");
      return;
    }

    update("witness_cnic_photo_path", saved.data);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;

    if (!form.vehicle_id || !form.customer_id) {
      toast.error("Please select both a vehicle and a customer");
      return;
    }

    if (
      form.payment_type === "cash" &&
      form.cash_payment_method === "bank_transfer" &&
      !form.bank_account_id
    ) {
      toast.error("Please select the receiving bank account");
      return;
    }

    if (form.payment_type === "installment") {
      if (scheduleTotal <= 0 || installmentSchedule.length === 0) {
        toast.error("Installment schedule is required");
        return;
      }
      if (Math.abs(scheduleTotal - remainingAmount) > 1) {
        toast.error("Installment amounts must match remaining balance");
        return;
      }
    }

    const saleData: any = {
      vehicle_id: form.vehicle_id,
      customer_id: form.customer_id,
      sale_price: parseFloat(form.sale_price) || 0,
      payment_type: form.payment_type,
      cash_payment_method: form.cash_payment_method,
      bank_account_id: form.bank_account_id || undefined,
      notes: form.notes,
    };

    if (form.payment_type === "installment") {
      saleData.down_payment = parseFloat(form.down_payment) || 0;
      saleData.installment_count = parseInt(form.installment_count) || 1;
      saleData.installment_duration_type = form.installment_duration_type;
      saleData.installment_start_date = form.installment_start_date;
      saleData.installment_schedule = installmentSchedule.map((row) => ({
        installment_number: row.installment_number,
        due_date: row.due_date,
        amount: round2(parseFloat(row.amount) || 0),
      }));
    }

    if (form.witness_required) {
      saleData.witness_required = true;
      saleData.witness = {
        name: form.witness_name,
        father_name: form.witness_father_name,
        cnic: form.witness_cnic,
        phone: form.witness_phone,
        cnic_photo_path: form.witness_cnic_photo_path,
      };
    } else {
      saleData.witness_required = false;
    }

    const result = isEdit
      ? await window.api.updateSale(user.id, id!, saleData)
      : await window.api.createSale(user.id, saleData);
    if (result.success) {
      toast.success(isEdit ? "Sale updated successfully" : "Sale created successfully");
      navigate(`/sales/${result.data.id}`);
    } else {
      toast.error(result.error);
    }
  };

  const bankLabel = (account: BankAccountOption) => {
    const secondary =
      account.account_title || account.account_number
        ? ` - ${account.account_title || account.account_number}`
        : "";
    return `${account.name}${secondary}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
        >
          <FiArrowLeft />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isEdit ? "Edit Sale" : "Create New Sale"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Select Vehicle
          </h2>
          <select
            value={form.vehicle_id}
            onChange={(event) => {
              const vehicleId = event.target.value;
              update("vehicle_id", vehicleId);
              if (vehicleId) {
                const vehicle = vehicles.find((entry) => entry.id === vehicleId);
                const candidatePrice =
                  vehicle?.selling_price ||
                  vehicle?.total_cost ||
                  vehicle?.purchase_price ||
                  0;
                if (candidatePrice > 0) {
                  update("sale_price", String(candidatePrice));
                }
              }
            }}
            className="input-field"
            required
          >
            <option value="">-- Select Vehicle --</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.registration_number || "No Registration"} - {vehicle.model} (
                {vehicle.year} {vehicle.make})
              </option>
            ))}
          </select>
          {selectedVehicle && (
            <p className="mt-2 text-sm text-gray-500">
              Suggested price: PKR {suggestedPrice.toLocaleString()}
            </p>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Select Buyer
          </h2>
          <select
            value={form.customer_id}
            onChange={(event) => update("customer_id", event.target.value)}
            className="input-field"
            required
          >
            <option value="">-- Select Customer --</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name} {customer.cnic ? `(${customer.cnic})` : ""}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => navigate("/customers/new")}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            + Add New Customer
          </button>
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Payment Details
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Sale Price *
              </label>
              <input
                type="number"
                value={form.sale_price}
                onChange={(event) => update("sale_price", event.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Payment Type *
              </label>
              <select
                value={form.payment_type}
                onChange={(event) => update("payment_type", event.target.value)}
                className="input-field"
              >
                {PAYMENT_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {form.payment_type === "cash" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Payment Method
                  </label>
                  <select
                    value={form.cash_payment_method}
                    onChange={(event) =>
                      update("cash_payment_method", event.target.value)
                    }
                    className="input-field"
                  >
                    {CASH_PAYMENT_METHODS.map((method) => (
                      <option key={method.value} value={method.value}>
                        {method.label}
                      </option>
                    ))}
                  </select>
                </div>
                {form.cash_payment_method === "bank_transfer" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Select Receiving Bank Account
                    </label>
                    <select
                      value={form.bank_account_id}
                      onChange={(event) =>
                        update("bank_account_id", event.target.value)
                      }
                      className="input-field"
                      required
                    >
                      <option value="">-- Select Bank Account --</option>
                      {bankAccounts.map((account) => (
                        <option key={account.id} value={account.id}>
                          {bankLabel(account)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </>
            )}

            {form.payment_type === "installment" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Down Payment *
                  </label>
                  <input
                    type="number"
                    value={form.down_payment}
                    onChange={(event) => update("down_payment", event.target.value)}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Number of Installments
                  </label>
                  <input
                    type="number"
                    value={form.installment_count}
                    onChange={(event) =>
                      update("installment_count", event.target.value)
                    }
                    className="input-field"
                    min={1}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Duration Type
                  </label>
                  <select
                    value={form.installment_duration_type}
                    onChange={(event) =>
                      update("installment_duration_type", event.target.value)
                    }
                    className="input-field"
                  >
                    {INSTALLMENT_DURATION_TYPES.map((durationType) => (
                      <option key={durationType.value} value={durationType.value}>
                        {durationType.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    First Due Date
                  </label>
                  <input
                    type="date"
                    value={form.installment_start_date}
                    onChange={(event) =>
                      update("installment_start_date", event.target.value)
                    }
                    className="input-field"
                  />
                </div>
              </>
            )}
          </div>

          {form.payment_type === "installment" && (
            <div className="mt-4 rounded-lg border border-blue-100 bg-blue-50 p-4 dark:border-blue-800/40 dark:bg-blue-900/10">
              <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
                Remaining balance:{" "}
                <strong>PKR {remainingAmount.toLocaleString()}</strong>
              </p>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr>
                      <th className="text-left py-2">Installment</th>
                      <th className="text-left py-2">Due Date</th>
                      <th className="text-right py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {installmentSchedule.map((row) => (
                      <tr key={row.installment_number}>
                        <td className="py-1">{row.installment_number}</td>
                        <td className="py-1">
                          <input
                            type="date"
                            value={row.due_date}
                            onChange={(event) =>
                              updateInstallment(
                                row.installment_number,
                                "due_date",
                                event.target.value,
                              )
                            }
                            className="input-field py-1"
                          />
                        </td>
                        <td className="py-1">
                          <input
                            type="number"
                            value={row.amount}
                            onChange={(event) =>
                              updateInstallment(
                                row.installment_number,
                                "amount",
                                event.target.value,
                              )
                            }
                            className="input-field py-1 text-right"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p
                className={`mt-2 text-sm ${Math.abs(scheduleTotal - remainingAmount) <= 1 ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}`}
              >
                Schedule total: PKR {scheduleTotal.toLocaleString()}
              </p>
            </div>
          )}
        </div>

        <div className="card">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Witness Information (Optional)
            </h2>
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.witness_required}
                onChange={(event) =>
                  update("witness_required", event.target.checked)
                }
              />
              Witness Required
            </label>
          </div>

          {form.witness_required && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <input
                type="text"
                placeholder="Witness Name"
                value={form.witness_name}
                onChange={(event) => update("witness_name", event.target.value)}
                className="input-field"
              />
              <input
                type="text"
                placeholder="Witness Father Name"
                value={form.witness_father_name}
                onChange={(event) =>
                  update("witness_father_name", event.target.value)
                }
                className="input-field"
              />
              <input
                type="text"
                placeholder="Witness CNIC"
                value={form.witness_cnic}
                onChange={(event) => update("witness_cnic", event.target.value)}
                className="input-field"
              />
              <input
                type="text"
                placeholder="Witness Phone"
                value={form.witness_phone}
                onChange={(event) => update("witness_phone", event.target.value)}
                className="input-field"
              />
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Witness CNIC Image
                </label>
                <div className="flex flex-col md:flex-row gap-4">
                  <button
                    type="button"
                    onClick={handleWitnessCnicImageSelect}
                    className="btn-secondary"
                  >
                    {form.witness_cnic_photo_path
                      ? "Replace Witness CNIC Image"
                      : "Upload Witness CNIC Image"}
                  </button>
                  {form.witness_cnic_photo_path && (
                    <div className="flex items-start gap-3">
                      <img
                        src={toFileUrl(form.witness_cnic_photo_path)}
                        alt="Witness CNIC"
                        className="w-44 h-28 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                      />
                      <button
                        type="button"
                        onClick={() => update("witness_cnic_photo_path", "")}
                        className="text-sm text-red-600 hover:underline"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="card">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notes
          </label>
          <textarea
            value={form.notes}
            onChange={(event) => update("notes", event.target.value)}
            className="input-field"
            rows={3}
          />
        </div>

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary flex items-center gap-2">
            <FiSave /> {isEdit ? "Update Sale" : "Create Sale"}
          </button>
        </div>
      </form>
    </div>
  );
}

