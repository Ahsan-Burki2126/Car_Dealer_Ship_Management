import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import type { Vehicle } from "../../shared/types";
import { VEHICLE_STATUSES } from "../../shared/constants";
import { toast } from "react-toastify";
import { FiArrowLeft, FiSave } from "react-icons/fi";

export default function VehicleFormPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    registration_number: "",
    chassis_number: "",
    engine_number: "",
    make: "",
    model: "",
    year: new Date().getFullYear(),
    color: "",
    assembly_country: "",
    key_available: true,
    status: "purchased" as string,
    purchase_price: "",
    purchase_date: new Date().toISOString().split("T")[0],
    seller_name: "",
    seller_cnic: "",
    seller_phone: "",
    notes: "",
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
        chassis_number: v.chassis_number || "",
        engine_number: v.engine_number || "",
        make: v.make,
        model: v.model,
        year: v.year,
        color: v.color || "",
        assembly_country: v.assembly_country || "",
        key_available: v.key_available,
        status: v.status,
        purchase_price: String(v.purchase_price),
        purchase_date: v.purchase_date || "",
        seller_name: v.seller_name || "",
        seller_cnic: v.seller_cnic || "",
        seller_phone: v.seller_phone || "",
        notes: v.notes || "",
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = {
      ...form,
      purchase_price: parseFloat(form.purchase_price) || 0,
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

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Vehicle Details */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Vehicle Details
          </h2>
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
                Status
              </label>
              <select
                value={form.status}
                onChange={(e) => updateForm("status", e.target.value)}
                className="input-field"
              >
                {VEHICLE_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="key_available"
                checked={form.key_available}
                onChange={(e) => updateForm("key_available", e.target.checked)}
                className="rounded"
              />
              <label
                htmlFor="key_available"
                className="text-sm text-gray-700 dark:text-gray-300"
              >
                Key Available
              </label>
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
                Seller CNIC
              </label>
              <input
                type="text"
                value={form.seller_cnic}
                onChange={(e) => updateForm("seller_cnic", e.target.value)}
                className="input-field"
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
    </div>
  );
}
