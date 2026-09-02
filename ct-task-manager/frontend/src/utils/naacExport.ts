import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface UserReport {
  _id: string;
  name: string;
  universityId?: string;
  role: string;
  department?: string;
  email?: string;
  phone?: string;
  tasksGiven: number;
  tasksPending: number;
  tasksInReview: number;
  tasksCompleted: number;
  totalRatings?: number;
  averageRating?: number;
  onTimeRate?: number;
  rank?: number;
}

export interface DepartmentReport {
  department: string;
  code?: string;
  totalTasksGiven: number;
  totalTasksPending: number;
  totalTasksInReview: number;
  totalTasksCompleted: number;
  totalRatings?: number;
  averageRating?: number;
  rank?: number;
  users: UserReport[];
  completionRate?: number;
}

export interface UniversityStats {
  totalDepts: number;
  activeDeptsCount: number;
  totalGiven: number;
  totalCompleted: number;
  totalPending: number;
  totalReview: number;
  overallRate: string;
  resourceUtilization: string;
}

const getFormattedDate = (): string => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  return `${day}-${month}-${year}`;
};

const getFormattedDateTime = (): string => {
  const now = new Date();
  const day = String(now.getDate()).padStart(2, '0');
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const year = now.getFullYear();
  const hours = String(now.getHours()).padStart(2, '0');
  const mins = String(now.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year}, ${hours}:${mins}`;
};

/**
 * Clean string to prevent encoding / emoji rendering issues in standard PDF fonts
 */
const cleanStr = (val: any): string => {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/[^\x00-\x7F]/g, '')
    .trim();
};

/**
 * Trigger Excel file download in browser
 */
const downloadWorkbook = async (workbook: ExcelJS.Workbook, filename: string) => {
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

/**
 * Export full university NAAC report to Excel (.xlsx) with professional cell colors, bold headings & merged titles
 */
export const exportNaacToExcel = async (data: DepartmentReport[], stats: UniversityStats) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CT University TMS';
  workbook.created = new Date();

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
  };

  const headerBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'medium', color: { argb: 'FF021C3B' } },
    left: { style: 'thin', color: { argb: 'FF334155' } },
    bottom: { style: 'medium', color: { argb: 'FF021C3B' } },
    right: { style: 'thin', color: { argb: 'FF334155' } }
  };

  // -------------------------------------------------------------
  // Sheet 1: 📊 Department Comparison (Main Sheet)
  // -------------------------------------------------------------
  const wsDept = workbook.addWorksheet('Department Comparison', {
    views: [{ showGridLines: true }]
  });

  // Column Widths
  wsDept.columns = [
    { key: 'rank', width: 10 },
    { key: 'department', width: 34 },
    { key: 'admin', width: 24 },
    { key: 'adminId', width: 14 },
    { key: 'staffCount', width: 14 },
    { key: 'avgRating', width: 18 },
    { key: 'reviews', width: 16 },
    { key: 'tasks', width: 22 },
    { key: 'completion', width: 18 }
  ];

  // 1. Title Banner (Merged A1:I2)
  wsDept.mergeCells('A1:I2');
  const titleCell = wsDept.getCell('A1');
  titleCell.value = 'CT UNIVERSITY - NAAC DASHBOARD REPORT';
  titleCell.font = { name: 'Arial', size: 15, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF021C3B' } }; // Deep Navy
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // 2. Subtitle Bar (Merged A3:I3)
  wsDept.mergeCells('A3:I3');
  const subCell = wsDept.getCell('A3');
  subCell.value = `Department Performance & Ratings Summary  •  Generated: ${getFormattedDateTime()}`;
  subCell.font = { name: 'Arial', size: 9.5, italic: true, color: { argb: 'FFCBD5E1' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }; // Slate 900
  subCell.alignment = { vertical: 'middle', horizontal: 'center' };
  wsDept.getRow(3).height = 20;

  // 3. KPI Section Header (Merged A5:I5)
  wsDept.mergeCells('A5:I5');
  const kpiHeader = wsDept.getCell('A5');
  kpiHeader.value = '1. INSTITUTIONAL PERFORMANCE SUMMARY';
  kpiHeader.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF021C3B' } };
  kpiHeader.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  kpiHeader.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  wsDept.getRow(5).height = 22;

  // 4. KPI Summary Cards (Row 6 to 7)
  wsDept.mergeCells('A6:B6');
  wsDept.getCell('A6').value = 'Overall Completion Rate';
  wsDept.getCell('A6').font = { name: 'Arial', size: 8.5, color: { argb: 'FF64748B' } };
  wsDept.getCell('A6').alignment = { horizontal: 'center' };
  wsDept.mergeCells('A7:B7');
  wsDept.getCell('A7').value = `${stats.overallRate}%`;
  wsDept.getCell('A7').font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF0284C7' } };
  wsDept.getCell('A7').alignment = { horizontal: 'center' };

  wsDept.mergeCells('C6:D6');
  wsDept.getCell('C6').value = 'Verified Tasks Completed';
  wsDept.getCell('C6').font = { name: 'Arial', size: 8.5, color: { argb: 'FF64748B' } };
  wsDept.getCell('C6').alignment = { horizontal: 'center' };
  wsDept.mergeCells('C7:D7');
  wsDept.getCell('C7').value = `${stats.totalCompleted} / ${stats.totalGiven}`;
  wsDept.getCell('C7').font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF059669' } };
  wsDept.getCell('C7').alignment = { horizontal: 'center' };

  wsDept.mergeCells('E6:F6');
  wsDept.getCell('E6').value = 'Active Departments';
  wsDept.getCell('E6').font = { name: 'Arial', size: 8.5, color: { argb: 'FF64748B' } };
  wsDept.getCell('E6').alignment = { horizontal: 'center' };
  wsDept.mergeCells('E7:F7');
  wsDept.getCell('E7').value = `${stats.activeDeptsCount} of ${stats.totalDepts}`;
  wsDept.getCell('E7').font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FF021C3B' } };
  wsDept.getCell('E7').alignment = { horizontal: 'center' };

  wsDept.mergeCells('G6:I6');
  wsDept.getCell('G6').value = 'Pending & Review Pipeline';
  wsDept.getCell('G6').font = { name: 'Arial', size: 8.5, color: { argb: 'FF64748B' } };
  wsDept.getCell('G6').alignment = { horizontal: 'center' };
  wsDept.mergeCells('G7:I7');
  wsDept.getCell('G7').value = `${stats.totalPending + stats.totalReview} Tasks`;
  wsDept.getCell('G7').font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFD97706' } };
  wsDept.getCell('G7').alignment = { horizontal: 'center' };

  ['A6', 'B6', 'C6', 'D6', 'E6', 'F6', 'G6', 'H6', 'I6', 'A7', 'B7', 'C7', 'D7', 'E7', 'F7', 'G7', 'H7', 'I7'].forEach(cell => {
    wsDept.getCell(cell).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    wsDept.getCell(cell).border = thinBorder;
  });

  // 5. Table Section Header (Merged A9:I9)
  wsDept.mergeCells('A9:I9');
  const tableHeaderSection = wsDept.getCell('A9');
  tableHeaderSection.value = '2. DEPARTMENT COMPARISON & RANKINGS MATRIX';
  tableHeaderSection.font = { name: 'Arial', size: 10.5, bold: true, color: { argb: 'FF021C3B' } };
  tableHeaderSection.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF1F5F9' } };
  tableHeaderSection.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  wsDept.getRow(9).height = 22;

  // 6. Table Column Headers (Row 10)
  const deptHeaders = [
    'Rank', 'Department Name', 'Admin (HOD)', 'Admin ID', 'Staff Count',
    'Average Rating', 'Total Reviews', 'Tasks (Done / Total)', 'Completion Rate'
  ];
  const headerRow = wsDept.getRow(10);
  headerRow.values = deptHeaders;
  headerRow.height = 26;

  headerRow.eachCell((cell, colNumber) => {
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF021C3B' } };
    cell.alignment = { vertical: 'middle', horizontal: colNumber === 2 || colNumber === 3 ? 'left' : 'center' };
    cell.border = headerBorder;
  });

  // 7. Populate Data Rows
  let currentRowIndex = 11;
  data.forEach((dept, index) => {
    const admin = dept.users.find(u => u.role === 'department_admin');
    const compRate = dept.totalTasksGiven > 0 ? Math.round((dept.totalTasksCompleted / dept.totalTasksGiven) * 100) : 0;
    const avgRating = dept.averageRating && dept.averageRating > 0 ? `${dept.averageRating.toFixed(1)} / 5.0` : 'Not Rated';
    const rankNum = dept.rank || (index + 1);

    const isEven = index % 2 === 0;
    const rowBg = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

    const row = wsDept.getRow(currentRowIndex);
    row.values = [
      `Rank ${rankNum}`,
      dept.department,
      admin ? admin.name : 'Unassigned',
      admin?.universityId || 'N/A',
      dept.users.length,
      avgRating,
      dept.totalRatings || 0,
      `${dept.totalTasksCompleted} / ${dept.totalTasksGiven}`,
      `${compRate}%`
    ];
    row.height = 22;

    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Arial', size: 9, color: { argb: 'FF1E293B' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
      cell.border = thinBorder;
      cell.alignment = { vertical: 'middle', horizontal: colNumber === 2 || colNumber === 3 ? 'left' : 'center' };

      if (colNumber === 1 && rankNum === 1) {
        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF92400E' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
      }

      if (colNumber === 6 && dept.averageRating && dept.averageRating > 0) {
        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FFD97706' } };
      }

      if (colNumber === 9) {
        if (compRate >= 80) {
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF059669' } };
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE6F4EA' } };
        } else {
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0284C7' } };
        }
      }
    });

    currentRowIndex++;
  });

  // -------------------------------------------------------------
  // Sheet 2: 👥 Faculty & Staff Roster
  // -------------------------------------------------------------
  const wsStaff = workbook.addWorksheet('Staff Details', {
    views: [{ showGridLines: true }]
  });

  wsStaff.columns = [
    { key: 'dept', width: 30 },
    { key: 'role', width: 16 },
    { key: 'name', width: 24 },
    { key: 'id', width: 14 },
    { key: 'email', width: 28 },
    { key: 'phone', width: 16 },
    { key: 'rating', width: 16 },
    { key: 'reviews', width: 14 },
    { key: 'tasks', width: 22 },
    { key: 'completion', width: 16 }
  ];

  wsStaff.mergeCells('A1:J2');
  const staffTitle = wsStaff.getCell('A1');
  staffTitle.value = 'CT UNIVERSITY - NAAC FACULTY & STAFF ROSTER';
  staffTitle.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  staffTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF021C3B' } };
  staffTitle.alignment = { vertical: 'middle', horizontal: 'center' };

  wsStaff.mergeCells('A3:J3');
  const staffSub = wsStaff.getCell('A3');
  staffSub.value = `Faculty and Staff Rating Roster  •  Generated: ${getFormattedDateTime()}`;
  staffSub.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FFCBD5E1' } };
  staffSub.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  staffSub.alignment = { vertical: 'middle', horizontal: 'center' };
  wsStaff.getRow(3).height = 18;

  const staffHeaders = [
    'Department', 'Role', 'Member Name', 'University ID', 'Email Address',
    'Phone', 'Average Rating', 'Total Reviews', 'Tasks (Done / Total)', 'Completion Rate'
  ];
  const staffHeaderRow = wsStaff.getRow(5);
  staffHeaderRow.values = staffHeaders;
  staffHeaderRow.height = 24;

  staffHeaderRow.eachCell((cell, colNumber) => {
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF021C3B' } };
    cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 || colNumber === 3 || colNumber === 5 ? 'left' : 'center' };
    cell.border = headerBorder;
  });

  let currentStaffRowIndex = 6;
  data.forEach((dept) => {
    dept.users.forEach((u, uIdx) => {
      const isAdmin = u.role === 'department_admin';
      const roleText = isAdmin ? 'Dept Admin' : (u.rank ? `Staff #${u.rank}` : `Staff #${uIdx + 1}`);
      const userRating = u.averageRating && u.averageRating > 0 ? `${u.averageRating.toFixed(1)} / 5.0` : 'Not Rated';
      const compRate = u.tasksGiven > 0 ? `${Math.round((u.tasksCompleted / u.tasksGiven) * 100)}%` : '0%';

      const row = wsStaff.getRow(currentStaffRowIndex);
      row.values = [
        dept.department,
        roleText,
        u.name,
        u.universityId || 'N/A',
        u.email || 'N/A',
        u.phone || 'N/A',
        userRating,
        u.totalRatings || 0,
        `${u.tasksCompleted} / ${u.tasksGiven}`,
        compRate
      ];
      row.height = 21;

      const rowFill = isAdmin ? 'FFE0F2FE' : (uIdx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC');

      row.eachCell((cell, colNumber) => {
        cell.font = { name: 'Arial', size: 9, color: { argb: 'FF1E293B' }, bold: isAdmin && (colNumber === 2 || colNumber === 3) };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowFill } };
        cell.border = thinBorder;
        cell.alignment = { vertical: 'middle', horizontal: colNumber === 1 || colNumber === 3 || colNumber === 5 ? 'left' : 'center' };

        if (isAdmin && colNumber === 2) {
          cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0369A1' } };
        }
      });

      currentStaffRowIndex++;
    });
  });

  // -------------------------------------------------------------
  // Sheet 3: 🏛️ University Summary
  // -------------------------------------------------------------
  const wsSummary = workbook.addWorksheet('University Summary', {
    views: [{ showGridLines: true }]
  });

  wsSummary.columns = [
    { key: 'metric', width: 36 },
    { key: 'value', width: 28 }
  ];

  wsSummary.mergeCells('A1:B2');
  wsSummary.getCell('A1').value = 'CT UNIVERSITY - INSTITUTIONAL OVERVIEW';
  wsSummary.getCell('A1').font = { name: 'Arial', size: 13, bold: true, color: { argb: 'FFFFFFFF' } };
  wsSummary.getCell('A1').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF021C3B' } };
  wsSummary.getCell('A1').alignment = { vertical: 'middle', horizontal: 'center' };

  wsSummary.mergeCells('A3:B3');
  wsSummary.getCell('A3').value = `Generated on: ${getFormattedDateTime()}`;
  wsSummary.getCell('A3').font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FFCBD5E1' } };
  wsSummary.getCell('A3').fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  wsSummary.getCell('A3').alignment = { vertical: 'middle', horizontal: 'center' };

  const summaryData = [
    ['Overall Task Completion Rate', `${stats.overallRate}%`],
    ['Total Departments Audited', `${stats.totalDepts} Departments`],
    ['Active Participating Departments', `${stats.activeDeptsCount} of ${stats.totalDepts}`],
    ['Total Institutional Tasks', `${stats.totalGiven} Tasks`],
    ['Verified Completed Tasks', `${stats.totalCompleted} Tasks`],
    ['Tasks Pending Action', `${stats.totalPending} Tasks`],
    ['Tasks In Review Pipeline', `${stats.totalReview} Tasks`],
    ['Resource Utilization Rate', `${stats.resourceUtilization}%`]
  ];

  wsSummary.getRow(5).values = ['KEY METRIC', 'VALUE'];
  wsSummary.getRow(5).height = 24;
  wsSummary.getRow(5).eachCell(cell => {
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF021C3B' } };
    cell.border = headerBorder;
    cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  });

  summaryData.forEach((item, idx) => {
    const rIndex = 6 + idx;
    const r = wsSummary.getRow(rIndex);
    r.values = item;
    r.height = 22;
    r.eachCell((cell, cNum) => {
      cell.font = { name: 'Arial', size: 9, color: { argb: 'FF1E293B' }, bold: cNum === 2 };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: idx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC' } };
      cell.border = thinBorder;
      cell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
      if (cNum === 2 && idx === 0) {
        cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FF059669' } };
      }
    });
  });

  await downloadWorkbook(workbook, `CT_University_NAAC_Dashboard_Report_${getFormattedDate()}.xlsx`);
};

/**
 * Export full university NAAC report to PDF
 * Clean, perfectly aligned, collision-free vertical A4 layout
 */
export const exportNaacToPdf = (data: DepartmentReport[], stats: UniversityStats) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // -------------------------------------------------------------
  // 1. Top Header Banner
  // -------------------------------------------------------------
  doc.setFillColor(2, 28, 59); // Dark Navy
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('CT UNIVERSITY - NAAC DASHBOARD REPORT', 14, 11);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(226, 232, 240);
  doc.text(`Department Performance & Ratings Summary • Generated: ${getFormattedDateTime()}`, 14, 18);

  let currentY = 32;

  // -------------------------------------------------------------
  // 2. Section 1: University Overview
  // -------------------------------------------------------------
  doc.setTextColor(2, 28, 59);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('1. University Overview', 14, currentY);
  currentY += 4;

  const kpiData = [
    [
      'Overall Completion Rate', `${stats.overallRate}%`,
      'Total Institutional Tasks', `${stats.totalGiven}`
    ],
    [
      'Active Departments', `${stats.activeDeptsCount} of ${stats.totalDepts} Departments`,
      'Completed Tasks', `${stats.totalCompleted}`
    ],
    [
      'Resource Utilization', `${stats.resourceUtilization}%`,
      'Pending / In Review Tasks', `${stats.totalPending + stats.totalReview}`
    ]
  ];

  autoTable(doc, {
    startY: currentY,
    head: [],
    body: kpiData,
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 2.8,
      textColor: [30, 41, 59],
      lineColor: [203, 213, 225],
      lineWidth: 0.2
    },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [2, 28, 59], cellWidth: 48, fillColor: [248, 250, 252] },
      1: { textColor: [2, 132, 199], fontStyle: 'bold', cellWidth: 43, halign: 'center' },
      2: { fontStyle: 'bold', textColor: [2, 28, 59], cellWidth: 48, fillColor: [248, 250, 252] },
      3: { textColor: [16, 185, 129], fontStyle: 'bold', cellWidth: 43, halign: 'center' }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 9;

  // -------------------------------------------------------------
  // 3. Section 2: Department Comparison & Rankings
  // -------------------------------------------------------------
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(2, 28, 59);
  doc.text('2. Department Comparison & Rankings', 14, currentY);
  currentY += 4;

  const deptTableBody = data.map((dept, index) => {
    const rank = dept.rank || (index + 1);
    const admin = dept.users.find(u => u.role === 'department_admin');
    const avgRating = dept.averageRating || 0;
    const ratingText = avgRating > 0 ? `${avgRating.toFixed(1)} / 5` : 'Not Rated';
    const compRate = dept.totalTasksGiven > 0 ? Math.round((dept.totalTasksCompleted / dept.totalTasksGiven) * 100) : 0;

    return [
      `Rank ${rank}`,
      cleanStr(dept.department),
      cleanStr(admin ? admin.name : 'Unassigned'),
      `${dept.users.length}`,
      ratingText,
      `${dept.totalRatings || 0}`,
      `${dept.totalTasksCompleted} / ${dept.totalTasksGiven}`,
      `${compRate}%`
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [[
      'Rank', 'Department Name', 'Admin (HOD)', 'Staff',
      'Avg Rating', 'Reviews', 'Tasks Done', 'Comp. %'
    ]],
    body: deptTableBody,
    theme: 'striped',
    headStyles: {
      fillColor: [2, 28, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
      cellPadding: 3
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 2.8
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { fontStyle: 'bold', halign: 'center', cellWidth: 16 },
      1: { fontStyle: 'bold', cellWidth: 48 },
      2: { cellWidth: 34 },
      3: { halign: 'center', cellWidth: 12 },
      4: { halign: 'center', fontStyle: 'bold', textColor: [217, 119, 6], cellWidth: 20 },
      5: { halign: 'center', cellWidth: 16 },
      6: { halign: 'center', cellWidth: 20 },
      7: { halign: 'center', fontStyle: 'bold', textColor: [16, 185, 129], cellWidth: 16 }
    },
    didDrawPage: (pageData) => {
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `CT University • NAAC Dashboard Report • Page ${pageData.pageNumber}`,
        14,
        pageHeight - 6
      );
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 11;

  // -------------------------------------------------------------
  // 4. Section 3: Staff Performance Breakdown
  // -------------------------------------------------------------
  if (currentY > pageHeight - 65) {
    doc.addPage();
    currentY = 20;
  }

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(2, 28, 59);
  doc.text('3. Staff Performance Breakdown by Department', 14, currentY);
  currentY += 6;

  data.forEach((dept, dIdx) => {
    if (currentY > pageHeight - 50) {
      doc.addPage();
      currentY = 20;
    }

    const admin = dept.users.find(u => u.role === 'department_admin');
    const compRate = dept.totalTasksGiven > 0 ? Math.round((dept.totalTasksCompleted / dept.totalTasksGiven) * 100) : 0;
    const avgScore = dept.averageRating && dept.averageRating > 0 ? `${dept.averageRating.toFixed(1)} / 5` : 'Not Rated';

    // Department Header Pill
    doc.setFillColor(241, 245, 249);
    doc.roundedRect(14, currentY, pageWidth - 28, 7.5, 1, 1, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(2, 28, 59);
    doc.text(
      `Rank ${dept.rank || (dIdx + 1)}: ${cleanStr(dept.department)} • Admin: ${cleanStr(admin ? admin.name : 'Unassigned')} • Rating: ${avgScore} • Completion: ${compRate}%`,
      17,
      currentY + 5.2
    );

    currentY += 10;

    const staffBody = dept.users.map((u, sIdx) => {
      const isAdmin = u.role === 'department_admin';
      const roleText = isAdmin ? 'Dept Admin' : (u.rank ? `Staff #${u.rank}` : `Staff #${sIdx + 1}`);
      const userRating = u.averageRating && u.averageRating > 0 ? `${u.averageRating.toFixed(1)} / 5` : 'Not Rated';
      const uCompRate = u.tasksGiven > 0 ? `${Math.round((u.tasksCompleted / u.tasksGiven) * 100)}%` : '0%';

      return [
        roleText,
        cleanStr(u.name),
        cleanStr(u.universityId || 'N/A'),
        userRating,
        `${u.totalRatings || 0}`,
        `${u.tasksCompleted} / ${u.tasksGiven}`,
        `${u.onTimeRate ?? 100}%`,
        uCompRate
      ];
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Role', 'Member Name', 'University ID', 'Avg Rating', 'Reviews', 'Tasks Done', 'On-Time %', 'Comp. %']],
      body: staffBody,
      theme: 'grid',
      headStyles: {
        fillColor: [30, 41, 59],
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 7.5,
        halign: 'center',
        cellPadding: 2.5
      },
      bodyStyles: {
        fontSize: 7.5,
        textColor: [51, 65, 85],
        cellPadding: 2.2
      },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [2, 28, 59], cellWidth: 24 },
        1: { fontStyle: 'bold', cellWidth: 44 },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'center', fontStyle: 'bold', textColor: [217, 119, 6], cellWidth: 20 },
        4: { halign: 'center', cellWidth: 16 },
        5: { halign: 'center', cellWidth: 20 },
        6: { halign: 'center', cellWidth: 19 },
        7: { halign: 'center', fontStyle: 'bold', textColor: [16, 185, 129], cellWidth: 19 }
      },
      didDrawPage: (pageData) => {
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `CT University • NAAC Dashboard Report • Page ${pageData.pageNumber}`,
          14,
          pageHeight - 6
        );
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  });

  doc.save(`CT_University_NAAC_Dashboard_Report_${getFormattedDate()}.pdf`);
};

/**
 * Export a single department's detailed staff report to Excel (.xlsx) with styled cells
 */
export const exportDepartmentToExcel = async (dept: DepartmentReport) => {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CT University TMS';
  workbook.created = new Date();

  const thinBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    left: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    bottom: { style: 'thin', color: { argb: 'FFE2E8F0' } },
    right: { style: 'thin', color: { argb: 'FFE2E8F0' } }
  };

  const headerBorder: Partial<ExcelJS.Borders> = {
    top: { style: 'medium', color: { argb: 'FF021C3B' } },
    left: { style: 'thin', color: { argb: 'FF334155' } },
    bottom: { style: 'medium', color: { argb: 'FF021C3B' } },
    right: { style: 'thin', color: { argb: 'FF334155' } }
  };

  const ws = workbook.addWorksheet('Department Summary', {
    views: [{ showGridLines: true }]
  });

  ws.columns = [
    { key: 'role', width: 16 },
    { key: 'rank', width: 14 },
    { key: 'name', width: 26 },
    { key: 'id', width: 14 },
    { key: 'email', width: 28 },
    { key: 'phone', width: 16 },
    { key: 'rating', width: 16 },
    { key: 'reviews', width: 14 },
    { key: 'tasks', width: 22 },
    { key: 'completion', width: 16 }
  ];

  // Title Banner
  ws.mergeCells('A1:J2');
  const titleCell = ws.getCell('A1');
  titleCell.value = `CT UNIVERSITY - ${dept.department.toUpperCase()} NAAC REPORT`;
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF021C3B' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };

  // Subtitle
  ws.mergeCells('A3:J3');
  const subCell = ws.getCell('A3');
  subCell.value = `Department Performance & Faculty Ratings  •  Generated: ${getFormattedDateTime()}`;
  subCell.font = { name: 'Arial', size: 9, italic: true, color: { argb: 'FFCBD5E1' } };
  subCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
  subCell.alignment = { vertical: 'middle', horizontal: 'center' };
  ws.getRow(3).height = 18;

  // Department Stats Summary Cards
  const compRate = dept.totalTasksGiven > 0 ? Math.round((dept.totalTasksCompleted / dept.totalTasksGiven) * 100) : 0;
  const avgRating = dept.averageRating && dept.averageRating > 0 ? `${dept.averageRating.toFixed(1)} / 5.0` : 'Not Rated';
  const admin = dept.users.find(u => u.role === 'department_admin');

  ws.mergeCells('A5:C5');
  ws.getCell('A5').value = 'Department Head (Admin)';
  ws.getCell('A5').font = { name: 'Arial', size: 8.5, color: { argb: 'FF64748B' } };
  ws.mergeCells('A6:C6');
  ws.getCell('A6').value = admin ? admin.name : 'Unassigned';
  ws.getCell('A6').font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF021C3B' } };

  ws.mergeCells('D5:E5');
  ws.getCell('D5').value = 'Institutional Rank';
  ws.getCell('D5').font = { name: 'Arial', size: 8.5, color: { argb: 'FF64748B' } };
  ws.mergeCells('D6:E6');
  ws.getCell('D6').value = `Rank #${dept.rank || 1}`;
  ws.getCell('D6').font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFD97706' } };

  ws.mergeCells('F5:G5');
  ws.getCell('F5').value = 'Average Star Rating';
  ws.getCell('F5').font = { name: 'Arial', size: 8.5, color: { argb: 'FF64748B' } };
  ws.mergeCells('F6:G6');
  ws.getCell('F6').value = avgRating;
  ws.getCell('F6').font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FFD97706' } };

  ws.mergeCells('H5:J5');
  ws.getCell('H5').value = 'Tasks Completed';
  ws.getCell('H5').font = { name: 'Arial', size: 8.5, color: { argb: 'FF64748B' } };
  ws.mergeCells('H6:J6');
  ws.getCell('H6').value = `${dept.totalTasksCompleted} / ${dept.totalTasksGiven} (${compRate}%)`;
  ws.getCell('H6').font = { name: 'Arial', size: 12, bold: true, color: { argb: 'FF059669' } };

  ['A5', 'B5', 'C5', 'D5', 'E5', 'F5', 'G5', 'H5', 'I5', 'J5', 'A6', 'B6', 'C6', 'D6', 'E6', 'F6', 'G6', 'H6', 'I6', 'J6'].forEach(cell => {
    ws.getCell(cell).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    ws.getCell(cell).border = thinBorder;
  });

  // Table Headers (Row 8)
  const headers = ['Role', 'Staff Rank', 'Member Name', 'University ID', 'Email', 'Phone', 'Average Rating', 'Reviews', 'Tasks Done', 'Completion'];
  const hRow = ws.getRow(8);
  hRow.values = headers;
  hRow.height = 24;
  hRow.eachCell((cell, colNum) => {
    cell.font = { name: 'Arial', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF021C3B' } };
    cell.alignment = { vertical: 'middle', horizontal: colNum === 3 || colNum === 5 ? 'left' : 'center' };
    cell.border = headerBorder;
  });

  // Staff Rows
  dept.users.forEach((u, uIdx) => {
    const isAdmin = u.role === 'department_admin';
    const userComp = u.tasksGiven > 0 ? `${Math.round((u.tasksCompleted / u.tasksGiven) * 100)}%` : '0%';
    const userRating = u.averageRating && u.averageRating > 0 ? `${u.averageRating.toFixed(1)} / 5.0` : 'Not Rated';

    const r = ws.getRow(9 + uIdx);
    r.values = [
      isAdmin ? 'Dept Admin' : 'Staff',
      isAdmin ? 'HOD' : `Staff #${u.rank || (uIdx + 1)}`,
      u.name,
      u.universityId || 'N/A',
      u.email || 'N/A',
      u.phone || 'N/A',
      userRating,
      u.totalRatings || 0,
      `${u.tasksCompleted} / ${u.tasksGiven}`,
      userComp
    ];
    r.height = 21;

    const fillBg = isAdmin ? 'FFE0F2FE' : (uIdx % 2 === 0 ? 'FFFFFFFF' : 'FFF8FAFC');

    r.eachCell((cell, colNum) => {
      cell.font = { name: 'Arial', size: 9, color: { argb: 'FF1E293B' }, bold: isAdmin && (colNum === 1 || colNum === 3) };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: fillBg } };
      cell.border = thinBorder;
      cell.alignment = { vertical: 'middle', horizontal: colNum === 3 || colNum === 5 ? 'left' : 'center' };
      if (isAdmin && colNum === 1) {
        cell.font = { name: 'Arial', size: 9, bold: true, color: { argb: 'FF0369A1' } };
      }
    });
  });

  await downloadWorkbook(workbook, `${dept.department.replace(/\s+/g, '_')}_NAAC_Report_${getFormattedDate()}.xlsx`);
};

/**
 * Export a single department's detailed staff report to PDF
 */
export const exportDepartmentToPdf = (dept: DepartmentReport) => {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Top Header Banner
  doc.setFillColor(2, 28, 59);
  doc.rect(0, 0, pageWidth, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.text(`CT UNIVERSITY - ${cleanStr(dept.department).toUpperCase()}`, 14, 11);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(226, 232, 240);
  doc.text(`NAAC Department Report • Generated: ${getFormattedDateTime()}`, 14, 18);

  const avgRating = dept.averageRating || 0;
  const compRate = dept.completionRate ?? 0;
  const admin = dept.users.find(u => u.role === 'department_admin');

  let currentY = 32;

  // Department Stats Summary Grid
  const summaryData = [
    [
      'Department Name', cleanStr(dept.department),
      'Institutional Rank', `Rank #${dept.rank || 1}`
    ],
    [
      'Department Admin (HOD)', cleanStr(admin ? admin.name : 'Unassigned'),
      'Average Rating', avgRating > 0 ? `${avgRating.toFixed(1)} / 5 (${dept.totalRatings || 0} reviews)` : 'Not Rated'
    ],
    [
      'Total Staff Members', `${dept.users.length} Members`,
      'Tasks Completed', `${dept.totalTasksCompleted} of ${dept.totalTasksGiven} (${compRate}%)`
    ]
  ];

  autoTable(doc, {
    startY: currentY,
    head: [],
    body: summaryData,
    theme: 'grid',
    styles: {
      fontSize: 8.5,
      cellPadding: 2.8,
      textColor: [30, 41, 59],
      lineColor: [203, 213, 225],
      lineWidth: 0.2
    },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [2, 28, 59], cellWidth: 46, fillColor: [248, 250, 252] },
      1: { textColor: [2, 132, 199], fontStyle: 'bold', cellWidth: 44 },
      2: { fontStyle: 'bold', textColor: [2, 28, 59], cellWidth: 46, fillColor: [248, 250, 252] },
      3: { textColor: [217, 119, 6], fontStyle: 'bold', cellWidth: 46 }
    }
  });

  currentY = (doc as any).lastAutoTable.finalY + 10;

  // Staff Table
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(2, 28, 59);
  doc.text('Staff Performance & Ratings Roster', 14, currentY);
  currentY += 4;

  const staffTableBody = dept.users.map((u, idx) => {
    const isAdmin = u.role === 'department_admin';
    const roleText = isAdmin ? 'Dept Admin' : (u.rank ? `Staff #${u.rank}` : `Staff #${idx + 1}`);
    const ratingText = u.averageRating && u.averageRating > 0 ? `${u.averageRating.toFixed(1)} / 5` : 'Not Rated';
    const uComp = u.tasksGiven > 0 ? `${Math.round((u.tasksCompleted / u.tasksGiven) * 100)}%` : '0%';

    return [
      roleText,
      cleanStr(u.name),
      cleanStr(u.universityId || 'N/A'),
      ratingText,
      `${u.totalRatings || 0}`,
      `${u.tasksCompleted} / ${u.tasksGiven}`,
      `${u.onTimeRate ?? 100}%`,
      uComp
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['Role', 'Member Name', 'ID', 'Avg Rating', 'Reviews', 'Tasks Done', 'On-Time %', 'Comp. %']],
    body: staffTableBody,
    theme: 'striped',
    headStyles: {
      fillColor: [2, 28, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'center',
      cellPadding: 3
    },
    bodyStyles: {
      fontSize: 8,
      textColor: [30, 41, 59],
      cellPadding: 2.8
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252]
    },
    columnStyles: {
      0: { fontStyle: 'bold', textColor: [2, 28, 59], cellWidth: 24 },
      1: { fontStyle: 'bold', cellWidth: 46 },
      2: { halign: 'center', cellWidth: 20 },
      3: { halign: 'center', fontStyle: 'bold', textColor: [217, 119, 6], cellWidth: 20 },
      4: { halign: 'center', cellWidth: 16 },
      5: { halign: 'center', cellWidth: 20 },
      6: { halign: 'center', cellWidth: 18 },
      7: { halign: 'center', fontStyle: 'bold', textColor: [16, 185, 129], cellWidth: 18 }
    },
    didDrawPage: (pageData) => {
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(
        `CT University • ${cleanStr(dept.department)} NAAC Report • Page ${pageData.pageNumber}`,
        14,
        pageHeight - 6
      );
    }
  });

  doc.save(`${dept.department.replace(/\s+/g, '_')}_NAAC_Report_${getFormattedDate()}.pdf`);
};
