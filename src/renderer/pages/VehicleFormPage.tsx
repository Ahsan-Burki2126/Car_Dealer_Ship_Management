import React, { useEffect, useState, Suspense } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import type { Vehicle, VehicleInspection } from "../../shared/types";
import { toast } from "react-toastify";
import { FiArrowLeft, FiSave } from "react-icons/fi";
import { toFileUrl } from "../utils/filePaths";
import ErrorBoundary from "../components/ErrorBoundary";

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

export default function VehicleFormPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    photo_path: "",
    seller_photo_path: "",
    seller_cnic_photo_path: "",
    registration_number: "",
    chassis_number: "",
    engine_number: "",
    make: "",
    model: "",
    year: new Date().getFullYear(),
    color: "",
    assembly_country: "",
    assembling_company: "",
    key_available: true,
    open_letter: false,
    purchase_price: "",
    purchase_date: new Date().toISOString().split("T")[0],
    // Seller details
    seller_name: "",
    seller_father_name: "",
    seller_caste: "",
    seller_address: "",
    seller_cnic: "",
    seller_phone: "",
    // Seller witness
    seller_witness_name: "",
    seller_witness_father_name: "",
    seller_witness_cnic: "",
    seller_witness_phone: "",
    // Commission
    is_commission: false,
    commission_owner_name: "",
    commission_owner_phone: "",
    commission_owner_cnic: "",
    commission_amount: "",
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
        chassis_number: v.chassis_number || "",
        engine_number: v.engine_number || "",
        make: v.make,
        model: v.model,
        year: v.year,
        color: v.color || "",
        assembly_country: v.assembly_country || "",
        assembling_company: v.assembling_company || "",
        key_available: v.key_available,
        open_letter: v.open_letter ?? false,
        purchase_price: String(v.purchase_price),
        purchase_date: v.purchase_date || "",
        seller_name: v.seller_name || "",
        seller_father_name: v.seller_father_name || "",
        seller_caste: v.seller_caste || "",
        seller_address: v.seller_address || "",
        seller_cnic: v.seller_cnic || "",
        seller_phone: v.seller_phone || "",
        seller_witness_name: v.seller_witness_name || "",
        seller_witness_father_name: v.seller_witness_father_name || "",
        seller_witness_cnic: v.seller_witness_cnic || "",
        seller_witness_phone: v.seller_witness_phone || "",
        is_commission: v.is_commission ?? false,
        commission_owner_name: v.commission_owner_name || "",
        commission_owner_phone: v.commission_owner_phone || "",
        commission_owner_cnic: v.commission_owner_cnic || "",
        commission_amount: v.commission_amount ? String(v.commission_amount) : "",
        notes: v.notes || "",
        vehicleInspection: v.vehicleInspection || {
          markers: [],
          completedPanels: [],
        },
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...form,
      purchase_price: parseFloat(form.purchase_price) || 0,
      commission_amount: form.commission_amount ? parseFloat(form.commission_amount) : undefined,
    };

    let result;
    if (isEdit) {
      result = await window.api.updateVehicle(user!.id, id!, data);
    } else {
      result = await window.api.addVehicle(user!.id, data);
    }

    if (result.success) {
      toast.success(isEdit ? "Vehicle updated" : "Vehicle added");
      navigate(isEdit ? `/vehicles/${id}` : "/vehicles");
    } else {
      toast.error(result.error);
    }
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

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* Vehicle Details */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Vehicle Details
          </h2>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Vehicle Image
            </label>
            <div className="flex flex-col md:flex-row gap-4">
              <button
                type="button"
                onClick={handleVehicleImageSelect}
                className="btn-secondary"
              >
                {form.photo_path ? "Replace Image" : "Upload Image"}
              </button>
              {form.photo_path && (
                <div className="flex items-start gap-3">
                  <img
                    src={toFileUrl(form.photo_path)}
                    alt="Vehicle"
                    className="w-48 h-32 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
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
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Model *
              </label>
              <input
                type="text"
                value={form.model}
                onChange={(e) => updateForm("model", e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Year *
              </label>
              <input
                type="number"
                value={form.year}
                onChange={(e) => updateForm("year", parseInt(e.target.value))}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Registration Number
              </label>
              <input
                type="text"
                value={form.registration_number}
                onChange={(e) =>
                  updateForm("registration_number", e.target.value)
                }
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Chassis Number
              </label>
              <input
                type="text"
                value={form.chassis_number}
                onChange={(e) => updateForm("chassis_number", e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Engine Number
              </label>
              <input
                type="text"
                value={form.engine_number}
                onChange={(e) => updateForm("engine_number", e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Color
              </label>
              <input
                type="text"
                value={form.color}
                onChange={(e) => updateForm("color", e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Assembly Country
              </label>
              <input
                type="text"
                value={form.assembly_country}
                onChange={(e) => updateForm("assembly_country", e.target.value)}
                className="input-field"
              />
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
            <div className="flex flex-col gap-3 pt-2">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="key_available"
                  checked={form.key_available}
                  onChange={(e) => updateForm("key_available", e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="key_available" className="text-sm text-gray-700 dark:text-gray-300">
                  Key Available
                </label>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="open_letter"
                  checked={form.open_letter}
                  onChange={(e) => updateForm("open_letter", e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="open_letter" className="text-sm text-gray-700 dark:text-gray-300">
                  Open Letter / Transfer Card Available
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Purchase Info */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Purchase Information
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Purchase Price *
              </label>
              <input
                type="number"
                value={form.purchase_price}
                onChange={(e) => updateForm("purchase_price", e.target.value)}
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Purchase Date
              </label>
              <input
                type="date"
                value={form.purchase_date}
                onChange={(e) => updateForm("purchase_date", e.target.value)}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Seller Name
              </label>
              <input
                type="text"
                value={form.seller_name}
                onChange={(e) => updateForm("seller_name", e.target.value)}
                className="input-field"
              />
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
                onChange={(e) => updateForm("seller_cnic", e.target.value)}
                className="input-field"
                placeholder="XXXXX-XXXXXXX-X"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Seller Phone
              </label>
              <input
                type="text"
                value={form.seller_phone}
                onChange={(e) => updateForm("seller_phone", e.target.value)}
                className="input-field"
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
              />
            </div>
            <div className="md:col-span-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Seller Photo
              </label>
              <div className="flex flex-col md:flex-row gap-4">
                <button
                  type="button"
                  onClick={handleSellerPhotoSelect}
                  className="btn-secondary"
                >
                  {form.seller_photo_path
                    ? "Replace Seller Photo"
                    : "Upload Seller Photo"}
                </button>
                {form.seller_photo_path && (
                  <div className="flex items-start gap-3">
                    <img
                      src={toFileUrl(form.seller_photo_path)}
                      alt="Seller"
                      className="w-28 h-28 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
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
                Seller CNIC Image
              </label>
              <div className="flex flex-col md:flex-row gap-4">
                <button
                  type="button"
                  onClick={handleSellerCnicImageSelect}
                  className="btn-secondary"
                >
                  {form.seller_cnic_photo_path
                    ? "Replace Seller CNIC Image"
                    : "Upload Seller CNIC Image"}
                </button>
                {form.seller_cnic_photo_path && (
                  <div className="flex items-start gap-3">
                    <img
                      src={toFileUrl(form.seller_cnic_photo_path)}
                      alt="Seller CNIC"
                      className="w-44 h-28 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
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
          </div>

          {/* Seller Witness */}
          <div className="mt-6 pt-5 border-t border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Seller's Witness
            </h3>
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
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Witness CNIC
                </label>
                <input
                  type="text"
                  value={form.seller_witness_cnic}
                  onChange={(e) => updateForm("seller_witness_cnic", e.target.value)}
                  className="input-field"
                  placeholder="XXXXX-XXXXXXX-X"
                />
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
                />
              </div>
            </div>
          </div>
        </div>

        {/* Commission Vehicle */}
        <div className="card">
          <div className="flex items-center gap-3 mb-4">
            <input
              type="checkbox"
              id="is_commission"
              checked={form.is_commission}
              onChange={(e) => updateForm("is_commission", e.target.checked)}
              className="rounded"
            />
            <label htmlFor="is_commission" className="text-lg font-semibold text-gray-900 dark:text-white cursor-pointer">
              Commission Vehicle (selling on behalf of owner)
            </label>
          </div>
          {form.is_commission && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6 border-l-2 border-blue-300 dark:border-blue-700">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Owner Name
                </label>
                <input
                  type="text"
                  value={form.commission_owner_name}
                  onChange={(e) => updateForm("commission_owner_name", e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Owner Phone
                </label>
                <input
                  type="text"
                  value={form.commission_owner_phone}
                  onChange={(e) => updateForm("commission_owner_phone", e.target.value)}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Owner CNIC
                </label>
                <input
                  type="text"
                  value={form.commission_owner_cnic}
                  onChange={(e) => updateForm("commission_owner_cnic", e.target.value)}
                  className="input-field"
                  placeholder="XXXXX-XXXXXXX-X"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Commission Amount (PKR)
                </label>
                <input
                  type="number"
                  value={form.commission_amount}
                  onChange={(e) => updateForm("commission_amount", e.target.value)}
                  className="input-field"
                  placeholder="0"
                />
              </div>
            </div>
          )}
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

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary flex items-center gap-2">
            <FiSave /> {isEdit ? "Update" : "Save"} Vehicle
          </button>
        </div>
      </form>

      {/* Vehicle Inspection — outside <form> to prevent SVG events from interfering with form inputs */}
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
    </div>
  );
}
