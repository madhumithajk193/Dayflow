import PDFDocument from 'pdfkit';
import { Payroll, Employee } from '../db/database.js';

function formatIndianNumber(num: number): string {
  const absNum = Math.abs(Math.round(num || 0));
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  }).format(absNum);
}

function numberToWordsINR(amount: number): string {
  const num = Math.floor(Math.abs(amount));
  if (num === 0) return 'Zero Rupees Only';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
    'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertChunk(n: number): string {
    let str = '';
    if (n >= 100) {
      str += units[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      str += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n > 0) {
      str += units[n] + ' ';
    }
    return str.trim();
  }

  let crore = Math.floor(num / 10000000);
  let remainder = num % 10000000;
  let lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;
  let thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;
  let hundred = remainder;

  let res = '';
  if (crore > 0) res += convertChunk(crore) + ' Crore ';
  if (lakh > 0) res += convertChunk(lakh) + ' Lakh ';
  if (thousand > 0) res += convertChunk(thousand) + ' Thousand ';
  if (hundred > 0) res += convertChunk(hundred);

  return 'Rupees ' + res.trim() + ' Only';
}

export class PdfService {
  /**
   * Generates a pristine, professional Payslip PDF buffer for an employee's payroll record.
   */
  static async generatePayslipPdf(payroll: Payroll, employee: Employee): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: 40,
          info: {
            Title: `Payslip - ${employee.first_name} ${employee.last_name} (${payroll.month} ${payroll.year})`,
            Author: 'Dayflow HRMS',
            Subject: 'Official Compensation Voucher',
          },
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err) => reject(err));

        const primaryColor = '#1e1b4b'; // Deep Indigo
        const accentColor = '#4f46e5'; // Indigo
        const darkText = '#0f172a'; // Slate 900
        const mutedText = '#64748b'; // Slate 500
        const borderColor = '#e2e8f0'; // Slate 200
        const bgLight = '#f8fafc'; // Slate 50
        const emeraldDark = '#065f46'; // Emerald 800
        const roseDark = '#9f1239'; // Rose 800

        const width = doc.page.width - 80;
        let y = 40;

        // 1. Top Header Banner
        doc.rect(40, y, width, 65).fill(primaryColor);

        doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold')
          .text('DAYFLOW HRMS', 55, y + 14, { characterSpacing: 1 });

        doc.fillColor('#cbd5e1').fontSize(9).font('Helvetica')
          .text('INTELLIGENT WORKFORCE MANAGEMENT & PAYROLL SYSTEM', 55, y + 36);

        // Header Right - Payslip Badge
        doc.fillColor('#a5b4fc').fontSize(12).font('Helvetica-Bold')
          .text('SALARY PAYSLIP', 40, y + 16, { align: 'right', width: width - 15 });

        const slipNo = (payroll.id || `SLIP-${employee.employee_code}`).slice(0, 16).toUpperCase();
        doc.fillColor('#e2e8f0').fontSize(8).font('Helvetica')
          .text(`Voucher ID: ${slipNo}`, 40, y + 36, { align: 'right', width: width - 15 });

        y += 75;

        // 2. Sub-header (Period & Status Bar)
        doc.rect(40, y, width, 26).fill('#f1f5f9');
        doc.strokeColor(borderColor).lineWidth(1).rect(40, y, width, 26).stroke();

        doc.fillColor(mutedText).fontSize(8).font('Helvetica-Bold')
          .text('PAY PERIOD:', 52, y + 8);
        doc.fillColor(accentColor).fontSize(9).font('Helvetica-Bold')
          .text(`${(payroll.month || 'August').toUpperCase()} ${payroll.year || 2026}`, 115, y + 7.5);

        doc.fillColor(mutedText).fontSize(8).font('Helvetica-Bold')
          .text('STATUS:', width - 130, y + 8);
        const statusText = payroll.status === 'PAID' ? 'PROCESSED & PAID' : 'PAYMENT PENDING';
        doc.fillColor(payroll.status === 'PAID' ? emeraldDark : '#b45309').fontSize(8.5).font('Helvetica-Bold')
          .text(statusText, width - 85, y + 8);

        y += 36;

        // 3. Employee Information Box (2 Columns)
        const infoBoxHeight = 84;
        doc.rect(40, y, width, infoBoxHeight).fill(bgLight);
        doc.strokeColor(borderColor).lineWidth(1).rect(40, y, width, infoBoxHeight).stroke();

        const col1X = 55;
        const col2X = 310;
        let infoY = y + 10;

        // Row 1
        doc.fillColor(mutedText).fontSize(8).font('Helvetica').text('Employee Name:', col1X, infoY);
        doc.fillColor(darkText).fontSize(8.5).font('Helvetica-Bold').text(`${employee.first_name} ${employee.last_name}`, col1X + 80, infoY);

        doc.fillColor(mutedText).fontSize(8).font('Helvetica').text('Employee Code:', col2X, infoY);
        doc.fillColor(darkText).fontSize(8.5).font('Helvetica-Bold').text(employee.employee_code, col2X + 80, infoY);

        // Row 2
        infoY += 18;
        doc.fillColor(mutedText).fontSize(8).font('Helvetica').text('Department:', col1X, infoY);
        doc.fillColor(darkText).fontSize(8.5).font('Helvetica-Bold').text(employee.department || 'Engineering', col1X + 80, infoY);

        doc.fillColor(mutedText).fontSize(8).font('Helvetica').text('Designation:', col2X, infoY);
        doc.fillColor(darkText).fontSize(8.5).font('Helvetica-Bold').text(employee.designation || 'Associate', col2X + 80, infoY);

        // Row 3
        infoY += 18;
        doc.fillColor(mutedText).fontSize(8).font('Helvetica').text('Email Address:', col1X, infoY);
        doc.fillColor(darkText).fontSize(8.5).font('Helvetica').text(employee.email || '—', col1X + 80, infoY);

        doc.fillColor(mutedText).fontSize(8).font('Helvetica').text('Joining Date:', col2X, infoY);
        doc.fillColor(darkText).fontSize(8.5).font('Helvetica').text(employee.joining_date || '2024-01-15', col2X + 80, infoY);

        // Row 4
        infoY += 18;
        doc.fillColor(mutedText).fontSize(8).font('Helvetica').text('Payment Mode:', col1X, infoY);
        doc.fillColor(darkText).fontSize(8.5).font('Helvetica').text('Direct Bank Deposit (INR / INR Accounts)', col1X + 80, infoY);

        doc.fillColor(mutedText).fontSize(8).font('Helvetica').text('Disbursement Date:', col2X, infoY);
        doc.fillColor(darkText).fontSize(8.5).font('Helvetica').text(payroll.disbursement_date || `${payroll.year || 2026}-08-01`, col2X + 80, infoY);

        y += infoBoxHeight + 16;

        // 4. Earnings & Deductions Tables (Side by Side)
        const tableWidth = (width - 15) / 2;
        const earnX = 40;
        const dedX = 40 + tableWidth + 15;
        const tableHeaderHeight = 22;

        // Headers
        doc.rect(earnX, y, tableWidth, tableHeaderHeight).fill('#1e293b');
        doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold').text('EARNINGS BREAKDOWN (₹ INR)', earnX + 10, y + 6);
        doc.text('AMOUNT (₹)', earnX + tableWidth - 75, y + 6, { align: 'right', width: 65 });

        doc.rect(dedX, y, tableWidth, tableHeaderHeight).fill('#1e293b');
        doc.fillColor('#ffffff').fontSize(8.5).font('Helvetica-Bold').text('DEDUCTIONS BREAKDOWN (₹ INR)', dedX + 10, y + 6);
        doc.text('AMOUNT (₹)', dedX + tableWidth - 75, y + 6, { align: 'right', width: 65 });

        y += tableHeaderHeight;

        // Earnings Rows
        const earningsItems = [
          { label: 'Basic Salary', amount: payroll.basic_salary },
          { label: 'House Rent Allowance (HRA)', amount: payroll.hra },
          { label: 'Transport Allowance', amount: payroll.transport_allowance },
          { label: 'Special Allowance', amount: payroll.special_allowance },
        ];

        // Deductions Rows
        const deductionItems = [
          { label: 'Income Tax (TDS)', amount: payroll.tax_deduction },
          { label: 'Provident Fund (PF)', amount: payroll.pf_deduction },
          { label: 'Unpaid Leave / Adjustments', amount: payroll.leave_deduction },
          { label: 'Other Statutory Deductions', amount: 0 },
        ];

        const rowHeight = 22;
        const maxRows = Math.max(earningsItems.length, deductionItems.length);

        for (let i = 0; i < maxRows; i++) {
          const rowBg = i % 2 === 0 ? '#ffffff' : '#f8fafc';
          const curY = y + (i * rowHeight);

          // Left (Earnings)
          doc.rect(earnX, curY, tableWidth, rowHeight).fill(rowBg);
          doc.strokeColor(borderColor).lineWidth(0.5).rect(earnX, curY, tableWidth, rowHeight).stroke();

          if (earningsItems[i]) {
            doc.fillColor(darkText).fontSize(8).font('Helvetica').text(earningsItems[i].label, earnX + 10, curY + 6);
            doc.fillColor(darkText).fontSize(8.5).font('Helvetica-Bold')
              .text(`₹ ${formatIndianNumber(earningsItems[i].amount)}`, earnX + tableWidth - 95, curY + 6, { align: 'right', width: 85 });
          }

          // Right (Deductions)
          doc.rect(dedX, curY, tableWidth, rowHeight).fill(rowBg);
          doc.strokeColor(borderColor).lineWidth(0.5).rect(dedX, curY, tableWidth, rowHeight).stroke();

          if (deductionItems[i]) {
            doc.fillColor(darkText).fontSize(8).font('Helvetica').text(deductionItems[i].label, dedX + 10, curY + 6);
            doc.fillColor(roseDark).fontSize(8.5).font('Helvetica-Bold')
              .text(`₹ ${formatIndianNumber(deductionItems[i].amount)}`, dedX + tableWidth - 95, curY + 6, { align: 'right', width: 85 });
          }
        }

        y += maxRows * rowHeight;

        // Subtotals Bar
        const totalRowHeight = 24;
        doc.rect(earnX, y, tableWidth, totalRowHeight).fill('#e0e7ff');
        doc.strokeColor(accentColor).lineWidth(1).rect(earnX, y, tableWidth, totalRowHeight).stroke();
        doc.fillColor('#312e81').fontSize(8.5).font('Helvetica-Bold').text('GROSS EARNINGS:', earnX + 10, y + 7);
        doc.text(`₹ ${formatIndianNumber(payroll.gross_salary)}`, earnX + tableWidth - 105, y + 7, { align: 'right', width: 95 });

        const totalDeductions = (payroll.tax_deduction || 0) + (payroll.pf_deduction || 0) + (payroll.leave_deduction || 0);
        doc.rect(dedX, y, tableWidth, totalRowHeight).fill('#ffe4e6');
        doc.strokeColor('#f43f5e').lineWidth(1).rect(dedX, y, tableWidth, totalRowHeight).stroke();
        doc.fillColor('#881337').fontSize(8.5).font('Helvetica-Bold').text('TOTAL DEDUCTIONS:', dedX + 10, y + 7);
        doc.text(`- ₹ ${formatIndianNumber(totalDeductions)}`, dedX + tableWidth - 105, y + 7, { align: 'right', width: 95 });

        y += totalRowHeight + 16;

        // 5. Net Salary Highlight Banner
        const netBoxHeight = 54;
        doc.rect(40, y, width, netBoxHeight).fill('#064e3b'); // Deep Emerald

        doc.fillColor('#a7f3d0').fontSize(9).font('Helvetica-Bold')
          .text('NET TAKE-HOME SALARY (INR)', 55, y + 12);

        doc.fillColor('#ffffff').fontSize(18).font('Helvetica-Bold')
          .text(`₹ ${formatIndianNumber(payroll.net_salary)}`, 55, y + 26);

        // Amount in Words
        const inWords = numberToWordsINR(payroll.net_salary);
        doc.fillColor('#d1fae5').fontSize(8).font('Helvetica-Oblique')
          .text(`(${inWords})`, 40, y + 23, { align: 'right', width: width - 15 });

        y += netBoxHeight + 20;

        // 6. Signature & Verification Section
        doc.rect(40, y, width, 55).fill(bgLight);
        doc.strokeColor(borderColor).lineWidth(1).rect(40, y, width, 55).stroke();

        doc.fillColor(mutedText).fontSize(7.5).font('Helvetica')
          .text('EMPLOYER SIGNATORY & STAMP', 55, y + 10);
        doc.fillColor(darkText).fontSize(8).font('Helvetica-Bold')
          .text('Authorized by Dayflow HR Operations', 55, y + 24);
        doc.fillColor(mutedText).fontSize(7).font('Helvetica')
          .text('Digitally Verified & Approved', 55, y + 36);

        doc.fillColor(mutedText).fontSize(7.5).font('Helvetica')
          .text('EMPLOYEE ACKNOWLEDGEMENT', width - 150, y + 10, { align: 'right', width: 140 });
        doc.fillColor(darkText).fontSize(8).font('Helvetica-Bold')
          .text(`${employee.first_name} ${employee.last_name}`, width - 150, y + 24, { align: 'right', width: 140 });
        doc.fillColor(mutedText).fontSize(7).font('Helvetica')
          .text(`Generated: ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}`, width - 150, y + 36, { align: 'right', width: 140 });

        y += 65;

        // 7. Footer Note
        doc.fillColor(mutedText).fontSize(7).font('Helvetica')
          .text('Note: This is a system-generated compensation voucher generated securely by Dayflow HRMS. All values are denominated in Indian National Rupees (₹ INR). Confidential & Proprietary.', 40, y, { align: 'center', width });

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}
