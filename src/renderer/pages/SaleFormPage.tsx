import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { addDays, addMonths, addYears, format } from "date-fns";
import type { RootState } from "../store";
import {
  PAYMENT_TYPES,
  INSTALLMENT_DURATION_TYPES,
} from "../../shared/constants";
import {
  formatCnic,
  isValidCnic,
  CNIC_PLACEHOLDER,
} from "../../shared/constants";
import { toast } from "react-toastify";
import { FiArrowLeft, FiSearch } from "react-icons/fi";
import { toFileUrl } from "../utils/filePaths";
import FormStepper, { StepNavigation } from "../components/FormStepper";

const IMG_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='140'%3E%3Crect width='200' height='140' fill='%23e5e7eb'/%3E%3Ctext x='100' y='76' text-anchor='middle' fill='%239ca3af' font-size='13' font-family='sans-serif'%3ENo image%3C/text%3E%3C/svg%3E";

interface VehicleOption {
  id: string;
  make: string;
  model: string;
  year: number;
  year_of_manufacture?: number;
  registration_number: string;
  chassis_number?: string;
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
  const location = useLocation();
  const isEdit = Boolean(id);

  // State passed back from CustomerFormPage after creating a new customer
  const locationState = location.state as any;
  const restoredForm = locationState?.saleForm as
    | typeof defaultForm
    | undefined;
  const restoredStep = locationState?.saleStep as number | undefined;
  const newCustomerId = locationState?.newCustomerId as string | undefined;

  const defaultForm = {
    vehicle_id: "",
    customer_id: "",
    customer_mode: "existing" as "existing" | "new",
    sale_price: "",
    payment_type: "cash" as string,
    cash_amount: "",
    bank_transfer_amount: "",
    bank_account_id: "",
    down_payment: "",
    installment_count: "12",
    installment_duration_type: "months" as string,
    installment_start_date: today,
    witness_required: false as boolean,
    witness_name: "",
    witness_father_name: "",
    witness_cnic: "",
    witness_phone: "",
    witness_cnic_photo_path: "",
    witness_cnic_photo_back_path: "",
    notes: "",
  };

  const [step, setStep] = useState(restoredStep ?? 0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccountOption[]>([]);
  const [installmentSchedule, setInstallmentSchedule] = useState<
    InstallmentDraft[]
  >([]);
  const [scheduleLocked, setScheduleLocked] = useState(false);

  // Vehicle search by chassis number
  const [chassisSearch, setChassisSearch] = useState("");
  const [searchResults, setSearchResults] = useState<VehicleOption[]>([]);
  const [paymentMethodOption, setPaymentMethodOption] = useState<
    "full_cash" | "half_half" | "full_bank" | null
  >(null);

  const [form, setForm] = useState(() => {
    if (restoredForm) {
      return {
        ...restoredForm,
        customer_id: newCustomerId || restoredForm.customer_id || "",
      };
    }
    return defaultForm;
  });

  const selectedVehicle = vehicles.find(
    (vehicle) => vehicle.id === form.vehicle_id,
  );
  const suggestedPrice = selectedVehicle
    ? selectedVehicle.selling_price ||
      selectedVehicle.total_cost ||
      selectedVehicle.purchase_price ||
      0
    : 0;

  const selectedCustomer = customers.find((c) => c.id === form.customer_id);

  const remainingAmount = useMemo(
    () =>
      Math.max(
        0,
        round2(
          (parseFloat(form.sale_price) || 0) -
            (parseFloat(form.down_payment) || 0),
        ),
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

  // Dynamic steps
  const steps = useMemo(() => {
    const base = [
      { label: "Select Vehicle" },
      { label: "Select Buyer" },
      { label: "Payment" },
    ];
    if (form.payment_type === "installment") {
      base.push({ label: "Installment Details" });
    }
    // Payment method step (cash & bank transfer split)
    base.push({ label: "Payment Method" });
    if (form.witness_required) {
      base.push({ label: "Witness" });
    }
    base.push({ label: "Review" });
    return base;
  }, [form.witness_required, form.payment_type]);

  // Calculate step indices dynamically
  const installmentStepIndex = form.payment_type === "installment" ? 3 : -1;
  const paymentMethodStepIndex = form.payment_type === "installment" ? 4 : 3;
  const witnessStepIndex = form.witness_required
    ? paymentMethodStepIndex + 1
    : -1;
  const reviewStepIndex = form.witness_required
    ? paymentMethodStepIndex + 2
    : paymentMethodStepIndex + 1;

  // Clear location state after restoring to prevent re-restore on refresh
  useEffect(() => {
    if (locationState?.saleForm) {
      window.history.replaceState({}, "");
    }
  }, []);

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
    const witnessCnicPhotoBack =
      sale.customer?.witness_cnic_photo_back_path || "";
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
      customer_mode: "existing",
      sale_price: String(sale.sale_price || sale.vehicle_price || 0),
      payment_type: sale.payment_type || "cash",
      cash_amount: String((sale as any).cash_amount || ""),
      bank_transfer_amount: String((sale as any).bank_transfer_amount || ""),
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
      witness_cnic_photo_back_path: witnessCnicPhotoBack,
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

  const searchVehicleByChassis = async () => {
    if (!chassisSearch.trim()) {
      setSearchResults([]);
      return;
    }
    const result = await window.api.getVehicles({
      status: "in_stock",
      search: chassisSearch.trim(),
      page: 1,
      limit: 50,
    });
    if (result.success) {
      // Filter to only matching chassis numbers
      const filtered = (result.data.data || []).filter((v: any) =>
        v.chassis_number
          ?.toLowerCase()
          .includes(chassisSearch.trim().toLowerCase()),
      );
      setSearchResults(filtered);
    }
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
      // Reset payment method option when payment_type or amount changes
      if (
        field === "payment_type" ||
        field === "down_payment" ||
        field === "sale_price"
      ) {
        setPaymentMethodOption(null);
      }
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

  const handleWitnessCnicBackImageSelect = async () => {
    const selected = await window.api.selectImage();
    if (!selected.success || !selected.data) return;

    const saved = await window.api.saveImage(
      selected.data,
      "witness-cnic-back",
    );
    if (!saved.success || !saved.data) {
      toast.error(saved.error || "Failed to save witness CNIC back image");
      return;
    }

    update("witness_cnic_photo_back_path", saved.data);
  };

  const validateStep = useCallback(
    (s: number): boolean => {
      const errs: Record<string, string> = {};
      if (s === 0) {
        if (!form.vehicle_id) errs.vehicle_id = "Please select a vehicle";
      }
      if (s === 1) {
        if (!form.customer_id)
          errs.customer_id = "Please select or add a customer";
      }
      if (s === 2) {
        if (!form.sale_price || parseFloat(form.sale_price) <= 0)
          errs.sale_price = "Sale price is required";
      }
      if (s === installmentStepIndex && form.payment_type === "installment") {
        if (scheduleTotal <= 0 || installmentSchedule.length === 0)
          errs.schedule = "Installment schedule is required";
        else if (Math.abs(scheduleTotal - remainingAmount) > 1)
          errs.schedule = "Installment amounts must match remaining balance";
      }
      if (s === witnessStepIndex && form.witness_required) {
        if (!form.witness_name.trim()) errs.witness_name = "Witness name is required";
        if (!form.witness_cnic.trim()) errs.witness_cnic = "Witness CNIC is required";
        else if (!isValidCnic(form.witness_cnic)) errs.witness_cnic = "Invalid CNIC format (XXXXX-XXXXXXX-X)";
      } else if (s === witnessStepIndex && form.witness_cnic && !isValidCnic(form.witness_cnic)) {
        errs.witness_cnic = "Invalid CNIC format (XXXXX-XXXXXXX-X)";
      }
      setErrors(errs);
      if (Object.keys(errs).length > 0) {
        const msg = Object.values(errs)[0];
        toast.error(msg);
        return false;
      }
      return true;
    },
    [
      form,
      scheduleTotal,
      remainingAmount,
      installmentSchedule,
      installmentStepIndex,
      witnessStepIndex,
    ],
  );

  const goNext = () => {
    if (validateStep(step)) setStep((s) => Math.min(s + 1, steps.length - 1));
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 0));
  const goToStep = (s: number) => setStep(s);

  const handleSubmit = async () => {
    if (!user) return;

    const saleData: any = {
      vehicle_id: form.vehicle_id,
      customer_id: form.customer_id,
      sale_price: parseFloat(form.sale_price) || 0,
      payment_type: form.payment_type,
      cash_payment_method: "both",
      cash_amount: parseFloat(form.cash_amount) || 0,
      bank_transfer_amount: parseFloat(form.bank_transfer_amount) || 0,
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
        cnic_photo_back_path: form.witness_cnic_photo_back_path,
      };
    } else {
      saleData.witness_required = false;
    }

    const result = isEdit
      ? await window.api.updateSale(user.id, id!, saleData)
      : await window.api.createSale(user.id, saleData);
    if (result.success) {
      toast.success(
        isEdit ? "Sale updated successfully" : "Sale created successfully",
      );
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

  const applyPaymentMethodOption = (
    option: "full_cash" | "half_half" | "full_bank",
  ) => {
    // Determine the amount to split (down_payment for installments, sale_price for cash)
    const amountToSplit =
      form.payment_type === "installment"
        ? parseFloat(form.down_payment) || 0
        : parseFloat(form.sale_price) || 0;

    let cashAmount = 0;
    let bankAmount = 0;

    if (option === "full_cash") {
      cashAmount = amountToSplit;
      bankAmount = 0;
    } else if (option === "half_half") {
      const half = round2(amountToSplit / 2);
      cashAmount = half;
      bankAmount = round2(amountToSplit - half);
    } else if (option === "full_bank") {
      cashAmount = 0;
      bankAmount = amountToSplit;
    }

    setPaymentMethodOption(option);
    update("cash_amount", String(cashAmount));
    update("bank_transfer_amount", String(bankAmount));
  };

  const fieldError = (field: string) =>
    errors[field] ? (
      <p className="text-red-500 text-xs mt-1">{errors[field]}</p>
    ) : null;

  // ── Step Renderers ──

  const renderSelectVehicle = () => (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Select Vehicle
      </h2>

      {/* Vehicle Dropdown */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Select from Available Vehicles
        </label>
        <select
          value={form.vehicle_id}
          onChange={(e) => {
            update("vehicle_id", e.target.value);
            const vehicle = vehicles.find((v) => v.id === e.target.value);
            if (vehicle) {
              const candidatePrice =
                vehicle.selling_price ||
                vehicle.total_cost ||
                vehicle.purchase_price ||
                0;
              if (candidatePrice > 0) {
                update("sale_price", String(candidatePrice));
              }
              setChassisSearch("");
              setSearchResults([]);
            }
          }}
          className="input-field"
        >
          <option value="">-- Choose a vehicle --</option>
          {vehicles.map((vehicle) => (
            <option key={vehicle.id} value={vehicle.id}>
              {vehicle.make} {vehicle.model} (
              {(vehicle as any).year_of_manufacture || vehicle.year}) - Chassis:{" "}
              {vehicle.chassis_number || "N/A"}
            </option>
          ))}
        </select>
        {fieldError("vehicle_id")}
      </div>

      {/* Search by Chassis Number */}
      <div className="border-t pt-4">
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Or Search Vehicle by Chassis Number
        </h3>
      </div>
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          value={chassisSearch}
          onChange={(e) => setChassisSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") searchVehicleByChassis();
          }}
          className="input-field flex-1"
          placeholder="Enter chassis number to search..."
        />
        <button
          type="button"
          onClick={searchVehicleByChassis}
          className="btn-primary flex items-center gap-2"
        >
          <FiSearch /> Search
        </button>
      </div>

      {searchResults.length > 0 && (
        <div className="space-y-2 mb-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {searchResults.length} vehicle(s) found:
          </p>
          {searchResults.map((vehicle) => (
            <button
              key={vehicle.id}
              type="button"
              onClick={() => {
                update("vehicle_id", vehicle.id);
                // Add to vehicles list if not already there
                if (!vehicles.some((v) => v.id === vehicle.id)) {
                  setVehicles((prev) => [vehicle, ...prev]);
                }
                const candidatePrice =
                  vehicle.selling_price ||
                  vehicle.total_cost ||
                  vehicle.purchase_price ||
                  0;
                if (candidatePrice > 0) {
                  update("sale_price", String(candidatePrice));
                }
                setSearchResults([]);
                setChassisSearch("");
              }}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                form.vehicle_id === vehicle.id
                  ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
              }`}
            >
              <p className="font-medium text-gray-900 dark:text-white">
                {vehicle.make} {vehicle.model} (
                {(vehicle as any).year_of_manufacture || vehicle.year})
              </p>
              <p className="text-sm text-gray-500">
                Chassis: {vehicle.chassis_number} | Reg:{" "}
                {vehicle.registration_number || "N/A"}
              </p>
            </button>
          ))}
        </div>
      )}

      {chassisSearch && searchResults.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          No vehicles found. Try a different chassis number.
        </p>
      )}

      {fieldError("vehicle_id")}
      {selectedVehicle && (
        <div className="mt-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/30">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            Selected Vehicle
          </p>
          <p className="font-medium text-gray-900 dark:text-white">
            {selectedVehicle.make} {selectedVehicle.model} (
            {(selectedVehicle as any).year_of_manufacture ||
              selectedVehicle.year}
            )
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Chassis: {selectedVehicle.chassis_number} | Suggested price: PKR{" "}
            {suggestedPrice.toLocaleString()}
          </p>
        </div>
      )}
    </div>
  );

  const renderSelectBuyer = () => (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Select Buyer
      </h2>

      {/* Existing or New toggle */}
      <div className="flex gap-4 mb-4">
        <button
          type="button"
          onClick={() => update("customer_mode", "existing")}
          className={`flex-1 py-3 px-4 rounded-lg border-2 text-center font-medium transition-colors ${
            form.customer_mode === "existing"
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
              : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
          }`}
        >
          Existing Customer
        </button>
        <button
          type="button"
          onClick={() => {
            update("customer_mode", "new");
            navigate("/customers/new", {
              state: {
                returnTo: isEdit ? `/sales/${id}/edit` : "/sales/new",
                returnState: { saleForm: form, saleStep: step },
              },
            });
          }}
          className={`flex-1 py-3 px-4 rounded-lg border-2 text-center font-medium transition-colors ${
            form.customer_mode === "new"
              ? "border-green-500 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300"
              : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50"
          }`}
        >
          + New Customer
        </button>
      </div>

      {form.customer_mode === "existing" && (
        <>
          <select
            value={form.customer_id}
            onChange={(event) => update("customer_id", event.target.value)}
            className={`input-field ${errors.customer_id ? "border-red-500" : ""}`}
          >
            <option value="">-- Select Customer --</option>
            {customers.map((customer) => (
              <option key={customer.id} value={customer.id}>
                {customer.name} {customer.cnic ? `(${customer.cnic})` : ""}
              </option>
            ))}
          </select>
          {fieldError("customer_id")}
        </>
      )}

      {selectedCustomer && (
        <div className="mt-4 p-4 rounded-lg bg-gray-50 dark:bg-gray-700/30">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            Selected Buyer
          </p>
          <p className="font-medium text-gray-900 dark:text-white">
            {selectedCustomer.name}
          </p>
          {selectedCustomer.cnic && (
            <p className="text-sm text-gray-500 mt-1">
              CNIC: {selectedCustomer.cnic}
            </p>
          )}
        </div>
      )}

      {/* Witness toggle */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Add witness for this sale?
        </p>
        <div className="flex gap-4">
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="witness_required"
              checked={form.witness_required === true}
              onChange={() => update("witness_required", true)}
              className="rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Yes
            </span>
          </label>
          <label className="inline-flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="witness_required"
              checked={form.witness_required === false}
              onChange={() => update("witness_required", false)}
              className="rounded"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">No</span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderPayment = () => (
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
            className={`input-field ${errors.sale_price ? "border-red-500" : ""}`}
          />
          {fieldError("sale_price")}
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

        {form.payment_type === "installment" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Net Cash *
            </label>
            <input
              type="number"
              value={form.down_payment}
              onChange={(event) => update("down_payment", event.target.value)}
              className="input-field"
            />
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="mt-4">
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
    </div>
  );

  const renderInstallmentDetails = () => (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Installment Details
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 dark:border-blue-800/40 dark:bg-blue-900/10">
        <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
          Remaining balance:{" "}
          <strong>PKR {remainingAmount.toLocaleString()}</strong>
        </p>
        {fieldError("schedule")}
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
    </div>
  );

  const renderPaymentMethod = () => (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Payment Method Options
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
        Select how to split the payment amount between cash and bank transfer.
      </p>

      {/* Amount to split display */}
      <div className="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
        <p className="text-sm text-gray-600 dark:text-gray-300">
          {form.payment_type === "installment"
            ? "Net Cash (Down Payment)"
            : "Total Sale Price"}
          :
          <span className="font-bold text-lg text-blue-600 dark:text-blue-400 ml-2">
            PKR{" "}
            {round2(
              form.payment_type === "installment"
                ? parseFloat(form.down_payment) || 0
                : parseFloat(form.sale_price) || 0,
            ).toLocaleString()}
          </span>
        </p>
      </div>

      {/* Payment method options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <button
          type="button"
          onClick={() => applyPaymentMethodOption("full_cash")}
          className={`p-4 rounded-lg border-2 transition-all text-left ${
            paymentMethodOption === "full_cash"
              ? "border-green-500 bg-green-50 dark:bg-green-900/20"
              : "border-gray-200 dark:border-gray-700 hover:border-green-300"
          }`}
        >
          <p className="font-semibold text-gray-900 dark:text-white">
            💰 Full Cash
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            100% paid in cash
          </p>
        </button>

        <button
          type="button"
          onClick={() => applyPaymentMethodOption("half_half")}
          className={`p-4 rounded-lg border-2 transition-all text-left ${
            paymentMethodOption === "half_half"
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
          }`}
        >
          <p className="font-semibold text-gray-900 dark:text-white">
            ⚖️ Half & Half
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            50% cash, 50% bank transfer
          </p>
        </button>

        <button
          type="button"
          onClick={() => applyPaymentMethodOption("full_bank")}
          className={`p-4 rounded-lg border-2 transition-all text-left ${
            paymentMethodOption === "full_bank"
              ? "border-purple-500 bg-purple-50 dark:bg-purple-900/20"
              : "border-gray-200 dark:border-gray-700 hover:border-purple-300"
          }`}
        >
          <p className="font-semibold text-gray-900 dark:text-white">
            🏦 Full Bank
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
            100% paid via bank transfer
          </p>
        </button>
      </div>

      {/* Manual adjustment section */}
      <div className="border-t pt-4">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
          Or manually adjust amounts:
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Cash Amount (PKR)
            </label>
            <input
              type="number"
              value={form.cash_amount}
              onChange={(event) => {
                update("cash_amount", event.target.value);
                setPaymentMethodOption(null);
              }}
              className="input-field"
              placeholder="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Bank Transfer Amount (PKR)
            </label>
            <input
              type="number"
              value={form.bank_transfer_amount}
              onChange={(event) => {
                update("bank_transfer_amount", event.target.value);
                setPaymentMethodOption(null);
              }}
              className="input-field"
              placeholder="0"
            />
          </div>
          {(parseFloat(form.bank_transfer_amount) || 0) > 0 && (
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Select Receiving Bank Account
              </label>
              <select
                value={form.bank_account_id}
                onChange={(event) =>
                  update("bank_account_id", event.target.value)
                }
                className={`input-field ${errors.bank_account_id ? "border-red-500" : ""}`}
              >
                <option value="">-- Select Bank Account --</option>
                {bankAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {bankLabel(account)}
                  </option>
                ))}
              </select>
              {fieldError("bank_account_id")}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderWitness = () => (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Witness Information
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Witness Name
          </label>
          <input
            type="text"
            value={form.witness_name}
            onChange={(event) => update("witness_name", event.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Witness Father Name
          </label>
          <input
            type="text"
            value={form.witness_father_name}
            onChange={(event) =>
              update("witness_father_name", event.target.value)
            }
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Witness CNIC
          </label>
          <input
            type="text"
            value={form.witness_cnic}
            onChange={(event) =>
              update("witness_cnic", formatCnic(event.target.value))
            }
            className={`input-field ${errors.witness_cnic ? "border-red-500" : ""}`}
            placeholder={CNIC_PLACEHOLDER}
            maxLength={15}
          />
          {fieldError("witness_cnic")}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Witness Phone
          </label>
          <input
            type="text"
            value={form.witness_phone}
            onChange={(event) => update("witness_phone", event.target.value)}
            className="input-field"
          />
        </div>
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Witness CNIC (Front)
          </label>
          <div className="flex flex-col md:flex-row gap-4">
            <button
              type="button"
              onClick={handleWitnessCnicImageSelect}
              className="btn-secondary"
            >
              {form.witness_cnic_photo_path ? "Replace Front" : "Upload Front"}
            </button>
            {form.witness_cnic_photo_path && (
              <div className="flex items-start gap-3">
                <img
                  src={toFileUrl(form.witness_cnic_photo_path)}
                  alt="Witness CNIC Front"
                  className="w-44 h-28 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = IMG_PLACEHOLDER;
                  }}
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
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Witness CNIC (Back)
          </label>
          <div className="flex flex-col md:flex-row gap-4">
            <button
              type="button"
              onClick={handleWitnessCnicBackImageSelect}
              className="btn-secondary"
            >
              {form.witness_cnic_photo_back_path
                ? "Replace Back"
                : "Upload Back"}
            </button>
            {form.witness_cnic_photo_back_path && (
              <div className="flex items-start gap-3">
                <img
                  src={toFileUrl(form.witness_cnic_photo_back_path)}
                  alt="Witness CNIC Back"
                  className="w-44 h-28 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = IMG_PLACEHOLDER;
                  }}
                />
                <button
                  type="button"
                  onClick={() => update("witness_cnic_photo_back_path", "")}
                  className="text-sm text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderReview = () => {
    const reviewRow = (label: string, value: string | number | undefined) => {
      if (value === undefined || value === "" || value === 0) return null;
      return (
        <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {label}
          </span>
          <span className="text-sm font-medium text-gray-900 dark:text-white text-right max-w-[60%]">
            {value}
          </span>
        </div>
      );
    };

    return (
      <div className="space-y-6">
        {/* Vehicle */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Vehicle
            </h3>
            <button
              type="button"
              onClick={() => setStep(0)}
              className="text-sm text-primary-600 hover:underline"
            >
              Edit
            </button>
          </div>
          {selectedVehicle && (
            <p className="font-medium text-gray-900 dark:text-white mb-2">
              {selectedVehicle.make} {selectedVehicle.model} (
              {(selectedVehicle as any).year_of_manufacture ||
                selectedVehicle.year}
              )
              {selectedVehicle.registration_number
                ? ` - ${selectedVehicle.registration_number}`
                : ""}
            </p>
          )}
        </div>

        {/* Buyer */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Buyer
            </h3>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-sm text-primary-600 hover:underline"
            >
              Edit
            </button>
          </div>
          {selectedCustomer && (
            <>
              <p className="font-medium text-gray-900 dark:text-white">
                {selectedCustomer.name}
              </p>
              {selectedCustomer.cnic && (
                <p className="text-sm text-gray-500 mt-1">
                  CNIC: {selectedCustomer.cnic}
                </p>
              )}
            </>
          )}
        </div>

        {/* Payment */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Payment
            </h3>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-sm text-primary-600 hover:underline"
            >
              Edit
            </button>
          </div>
          {reviewRow(
            "Sale Price",
            `PKR ${(parseFloat(form.sale_price) || 0).toLocaleString()}`,
          )}
          {reviewRow(
            "Payment Type",
            PAYMENT_TYPES.find((t) => t.value === form.payment_type)?.label,
          )}
          {reviewRow(
            "Cash Amount",
            form.cash_amount
              ? `PKR ${(parseFloat(form.cash_amount) || 0).toLocaleString()}`
              : undefined,
          )}
          {reviewRow(
            "Bank Transfer",
            form.bank_transfer_amount
              ? `PKR ${(parseFloat(form.bank_transfer_amount) || 0).toLocaleString()}`
              : undefined,
          )}
          {form.bank_account_id &&
            reviewRow(
              "Bank Account",
              bankAccounts.find((a) => a.id === form.bank_account_id)?.name,
            )}
          {form.payment_type === "installment" && (
            <>
              {reviewRow(
                "Net Cash",
                `PKR ${(parseFloat(form.down_payment) || 0).toLocaleString()}`,
              )}
              {reviewRow(
                "Installments",
                `${form.installment_count} (${form.installment_duration_type})`,
              )}
              {reviewRow(
                "Remaining",
                `PKR ${remainingAmount.toLocaleString()}`,
              )}
            </>
          )}
          {reviewRow("Notes", form.notes)}
        </div>

        {/* Witness */}
        {form.witness_required && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Witness
              </h3>
              <button
                type="button"
                onClick={() => setStep(witnessStepIndex)}
                className="text-sm text-primary-600 hover:underline"
              >
                Edit
              </button>
            </div>
            {reviewRow("Name", form.witness_name)}
            {reviewRow("Father Name", form.witness_father_name)}
            {reviewRow("CNIC", form.witness_cnic)}
            {reviewRow("Phone", form.witness_phone)}
          </div>
        )}
      </div>
    );
  };

  // Build step content dynamically
  const getStepContent = () => {
    if (step === 0) return renderSelectVehicle();
    if (step === 1) return renderSelectBuyer();
    if (step === 2) return renderPayment();
    if (step === installmentStepIndex) return renderInstallmentDetails();
    if (step === paymentMethodStepIndex) return renderPaymentMethod();
    if (form.witness_required && step === witnessStepIndex)
      return renderWitness();
    return renderReview();
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

      <FormStepper steps={steps} currentStep={step} onStepClick={goToStep} />

      {getStepContent()}

      <StepNavigation
        currentStep={step}
        totalSteps={steps.length}
        onBack={goBack}
        onNext={goNext}
        onSubmit={handleSubmit}
        submitLabel={isEdit ? "Update Sale" : "Create Sale"}
      />
    </div>
  );
}
