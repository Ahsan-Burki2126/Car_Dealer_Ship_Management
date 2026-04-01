import React, { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import { formatCnic, isValidCnic, CNIC_PLACEHOLDER } from "../../shared/constants";
import { toast } from "react-toastify";
import { FiArrowLeft } from "react-icons/fi";
import { toFileUrl } from "../utils/filePaths";
import { generatePlaceholderSVG } from "../utils/themeUtils";
import FormStepper, { StepNavigation } from "../components/FormStepper";

const STEPS = [
  { label: "Personal Info" },
  { label: "Photos & Address" },
  { label: "Review" },
];

export default function CustomerFormPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const location = useLocation();
  const isEdit = Boolean(id);
  const returnTo = (location.state as any)?.returnTo as string | undefined;
  const returnState = (location.state as any)?.returnState as Record<string, any> | undefined;
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [form, setForm] = useState({
    name: "",
    father_name: "",
    caste: "",
    cnic: "",
    phone: "",
    address: "",
    photo_path: "",
    cnic_photo_path: "",
    cnic_photo_back_path: "",
    notes: "",
  });

  useEffect(() => {
    if (isEdit && id) loadCustomer();
  }, [id]);

  const loadCustomer = async () => {
    const result = await window.api.getCustomerById(id!);
    if (result.success && result.data) {
      const c = result.data;
      setForm({
        name: c.name,
        father_name: c.father_name || "",
        caste: c.caste || "",
        cnic: c.cnic || "",
        phone: c.phone || "",
        address: c.address || "",
        photo_path: c.photo_path || "",
        cnic_photo_path: c.cnic_photo_path || "",
        cnic_photo_back_path: c.cnic_photo_back_path || "",
        notes: c.notes || "",
      });
    }
  };

  const handleCustomerImageSelect = async () => {
    const selected = await window.api.selectImage();
    if (!selected.success || !selected.data) return;
    const saved = await window.api.saveImage(selected.data, "customers");
    if (!saved.success || !saved.data) {
      toast.error(saved.error || "Failed to save customer image");
      return;
    }
    update("photo_path", saved.data);
  };

  const handleCnicImageSelect = async () => {
    const selected = await window.api.selectImage();
    if (!selected.success || !selected.data) return;
    const saved = await window.api.saveImage(selected.data, "customer-cnic");
    if (!saved.success || !saved.data) {
      toast.error(saved.error || "Failed to save CNIC image");
      return;
    }
    update("cnic_photo_path", saved.data);
  };

  const handleCnicBackImageSelect = async () => {
    const selected = await window.api.selectImage();
    if (!selected.success || !selected.data) return;
    const saved = await window.api.saveImage(selected.data, "customer-cnic-back");
    if (!saved.success || !saved.data) {
      toast.error(saved.error || "Failed to save CNIC back image");
      return;
    }
    update("cnic_photo_back_path", saved.data);
  };

  const handleSubmit = async () => {
    let result;
    if (isEdit) {
      result = await window.api.updateCustomer(user!.id, id!, form);
    } else {
      result = await window.api.addCustomer(user!.id, form);
    }
    if (result.success) {
      toast.success(isEdit ? "Customer updated" : "Customer added");
      if (!isEdit && returnTo) {
        navigate(returnTo, {
          state: { ...returnState, newCustomerId: result.data?.id },
        });
      } else {
        navigate(isEdit ? `/customers/${id}` : "/customers");
      }
    } else {
      toast.error(result.error);
    }
  };

  const update = (field: string, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const validateStep = useCallback(
    (s: number): boolean => {
      const errs: Record<string, string> = {};
      if (s === 0) {
        if (!form.name.trim()) errs.name = "Full name is required";
        if (!form.phone.trim()) errs.phone = "Phone number is required";
        if (!form.cnic.trim()) errs.cnic = "CNIC is required";
        else if (!isValidCnic(form.cnic)) errs.cnic = "Invalid CNIC format (XXXXX-XXXXXXX-X)";
        if (!form.father_name.trim()) errs.father_name = "Father's name is required";
      }
      setErrors(errs);
      if (Object.keys(errs).length > 0) {
        const msg = Object.values(errs)[0];
        toast.error(msg);
        return false;
      }
      return true;
    },
    [form],
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

  // ── Step Renderers ──

  const renderPersonalInfo = () => (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Personal Information
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Full Name *
          </label>
          <input
            type="text"
            value={form.name}
            onChange={(e) => update("name", e.target.value)}
            className={`input-field ${errors.name ? "border-red-500" : ""}`}
            required
          />
          {fieldError("name")}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Father's Name *
          </label>
          <input
            type="text"
            value={form.father_name}
            onChange={(e) => update("father_name", e.target.value)}
            className={`input-field ${errors.father_name ? "border-red-500" : ""}`}
            required
          />
          {fieldError("father_name")}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Caste / Tribe
          </label>
          <input
            type="text"
            value={form.caste}
            onChange={(e) => update("caste", e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            CNIC *
          </label>
          <input
            type="text"
            value={form.cnic}
            onChange={(e) => update("cnic", formatCnic(e.target.value))}
            className={`input-field ${errors.cnic ? "border-red-500" : ""}`}
            placeholder={CNIC_PLACEHOLDER}
            maxLength={15}
            required
          />
          {fieldError("cnic")}
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Phone *
          </label>
          <input
            type="text"
            value={form.phone}
            onChange={(e) => update("phone", e.target.value)}
            className={`input-field ${errors.phone ? "border-red-500" : ""}`}
            required
          />
          {fieldError("phone")}
        </div>
      </div>
    </div>
  );

  const renderPhotosAddress = () => (
    <div className="card">
      <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        Photos & Address
      </h2>
      <div className="space-y-6">
        {/* Customer Photo */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Customer Photo
          </label>
          <div className="flex flex-col md:flex-row gap-4">
            <button type="button" onClick={handleCustomerImageSelect} className="btn-secondary">
              {form.photo_path ? "Replace Photo" : "Upload Photo"}
            </button>
            {form.photo_path && (
              <div className="flex items-start gap-3">
                <img
                  src={toFileUrl(form.photo_path)}
                  alt="Customer"
                  className="w-28 h-28 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                  onError={(e) => { (e.target as HTMLImageElement).src = generatePlaceholderSVG(200, 140, "No image"); }}
                />
                <button
                  type="button"
                  onClick={() => update("photo_path", "")}
                  className="text-sm text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>

        {/* CNIC Front */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            CNIC (Front)
          </label>
          <div className="flex flex-col md:flex-row gap-4">
            <button type="button" onClick={handleCnicImageSelect} className="btn-secondary">
              {form.cnic_photo_path ? "Replace Front" : "Upload Front"}
            </button>
            {form.cnic_photo_path && (
              <div className="flex items-start gap-3">
                <img
                  src={toFileUrl(form.cnic_photo_path)}
                  alt="Customer CNIC Front"
                  className="w-44 h-28 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                  onError={(e) => { (e.target as HTMLImageElement).src = generatePlaceholderSVG(200, 140, "No image"); }}
                />
                <button
                  type="button"
                  onClick={() => update("cnic_photo_path", "")}
                  className="text-sm text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>

        {/* CNIC Back */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            CNIC (Back)
          </label>
          <div className="flex flex-col md:flex-row gap-4">
            <button type="button" onClick={handleCnicBackImageSelect} className="btn-secondary">
              {form.cnic_photo_back_path ? "Replace Back" : "Upload Back"}
            </button>
            {form.cnic_photo_back_path && (
              <div className="flex items-start gap-3">
                <img
                  src={toFileUrl(form.cnic_photo_back_path)}
                  alt="Customer CNIC Back"
                  className="w-44 h-28 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                  onError={(e) => { (e.target as HTMLImageElement).src = generatePlaceholderSVG(200, 140, "No image"); }}
                />
                <button
                  type="button"
                  onClick={() => update("cnic_photo_back_path", "")}
                  className="text-sm text-red-600 hover:underline"
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Address
          </label>
          <input
            type="text"
            value={form.address}
            onChange={(e) => update("address", e.target.value)}
            className="input-field"
            required
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Notes
          </label>
          <textarea
            value={form.notes}
            onChange={(e) => update("notes", e.target.value)}
            className="input-field"
            rows={3}
          />
        </div>
      </div>
    </div>
  );

  const renderReview = () => {
    const reviewRow = (label: string, value: string | undefined) => {
      if (!value) return null;
      return (
        <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700 last:border-0">
          <span className="text-sm text-gray-500 dark:text-gray-400">{label}</span>
          <span className="text-sm font-medium text-gray-900 dark:text-white text-right max-w-[60%]">
            {value}
          </span>
        </div>
      );
    };

    return (
      <div className="space-y-6">
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Personal Information
            </h3>
            <button
              type="button"
              onClick={() => setStep(0)}
              className="text-sm text-primary-600 hover:underline"
            >
              Edit
            </button>
          </div>
          {reviewRow("Full Name", form.name)}
          {reviewRow("Father's Name", form.father_name)}
          {reviewRow("Caste / Tribe", form.caste)}
          {reviewRow("CNIC", form.cnic)}
          {reviewRow("Phone", form.phone)}
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Photos & Address
            </h3>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-sm text-primary-600 hover:underline"
            >
              Edit
            </button>
          </div>
          <div className="flex gap-4 mb-4">
            {form.photo_path && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Customer Photo</p>
                <img
                  src={toFileUrl(form.photo_path)}
                  alt="Customer"
                  className="w-28 h-28 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                  onError={(e) => { (e.target as HTMLImageElement).src = generatePlaceholderSVG(200, 140, "No image"); }}
                />
              </div>
            )}
            {form.cnic_photo_path && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">CNIC (Front)</p>
                <img
                  src={toFileUrl(form.cnic_photo_path)}
                  alt="CNIC Front"
                  className="w-44 h-28 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                  onError={(e) => { (e.target as HTMLImageElement).src = generatePlaceholderSVG(200, 140, "No image"); }}
                />
              </div>
            )}
            {form.cnic_photo_back_path && (
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">CNIC (Back)</p>
                <img
                  src={toFileUrl(form.cnic_photo_back_path)}
                  alt="CNIC Back"
                  className="w-44 h-28 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
                  onError={(e) => { (e.target as HTMLImageElement).src = generatePlaceholderSVG(200, 140, "No image"); }}
                />
              </div>
            )}
          </div>
          {reviewRow("Address", form.address)}
          {reviewRow("Notes", form.notes)}
        </div>
      </div>
    );
  };

  const stepContent = [renderPersonalInfo, renderPhotosAddress, renderReview];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300"
        >
          <FiArrowLeft />
        </button>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {isEdit ? "Edit Customer" : "Add New Customer"}
        </h1>
      </div>

      <FormStepper steps={STEPS} currentStep={step} onStepClick={goToStep} />

      {stepContent[step]()}

      <StepNavigation
        currentStep={step}
        totalSteps={STEPS.length}
        onBack={goBack}
        onNext={goNext}
        onSubmit={handleSubmit}
        submitLabel={isEdit ? "Update Customer" : "Save Customer"}
      />
    </div>
  );
}
