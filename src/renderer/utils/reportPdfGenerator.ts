import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

// ── Colour palette ───────────────────────────────────────────────────────
const BRAND = [30, 64, 175] as const;
const BRAND_LIGHT = [238, 242, 255] as const;
const ACCENT = [79, 70, 229] as const;
const GRAY = [100, 116, 139] as const;
const DARK = [15, 23, 42] as const;
const LIGHT_BG = [248, 250, 252] as const;
const WHITE = [255, 255, 255] as const;
const GREEN = [22, 163, 74] as const;
const RED = [220, 38, 38] as const;
const AMBER = [202, 138, 4] as const;
const BORDER = [226, 232, 240] as const;
const BLUE = [59, 130, 246] as const;
const PURPLE = [139, 92, 246] as const;
const ORANGE = [249, 115, 22] as const;

type RGB = readonly [number, number, number];

const formatCurrency = (v: number) => `PKR ${v?.toLocaleString() || "0"}`;
const formatNumber = (v: number) => v?.toLocaleString() || "0";

function setColor(doc: jsPDF, color: RGB, type: "text" | "fill" | "draw" = "text") {
  if (type === "text") doc.setTextColor(...color);
  else if (type === "fill") doc.setFillColor(...color);
  else doc.setDrawColor(...color);
}

function drawRoundedRect(doc: jsPDF, x: number, y: number, w: number, h: number, r: number, style: "F" | "S" | "FD" = "F") {
  doc.roundedRect(x, y, w, h, r, r, style);
}

interface ChartDataPoint {
  label: string;
  sales: number;
  revenue: number;
  cash: number;
  installment: number;
}

interface SalesReport {
  period: string;
  total_sales: number;
  total_revenue: number;
  cash_sales: number;
  installment_sales: number;
  total_collected: number;
  total_pending: number;
  chart_data: ChartDataPoint[];
  top_vehicles: Array<{
    vehicle_info: string;
    sale_price: number;
    customer_name: string;
    date: string;
    payment_type: string;
  }>;
  expense_summary: {
    vehicle_expenses: number;
    showroom_expenses: number;
    total: number;
  };
}

interface ProfitReportItem {
  vehicle_id: string;
  vehicle_info: string;
  purchase_price: number;
  total_expenses: number;
  total_cost: number;
  selling_price: number;
  profit: number;
}

interface InventoryReport {
  total_vehicles: number;
  in_stock: number;
  sold: number;
  on_installments: number;
  reserved: number;
  long_staying: number;
}

interface ReportInput {
  period: string;
  periodRange: string;
  salesReport: SalesReport;
  profitReport: ProfitReportItem[];
  inventoryReport: InventoryReport | null;
}

// ── Main entry ──────────────────────────────────────────────────────────
export function generateSalesReportPdf(input: ReportInput): jsPDF {
  const doc = new jsPDF("p", "mm", "a4");
  const pw = doc.internal.pageSize.getWidth();
  const ph = doc.internal.pageSize.getHeight();
  const margin = 15;
  const contentW = pw - margin * 2;

  // ═══════════════ PAGE 1: Cover + Sales Summary ═══════════════
  let y = drawCoverHeader(doc, pw, input.period, input.periodRange);

  // ── Sales Summary Cards ──
  y = drawSectionTitle(doc, "Sales Summary", y, pw);
  y = drawSummaryCards(doc, input.salesReport, y, margin, contentW);

  // ── Payment Type Breakdown ──
  y = drawSectionTitle(doc, "Payment Analysis", y + 4, pw);
  y = drawPaymentBreakdown(doc, input.salesReport, y, margin, contentW);

  // ── Revenue Trend Table ──
  if (input.salesReport.chart_data.length > 1) {
    y = checkPageBreak(doc, y, 60, ph);
    y = drawSectionTitle(doc, "Revenue Trend Breakdown", y + 2, pw);
    y = drawRevenueTable(doc, input.salesReport.chart_data, y, margin, contentW);
  }

  // ── Expense Summary ──
  if (input.salesReport.expense_summary.total > 0) {
    y = checkPageBreak(doc, y, 40, ph);
    y = drawSectionTitle(doc, "Expense Summary", y + 2, pw);
    y = drawExpenseSummary(doc, input.salesReport.expense_summary, y, margin, contentW);
  }

  // ── Top Sales ──
  if (input.salesReport.top_vehicles.length > 0) {
    y = checkPageBreak(doc, y, 50, ph);
    y = drawSectionTitle(doc, "Top Vehicle Sales", y + 2, pw);
    y = drawTopSalesTable(doc, input.salesReport.top_vehicles, y, margin);
  }

  // ═══════════════ PAGE 2+: Profit Analysis ═══════════════
  if (input.profitReport.length > 0) {
    doc.addPage();
    y = drawPageHeader(doc, pw, "Profit & Loss Analysis");
    y = drawProfitSummary(doc, input.profitReport, y, margin, contentW);
    y = checkPageBreak(doc, y, 50, ph);
    y = drawSectionTitle(doc, "Per Vehicle Profit Details", y + 2, pw);
    y = drawProfitTable(doc, input.profitReport, y, margin);
  }

  // ═══════════════ PAGE 3+: Inventory ═══════════════
  if (input.inventoryReport) {
    doc.addPage();
    y = drawPageHeader(doc, pw, "Inventory Report");
    y = drawInventorySummary(doc, input.inventoryReport, y, margin, contentW);
    y = drawInventoryBreakdown(doc, input.inventoryReport, y + 4, margin, contentW);
  }

  // ── Footer on all pages ──
  addProfessionalFooter(doc, pw, input.period, input.periodRange);

  return doc;
}

// ═══════════════════════════════════════════════════════════════════════
// Drawing functions
// ═══════════════════════════════════════════════════════════════════════

function drawCoverHeader(doc: jsPDF, pw: number, period: string, range: string): number {
  // Top accent bar
  setColor(doc, BRAND, "fill");
  doc.rect(0, 0, pw, 6, "F");

  // Decorative side accent
  setColor(doc, ACCENT, "fill");
  doc.rect(0, 6, 4, 40, "F");

  // Company name
  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  setColor(doc, DARK);
  doc.text("PAK JAPAN MOTORS", 15, 22);

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  setColor(doc, GRAY);
  doc.text("Layyah, Punjab, Pakistan", 15, 29);

  // Report title badge
  setColor(doc, BRAND_LIGHT, "fill");
  setColor(doc, BRAND, "draw");
  doc.setLineWidth(0.5);
  drawRoundedRect(doc, 15, 34, pw - 30, 16, 3, "FD");

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  setColor(doc, BRAND);
  doc.text(`${period} Business Report`, pw / 2, 43, { align: "center" });

  // Date range and generation info
  doc.setFontSize(8);
  doc.setFont("helvetica", "normal");
  setColor(doc, GRAY);
  doc.text(`Period: ${range}`, 15, 57);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pw - 15, 57, { align: "right" });

  // Divider
  setColor(doc, BORDER, "draw");
  doc.setLineWidth(0.3);
  doc.line(15, 60, pw - 15, 60);

  return 66;
}

function drawPageHeader(doc: jsPDF, pw: number, title: string): number {
  setColor(doc, BRAND, "fill");
  doc.rect(0, 0, pw, 4, "F");

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  setColor(doc, GRAY);
  doc.text("PAK JAPAN MOTORS", 15, 14);

  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  setColor(doc, DARK);
  doc.text(title, pw - 15, 14, { align: "right" });

  setColor(doc, BORDER, "draw");
  doc.setLineWidth(0.3);
  doc.line(15, 18, pw - 15, 18);

  return 26;
}

function drawSectionTitle(doc: jsPDF, title: string, y: number, pw: number): number {
  // Accent bar
  setColor(doc, ACCENT, "fill");
  doc.rect(15, y, 3, 7, "F");

  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  setColor(doc, DARK);
  doc.text(title, 21, y + 5.5);

  return y + 12;
}

function drawSummaryCards(doc: jsPDF, report: SalesReport, y: number, margin: number, contentW: number): number {
  const cardW = (contentW - 9) / 4;
  const cardH = 22;
  const cards = [
    { label: "Total Sales", value: report.total_sales.toString(), color: BLUE },
    { label: "Total Revenue", value: formatCurrency(report.total_revenue), color: GREEN },
    { label: "Collected", value: formatCurrency(report.total_collected), color: PURPLE },
    { label: "Pending", value: formatCurrency(report.total_pending), color: RED },
  ];

  cards.forEach((card, i) => {
    const x = margin + i * (cardW + 3);

    // Card background
    setColor(doc, LIGHT_BG, "fill");
    setColor(doc, BORDER, "draw");
    doc.setLineWidth(0.3);
    drawRoundedRect(doc, x, y, cardW, cardH, 2, "FD");

    // Top accent line
    setColor(doc, card.color, "fill");
    doc.rect(x, y, cardW, 2, "F");

    // Value
    doc.setFontSize(card.value.length > 15 ? 9 : 11);
    doc.setFont("helvetica", "bold");
    setColor(doc, card.color);
    doc.text(card.value, x + cardW / 2, y + 11, { align: "center" });

    // Label
    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    setColor(doc, GRAY);
    doc.text(card.label, x + cardW / 2, y + 18, { align: "center" });
  });

  return y + cardH + 4;
}

function drawPaymentBreakdown(doc: jsPDF, report: SalesReport, y: number, margin: number, contentW: number): number {
  const halfW = (contentW - 4) / 2;

  // Cash vs Installment bars
  const total = report.cash_sales + report.installment_sales || 1;
  const cashPct = (report.cash_sales / total) * 100;
  const instPct = (report.installment_sales / total) * 100;

  // Left card: Payment type
  setColor(doc, LIGHT_BG, "fill");
  drawRoundedRect(doc, margin, y, halfW, 32, 2, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  setColor(doc, DARK);
  doc.text("Payment Type", margin + 4, y + 7);

  // Cash bar
  doc.setFontSize(7);
  setColor(doc, GRAY);
  doc.text(`Cash: ${report.cash_sales} sales (${cashPct.toFixed(0)}%)`, margin + 4, y + 14);
  setColor(doc, [229, 231, 235] as unknown as RGB, "fill");
  drawRoundedRect(doc, margin + 4, y + 16, halfW - 8, 4, 1, "F");
  if (cashPct > 0) {
    setColor(doc, BLUE, "fill");
    drawRoundedRect(doc, margin + 4, y + 16, Math.max(2, (halfW - 8) * cashPct / 100), 4, 1, "F");
  }

  // Installment bar
  doc.text(`Installment: ${report.installment_sales} sales (${instPct.toFixed(0)}%)`, margin + 4, y + 24);
  setColor(doc, [229, 231, 235] as unknown as RGB, "fill");
  drawRoundedRect(doc, margin + 4, y + 26, halfW - 8, 4, 1, "F");
  if (instPct > 0) {
    setColor(doc, PURPLE, "fill");
    drawRoundedRect(doc, margin + 4, y + 26, Math.max(2, (halfW - 8) * instPct / 100), 4, 1, "F");
  }

  // Right card: Collection status
  const rightX = margin + halfW + 4;
  setColor(doc, LIGHT_BG, "fill");
  drawRoundedRect(doc, rightX, y, halfW, 32, 2, "F");

  doc.setFontSize(8);
  doc.setFont("helvetica", "bold");
  setColor(doc, DARK);
  doc.text("Collection Status", rightX + 4, y + 7);

  const collectTotal = report.total_collected + report.total_pending || 1;
  const collectPct = (report.total_collected / collectTotal) * 100;

  doc.setFontSize(7);
  setColor(doc, GREEN);
  doc.text(`Collected: ${formatCurrency(report.total_collected)} (${collectPct.toFixed(0)}%)`, rightX + 4, y + 14);
  setColor(doc, RED);
  doc.text(`Pending: ${formatCurrency(report.total_pending)} (${(100 - collectPct).toFixed(0)}%)`, rightX + 4, y + 21);

  // Progress bar
  setColor(doc, [229, 231, 235] as unknown as RGB, "fill");
  drawRoundedRect(doc, rightX + 4, y + 24, halfW - 8, 5, 1.5, "F");
  if (collectPct > 0) {
    setColor(doc, GREEN, "fill");
    drawRoundedRect(doc, rightX + 4, y + 24, Math.max(2, (halfW - 8) * collectPct / 100), 5, 1.5, "F");
  }

  return y + 38;
}

function drawRevenueTable(doc: jsPDF, data: ChartDataPoint[], y: number, margin: number, contentW: number): number {
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Period", "Sales", "Revenue", "Cash", "Installment"]],
    body: data.map((d) => [
      d.label,
      d.sales.toString(),
      formatCurrency(d.revenue),
      d.cash.toString(),
      d.installment.toString(),
    ]),
    styles: {
      fontSize: 8,
      cellPadding: 3,
      lineColor: [...BORDER] as [number, number, number],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [...BRAND] as [number, number, number],
      textColor: [...WHITE] as [number, number, number],
      fontStyle: "bold",
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: [...LIGHT_BG] as [number, number, number],
    },
    foot: [
      [
        "TOTAL",
        data.reduce((s, d) => s + d.sales, 0).toString(),
        formatCurrency(data.reduce((s, d) => s + d.revenue, 0)),
        data.reduce((s, d) => s + d.cash, 0).toString(),
        data.reduce((s, d) => s + d.installment, 0).toString(),
      ],
    ],
    footStyles: {
      fillColor: [...BRAND_LIGHT] as [number, number, number],
      textColor: [...BRAND] as [number, number, number],
      fontStyle: "bold",
    },
  });

  return (doc as any).lastAutoTable.finalY + 6;
}

function drawExpenseSummary(doc: jsPDF, exp: SalesReport["expense_summary"], y: number, margin: number, contentW: number): number {
  const thirdW = (contentW - 6) / 3;
  const items = [
    { label: "Vehicle Expenses", value: exp.vehicle_expenses, color: ORANGE },
    { label: "Showroom Expenses", value: exp.showroom_expenses, color: RED },
    { label: "Total Expenses", value: exp.total, color: DARK },
  ];

  items.forEach((item, i) => {
    const x = margin + i * (thirdW + 3);
    setColor(doc, LIGHT_BG, "fill");
    setColor(doc, BORDER, "draw");
    doc.setLineWidth(0.2);
    drawRoundedRect(doc, x, y, thirdW, 16, 2, "FD");

    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    setColor(doc, item.color);
    doc.text(formatCurrency(item.value), x + thirdW / 2, y + 7, { align: "center" });

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    setColor(doc, GRAY);
    doc.text(item.label, x + thirdW / 2, y + 13, { align: "center" });
  });

  return y + 22;
}

function drawTopSalesTable(doc: jsPDF, vehicles: SalesReport["top_vehicles"], y: number, margin: number): number {
  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["#", "Vehicle", "Customer", "Date", "Type", "Price"]],
    body: vehicles.map((v, i) => [
      (i + 1).toString(),
      v.vehicle_info || "N/A",
      v.customer_name || "N/A",
      v.date,
      v.payment_type.charAt(0).toUpperCase() + v.payment_type.slice(1),
      formatCurrency(v.sale_price),
    ]),
    styles: {
      fontSize: 7.5,
      cellPadding: 2.5,
      lineColor: [...BORDER] as [number, number, number],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [...BRAND] as [number, number, number],
      textColor: [...WHITE] as [number, number, number],
      fontStyle: "bold",
      fontSize: 7.5,
    },
    alternateRowStyles: {
      fillColor: [...LIGHT_BG] as [number, number, number],
    },
    columnStyles: {
      0: { cellWidth: 8 },
      5: { halign: "right", fontStyle: "bold" },
    },
  });

  return (doc as any).lastAutoTable.finalY + 6;
}

function drawProfitSummary(doc: jsPDF, report: ProfitReportItem[], y: number, margin: number, contentW: number): number {
  const totalInvested = report.reduce((s, v) => s + v.total_cost, 0);
  const totalSelling = report.reduce((s, v) => s + v.selling_price, 0);
  const totalProfit = report.reduce((s, v) => s + v.profit, 0);
  const roi = totalInvested > 0 ? ((totalProfit / totalInvested) * 100).toFixed(1) : "0";

  const thirdW = (contentW - 6) / 3;
  const cards = [
    { label: "Total Invested", value: formatCurrency(totalInvested), color: BLUE },
    { label: "Total Profit / Loss", value: formatCurrency(totalProfit), color: totalProfit >= 0 ? GREEN : RED },
    { label: "Return on Investment", value: `${roi}%`, color: PURPLE },
  ];

  cards.forEach((card, i) => {
    const x = margin + i * (thirdW + 3);
    setColor(doc, LIGHT_BG, "fill");
    setColor(doc, BORDER, "draw");
    doc.setLineWidth(0.3);
    drawRoundedRect(doc, x, y, thirdW, 20, 2, "FD");

    setColor(doc, card.color, "fill");
    doc.rect(x, y, thirdW, 2, "F");

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    setColor(doc, card.color);
    doc.text(card.value, x + thirdW / 2, y + 11, { align: "center" });

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    setColor(doc, GRAY);
    doc.text(card.label, x + thirdW / 2, y + 17, { align: "center" });
  });

  // Visual profit indicator
  y += 26;
  const profitCount = report.filter((v) => v.profit >= 0).length;
  const lossCount = report.filter((v) => v.profit < 0).length;

  doc.setFontSize(8);
  setColor(doc, GREEN);
  doc.setFont("helvetica", "bold");
  doc.text(`${profitCount} Profitable`, margin + 4, y);
  setColor(doc, RED);
  doc.text(`${lossCount} Loss-Making`, margin + 50, y);
  setColor(doc, GRAY);
  doc.setFont("helvetica", "normal");
  doc.text(`${report.length} Total Vehicles Sold`, margin + 100, y);

  return y + 6;
}

function drawProfitTable(doc: jsPDF, report: ProfitReportItem[], y: number, margin: number): number {
  const totalPurchase = report.reduce((s, v) => s + v.purchase_price, 0);
  const totalExpenses = report.reduce((s, v) => s + v.total_expenses, 0);
  const totalCost = report.reduce((s, v) => s + v.total_cost, 0);
  const totalSelling = report.reduce((s, v) => s + v.selling_price, 0);
  const totalProfit = report.reduce((s, v) => s + v.profit, 0);

  autoTable(doc, {
    startY: y,
    margin: { left: margin, right: margin },
    head: [["Vehicle", "Purchase", "Expenses", "Total Cost", "Sale Price", "Profit/Loss"]],
    body: report.map((v) => [
      v.vehicle_info,
      formatCurrency(v.purchase_price),
      formatCurrency(v.total_expenses),
      formatCurrency(v.total_cost),
      formatCurrency(v.selling_price),
      formatCurrency(v.profit),
    ]),
    styles: {
      fontSize: 7,
      cellPadding: 2.5,
      lineColor: [...BORDER] as [number, number, number],
      lineWidth: 0.2,
    },
    headStyles: {
      fillColor: [...BRAND] as [number, number, number],
      textColor: [...WHITE] as [number, number, number],
      fontStyle: "bold",
      fontSize: 7,
    },
    alternateRowStyles: {
      fillColor: [...LIGHT_BG] as [number, number, number],
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { halign: "right" },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
      5: { halign: "right", fontStyle: "bold" },
    },
    didParseCell: (data: any) => {
      if (data.section === "body" && data.column.index === 5) {
        const val = report[data.row.index]?.profit;
        if (val !== undefined) {
          data.cell.styles.textColor = val >= 0 ? [...GREEN] : [...RED];
        }
      }
    },
    foot: [
      [
        "TOTAL",
        formatCurrency(totalPurchase),
        formatCurrency(totalExpenses),
        formatCurrency(totalCost),
        formatCurrency(totalSelling),
        formatCurrency(totalProfit),
      ],
    ],
    footStyles: {
      fillColor: [...BRAND_LIGHT] as [number, number, number],
      textColor: totalProfit >= 0 ? ([...GREEN] as [number, number, number]) : ([...RED] as [number, number, number]),
      fontStyle: "bold",
    },
  });

  return (doc as any).lastAutoTable.finalY + 6;
}

function drawInventorySummary(doc: jsPDF, inv: InventoryReport, y: number, margin: number, contentW: number): number {
  const thirdW = (contentW - 9) / 4;
  const cards = [
    { label: "Total Purchased", value: inv.total_vehicles.toString(), color: BLUE },
    { label: "Cars in Stock", value: inv.in_stock.toString(), color: GREEN },
    { label: "Total Sold", value: inv.sold.toString(), color: PURPLE },
    { label: "On Installments", value: inv.on_installments.toString(), color: AMBER },
  ];

  cards.forEach((card, i) => {
    const x = margin + i * (thirdW + 3);
    setColor(doc, LIGHT_BG, "fill");
    setColor(doc, BORDER, "draw");
    doc.setLineWidth(0.3);
    drawRoundedRect(doc, x, y, thirdW, 22, 2, "FD");

    setColor(doc, card.color, "fill");
    doc.rect(x, y, thirdW, 2, "F");

    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    setColor(doc, card.color);
    doc.text(card.value, x + thirdW / 2, y + 12, { align: "center" });

    doc.setFontSize(7);
    doc.setFont("helvetica", "normal");
    setColor(doc, GRAY);
    doc.text(card.label, x + thirdW / 2, y + 19, { align: "center" });
  });

  return y + 28;
}

function drawInventoryBreakdown(doc: jsPDF, inv: InventoryReport, y: number, margin: number, contentW: number): number {
  y = drawSectionTitle(doc, "Status Breakdown", y, margin + contentW);

  const statuses = [
    { label: "In Stock", count: inv.in_stock, color: GREEN },
    { label: "Sold", count: inv.sold, color: BLUE },
    { label: "On Installments", count: inv.on_installments, color: AMBER },
    { label: "Reserved", count: inv.reserved, color: PURPLE },
    { label: "Long Staying (60+ days)", count: inv.long_staying, color: ORANGE },
  ];

  const barWidth = contentW - 40;
  const total = inv.total_vehicles || 1;

  statuses.forEach((s, i) => {
    const barY = y + i * 12;
    const pct = (s.count / total) * 100;

    // Label
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    setColor(doc, DARK);
    doc.text(s.label, margin + 4, barY + 4);

    // Count
    doc.setFont("helvetica", "bold");
    doc.text(`${s.count} (${pct.toFixed(0)}%)`, margin + contentW - 4, barY + 4, { align: "right" });

    // Background bar
    setColor(doc, [229, 231, 235] as unknown as RGB, "fill");
    drawRoundedRect(doc, margin + 4, barY + 6, barWidth, 3.5, 1, "F");

    // Filled bar
    if (pct > 0) {
      setColor(doc, s.color, "fill");
      drawRoundedRect(doc, margin + 4, barY + 6, Math.max(2, barWidth * pct / 100), 3.5, 1, "F");
    }
  });

  return y + statuses.length * 12 + 6;
}

function checkPageBreak(doc: jsPDF, y: number, needed: number, pageHeight: number): number {
  if (y + needed > pageHeight - 25) {
    doc.addPage();
    return drawPageHeader(doc, doc.internal.pageSize.getWidth(), "Report (continued)");
  }
  return y;
}

function addProfessionalFooter(doc: jsPDF, pw: number, period: string, range: string) {
  const pages = doc.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);

    // Footer line
    setColor(doc, BORDER, "draw");
    doc.setLineWidth(0.3);
    doc.line(15, 280, pw - 15, 280);

    // Bottom accent
    setColor(doc, BRAND, "fill");
    doc.rect(0, 293, pw, 4, "F");

    doc.setFontSize(7);
    setColor(doc, GRAY);
    doc.setFont("helvetica", "normal");
    doc.text("Pak Japan Motors, Layyah | Confidential Business Report", 15, 285);
    doc.text(`${period} Report (${range})`, pw / 2, 285, { align: "center" });
    doc.text(`Page ${i} of ${pages}`, pw - 15, 285, { align: "right" });

    doc.setFontSize(6);
    doc.text(`Generated: ${new Date().toLocaleString()}`, pw / 2, 290, { align: "center" });
  }
}
