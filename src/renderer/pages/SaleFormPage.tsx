import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../store";
import { PAYMENT_TYPES, INSTALLMENT_FREQUENCIES } from "../../shared/constants";
import { toast } from "react-toastify";
import { FiArrowLeft, FiSave } from "react-icons/fi";

interface VehicleOption {
  id: string;
  make: string;
  model: string;
  year: number;
  registration_number: string;
  sale_price_suggested: number;
}
interface CustomerOption {
  id: string;
  name: string;
  cnic: string;
}

export default function SaleFormPage() {
  const { user } = useSelector((state: RootState) => state.auth);
  const navigate = useNavigate();

  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);

  const [form, setForm] = useState({
    vehicle_id: "",
    customer_id: "",
    sale_price: "",
    payment_type: "cash" as string,
    down_payment: "",
    installment_count: "12",
    installment_frequency: "monthly" as string,
    notes: "",
  });

  useEffect(() => {
    loadVehicles();
    loadCustomers();
  }, []);

  const loadVehicles = async () => {
    const result = await window.api.getVehicles({
      status: "in_showroom",
      page: 1,
      limit: 500,
    });
    if (result.success) setVehicles(result.data.data);
  };

  const loadCustomers = async () => {
    const result = await window.api.getCustomers({ page: 1, limit: 500 });
    if (result.success) setCustomers(result.data.data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.vehicle_id || !form.customer_id) {
      toast.error("Please select both a vehicle and a customer");
      return;
    }

    const saleData: any = {
      vehicle_id: form.vehicle_id,
      customer_id: form.customer_id,
      sale_price: parseFloat(form.sale_price) || 0,
      payment_type: form.payment_type,
      notes: form.notes,
    };

    if (form.payment_type === "installment") {
      saleData.down_payment = parseFloat(form.down_payment) || 0;
      saleData.installment_count = parseInt(form.installment_count) || 12;
      saleData.installment_frequency = form.installment_frequency;
    }

    const result = await window.api.createSale(user!.id, saleData);
    if (result.success) {
      toast.success("Sale created successfully");
      navigate(`/sales/${result.data.id}`);
    } else {
      toast.error(result.error);
    }
  };

  const update = (field: string, value: any) =>
    setForm((prev) => ({ ...prev, [field]: value }));
  const selectedVehicle = vehicles.find((v) => v.id === form.vehicle_id);

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
          Create New Sale
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Vehicle Selection */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Select Vehicle
          </h2>
          <select
            value={form.vehicle_id}
            onChange={(e) => {
              update("vehicle_id", e.target.value);
              const v = vehicles.find((x) => x.id === e.target.value);
              if (v) update("sale_price", String(v.sale_price_suggested || ""));
            }}
            className="input-field"
            required
          >
            <option value="">-- Select Vehicle --</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.year} {v.make} {v.model}{" "}
                {v.registration_number ? `(${v.registration_number})` : ""}
              </option>
            ))}
          </select>
          {selectedVehicle && (
            <p className="mt-2 text-sm text-gray-500">
              Suggested price: PKR{" "}
              {selectedVehicle.sale_price_suggested?.toLocaleString() || "N/A"}
            </p>
          )}
        </div>

        {/* Customer Selection */}
        <div className="card">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Select Customer
          </h2>
          <select
            value={form.customer_id}
            onChange={(e) => update("customer_id", e.target.value)}
            className="input-field"
            required
          >
            <option value="">-- Select Customer --</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.cnic ? `(${c.cnic})` : ""}
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

        {/* Payment Details */}
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
                onChange={(e) => update("sale_price", e.target.value)}
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
                onChange={(e) => update("payment_type", e.target.value)}
                className="input-field"
              >
                {PAYMENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {form.payment_type === "installment" && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Down Payment *
                  </label>
                  <input
                    type="number"
                    value={form.down_payment}
                    onChange={(e) => update("down_payment", e.target.value)}
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
                    onChange={(e) =>
                      update("installment_count", e.target.value)
                    }
                    className="input-field"
                    min={1}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Frequency
                  </label>
                  <select
                    value={form.installment_frequency}
                    onChange={(e) =>
                      update("installment_frequency", e.target.value)
                    }
                    className="input-field"
                  >
                    {INSTALLMENT_FREQUENCIES.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </div>
                {form.sale_price && form.down_payment && (
                  <div className="md:col-span-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      Remaining:{" "}
                      <strong>
                        PKR{" "}
                        {(
                          (parseFloat(form.sale_price) || 0) -
                          (parseFloat(form.down_payment) || 0)
                        ).toLocaleString()}
                      </strong>{" "}
                      | Per installment:{" "}
                      <strong>
                        PKR{" "}
                        {Math.ceil(
                          ((parseFloat(form.sale_price) || 0) -
                            (parseFloat(form.down_payment) || 0)) /
                            (parseInt(form.installment_count) || 1),
                        ).toLocaleString()}
                      </strong>
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="card">
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

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="btn-secondary"
          >
            Cancel
          </button>
          <button type="submit" className="btn-primary flex items-center gap-2">
            <FiSave /> Create Sale
          </button>
        </div>
      </form>
    </div>
  );
}
