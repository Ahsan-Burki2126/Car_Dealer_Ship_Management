import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import { toast } from "react-toastify";
import { FiArrowLeft, FiSave } from "react-icons/fi";

export default function CustomerFormPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({
    name: "",
    father_name: "",
    cnic: "",
    phone: "",
    address: "",
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
        cnic: c.cnic || "",
        phone: c.phone || "",
        address: c.address || "",
        notes: c.notes || "",
      });
    }
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
