import jsPDF from "jspdf";
import { PANEL_LABELS } from "../../shared/constants";

const formatCurrency = (v: number) => `PKR ${v?.toLocaleString() || "0"}`;

// Common PDF header
function addHeader(doc: jsPDF, title: string, subtitle?: string) {
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text(title, 105, 20, { align: "center" });

  if (subtitle) {
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(subtitle, 105, 28, { align: "center" });
  }

  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.line(15, 32, 195, 32);

  return 38;
}

function addFooter(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(150);
    doc.text(`Page ${i} of ${pages}`, 105, 290, { align: "center" });
    doc.text(`Generated: ${new Date().toLocaleString()}`, 15, 290);
  }
}

// Sale Invoice PDF
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
  installments?: { number: number; due_date: string; amount: number }[];
}): jsPDF {
  const doc = new jsPDF();
  let y = addHeader(doc, "SALE INVOICE", sale.invoice_number);

  // Invoice Details
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
  doc.text(`Invoice: ${sale.invoice_number}`, 15, y);
  doc.text(`Date: ${new Date(sale.sale_date).toLocaleDateString()}`, 140, y);
  y += 10;

  // Customer & Vehicle
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text("Customer Details", 15, y);
  doc.text("Vehicle Details", 110, y);
  y += 6;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const customerLines = [
    `Name: ${sale.customer_name}`,
    sale.customer_cnic ? `CNIC: ${sale.customer_cnic}` : "",
    sale.customer_phone ? `Phone: ${sale.customer_phone}` : "",
  ].filter(Boolean);

  const vehicleLines = [
    `Vehicle: ${sale.vehicle_name}`,
    sale.registration_number ? `Reg #: ${sale.registration_number}` : "",
    sale.chassis_number ? `Chassis: ${sale.chassis_number}` : "",
    sale.engine_number ? `Engine: ${sale.engine_number}` : "",
  ].filter(Boolean);

  customerLines.forEach((line, i) => {
    doc.text(line, 15, y + i * 5);
  });
  vehicleLines.forEach((line, i) => {
    doc.text(line, 110, y + i * 5);
  });
  y += Math.max(customerLines.length, vehicleLines.length) * 5 + 8;

  // Financial
  doc.setFillColor(241, 245, 249);
  doc.rect(15, y - 3, 180, 30, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Payment Summary", 20, y + 3);
  y += 10;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Sale Price: ${formatCurrency(sale.sale_price)}`, 20, y);
  doc.text(
    `Payment Type: ${sale.payment_type.charAt(0).toUpperCase() + sale.payment_type.slice(1)}`,
    110,
    y,
  );
  y += 6;
  if (sale.payment_type === "installment") {
    doc.text(`Down Payment: ${formatCurrency(sale.down_payment)}`, 20, y);
    doc.text(
      `Balance: ${formatCurrency(sale.sale_price - sale.down_payment)}`,
      110,
      y,
    );
  }
  y += 12;

  // Installment Schedule
  if (sale.installments && sale.installments.length > 0) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.text("Installment Schedule", 15, y);
    y += 8;

    // Table header
    doc.setFillColor(59, 130, 246);
    doc.setTextColor(255);
    doc.setFontSize(9);
    doc.rect(15, y - 4, 180, 7, "F");
    doc.text("#", 20, y);
    doc.text("Due Date", 50, y);
    doc.text("Amount", 150, y);
    y += 8;

    doc.setTextColor(0);
    doc.setFont("helvetica", "normal");
    sale.installments.forEach((inst) => {
      if (y > 270) {
        doc.addPage();
        y = 20;
      }
      doc.text(String(inst.number), 20, y);
      doc.text(new Date(inst.due_date).toLocaleDateString(), 50, y);
      doc.text(formatCurrency(inst.amount), 150, y);
      y += 6;
    });
  }

  // Notes
  if (sale.notes) {
    y += 5;
    doc.setFontSize(9);
    doc.setTextColor(100);
    doc.text(`Notes: ${sale.notes}`, 15, y);
  }

  // Signatures
  y = 250;
  doc.setDrawColor(0);
  doc.setLineWidth(0.3);
  doc.line(15, y, 80, y);
  doc.line(120, y, 185, y);
  doc.setFontSize(9);
  doc.setTextColor(0);
  doc.text("Buyer Signature", 30, y + 5);
  doc.text("Seller Signature", 135, y + 5);

  addFooter(doc);
  return doc;
}

// Inspection Certificate PDF
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
  let y = addHeader(doc, "VEHICLE INSPECTION CERTIFICATE");

  // Score
  const score = inspection.overall_score;
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(
    score >= 8 ? 34 : score >= 5 ? 202 : 239,
    score >= 8 ? 197 : score >= 5 ? 138 : 68,
    score >= 8 ? 94 : score >= 5 ? 4 : 68,
  );
  doc.text(`${score.toFixed(1)}/10`, 105, y + 5, { align: "center" });
  y += 15;

  // Vehicle Info
  doc.setFontSize(10);
  doc.setTextColor(0);
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

  // Damage Map Summary
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text("Body Panel Status", 15, y);
  y += 7;

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  inspection.damage_map.forEach((d) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    const color =
      d.status === "original"
        ? [34, 197, 94]
        : d.status === "repainted"
          ? [234, 179, 8]
          : [239, 68, 68];
    doc.setTextColor(color[0], color[1], color[2]);
    doc.text(
      `${(PANEL_LABELS[d.panel_id] || d.panel_id).toUpperCase()}: ${d.status}${d.notes ? ` - ${d.notes}` : ""}`,
      20,
      y,
    );
    y += 5;
  });
  y += 5;

  // Group items by category
  const categories = [...new Set(inspection.items.map((i) => i.category))];
  categories.forEach((cat) => {
    if (y > 250) {
      doc.addPage();
      y = 20;
    }

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    doc.text(cat.replace(/_/g, " ").toUpperCase(), 15, y);
    y += 7;

    // Table header
    doc.setFillColor(241, 245, 249);
    doc.rect(15, y - 4, 180, 6, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.text("Point", 17, y);
    doc.text("Status", 120, y);
    doc.text("Deduction", 160, y);
    y += 6;

    doc.setFont("helvetica", "normal");
    doc.setTextColor(0);
    inspection.items
      .filter((i) => i.category === cat)
      .forEach((item) => {
        if (y > 275) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(8);
        doc.text(item.point_name.substring(0, 50), 17, y);
        const statusColor =
          item.status === "good"
            ? [34, 197, 94]
            : item.status === "fair"
              ? [202, 138, 4]
              : [239, 68, 68];
        doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
        doc.text(item.status.toUpperCase(), 120, y);
        doc.setTextColor(0);
        doc.text(
          item.deduction ? `-${item.deduction.toFixed(2)}` : "-",
          165,
          y,
        );
        y += 5;
      });
    y += 5;
  });

  addFooter(doc);
  return doc;
}

// Customer Ledger PDF
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
  let y = addHeader(doc, "CUSTOMER LEDGER", customer.name);

  doc.setFontSize(10);
  doc.setTextColor(0);
  doc.text(`Customer: ${customer.name}`, 15, y);
  if (customer.cnic) doc.text(`CNIC: ${customer.cnic}`, 110, y);
  y += 6;
  if (customer.phone) {
    doc.text(`Phone: ${customer.phone}`, 15, y);
    y += 6;
  }
  y += 5;

  // Table header
  doc.setFillColor(59, 130, 246);
  doc.setTextColor(255);
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.rect(15, y - 4, 180, 7, "F");
  doc.text("Invoice", 17, y);
  doc.text("Vehicle", 45, y);
  doc.text("Date", 95, y);
  doc.text("Sale Price", 120, y);
  doc.text("Paid", 150, y);
  doc.text("Balance", 175, y);
  y += 8;

  doc.setTextColor(0);
  doc.setFont("helvetica", "normal");
  let totalSale = 0,
    totalPaid = 0,
    totalBalance = 0;

  customer.ledger.forEach((l) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.text(l.invoice_number, 17, y);
    doc.text(l.vehicle_name.substring(0, 25), 45, y);
    doc.text(new Date(l.sale_date).toLocaleDateString(), 95, y);
    doc.text(formatCurrency(l.sale_price), 120, y);
    doc.text(formatCurrency(l.total_paid), 150, y);
    doc.text(formatCurrency(l.balance), 175, y);
    totalSale += l.sale_price;
    totalPaid += l.total_paid;
    totalBalance += l.balance;
    y += 6;
  });

  // Totals
  y += 3;
  doc.setDrawColor(0);
  doc.line(15, y - 2, 195, y - 2);
  doc.setFont("helvetica", "bold");
  doc.text("TOTAL", 17, y + 3);
  doc.text(formatCurrency(totalSale), 120, y + 3);
  doc.text(formatCurrency(totalPaid), 150, y + 3);
  doc.text(formatCurrency(totalBalance), 175, y + 3);

  addFooter(doc);
  return doc;
}

// Professional Inspection Report PDF (PakWheels-style)
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
  overall_condition: string; // "Excellent", "Good", "Fair", "Poor"

  // Exterior condition by category
  exterior_damages: {
    panel_id: string;
    status: string; // normal, scratch, dent, repainted, rust, cracked, replaced
    notes?: string;
  }[];

  // Interior condition scores
  interior_rating?: number; // 1-10
  interior_notes?: string;

  // Mechanical condition scores
  mechanical_rating?: number; // 1-10
  mechanical_notes?: string;

  // Category breakdowns
  categories: {
    name: string;
    rating: number; // 1-10
    items: {
      point_name: string;
      status: string; // good, fair, poor
      notes?: string;
    }[];
  }[];

  // Images/photos
  photos?: { url: string; label: string }[];

  // Final recommendation
  recommendation?: string;
}): jsPDF {
  const doc = new jsPDF("p", "mm", "a4");
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  let y = 15;

  // ─────────────────── PAGE 1: HEADER & SUMMARY ──────────────────────

  // Professional header
  const getRatingColor = (score: number): [number, number, number] => {
    if (score >= 8) return [34, 197, 94]; // Green (Excellent)
    if (score >= 6) return [202, 138, 4]; // Amber (Good)
    if (score >= 4) return [239, 68, 68]; // Orange (Fair)
    return [220, 38, 38]; // Red (Poor)
  };

  const ratingColor = getRatingColor(inspection.overall_score);

  // Header background
  doc.setFillColor(...ratingColor);
  doc.rect(0, 0, pageWidth, 35, "F");

  // Title
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(255, 255, 255);
  doc.text("VEHICLE INSPECTION REPORT", pageWidth / 2, 12, { align: "center" });

  // Score circle
  doc.setFillColor(255, 255, 255);
  doc.circle(pageWidth - 18, 17.5, 8);
  doc.setTextColor(...ratingColor);
  doc.setFontSize(18);
  doc.setFont("helvetica", "bold");
  doc.text(inspection.overall_score.toFixed(1), pageWidth - 18, 19.5, {
    align: "center",
  });
  doc.setFontSize(9);
  doc.text("/10", pageWidth - 14, 19.5, { align: "left" });

  y = 40;

  // Vehicle Details Section
  doc.setFillColor(241, 245, 249);
  doc.rect(12, y - 5, pageWidth - 24, 45, "F");

  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("VEHICLE INFORMATION", 15, y);

  y += 8;
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");

  const vehicleDetails = [
    ["Vehicle", inspection.vehicle_name],
    ["Reg. Number", inspection.registration_number || "N/A"],
    [
      "Model Year",
      inspection.model_year ? String(inspection.model_year) : "N/A",
    ],
    ["Transmission", inspection.transmission || "N/A"],
  ];

  const mechanicalDetails = [
    ["Chassis #", inspection.chassis_number || "N/A"],
    ["Engine #", inspection.engine_number || "N/A"],
    [
      "Mileage",
      inspection.mileage ? `${inspection.mileage.toLocaleString()} km` : "N/A",
    ],
    [
      "Inspection Date",
      new Date(inspection.inspection_date).toLocaleDateString(),
    ],
  ];

  vehicleDetails.forEach((detail, i) => {
    doc.text(`${detail[0]}:`, 15, y + i * 5, { maxWidth: 40 });
    doc.setFont("helvetica", "bold");
    doc.text(detail[1], 60, y + i * 5);
    doc.setFont("helvetica", "normal");
  });

  mechanicalDetails.forEach((detail, i) => {
    doc.text(`${detail[0]}:`, pageWidth / 2 + 5, y + i * 5, { maxWidth: 40 });
    doc.setFont("helvetica", "bold");
    doc.text(detail[1], pageWidth / 2 + 50, y + i * 5);
    doc.setFont("helvetica", "normal");
  });

  y += 25;

  // Condition Summary
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("OVERALL CONDITION", 15, y);
  y += 7;

  // Condition rows
  const conditions = [
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

    // Condition bar
    const condRating = cond[1];
    const barColor = getRatingColor(condRating);
    const barWidth = (condRating / 10) * 60;

    doc.text(`${cond[0]}:`, 15, y + 2);
    doc.setFillColor(230, 230, 230);
    doc.rect(50, y - 1, 60, 4);
    doc.setFillColor(...barColor);
    doc.rect(50, y - 1, barWidth, 4, "F");
    doc.text(`${condRating.toFixed(1)}/10`, 115, y + 2);
    y += 7;
  });

  y += 5;

  // Recommendation box
  if (inspection.recommendation) {
    if (y > 250) {
      doc.addPage();
      y = 15;
    }
    doc.setFillColor(237, 242, 247);
    doc.setDrawColor(...ratingColor);
    doc.setLineWidth(1.5);
    doc.rect(12, y - 2, pageWidth - 24, 20, "FD");
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...ratingColor);
    doc.text("RECOMMENDATION", 15, y + 2);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    const recText = doc.splitTextToSize(
      inspection.recommendation,
      pageWidth - 35,
    );
    doc.text(recText, 15, y + 7);
    y += 22;
  }

  // ─────────────────── PAGE 2+: DETAILED BREAKDOWN ──────────────────────

  doc.addPage();
  y = 15;

  // Exterior/Damage Map Section
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0, 0, 0);
  doc.text("EXTERIOR CONDITION - BODY PANELS", 15, y);
  y += 8;

  doc.setFillColor(241, 245, 249);
  doc.rect(12, y - 3, pageWidth - 24, 6, "F");
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(50, 50, 50);
  doc.text("Panel", 15, y);
  doc.text("Status", 80, y);
  doc.text("Notes", 130, y);
  y += 8;

  doc.setFont("helvetica", "normal");
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(8);

  inspection.exterior_damages.forEach((damage) => {
    if (y > 270) {
      doc.addPage();
      y = 15;
    }

    const panelName = PANEL_LABELS[damage.panel_id] || damage.panel_id;
    const statusColor =
      damage.status === "normal"
        ? [34, 197, 94]
        : damage.status === "scratch"
          ? [202, 138, 4]
          : damage.status === "dent"
            ? [234, 179, 8]
            : damage.status === "repainted"
              ? [139, 92, 246]
              : damage.status === "rust"
                ? [239, 68, 68]
                : [220, 38, 38];

    doc.text(panelName, 15, y);
    doc.setTextColor(...statusColor);
    doc.setFont("helvetica", "bold");
    doc.text(damage.status.toUpperCase(), 80, y);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);
    const notes = damage.notes ? damage.notes.substring(0, 40) : "-";
    doc.text(notes, 130, y);
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

    // Category header
    doc.setFillColor(...categoryColor);
    doc.rect(12, y - 3, pageWidth - 24, 7, "F");
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(
      `${category.name.toUpperCase()} - ${category.rating.toFixed(1)}/10`,
      pageWidth / 2 - 20,
      y + 2,
      { align: "center" },
    );
    y += 9;

    // Category items
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(0, 0, 0);

    category.items.forEach((item) => {
      if (y > 275) {
        doc.addPage();
        y = 15;
      }

      const itemColor =
        item.status === "good"
          ? [34, 197, 94]
          : item.status === "fair"
            ? [202, 138, 4]
            : [239, 68, 68];

      doc.setTextColor(...itemColor);
      doc.text("●", 15, y);
      doc.setTextColor(0, 0, 0);
      doc.text(item.point_name, 18, y, { maxWidth: 80 });
      doc.setTextColor(...itemColor);
      doc.setFont("helvetica", "bold");
      doc.text(`[${item.status.toUpperCase()}]`, 125, y);
      doc.setFont("helvetica", "normal");
      if (item.notes) {
        doc.setTextColor(100, 100, 100);
        doc.text(item.notes.substring(0, 35), 160, y, { maxWidth: 40 });
      }
      y += 5;
    });

    y += 3;
  });

  // Final footer
  doc.setPage(1);
  addFooter(doc);

  return doc;
}
