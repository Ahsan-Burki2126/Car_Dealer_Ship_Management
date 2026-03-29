import jsPDF from "jspdf";
import { PANEL_LABELS } from "../../shared/constants";

const formatCurrency = (v: number) => `PKR ${v?.toLocaleString() || "0"}`;

// ── Colour palette ───────────────────────────────────────────────────────
const BRAND = [30, 64, 175] as const; // indigo-800
const BRAND_LIGHT = [238, 242, 255] as const; // indigo-50
const ACCENT = [79, 70, 229] as const; // indigo-600
const GRAY = [100, 116, 139] as const; // slate-500
const DARK = [15, 23, 42] as const; // slate-900
const LIGHT_BG = [248, 250, 252] as const; // slate-50
const WHITE = [255, 255, 255] as const;
const GREEN = [22, 163, 74] as const;
const RED = [220, 38, 38] as const;
const AMBER = [202, 138, 4] as const;
const BORDER = [226, 232, 240] as const; // slate-200

type RGB = readonly [number, number, number];

// ── Helpers ──────────────────────────────────────────────────────────────

function drawRoundedRect(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  style: "F" | "S" | "FD" = "F",
) {
  doc.roundedRect(x, y, w, h, r, r, style);
}

function setColor(doc: jsPDF, color: RGB, type: "text" | "fill" | "draw" = "text") {
  if (type === "text") doc.setTextColor(...color);
  else if (type === "fill") doc.setFillColor(...color);
  else doc.setDrawColor(...color);
}

function addModernFooter(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    const pw = doc.internal.pageSize.getWidth();

    // Footer line
    setColor(doc, BORDER, "draw");
    doc.setLineWidth(0.3);
    doc.line(15, 280, pw - 15, 280);

    doc.setFontSize(7);
    setColor(doc, GRAY);
    doc.setFont("helvetica", "normal");
    doc.text("Pak Japan Motors, Layyah", 15, 285);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pw / 2, 285, { align: "center" });
    doc.text(`Page ${i} of ${pages}`, pw - 15, 285, { align: "right" });
  }
}

// ── Modern Invoice Header ────────────────────────────────────────────────

function addInvoiceHeader(
  doc: jsPDF,
  invoiceNumber: string,
  date: string,
): number {
  const pw = doc.internal.pageSize.getWidth();

  // Top accent bar
  setColor(doc, BRAND, "fill");
  doc.rect(0, 0, pw, 4, "F");

  // Company name
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  setColor(doc, DARK);
  doc.text("PAK JAPAN MOTORS", 15, 18);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  setColor(doc, GRAY);
  doc.text("Layyah — Automobile Sales & Services", 15, 24);

  // Invoice badge (right side)
  setColor(doc, BRAND_LIGHT, "fill");
  setColor(doc, ACCENT, "draw");
  doc.setLineWidth(0.3);
  drawRoundedRect(doc, pw - 75, 8, 60, 20, 3, "FD");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  setColor(doc, ACCENT);
  doc.text("INVOICE", pw - 45, 15, { align: "center" });
  doc.setFontSize(9);
  setColor(doc, DARK);
  doc.text(invoiceNumber, pw - 45, 22, { align: "center" });

  // Date below badge
  doc.setFontSize(8);
  setColor(doc, GRAY);
  doc.setFont("helvetica", "normal");
  doc.text(`Date: ${new Date(date).toLocaleDateString()}`, pw - 15, 34, {
    align: "right",
  });

  // Divider
  setColor(doc, BRAND, "draw");
  doc.setLineWidth(0.8);
  doc.line(15, 30, 80, 30);

  return 42;
}

// ── Section heading ──────────────────────────────────────────────────────

function sectionHeading(doc: jsPDF, title: string, y: number, x = 15): number {
  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  setColor(doc, BRAND);
  doc.text(title.toUpperCase(), x, y);

  setColor(doc, ACCENT, "draw");
  doc.setLineWidth(0.4);
  doc.line(x, y + 1.5, x + doc.getTextWidth(title.toUpperCase()) + 2, y + 1.5);

  return y + 7;
}

// ── Detail row helper ────────────────────────────────────────────────────

function detailRow(
  doc: jsPDF,
  label: string,
  value: string,
  x: number,
  y: number,
) {
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(doc, GRAY);
  doc.text(label, x, y);
  doc.setFont("helvetica", "bold");
  setColor(doc, DARK);
  doc.text(value, x, y + 4.5);
}

// ══════════════════════════════════════════════════════════════════════════
//  SALE INVOICE PDF
// ══════════════════════════════════════════════════════════════════════════

export function generateInvoicePdf(sale: {
  invoice_number: string;
  sale_date: string;
  customer_name: string;
  customer_cnic?: string;
  customer_phone?: string;
  vehicle_name: string;
  registration_number?: string;
  chassis_number?: string;
  engine_number?: string;
  sale_price: number;
  down_payment: number;
  payment_type: string;
  notes?: string;
  witness_name?: string;
  witness_cnic?: string;
  witness_phone?: string;
  installments?: { number: number; due_date: string; amount: number }[];
}): jsPDF {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();
  let y = addInvoiceHeader(doc, sale.invoice_number, sale.sale_date);

  // ── Customer & Vehicle cards side-by-side ──────────────────────────

  // Customer card
  setColor(doc, LIGHT_BG, "fill");
  drawRoundedRect(doc, 15, y, 82, 38, 3, "F");
  y += 5;
  y = sectionHeading(doc, "Customer", y, 20) - 2;
  detailRow(doc, "Name", sale.customer_name, 20, y);
  y += 10;
  if (sale.customer_cnic) {
    detailRow(doc, "CNIC", sale.customer_cnic, 20, y);
    y += 10;
  }
  if (sale.customer_phone) {
    detailRow(doc, "Phone", sale.customer_phone, 20, y);
  }

  // Vehicle card
  let vy = 42 + 5;
  setColor(doc, LIGHT_BG, "fill");
  drawRoundedRect(doc, 103, 42, 92, 38, 3, "F");
  vy = sectionHeading(doc, "Vehicle", vy, 108) - 2;
  detailRow(doc, "Vehicle", sale.vehicle_name, 108, vy);
  vy += 10;
  if (sale.registration_number) {
    detailRow(doc, "Registration", sale.registration_number, 108, vy);
    vy += 10;
  }
  const extraInfo = [
    sale.chassis_number ? `Chassis: ${sale.chassis_number}` : "",
    sale.engine_number ? `Engine: ${sale.engine_number}` : "",
  ]
    .filter(Boolean)
    .join("  |  ");
  if (extraInfo) {
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    setColor(doc, GRAY);
    doc.text(extraInfo, 108, vy + 3);
  }

  y = 42 + 38 + 8; // after cards

  // ── Payment Summary box ────────────────────────────────────────────

  setColor(doc, BRAND, "fill");
  drawRoundedRect(doc, 15, y, pw - 30, 28, 3, "F");
  y += 5;

  doc.setFontSize(10);
  doc.setFont("helvetica", "bold");
  setColor(doc, WHITE);
  doc.text("PAYMENT SUMMARY", 20, y + 2);
  y += 9;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");

  // Row 1
  setColor(doc, [...WHITE] as unknown as RGB);
  doc.text("Sale Price", 20, y);
  doc.setFont("helvetica", "bold");
  doc.text(formatCurrency(sale.sale_price), 70, y);

  doc.setFont("helvetica", "normal");
  doc.text("Payment Type", 110, y);
  doc.setFont("helvetica", "bold");
  const ptLabel =
    sale.payment_type.charAt(0).toUpperCase() + sale.payment_type.slice(1);
  doc.text(ptLabel, 155, y);
  y += 6;

  // Row 2 (installment-specific)
  if (sale.payment_type === "installment") {
    doc.setFont("helvetica", "normal");
    doc.text("Down Payment", 20, y);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(sale.down_payment), 70, y);

    doc.setFont("helvetica", "normal");
    doc.text("Balance Due", 110, y);
    doc.setFont("helvetica", "bold");
    doc.text(formatCurrency(sale.sale_price - sale.down_payment), 155, y);
  }

  y += 12;

  // ── Installment Schedule ───────────────────────────────────────────

  if (sale.installments && sale.installments.length > 0) {
    y = sectionHeading(doc, "Installment Schedule", y);
    y += 2;

    // Table header
    setColor(doc, BRAND_LIGHT, "fill");
    setColor(doc, BORDER, "draw");
    doc.setLineWidth(0.3);
    drawRoundedRect(doc, 15, y - 4, pw - 30, 7, 1.5, "FD");

    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    setColor(doc, BRAND);
    doc.text("#", 20, y);
    doc.text("Due Date", 40, y);
    doc.text("Amount", pw - 35, y, { align: "right" });
    y += 8;

    // Table rows
    doc.setFont("helvetica", "normal");
    sale.installments.forEach((inst, idx) => {
      if (y > 260) {
        doc.addPage();
        y = 20;
      }

      // Zebra stripe
      if (idx % 2 === 0) {
        setColor(doc, LIGHT_BG, "fill");
        doc.rect(15, y - 3.5, pw - 30, 6, "F");
      }

      doc.setFontSize(8);
      setColor(doc, DARK);
      doc.text(String(inst.number), 20, y);
      setColor(doc, GRAY);
      doc.text(new Date(inst.due_date).toLocaleDateString(), 40, y);
      doc.setFont("helvetica", "bold");
      setColor(doc, DARK);
      doc.text(formatCurrency(inst.amount), pw - 35, y, { align: "right" });
      doc.setFont("helvetica", "normal");
      y += 6;
    });

    // Total row
    y += 1;
    setColor(doc, BORDER, "draw");
    doc.setLineWidth(0.3);
    doc.line(15, y - 2, pw - 15, y - 2);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    setColor(doc, BRAND);
    doc.text("TOTAL", 40, y + 2);
    const total = sale.installments.reduce((s, i) => s + i.amount, 0);
    doc.text(formatCurrency(total), pw - 35, y + 2, { align: "right" });
    y += 8;
  }

  // ── Notes ──────────────────────────────────────────────────────────

  if (sale.notes) {
    if (y > 245) {
      doc.addPage();
      y = 20;
    }
    y = sectionHeading(doc, "Notes", y);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    setColor(doc, GRAY);
    const noteLines = doc.splitTextToSize(sale.notes, pw - 40);
    doc.text(noteLines, 15, y);
    y += noteLines.length * 4 + 4;
  }

  // ── Witness Information ────────────────────────────────────────────

  if (sale.witness_name || sale.witness_cnic || sale.witness_phone) {
    if (y > 245) {
      doc.addPage();
      y = 20;
    }
    y = sectionHeading(doc, "Witness", y);
    if (sale.witness_name) {
      detailRow(doc, "Name", sale.witness_name, 15, y);
      y += 10;
    }
    if (sale.witness_cnic) {
      detailRow(doc, "CNIC", sale.witness_cnic, 15, y);
      y += 10;
    }
    if (sale.witness_phone) {
      detailRow(doc, "Contact", sale.witness_phone, 15, y);
      y += 10;
    }
  }

  // ── Signatures ─────────────────────────────────────────────────────

  y = Math.max(y + 10, 245);
  if (y > 260) {
    doc.addPage();
    y = 240;
  }

  setColor(doc, BORDER, "draw");
  doc.setLineWidth(0.4);
  doc.line(15, y, 80, y);
  doc.line(pw - 80, y, pw - 15, y);

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(doc, GRAY);
  doc.text("Buyer's Signature", 47.5, y + 5, { align: "center" });
  doc.text("Seller's Signature", pw - 47.5, y + 5, { align: "center" });

  // Stamp area
  doc.setFontSize(7);
  doc.text("(Stamp / Seal)", pw / 2, y + 5, { align: "center" });
  setColor(doc, BORDER, "draw");
  doc.setLineWidth(0.2);
  doc.circle(pw / 2, y - 8, 8, "S");

  addModernFooter(doc);
  return doc;
}

// ══════════════════════════════════════════════════════════════════════════
//  INSPECTION CERTIFICATE PDF
// ══════════════════════════════════════════════════════════════════════════

export function generateInspectionPdf(inspection: {
  vehicle_name: string;
  registration_number?: string;
  inspector_name: string;
  overall_score: number;
  created_at: string;
  items: {
    point_name: string;
    category: string;
    status: string;
    deduction: number;
    notes?: string;
  }[];
  damage_map: { panel_id: string; status: string; notes?: string }[];
}): jsPDF {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();

  // Header bar
  setColor(doc, BRAND, "fill");
  doc.rect(0, 0, pw, 4, "F");

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  setColor(doc, DARK);
  doc.text("VEHICLE INSPECTION CERTIFICATE", pw / 2, 18, { align: "center" });

  let y = 28;

  // Score badge
  const score = inspection.overall_score;
  const scoreColor: RGB =
    score >= 8 ? GREEN : score >= 5 ? AMBER : RED;

  setColor(doc, scoreColor, "fill");
  drawRoundedRect(doc, pw / 2 - 15, y - 5, 30, 16, 3, "F");
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  setColor(doc, WHITE);
  doc.text(`${score.toFixed(1)}/10`, pw / 2, y + 5, { align: "center" });
  y += 18;

  // Vehicle Info
  doc.setFontSize(9);
  setColor(doc, DARK);
  doc.setFont("helvetica", "normal");
  doc.text(`Vehicle: ${inspection.vehicle_name}`, 15, y);
  doc.text(`Registration: ${inspection.registration_number || "N/A"}`, 110, y);
  y += 6;
  doc.text(`Inspector: ${inspection.inspector_name}`, 15, y);
  doc.text(
    `Date: ${new Date(inspection.created_at).toLocaleDateString()}`,
    110,
    y,
  );
  y += 10;

  // Damage Map
  y = sectionHeading(doc, "Body Panel Status", y);
  y += 2;

  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  inspection.damage_map.forEach((d) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    const color: RGB =
      d.status === "original" ? GREEN : d.status === "repainted" ? AMBER : RED;
    setColor(doc, color);
    doc.text(
      `${(PANEL_LABELS[d.panel_id] || d.panel_id).toUpperCase()}: ${d.status}${d.notes ? ` - ${d.notes}` : ""}`,
      20,
      y,
    );
    y += 5;
  });
  y += 5;

  // Categories
  const categories = [...new Set(inspection.items.map((i) => i.category))];
  categories.forEach((cat) => {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    y = sectionHeading(doc, cat.replace(/_/g, " "), y);
    y += 2;

    // Table header
    setColor(doc, BRAND_LIGHT, "fill");
    doc.rect(15, y - 4, pw - 30, 6, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    setColor(doc, BRAND);
    doc.text("Point", 17, y);
    doc.text("Status", 120, y);
    doc.text("Deduction", 160, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    inspection.items
      .filter((i) => i.category === cat)
      .forEach((item) => {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        setColor(doc, DARK);
        doc.setFontSize(8);
        doc.text(item.point_name.substring(0, 50), 17, y);
        const statusColor: RGB =
          item.status === "good" ? GREEN : item.status === "fair" ? AMBER : RED;
        setColor(doc, statusColor);
        doc.setFont("helvetica", "bold");
        doc.text(item.status.toUpperCase(), 120, y);
        doc.setFont("helvetica", "normal");
        setColor(doc, DARK);
        doc.text(
          item.deduction ? `-${item.deduction.toFixed(2)}` : "-",
          165,
          y,
        );
        y += 5;
      });
    y += 5;
  });

  addModernFooter(doc);
  return doc;
}

// ══════════════════════════════════════════════════════════════════════════
//  CUSTOMER LEDGER PDF
// ══════════════════════════════════════════════════════════════════════════

export function generateLedgerPdf(customer: {
  name: string;
  cnic?: string;
  phone?: string;
  ledger: {
    invoice_number: string;
    vehicle_name: string;
    sale_date: string;
    sale_price: number;
    total_paid: number;
    balance: number;
  }[];
}): jsPDF {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();

  // Header
  setColor(doc, BRAND, "fill");
  doc.rect(0, 0, pw, 4, "F");

  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  setColor(doc, DARK);
  doc.text("CUSTOMER LEDGER", pw / 2, 18, { align: "center" });

  let y = 28;

  // Customer info
  setColor(doc, LIGHT_BG, "fill");
  drawRoundedRect(doc, 15, y, pw - 30, 18, 3, "F");
  y += 6;
  detailRow(doc, "Customer", customer.name, 20, y);
  if (customer.cnic) detailRow(doc, "CNIC", customer.cnic, 80, y);
  if (customer.phone) detailRow(doc, "Phone", customer.phone, 140, y);
  y += 18;

  // Table header
  setColor(doc, BRAND, "fill");
  drawRoundedRect(doc, 15, y - 4, pw - 30, 7, 1.5, "F");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  setColor(doc, WHITE);
  doc.text("Invoice", 17, y);
  doc.text("Vehicle", 45, y);
  doc.text("Date", 95, y);
  doc.text("Sale Price", 120, y);
  doc.text("Paid", 150, y);
  doc.text("Balance", 175, y);
  y += 8;

  let totalSale = 0,
    totalPaid = 0,
    totalBalance = 0;

  doc.setFont("helvetica", "normal");
  customer.ledger.forEach((l, idx) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }

    if (idx % 2 === 0) {
      setColor(doc, LIGHT_BG, "fill");
      doc.rect(15, y - 3.5, pw - 30, 6, "F");
    }

    doc.setFontSize(8);
    setColor(doc, DARK);
    doc.text(l.invoice_number, 17, y);
    doc.text(l.vehicle_name.substring(0, 25), 45, y);
    setColor(doc, GRAY);
    doc.text(new Date(l.sale_date).toLocaleDateString(), 95, y);
    setColor(doc, DARK);
    doc.text(formatCurrency(l.sale_price), 120, y);
    setColor(doc, GREEN);
    doc.text(formatCurrency(l.total_paid), 150, y);
    setColor(doc, l.balance > 0 ? RED : GREEN);
    doc.text(formatCurrency(l.balance), 175, y);

    totalSale += l.sale_price;
    totalPaid += l.total_paid;
    totalBalance += l.balance;
    y += 6;
  });

  // Totals row
  y += 2;
  setColor(doc, BRAND, "draw");
  doc.setLineWidth(0.5);
  doc.line(15, y - 2, pw - 15, y - 2);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  setColor(doc, BRAND);
  doc.text("TOTAL", 17, y + 3);
  setColor(doc, DARK);
  doc.text(formatCurrency(totalSale), 120, y + 3);
  setColor(doc, GREEN);
  doc.text(formatCurrency(totalPaid), 150, y + 3);
  setColor(doc, totalBalance > 0 ? RED : GREEN);
  doc.text(formatCurrency(totalBalance), 175, y + 3);

  addModernFooter(doc);
  return doc;
}

// ══════════════════════════════════════════════════════════════════════════
//  PROFESSIONAL INSPECTION REPORT (PakWheels-style)
// ══════════════════════════════════════════════════════════════════════════

export function generateProfessionalInspectionReport(inspection: {
  id: string;
  vehicle_name: string;
  registration_number?: string;
  chassis_number?: string;
  engine_number?: string;
  model_year?: number;
  transmission?: string;
  mileage?: number;
  inspector_name: string;
  inspection_date: string;
  overall_score: number;
  overall_condition: string;
  exterior_damages: {
    panel_id: string;
    status: string;
    notes?: string;
  }[];
  interior_rating?: number;
  interior_notes?: string;
  mechanical_rating?: number;
  mechanical_notes?: string;
  categories: {
    name: string;
    rating: number;
    items: {
      point_name: string;
      status: string;
      notes?: string;
    }[];
  }[];
  photos?: { url: string; label: string }[];
  recommendation?: string;
}): jsPDF {
  const doc = new jsPDF("p", "mm", "a4");
  const pw = doc.internal.pageSize.getWidth();
  let y = 15;

  const getRatingColor = (score: number): RGB => {
    if (score >= 8) return GREEN;
    if (score >= 6) return AMBER;
    if (score >= 4) return RED;
    return [220, 38, 38];
  };

  const ratingColor = getRatingColor(inspection.overall_score);

  // Header background
  setColor(doc, ratingColor, "fill");
  doc.rect(0, 0, pw, 35, "F");

  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  setColor(doc, WHITE);
  doc.text("VEHICLE INSPECTION REPORT", pw / 2, 12, { align: "center" });

  // Score circle
  setColor(doc, WHITE, "fill");
  doc.circle(pw - 18, 17.5, 8);
  setColor(doc, ratingColor);
  doc.setFontSize(18);
  doc.text(inspection.overall_score.toFixed(1), pw - 18, 19.5, {
    align: "center",
  });
  doc.setFontSize(9);
  doc.text("/10", pw - 14, 19.5, { align: "left" });

  y = 40;

  // Vehicle Details
  setColor(doc, LIGHT_BG, "fill");
  doc.rect(12, y - 5, pw - 24, 45, "F");

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  setColor(doc, DARK);
  doc.text("VEHICLE INFORMATION", 15, y);

  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const vehicleDetails = [
    ["Vehicle", inspection.vehicle_name],
    ["Reg. Number", inspection.registration_number || "N/A"],
    ["Model Year", inspection.model_year ? String(inspection.model_year) : "N/A"],
    ["Transmission", inspection.transmission || "N/A"],
  ];

  const mechanicalDetails = [
    ["Chassis #", inspection.chassis_number || "N/A"],
    ["Engine #", inspection.engine_number || "N/A"],
    ["Mileage", inspection.mileage ? `${inspection.mileage.toLocaleString()} km` : "N/A"],
    ["Inspection Date", new Date(inspection.inspection_date).toLocaleDateString()],
  ];

  vehicleDetails.forEach((detail, i) => {
    setColor(doc, GRAY);
    doc.text(`${detail[0]}:`, 15, y + i * 5, { maxWidth: 40 });
    doc.setFont("helvetica", "bold");
    setColor(doc, DARK);
    doc.text(detail[1], 60, y + i * 5);
    doc.setFont("helvetica", "normal");
  });

  mechanicalDetails.forEach((detail, i) => {
    setColor(doc, GRAY);
    doc.text(`${detail[0]}:`, pw / 2 + 5, y + i * 5, { maxWidth: 40 });
    doc.setFont("helvetica", "bold");
    setColor(doc, DARK);
    doc.text(detail[1], pw / 2 + 50, y + i * 5);
    doc.setFont("helvetica", "normal");
  });

  y += 25;

  // Condition Summary
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  setColor(doc, DARK);
  doc.text("OVERALL CONDITION", 15, y);
  y += 7;

  const conditions: [string, number][] = [
    [
      "Exterior",
      inspection.categories?.find((c) =>
        c.name.toLowerCase().includes("exterior"),
      )?.rating || 5,
    ],
    ["Interior", inspection.interior_rating || 5],
    ["Mechanical", inspection.mechanical_rating || 5],
  ];

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  conditions.forEach((cond) => {
    if (y > 260) {
      doc.addPage();
      y = 15;
    }

    const condRating = cond[1];
    const barColor = getRatingColor(condRating);
    const barWidth = (condRating / 10) * 60;

    setColor(doc, DARK);
    doc.text(`${cond[0]}:`, 15, y + 2);
    setColor(doc, [230, 230, 230], "fill");
    doc.rect(50, y - 1, 60, 4);
    setColor(doc, barColor, "fill");
    doc.rect(50, y - 1, barWidth, 4, "F");
    setColor(doc, DARK);
    doc.text(`${condRating.toFixed(1)}/10`, 115, y + 2);
    y += 7;
  });

  y += 5;

  // Recommendation
  if (inspection.recommendation) {
    if (y > 250) {
      doc.addPage();
      y = 15;
    }
    setColor(doc, [237, 242, 247], "fill");
    setColor(doc, ratingColor, "draw");
    doc.setLineWidth(1.5);
    doc.rect(12, y - 2, pw - 24, 20, "FD");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    setColor(doc, ratingColor);
    doc.text("RECOMMENDATION", 15, y + 2);
    doc.setFont("helvetica", "normal");
    setColor(doc, DARK);
    doc.setFontSize(8);
    const recText = doc.splitTextToSize(inspection.recommendation, pw - 35);
    doc.text(recText, 15, y + 7);
    y += 22;
  }

  // Page 2+: Detailed Breakdown
  doc.addPage();
  y = 15;

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  setColor(doc, DARK);
  doc.text("EXTERIOR CONDITION - BODY PANELS", 15, y);
  y += 8;

  setColor(doc, LIGHT_BG, "fill");
  doc.rect(12, y - 3, pw - 24, 6, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  setColor(doc, BRAND);
  doc.text("Panel", 15, y);
  doc.text("Status", 80, y);
  doc.text("Notes", 130, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  setColor(doc, DARK);

  inspection.exterior_damages.forEach((damage) => {
    if (y > 270) {
      doc.addPage();
      y = 15;
    }

    const panelName = PANEL_LABELS[damage.panel_id] || damage.panel_id;
    const statusColor: RGB =
      damage.status === "normal"
        ? GREEN
        : damage.status === "scratch"
          ? AMBER
          : damage.status === "dent"
            ? [234, 179, 8]
            : damage.status === "repainted"
              ? [139, 92, 246]
              : damage.status === "rust"
                ? RED
                : [220, 38, 38];

    setColor(doc, DARK);
    doc.text(panelName, 15, y);
    setColor(doc, statusColor);
    doc.setFont("helvetica", "bold");
    doc.text(damage.status.toUpperCase(), 80, y);
    doc.setFont("helvetica", "normal");
    setColor(doc, DARK);
    doc.text(damage.notes ? damage.notes.substring(0, 40) : "-", 130, y);
    y += 5;
  });

  y += 8;

  // Category Sections
  inspection.categories.forEach((category) => {
    if (y > 240) {
      doc.addPage();
      y = 15;
    }

    const categoryColor = getRatingColor(category.rating);

    setColor(doc, categoryColor, "fill");
    doc.rect(12, y - 3, pw - 24, 7, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    setColor(doc, WHITE);
    doc.text(
      `${category.name.toUpperCase()} - ${category.rating.toFixed(1)}/10`,
      pw / 2 - 20,
      y + 2,
      { align: "center" },
    );
    y += 9;

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");

    category.items.forEach((item) => {
      if (y > 275) {
        doc.addPage();
        y = 15;
      }

      const itemColor: RGB =
        item.status === "good" ? GREEN : item.status === "fair" ? AMBER : RED;

      setColor(doc, itemColor);
      doc.text("\u2022", 15, y);
      setColor(doc, DARK);
      doc.text(item.point_name, 18, y, { maxWidth: 80 });
      setColor(doc, itemColor);
      doc.setFont("helvetica", "bold");
      doc.text(`[${item.status.toUpperCase()}]`, 125, y);
      doc.setFont("helvetica", "normal");
      if (item.notes) {
        setColor(doc, GRAY);
        doc.text(item.notes.substring(0, 35), 160, y, { maxWidth: 40 });
      }
      y += 5;
    });

    y += 3;
  });

  doc.setPage(1);
  addModernFooter(doc);

  return doc;
}

// ══════════════════════════════════════════════════════════════════════════
//  VEHICLE PURCHASE PDF
// ══════════════════════════════════════════════════════════════════════════

export function generateVehiclePurchasePdf(vehicle: {
  make: string;
  model: string;
  year_of_manufacture: number;
  year_of_import?: number;
  color?: string;
  registration_number?: string;
  chassis_number?: string;
  engine_number?: string;
  assembling_company?: string;
  extra_keys_available?: boolean;
  extra_keys_count?: number;
  file_available?: boolean;
  file_pages?: number;
  current_smart_card?: boolean;
  smart_card_count?: number;
  purchase_price: number;
  purchase_date?: string;
  seller_name?: string;
  seller_father_name?: string;
  seller_caste?: string;
  seller_cnic?: string;
  seller_phone?: string;
  seller_address?: string;
  seller_witness_name?: string;
  seller_witness_cnic?: string;
  seller_witness_phone?: string;
  notes?: string;
}): jsPDF {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();

  // Header bar
  setColor(doc, BRAND, "fill");
  doc.rect(0, 0, pw, 4, "F");

  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  setColor(doc, DARK);
  doc.text("PAK JAPAN VEHICLES, LAYYAH", pw / 2, 18, { align: "center" });

  doc.setFontSize(11);
  setColor(doc, ACCENT);
  doc.text("VEHICLE PURCHASE RECEIPT", pw / 2, 26, { align: "center" });

  setColor(doc, BRAND, "draw");
  doc.setLineWidth(0.8);
  doc.line(15, 30, pw - 15, 30);

  let y = 38;

  const MID = pw / 2;
  let rowIdx = 0;

  const drawRowBg = (ry: number) => {
    if (rowIdx % 2 === 0) {
      setColor(doc, LIGHT_BG, "fill");
      doc.rect(15, ry - 4, pw - 30, 7.5, "F");
    }
    rowIdx++;
  };

  const sectionBox = (title: string, startY: number): number => {
    setColor(doc, BRAND, "fill");
    drawRoundedRect(doc, 15, startY - 5, pw - 30, 9, 2, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    setColor(doc, WHITE);
    doc.text(title.toUpperCase(), 20, startY + 1);
    return startY + 12;
  };

  const dualRow = (
    lLabel: string, lValue: string | undefined,
    rLabel: string, rValue: string | undefined,
    ry: number,
  ): number => {
    drawRowBg(ry);
    doc.setFontSize(8.5);
    const lv = lValue || "-";
    const rv = rValue || "-";
    doc.setFont("helvetica", "normal");
    setColor(doc, GRAY);
    doc.text(`${lLabel}:`, 20, ry);
    doc.setFont("helvetica", "bold");
    setColor(doc, DARK);
    doc.text(lv, MID - 5, ry, { align: "right" });
    setColor(doc, BORDER, "draw");
    doc.setLineWidth(0.2);
    doc.line(MID, ry - 3, MID, ry + 2);
    doc.setFont("helvetica", "normal");
    setColor(doc, GRAY);
    doc.text(`${rLabel}:`, MID + 5, ry);
    doc.setFont("helvetica", "bold");
    setColor(doc, DARK);
    doc.text(rv, pw - 20, ry, { align: "right" });
    return ry + 7.5;
  };

  const singleRow = (label: string, value: string | undefined, ry: number): number => {
    if (!value) return ry;
    drawRowBg(ry);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    setColor(doc, GRAY);
    doc.text(`${label}:`, 20, ry);
    doc.setFont("helvetica", "bold");
    setColor(doc, DARK);
    doc.text(String(value), pw - 20, ry, { align: "right" });
    return ry + 7.5;
  };

  // ── Vehicle Details ───────────────────────────────────────────────────────
  y = sectionBox("Vehicle Details", y);
  rowIdx = 0;
  y = dualRow("Make", vehicle.make, "Model", vehicle.model, y);
  y = dualRow(
    "Year", String(vehicle.year_of_manufacture || "-"),
    "Color", vehicle.color || "-",
    y,
  );
  y = dualRow(
    "Registration", vehicle.registration_number || "-",
    "Chassis No.", vehicle.chassis_number || "-",
    y,
  );
  y = dualRow(
    "Engine No.", vehicle.engine_number || "-",
    "Assembly", vehicle.assembling_company || "-",
    y,
  );
  y = dualRow(
    "Extra Keys",
    vehicle.extra_keys_available ? `Yes (${vehicle.extra_keys_count || 0})` : "No",
    "File",
    vehicle.file_available ? `Yes (${vehicle.file_pages || 0} pages)` : "No",
    y,
  );
  y = singleRow(
    "Smart Card",
    vehicle.current_smart_card ? `Yes (${vehicle.smart_card_count || 0})` : "No",
    y,
  );
  y += 6;

  // ── Purchase Details ──────────────────────────────────────────────────────
  y = sectionBox("Purchase Details", y);
  setColor(doc, GREEN, "fill");
  drawRoundedRect(doc, 15, y - 3, pw - 30, 14, 3, "F");
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  setColor(doc, WHITE);
  doc.text(`Purchase Price: ${formatCurrency(vehicle.purchase_price)}`, pw / 2, y + 6, { align: "center" });
  y += 18;
  rowIdx = 0;
  y = singleRow(
    "Purchase Date",
    vehicle.purchase_date ? new Date(vehicle.purchase_date).toLocaleDateString() : "-",
    y,
  );
  y += 6;

  // ── Seller Information ────────────────────────────────────────────────────
  if (vehicle.seller_name) {
    if (y > 240) { doc.addPage(); y = 20; }
    y = sectionBox("Seller Information", y);
    rowIdx = 0;
    y = dualRow("Name", vehicle.seller_name, "Father's Name", vehicle.seller_father_name || "-", y);
    y = dualRow("Caste / Tribe", vehicle.seller_caste || "-", "CNIC", vehicle.seller_cnic || "-", y);
    y = dualRow("Contact", vehicle.seller_phone || "-", "Address", vehicle.seller_address || "-", y);
    y += 6;
  }

  // ── Witness Information ───────────────────────────────────────────────────
  if (vehicle.seller_witness_name) {
    if (y > 240) { doc.addPage(); y = 20; }
    y = sectionBox("Witness Information", y);
    rowIdx = 0;
    y = dualRow("Name", vehicle.seller_witness_name, "CNIC", vehicle.seller_witness_cnic || "-", y);
    y = singleRow("Contact", vehicle.seller_witness_phone || "-", y);
    y += 6;
  }

  // ── Notes ─────────────────────────────────────────────────────────────────
  if (vehicle.notes) {
    if (y > 250) { doc.addPage(); y = 20; }
    y = sectionBox("Notes", y);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    setColor(doc, DARK);
    const noteLines = doc.splitTextToSize(vehicle.notes, pw - 40);
    doc.text(noteLines, 20, y);
    y += noteLines.length * 5 + 8;
  }

  // ── Signatures ────────────────────────────────────────────────────────────
  y = Math.max(y + 10, 248);
  if (y > 265) { doc.addPage(); y = 250; }
  setColor(doc, BORDER, "draw");
  doc.setLineWidth(0.4);
  doc.line(15, y, 80, y);
  doc.line(pw - 80, y, pw - 15, y);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(doc, GRAY);
  doc.text("Buyer's Signature", 47.5, y + 5, { align: "center" });
  doc.text("Seller's Signature", pw - 47.5, y + 5, { align: "center" });
  doc.setFontSize(7);
  doc.text("(Stamp / Seal)", pw / 2, y + 5, { align: "center" });
  setColor(doc, BORDER, "draw");
  doc.setLineWidth(0.2);
  doc.circle(pw / 2, y - 8, 8, "S");

  addModernFooter(doc);
  return doc;
}

// ══════════════════════════════════════════════════════════════════════════
//  VEHICLE PURCHASE REPORT PDF
// ══════════════════════════════════════════════════════════════════════════

export function generatePurchaseReportPdf(vehicle: {
  make: string;
  model: string;
  year_of_manufacture?: number;
  year?: number;
  registration_number?: string;
  chassis_number?: string;
  engine_number?: string;
  color?: string;
  assembling_company?: string;
  purchase_price: number;
  purchase_date?: string;
  seller_name?: string;
  seller_father_name?: string;
  seller_caste?: string;
  seller_cnic?: string;
  seller_phone?: string;
  seller_address?: string;
  seller_witness_name?: string;
  seller_witness_father_name?: string;
  seller_witness_cnic?: string;
  seller_witness_phone?: string;
  extra_keys_available?: boolean;
  extra_keys_count?: number | string;
  file_available?: boolean;
  file_pages?: number | string;
  current_smart_card?: boolean;
  smart_card_count?: number | string;
  notes?: string;
}): jsPDF {
  const doc = new jsPDF();
  const pw = doc.internal.pageSize.getWidth();

  setColor(doc, BRAND, "fill");
  doc.rect(0, 0, pw, 4, "F");

  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  setColor(doc, DARK);
  doc.text("PAK JAPAN MOTORS", 15, 18);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  setColor(doc, GRAY);
  doc.text("Layyah — Automobile Sales & Services", 15, 24);

  setColor(doc, BRAND_LIGHT, "fill");
  setColor(doc, ACCENT, "draw");
  doc.setLineWidth(0.3);
  drawRoundedRect(doc, pw - 70, 8, 55, 20, 3, "FD");
  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  setColor(doc, ACCENT);
  doc.text("PURCHASE REPORT", pw - 42.5, 16, { align: "center" });
  doc.setFontSize(8);
  setColor(doc, DARK);
  doc.setFont("helvetica", "normal");
  doc.text(
    vehicle.purchase_date
      ? new Date(vehicle.purchase_date).toLocaleDateString()
      : new Date().toLocaleDateString(),
    pw - 42.5, 23, { align: "center" }
  );

  setColor(doc, BRAND, "draw");
  doc.setLineWidth(0.8);
  doc.line(15, 30, pw - 15, 30);

  let y = 40;

  // ── Section header bar ────────────────────────────────────────────────────
  const sectionBox = (title: string, startY: number): number => {
    setColor(doc, BRAND, "fill");
    drawRoundedRect(doc, 15, startY - 5, pw - 30, 9, 2, "F");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    setColor(doc, WHITE);
    doc.text(title.toUpperCase(), 20, startY + 1);
    return startY + 12;
  };

  // ── Two-column field row ───────────────────────────────────────────────────
  // Left cell: x=15..pw/2-3  |  Right cell: x=pw/2+3..pw-15
  const MID = pw / 2;
  let rowIdx = 0;

  const drawRowBg = (ry: number) => {
    if (rowIdx % 2 === 0) {
      setColor(doc, LIGHT_BG, "fill");
      doc.rect(15, ry - 4, pw - 30, 7.5, "F");
    }
    rowIdx++;
  };

  // Two fields side by side — label left, value right-aligned within each half
  const dualRow = (
    lLabel: string, lValue: string | undefined,
    rLabel: string, rValue: string | undefined,
    ry: number,
  ): number => {
    drawRowBg(ry);
    doc.setFontSize(8.5);
    const lv = lValue || "-";
    const rv = rValue || "-";
    doc.setFont("helvetica", "normal");
    setColor(doc, GRAY);
    doc.text(`${lLabel}:`, 20, ry);
    doc.setFont("helvetica", "bold");
    setColor(doc, DARK);
    doc.text(lv, MID - 5, ry, { align: "right" });
    setColor(doc, BORDER, "draw");
    doc.setLineWidth(0.2);
    doc.line(MID, ry - 3, MID, ry + 2);
    doc.setFont("helvetica", "normal");
    setColor(doc, GRAY);
    doc.text(`${rLabel}:`, MID + 5, ry);
    doc.setFont("helvetica", "bold");
    setColor(doc, DARK);
    doc.text(rv, pw - 20, ry, { align: "right" });
    return ry + 7.5;
  };

  // Single full-width field
  const singleRow = (label: string, value: string | undefined, ry: number): number => {
    if (!value) return ry;
    drawRowBg(ry);
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "normal");
    setColor(doc, GRAY);
    doc.text(`${label}:`, 20, ry);
    doc.setFont("helvetica", "bold");
    setColor(doc, DARK);
    doc.text(String(value), pw - 20, ry, { align: "right" });
    return ry + 7.5;
  };

  // ── Vehicle Details ───────────────────────────────────────────────────────
  y = sectionBox("Vehicle Details", y);
  rowIdx = 0;
  y = dualRow("Make", vehicle.make, "Model", vehicle.model, y);
  y = dualRow(
    "Year", String(vehicle.year_of_manufacture || vehicle.year || "-"),
    "Color", vehicle.color || "-",
    y,
  );
  y = dualRow(
    "Registration", vehicle.registration_number || "-",
    "Chassis No.", vehicle.chassis_number || "-",
    y,
  );
  y = dualRow(
    "Engine No.", vehicle.engine_number || "-",
    "Assembly", vehicle.assembling_company || "-",
    y,
  );
  y = dualRow(
    "Extra Keys",
    vehicle.extra_keys_available ? `Yes (${vehicle.extra_keys_count || 0})` : "No",
    "File",
    vehicle.file_available ? `Yes (${vehicle.file_pages || 0} pages)` : "No",
    y,
  );
  y = singleRow(
    "Smart Card",
    vehicle.current_smart_card ? `Yes (${vehicle.smart_card_count || 0})` : "No",
    y,
  );
  y += 6;

  // ── Purchase Details ──────────────────────────────────────────────────────
  y = sectionBox("Purchase Details", y);
  setColor(doc, GREEN, "fill");
  drawRoundedRect(doc, 15, y - 3, pw - 30, 14, 3, "F");
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  setColor(doc, WHITE);
  doc.text(`Purchase Price: ${formatCurrency(vehicle.purchase_price)}`, pw / 2, y + 6, { align: "center" });
  y += 18;
  rowIdx = 0;
  y = singleRow(
    "Purchase Date",
    vehicle.purchase_date ? new Date(vehicle.purchase_date).toLocaleDateString() : "-",
    y,
  );
  y += 6;

  // ── Seller Information ────────────────────────────────────────────────────
  if (vehicle.seller_name) {
    if (y > 240) { doc.addPage(); y = 20; }
    y = sectionBox("Seller Information", y);
    rowIdx = 0;
    y = dualRow("Name", vehicle.seller_name, "Father's Name", vehicle.seller_father_name || "-", y);
    y = dualRow("Caste / Tribe", vehicle.seller_caste || "-", "CNIC", vehicle.seller_cnic || "-", y);
    y = dualRow("Contact", vehicle.seller_phone || "-", "Address", vehicle.seller_address || "-", y);
    y += 6;
  }

  // ── Witness Information ───────────────────────────────────────────────────
  if (vehicle.seller_witness_name) {
    if (y > 240) { doc.addPage(); y = 20; }
    y = sectionBox("Witness Information", y);
    rowIdx = 0;
    y = dualRow("Name", vehicle.seller_witness_name, "Father's Name", vehicle.seller_witness_father_name || "-", y);
    y = dualRow("CNIC", vehicle.seller_witness_cnic || "-", "Contact", vehicle.seller_witness_phone || "-", y);
    y += 6;
  }

  // ── Notes ─────────────────────────────────────────────────────────────────
  if (vehicle.notes) {
    if (y > 250) { doc.addPage(); y = 20; }
    y = sectionBox("Notes", y);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    setColor(doc, DARK);
    const splitNotes = doc.splitTextToSize(vehicle.notes, pw - 40);
    doc.text(splitNotes, 20, y);
    y += splitNotes.length * 5 + 8;
  }

  y = Math.max(y + 10, 248);
  if (y > 265) { doc.addPage(); y = 250; }
  setColor(doc, BORDER, "draw");
  doc.setLineWidth(0.4);
  doc.line(15, y, 80, y);
  doc.line(pw - 80, y, pw - 15, y);
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(doc, GRAY);
  doc.text("Buyer's Signature", 47.5, y + 5, { align: "center" });
  doc.text("Seller's Signature", pw - 47.5, y + 5, { align: "center" });
  doc.setFontSize(7);
  doc.text("(Stamp / Seal)", pw / 2, y + 5, { align: "center" });
  setColor(doc, BORDER, "draw");
  doc.setLineWidth(0.2);
  doc.circle(pw / 2, y - 8, 8, "S");

  addModernFooter(doc);
  return doc;
}
