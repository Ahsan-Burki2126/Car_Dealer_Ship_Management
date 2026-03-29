import React, { useEffect, useState, Suspense, useCallback, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import type { Vehicle, VehicleInspection } from "../../shared/types";
import { formatCnic, isValidCnic, CNIC_PLACEHOLDER } from "../../shared/constants";
import { toast } from "react-toastify";
import { FiArrowLeft, FiFileText, FiUploadCloud, FiSkipForward } from "react-icons/fi";
import { toFileUrl } from "../utils/filePaths";
import ErrorBoundary from "../components/ErrorBoundary";
import FormStepper, { StepNavigation } from "../components/FormStepper";
import { generatePurchaseReportPdf } from "../utils/pdfGenerator";
import AmountWords from "../components/AmountWords";

const IMG_PLACEHOLDER =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='140'%3E%3Crect width='200' height='140' fill='%23e5e7eb'/%3E%3Ctext x='100' y='76' text-anchor='middle' fill='%239ca3af' font-size='13' font-family='sans-serif'%3ENo image%3C/text%3E%3C/svg%3E";

const VehicleInspectionSVG = React.lazy(() =>
  import("../components/inspection/VehicleInspectionSVG").catch((err) => {
    console.error("Failed to load inspection component:", err);
    return {
      default: () => (
        <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            Inspection component is not available. You can proceed with vehicle
            information and skip inspection.
          </p>
        </div>
      ),
    };
  }),
);

const WITNESS_CONFIRM_STEP = 2; // always present

export default function VehicleFormPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [savedFormData, setSavedFormData] = useState<typeof form | null>(null);
  const [pdfSaving, setPdfSaving] = useState(false);

  const [form, setForm] = useState({
    photo_path: "",
    seller_photo_path: "",
    seller_cnic_photo_path: "",
    seller_cnic_photo_back_path: "",
    registration_number: "",
    chassis_number: "",
    engine_number: "",
    make: "",
    model: "",
    year_of_manufacture: new Date().getFullYear(),
    year_of_import: "" as string | number,
    color: "",
    assembling_company: "",
    extra_keys_available: true,
    extra_keys_count: "" as string | number,
    file_available: false,
    file_pages: "" as string | number,
    current_smart_card: false,
    smart_card_count: "" as string | number,
    purchase_price: "",
    purchase_date: new Date().toISOString().split("T")[0],
    seller_name: "",
    seller_father_name: "",
    seller_caste: "",
    seller_address: "",
    seller_cnic: "",
    seller_phone: "",
    seller_witness_required: false as boolean,
    seller_witness_name: "",
    seller_witness_father_name: "",
    seller_witness_cnic: "",
    seller_witness_phone: "",
    notes: "",
    vehicleInspection: {
      markers: [],
      completedPanels: [],
    } as VehicleInspection,
  });

  useEffect(() => {
    if (isEdit && id) loadVehicle();
  }, [id]);

  const loadVehicle = async () => {
    const result = await window.api.getVehicleById(id!);
    if (result.success && result.data) {
      const v = result.data;
      setForm({
        registration_number: v.registration_number || "",
        photo_path: v.photo_path || "",
        seller_photo_path: v.seller_photo_path || "",
        seller_cnic_photo_path: v.seller_cnic_photo_path || "",
        seller_cnic_photo_back_path: v.seller_cnic_photo_back_path || "",
        chassis_number: v.chassis_number || "",
        engine_number: v.engine_number || "",
        make: v.make,
        model: v.model,
        year_of_manufacture: v.year_of_manufacture || v.year_of_manufacture,
        year_of_import: (v as any).year_of_import || "",
        color: v.color || "",
        assembling_company: v.assembling_company || "",
        extra_keys_available: v.extra_keys_available ?? true,
        extra_keys_count: (v as any).extra_keys_count || "",
        file_available: (v as any).file_available ?? false,
        file_pages: (v as any).file_pages || "",
        current_smart_card: (v as any).current_smart_card ?? false,
        smart_card_count: (v as any).smart_card_count || "",
        purchase_price: String(v.purchase_price),
        purchase_date: v.purchase_date || "",
        seller_name: v.seller_name || "",
        seller_father_name: v.seller_father_name || "",
        seller_caste: v.seller_caste || "",
        seller_address: v.seller_address || "",
        seller_cnic: v.seller_cnic || "",
        seller_phone: v.seller_phone || "",
        seller_witness_required: Boolean(v.seller_witness_name || v.seller_witness_cnic),
        seller_witness_name: v.seller_witness_name || "",
        seller_witness_father_name: v.seller_witness_father_name || "",
        seller_witness_cnic: v.seller_witness_cnic || "",
        seller_witness_phone: v.seller_witness_phone || "",
        notes: v.notes || "",
        vehicleInspection: v.vehicleInspection || {
          markers: [],
          completedPanels: [],
        },
      });
    }
  };

  const handleSubmit = async () => {
    const data = {
      ...form,
      purchase_price: parseFloat(form.purchase_price) || 0,
      year_of_import: form.year_of_import ? Number(form.year_of_import) : undefined,
      extra_keys_count: form.extra_keys_count ? Number(form.extra_keys_count) : undefined,
      file_pages: form.file_pages ? Number(form.file_pages) : undefined,
      smart_card_count: form.smart_card_count ? Number(form.smart_card_count) : undefined,
    };

    let result;
    if (isEdit) {
      result = await window.api.updateVehicle(user!.id, id!, data);
    } else {
      result = await window.api.addVehicle(user!.id, data);
    }

    if (result.success) {
      toast.success(isEdit ? "Vehicle updated" : "Vehicle added");
      if (!isEdit) {
        setSavedFormData(form);
        setShowPdfModal(true);
      } else {
        navigate(`/vehicles/${id}`);
      }
    } else {
      toast.error(result.error);
    }
  };

  const handlePdfSave = async (uploadToDrive: boolean) => {
    if (!savedFormData || !user) return;
    setPdfSaving(true);
    try {
      const doc = generatePurchaseReportPdf({
        ...savedFormData,
        purchase_price: parseFloat(savedFormData.purchase_price) || 0,
      });
      const pdfBytes = new Uint8Array(doc.output("arraybuffer"));
      const chassis = (savedFormData.chassis_number || "").trim().replace(/[^a-zA-Z0-9]/g, "_");
      const fileName = chassis
        ? `${chassis}.pdf`
        : `purchase_report_${new Date().toISOString().split("T")[0]}.pdf`;

      const result = await (window.api as any).savePdfToBackup(
        user.id,
        pdfBytes,
        fileName,
        uploadToDrive,
      );
      if (result.success) {
        const driveMsg = uploadToDrive && result.data?.driveFileId ? " & uploaded to Google Drive" : "";
        toast.success(`Purchase report saved locally${driveMsg}`);
      } else {
        toast.error(result.error || "Failed to save PDF");
      }
    } catch (err) {
      toast.error("Failed to generate PDF");
    }
    setPdfSaving(false);
    setShowPdfModal(false);
    navigate("/vehicles");
  };

  const updateForm = (field: string, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleVehicleImageSelect = async () => {
    const selected = await window.api.selectImage();
    if (!selected.success || !selected.data) return;
    const saved = await window.api.saveImage(selected.data, "vehicles");
    if (!saved.success || !saved.data) {
      toast.error(saved.error || "Failed to save vehicle image");
      return;
    }
    updateForm("photo_path", saved.data);
  };

  const handleSellerPhotoSelect = async () => {
    const selected = await window.api.selectImage();
    if (!selected.success || !selected.data) return;
    const saved = await window.api.saveImage(selected.data, "seller-photo");
    if (!saved.success || !saved.data) {
      toast.error(saved.error || "Failed to save seller photo");
      return;
    }
    updateForm("seller_photo_path", saved.data);
  };

  const handleSellerCnicImageSelect = async () => {
    const selected = await window.api.selectImage();
    if (!selected.success || !selected.data) return;
    const saved = await window.api.saveImage(selected.data, "seller-cnic");
    if (!saved.success || !saved.data) {
      toast.error(saved.error || "Failed to save seller CNIC image");
      return;
    }
    updateForm("seller_cnic_photo_path", saved.data);
  };

  const handleSellerCnicBackImageSelect = async () => {
    const selected = await window.api.selectImage();
    if (!selected.success || !selected.data) return;
    const saved = await window.api.saveImage(selected.data, "seller-cnic-back");
    if (!saved.success || !saved.data) {
      toast.error(saved.error || "Failed to save seller CNIC back image");
      return;
    }
    updateForm("seller_cnic_photo_back_path", saved.data);
  };

  // Dynamic steps
  const STEPS = useMemo(() => {
    const base = [
      { label: "Vehicle Details" },
      { label: "Seller & Purchase" },
      { label: "Witness?" },
    ];
    if (form.seller_witness_required) base.push({ label: "Witness" });
    base.push({ label: "Inspection" });
    base.push({ label: "Review" });
    return base;
  }, [form.seller_witness_required]);

  const witnessStepIdx     = form.seller_witness_required ? WITNESS_CONFIRM_STEP + 1 : -1;
  const inspectionStepIdx  = form.seller_witness_required ? WITNESS_CONFIRM_STEP + 2 : WITNESS_CONFIRM_STEP + 1;
  const reviewStepIdx      = form.seller_witness_required ? WITNESS_CONFIRM_STEP + 3 : WITNESS_CONFIRM_STEP + 2;

  const validateStep = useCallback(
    (s: number): boolean => {
      const errs: Record<string, string> = {};
      if (s === 0) {
        if (!form.make.trim()) errs.make = "Make is required";
        if (!form.model.trim()) errs.model = "Model is required";
        if (!form.year_of_manufacture) errs.year_of_manufacture = "Year of manufacture is required";
        if (!form.chassis_number.trim()) errs.chassis_number = "Chassis number is required";
        if (!form.engine_number.trim()) errs.engine_number = "Engine number is required";
        if (!form.color.trim()) errs.color = "Color is required";
      }
      if (s === 1) {
        if (!form.purchase_price || parseFloat(form.purchase_price) <= 0)
          errs.purchase_price = "Purchase price is required";
        if (!form.purchase_date) errs.purchase_date = "Purchase date is required";
        if (!form.seller_name.trim()) errs.seller_name = "Seller name is required";
        if (form.seller_cnic && !isValidCnic(form.seller_cnic))
          errs.seller_cnic = "Invalid CNIC format (XXXXX-XXXXXXX-X)";
      }
      if (s === witnessStepIdx && form.seller_witness_required) {
        if (form.seller_witness_cnic && !isValidCnic(form.seller_witness_cnic))
          errs.seller_witness_cnic = "Invalid CNIC format (XXXXX-XXXXXXX-X)";
      }
      setErrors(errs);
      if (Object.keys(errs).length > 0) {
        toast.error(Object.values(errs)[0]);
        return false;
      }
      return true;
    },
    [form, witnessStepIdx],
  );

  const goNext = () => {
    if (validateStep(step)) setStep((s) => Math.min(s + 1, STEPS.length - 1));
  };
  const goBack = () => setStep((s) => Math.max(s - 1, 0));
  const goToStep = (s: number) => setStep(s);

  const fieldError = (field: string) =>
    errors[field] ? (
      <p className="text-red-500 text-xs mt-1">{errors[field]}</p>
    ) : null;

  // ── Step renderers ──

  const renderVehicleDetails = () => (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Vehicle Details
      </h2>
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Vehicle Image
        </label>
        <div className="flex flex-col md:flex-row gap-4">
          <button type="button" onClick={handleVehicleImageSelect} className="btn-secondary">
            {form.photo_path ? "Replace Image" : "Upload Image"}
          </button>
          {form.photo_path && (
            <div className="flex items-start gap-3">
              <img
                src={toFileUrl(form.photo_path)}
                alt="Vehicle"
                className="w-48 h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                onError={(e) => { (e.target as HTMLImageElement).src = IMG_PLACEHOLDER; }}
              />
              <button
                type="button"
                onClick={() => updateForm("photo_path", "")}
                className="text-sm text-red-600 hover:underline"
              >
                Remove
              </button>
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Make *
          </label>
          <input
            type="text"
            value={form.make}
            onChange={(e) => updateForm("make", e.target.value)}
            className={`input-field ${errors.make ? "border-red-500" : ""}`}
            required
          />
          {fieldError("make")}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Model *
          </label>
          <input
            type="text"
            value={form.model}
            onChange={(e) => updateForm("model", e.target.value)}
            className={`input-field ${errors.model ? "border-red-500" : ""}`}
            required
          />
          {fieldError("model")}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Year of Manufacture *
          </label>
          <input
            type="number"
            value={form.year_of_manufacture}
            onChange={(e) => updateForm("year_of_manufacture", parseInt(e.target.value))}
            className={`input-field ${errors.year_of_manufacture ? "border-red-500" : ""}`}
            required
          />
          {fieldError("year_of_manufacture")}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Year of Import
          </label>
          <input
            type="number"
            value={form.year_of_import}
            onChange={(e) => updateForm("year_of_import", e.target.value ? parseInt(e.target.value) : "")}
            className="input-field"
            placeholder="e.g. 2024"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Registration Number
          </label>
          <input
            type="text"
            value={form.registration_number}
            onChange={(e) => updateForm("registration_number", e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Chassis Number *
          </label>
          <input
            type="text"
            value={form.chassis_number}
            onChange={(e) => updateForm("chassis_number", e.target.value.toUpperCase())}
            className={`input-field ${errors.chassis_number ? "border-red-500" : ""}`}
            placeholder="e.g. ABC123XYZ456789"
            required
          />
          {fieldError("chassis_number")}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Engine Number *
          </label>
          <input
            type="text"
            value={form.engine_number}
            onChange={(e) => updateForm("engine_number", e.target.value.toUpperCase())}
            className={`input-field ${errors.engine_number ? "border-red-500" : ""}`}
            required
          />
          {fieldError("engine_number")}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Color *
          </label>
          <input
            type="text"
            value={form.color}
            onChange={(e) => updateForm("color", e.target.value)}
            className={`input-field ${errors.color ? "border-red-500" : ""}`}
            required
          />
          {fieldError("color")}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Assembling Company
          </label>
          <input
            type="text"
            value={form.assembling_company}
            onChange={(e) => updateForm("assembling_company", e.target.value)}
            className="input-field"
            placeholder="e.g. Indus Motor, Atlas Honda"
          />
        </div>

        {/* Extra Keys Available */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Extra Keys Available
          </label>
          <select
            value={form.extra_keys_available ? "yes" : "no"}
            onChange={(e) => {
              const val = e.target.value === "yes";
              updateForm("extra_keys_available", val);
              if (!val) updateForm("extra_keys_count", "");
            }}
            className="input-field"
          >
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
          {form.extra_keys_available && (
            <input
              type="number"
              value={form.extra_keys_count}
              onChange={(e) => updateForm("extra_keys_count", e.target.value ? parseInt(e.target.value) : "")}
              className="input-field mt-2"
              placeholder="How many extra keys?"
              min={0}
            />
          )}
        </div>

        {/* File Available */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            File Available
          </label>
          <select
            value={form.file_available ? "yes" : "no"}
            onChange={(e) => {
              const val = e.target.value === "yes";
              updateForm("file_available", val);
              if (!val) updateForm("file_pages", "");
            }}
            className="input-field"
          >
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
          {form.file_available && (
            <input
              type="number"
              value={form.file_pages}
              onChange={(e) => updateForm("file_pages", e.target.value ? parseInt(e.target.value) : "")}
              className="input-field mt-2"
              placeholder="How many pages?"
              min={0}
            />
          )}
        </div>

        {/* Current Smart Card */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Current Smart Card
          </label>
          <select
            value={form.current_smart_card ? "yes" : "no"}
            onChange={(e) => {
              const val = e.target.value === "yes";
              updateForm("current_smart_card", val);
              if (!val) updateForm("smart_card_count", "");
            }}
            className="input-field"
          >
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
          {form.current_smart_card && (
            <input
              type="number"
              value={form.smart_card_count}
              onChange={(e) => updateForm("smart_card_count", e.target.value ? parseInt(e.target.value) : "")}
              className="input-field mt-2"
              placeholder="Number of cards available"
              min={0}
            />
          )}
        </div>
      </div>
    </div>
  );

  const renderSellerPurchase = () => (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Purchase & Seller Information
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Purchase Date *
          </label>
          <input
            type="date"
            value={form.purchase_date}
            onChange={(e) => updateForm("purchase_date", e.target.value)}
            className={`input-field ${errors.purchase_date ? "border-red-500" : ""}`}
            required
          />
          {fieldError("purchase_date")}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Purchase Price *
          </label>
          <input
            type="number"
            value={form.purchase_price}
            onChange={(e) => updateForm("purchase_price", e.target.value)}
            className={`input-field ${errors.purchase_price ? "border-red-500" : ""}`}
            required
          />
          <AmountWords value={form.purchase_price} />
          {fieldError("purchase_price")}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Seller Name *
          </label>
          <input
            type="text"
            value={form.seller_name}
            onChange={(e) => updateForm("seller_name", e.target.value)}
            className={`input-field ${errors.seller_name ? "border-red-500" : ""}`}
            required
          />
          {fieldError("seller_name")}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Father's Name
          </label>
          <input
            type="text"
            value={form.seller_father_name}
            onChange={(e) => updateForm("seller_father_name", e.target.value)}
            className="input-field"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Caste / Tribe
          </label>
          <input
            type="text"
            value={form.seller_caste}
            onChange={(e) => updateForm("seller_caste", e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Seller CNIC
          </label>
          <input
            type="text"
            value={form.seller_cnic}
            onChange={(e) => updateForm("seller_cnic", formatCnic(e.target.value))}
            className={`input-field ${errors.seller_cnic ? "border-red-500" : ""}`}
            placeholder={CNIC_PLACEHOLDER}
            maxLength={15}
            required
          />
          {fieldError("seller_cnic")}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Contact
          </label>
          <input
            type="text"
            value={form.seller_phone}
            onChange={(e) => updateForm("seller_phone", e.target.value)}
            className="input-field"
            required
          />
        </div>
        <div className="md:col-span-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Seller Address
          </label>
          <input
            type="text"
            value={form.seller_address}
            onChange={(e) => updateForm("seller_address", e.target.value)}
            className="input-field"
            required
          />
        </div>
        <div className="md:col-span-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Seller Photo
          </label>
          <div className="flex flex-col md:flex-row gap-4">
            <button type="button" onClick={handleSellerPhotoSelect} className="btn-secondary">
              {form.seller_photo_path ? "Replace Seller Photo" : "Upload Seller Photo"}
            </button>
            {form.seller_photo_path && (
              <div className="flex items-start gap-3">
                <img
                  src={toFileUrl(form.seller_photo_path)}
                  alt="Seller"
                  className="w-28 h-28 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                  onError={(e) => { (e.target as HTMLImageElement).src = IMG_PLACEHOLDER; }}
                />
                <button
                  type="button"
                  onClick={() => updateForm("seller_photo_path", "")}
                  className="text-sm text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="md:col-span-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Seller CNIC (Front)
          </label>
          <div className="flex flex-col md:flex-row gap-4">
            <button type="button" onClick={handleSellerCnicImageSelect} className="btn-secondary">
              {form.seller_cnic_photo_path ? "Replace Front" : "Upload Front"}
            </button>
            {form.seller_cnic_photo_path && (
              <div className="flex items-start gap-3">
                <img
                  src={toFileUrl(form.seller_cnic_photo_path)}
                  alt="Seller CNIC Front"
                  className="w-44 h-28 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                  onError={(e) => { (e.target as HTMLImageElement).src = IMG_PLACEHOLDER; }}
                />
                <button
                  type="button"
                  onClick={() => updateForm("seller_cnic_photo_path", "")}
                  className="text-sm text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>
        <div className="md:col-span-3">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Seller CNIC (Back)
          </label>
          <div className="flex flex-col md:flex-row gap-4">
            <button type="button" onClick={handleSellerCnicBackImageSelect} className="btn-secondary">
              {form.seller_cnic_photo_back_path ? "Replace Back" : "Upload Back"}
            </button>
            {form.seller_cnic_photo_back_path && (
              <div className="flex items-start gap-3">
                <img
                  src={toFileUrl(form.seller_cnic_photo_back_path)}
                  alt="Seller CNIC Back"
                  className="w-44 h-28 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                  onError={(e) => { (e.target as HTMLImageElement).src = IMG_PLACEHOLDER; }}
                />
                <button
                  type="button"
                  onClick={() => updateForm("seller_cnic_photo_back_path", "")}
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

  const renderWitnessConfirmation = () => (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        Witness
      </h2>
      <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
        Is there a witness for this purchase?
      </p>
      <div className="grid grid-cols-2 gap-4">
        <button
          type="button"
          onClick={() => {
            updateForm("seller_witness_required", true);
            setStep(WITNESS_CONFIRM_STEP + 1);
          }}
          className={`p-6 rounded-xl border-2 text-center transition-all ${
            form.seller_witness_required
              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
              : "border-gray-200 dark:border-gray-700 hover:border-blue-300"
          }`}
        >
          <p className="text-2xl mb-2">✅</p>
          <p className="font-semibold text-gray-900 dark:text-white">Yes, add witness</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Proceed to witness details</p>
        </button>
        <button
          type="button"
          onClick={() => {
            updateForm("seller_witness_required", false);
            setStep(WITNESS_CONFIRM_STEP + 1);
          }}
          className={`p-6 rounded-xl border-2 text-center transition-all ${
            form.seller_witness_required === false
              ? "border-gray-400 bg-gray-50 dark:bg-gray-700/30"
              : "border-gray-200 dark:border-gray-700 hover:border-gray-400"
          }`}
        >
          <p className="text-2xl mb-2">⏭️</p>
          <p className="font-semibold text-gray-900 dark:text-white">No witness</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Skip and continue</p>
        </button>
      </div>
    </div>
  );

  const renderWitness = () => (
    <div className="space-y-6">
      {/* Seller Witness */}
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Seller's Witness
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Witness Name
            </label>
            <input
              type="text"
              value={form.seller_witness_name}
              onChange={(e) => updateForm("seller_witness_name", e.target.value)}
              className="input-field"
              required={form.seller_witness_required}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Witness Father's Name
            </label>
            <input
              type="text"
              value={form.seller_witness_father_name}
              onChange={(e) => updateForm("seller_witness_father_name", e.target.value)}
              className="input-field"
              required={form.seller_witness_required}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Witness CNIC
            </label>
            <input
              type="text"
              value={form.seller_witness_cnic}
              onChange={(e) => updateForm("seller_witness_cnic", formatCnic(e.target.value))}
              className={`input-field ${errors.seller_witness_cnic ? "border-red-500" : ""}`}
              placeholder={CNIC_PLACEHOLDER}
              maxLength={15}
              required={form.seller_witness_required}
            />
            {fieldError("seller_witness_cnic")}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Witness Phone
            </label>
            <input
              type="text"
              value={form.seller_witness_phone}
              onChange={(e) => updateForm("seller_witness_phone", e.target.value)}
              className="input-field"
              required={form.seller_witness_required}
            />
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="card">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Notes
        </label>
        <textarea
          value={form.notes}
          onChange={(e) => updateForm("notes", e.target.value)}
          className="input-field"
          rows={3}
        />
      </div>
    </div>
  );

  const renderInspection = () => (
    <ErrorBoundary>
      <div className="card">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Vehicle Inspection
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Click on any panel in the diagram to add or update damage markers.
        </p>
        <Suspense
          fallback={
            <div className="p-6 bg-gray-100 dark:bg-gray-900 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Loading vehicle inspection blueprint...
              </p>
            </div>
          }
        >
          <VehicleInspectionSVG
            inspection={form.vehicleInspection}
            onInspectionChange={(inspection) =>
              updateForm("vehicleInspection", inspection)
            }
            inspectorName={user?.full_name}
          />
        </Suspense>
      </div>
    </ErrorBoundary>
  );

  const renderReview = () => {
    const reviewRow = (label: string, value: string | number | boolean | undefined) => {
      if (value === undefined || value === "") return null;
      const display = typeof value === "boolean" ? (value ? "Yes" : "No") : String(value);
      return (
        <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
          <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white text-right max-w-[60%]">
            {display}
          </span>
        </div>
      );
    };

    return (
      <div className="space-y-6">
        {/* Vehicle Details */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Vehicle Details
            </h3>
            <button
              type="button"
              onClick={() => setStep(0)}
              className="text-sm text-primary-600 hover:underline"
            >
              Edit
            </button>
          </div>
          {form.photo_path && (
            <img
              src={toFileUrl(form.photo_path)}
              alt="Vehicle"
              className="w-48 h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700 mb-4"
              onError={(e) => { (e.target as HTMLImageElement).src = IMG_PLACEHOLDER; }}
            />
          )}
          {reviewRow("Make", form.make)}
          {reviewRow("Model", form.model)}
          {reviewRow("Year of Manufacture", form.year_of_manufacture)}
          {reviewRow("Year of Import", form.year_of_import)}
          {reviewRow("Registration", form.registration_number)}
          {reviewRow("Chassis Number", form.chassis_number)}
          {reviewRow("Engine Number", form.engine_number)}
          {reviewRow("Color", form.color)}
          {reviewRow("Assembling Company", form.assembling_company)}
          {reviewRow("Extra Keys Available", form.extra_keys_available)}
          {form.extra_keys_available && reviewRow("Extra Keys Count", form.extra_keys_count)}
          {reviewRow("File Available", form.file_available)}
          {form.file_available && reviewRow("File Pages", form.file_pages)}
          {reviewRow("Current Smart Card", form.current_smart_card)}
          {form.current_smart_card && reviewRow("Smart Card Count", form.smart_card_count)}
        </div>

        {/* Purchase & Seller */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Purchase & Seller
            </h3>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-sm text-primary-600 hover:underline"
            >
              Edit
            </button>
          </div>
          {reviewRow("Purchase Date", form.purchase_date)}
          {reviewRow("Purchase Price", form.purchase_price ? `Rs ${parseFloat(form.purchase_price).toLocaleString()}` : "")}
          {reviewRow("Seller Name", form.seller_name)}
          {reviewRow("Father's Name", form.seller_father_name)}
          {reviewRow("Caste / Tribe", form.seller_caste)}
          {reviewRow("Seller CNIC", form.seller_cnic)}
          {reviewRow("Contact", form.seller_phone)}
          {reviewRow("Seller Address", form.seller_address)}
        </div>

        {/* Witness */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Witness
            </h3>
            <button
              type="button"
              onClick={() => setStep(2)}
              className="text-sm text-primary-600 hover:underline"
            >
              Edit
            </button>
          </div>
          {reviewRow("Witness Name", form.seller_witness_name)}
          {reviewRow("Witness Father's Name", form.seller_witness_father_name)}
          {reviewRow("Witness CNIC", form.seller_witness_cnic)}
          {reviewRow("Witness Phone", form.seller_witness_phone)}
          {reviewRow("Notes", form.notes)}
        </div>

        {/* Inspection Summary */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Inspection
            </h3>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="text-sm text-primary-600 hover:underline"
            >
              Edit
            </button>
          </div>
          {reviewRow("Panels Inspected", form.vehicleInspection.completedPanels?.length || 0)}
          {reviewRow("Damage Markers", form.vehicleInspection.markers?.length || 0)}
        </div>
      </div>
    );
  };

  const getStepContent = () => {
    if (step === 0) return renderVehicleDetails();
    if (step === 1) return renderSellerPurchase();
    if (step === WITNESS_CONFIRM_STEP) return renderWitnessConfirmation();
    if (step === witnessStepIdx) return renderWitness();
    if (step === inspectionStepIdx) return renderInspection();
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
          {isEdit ? "Edit Vehicle" : "Add New Vehicle"}
        </h1>
      </div>

      <FormStepper steps={STEPS} currentStep={step} onStepClick={goToStep} />

      {getStepContent()}

      <StepNavigation
        currentStep={step}
        totalSteps={STEPS.length}
        onBack={goBack}
        onNext={goNext}
        onSubmit={handleSubmit}
        submitLabel={isEdit ? "Update Vehicle" : "Save Vehicle"}
      />

      {/* PDF Save Modal */}
      {showPdfModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col items-center text-center gap-4">
              <div className="w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <FiFileText className="text-blue-600 dark:text-blue-400" size={32} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-1">
                  Generate Purchase Report?
                </h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Vehicle added successfully. Would you like to generate and save the purchase report PDF?
                  {savedFormData?.chassis_number && (
                    <span className="block mt-1 font-medium text-gray-700 dark:text-gray-300">
                      File will be saved as: <span className="text-blue-600">{savedFormData.chassis_number}.pdf</span>
                    </span>
                  )}
                </p>
              </div>
              <div className="flex flex-col w-full gap-3 mt-2">
                <button
                  onClick={() => handlePdfSave(true)}
                  disabled={pdfSaving}
                  className="btn-primary flex items-center justify-center gap-2 w-full disabled:opacity-50"
                >
                  <FiUploadCloud size={16} />
                  {pdfSaving ? "Saving..." : "Yes — Save Locally & Upload to Google Drive"}
                </button>
                <button
                  onClick={() => handlePdfSave(false)}
                  disabled={pdfSaving}
                  className="btn-secondary flex items-center justify-center gap-2 w-full disabled:opacity-50"
                >
                  <FiFileText size={16} />
                  Yes — Save Locally Only
                </button>
                <button
                  onClick={() => { setShowPdfModal(false); navigate("/vehicles"); }}
                  disabled={pdfSaving}
                  className="flex items-center justify-center gap-2 w-full py-2 text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
                >
                  <FiSkipForward size={14} />
                  Skip — Don't Generate PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
