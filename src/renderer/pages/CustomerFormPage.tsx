import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import { toast } from "react-toastify";
import { FiArrowLeft, FiSave } from "react-icons/fi";
import { toFileUrl } from "../utils/filePaths";

export default function CustomerFormPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    name: "",
    father_name: "",
    caste: "",
    cnic: "",
    phone: "",
    address: "",
    photo_path: "",
    cnic_photo_path: "",
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    let result;
    if (isEdit) {
      result = await window.api.updateCustomer(user!.id, id!, form);
    } else {
      result = await window.api.addCustomer(user!.id, form);
    }
    if (result.success) {
      toast.success(isEdit ? "Customer updated" : "Customer added");
      navigate(isEdit ? `/customers/${id}` : "/customers");
    } else {
      toast.error(result.error);
    }
  };

  const update = (field: string, value: string) =>
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
          {isEdit ? "Edit Customer" : "Add New Customer"}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Customer Information
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
                className="input-field"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Father's Name
              </label>
              <input
                type="text"
                value={form.father_name}
                onChange={(e) => update("father_name", e.target.value)}
                className="input-field"
              />
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
                CNIC
              </label>
              <input
                type="text"
                value={form.cnic}
                onChange={(e) => update("cnic", e.target.value)}
                className="input-field"
                placeholder="XXXXX-XXXXXXX-X"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Phone
              </label>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                className="input-field"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Customer Photo
              </label>
              <div className="flex flex-col md:flex-row gap-4">
                <button
                  type="button"
                  onClick={handleCustomerImageSelect}
                  className="btn-secondary"
                >
                  {form.photo_path ? "Replace Photo" : "Upload Photo"}
                </button>
                {form.photo_path && (
                  <div className="flex items-start gap-3">
                    <img
                      src={toFileUrl(form.photo_path)}
                      alt="Customer"
                      className="w-28 h-28 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
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
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                CNIC Image
              </label>
              <div className="flex flex-col md:flex-row gap-4">
                <button
                  type="button"
                  onClick={handleCnicImageSelect}
                  className="btn-secondary"
                >
                  {form.cnic_photo_path ? "Replace CNIC Image" : "Upload CNIC Image"}
                </button>
                {form.cnic_photo_path && (
                  <div className="flex items-start gap-3">
                    <img
                      src={toFileUrl(form.cnic_photo_path)}
                      alt="Customer CNIC"
                      className="w-44 h-28 object-cover rounded-lg border border-gray-200 dark:border-gray-700"
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
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Address
              </label>
              <input
                type="text"
                value={form.address}
                onChange={(e) => update("address", e.target.value)}
                className="input-field"
              />
            </div>
            <div className="md:col-span-2">
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

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary flex items-center gap-2">
            <FiSave /> {isEdit ? "Update" : "Save"} Customer
          </button>
        </div>
      </form>
    </div>
  );
}
