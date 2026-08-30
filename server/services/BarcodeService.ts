import QRCode from 'qrcode';
import { db, EmployeeBarcode } from '../db/database.js';
import { AttendanceService } from './AttendanceService.js';

export class BarcodeService {
  static async generateForEmployee(employeeId: string): Promise<EmployeeBarcode> {
    const employee = db.employees.find(e => e.id === employeeId);
    if (!employee) throw new Error('Employee not found');

    const barcodeCode = employee.employee_code;
    const qrPayload = JSON.stringify({
      system: 'DAYFLOW_HRMS',
      code: barcodeCode,
      id: employee.id,
      name: `${employee.first_name} ${employee.last_name}`,
      dept: employee.department,
    });

    const qrDataUrl = await QRCode.toDataURL(qrPayload, {
      width: 320,
      margin: 2,
      color: {
        dark: '#1e293b',
        light: '#ffffff',
      },
    });

    let record = db.employee_barcodes.find(b => b.employee_id === employeeId);
    if (record) {
      record.qr_data = qrDataUrl;
      record.generated_at = new Date().toISOString();
    } else {
      record = {
        id: 'bc_' + employeeId,
        employee_id: employeeId,
        barcode_code: barcodeCode,
        qr_data: qrDataUrl,
        generated_at: new Date().toISOString(),
      };
      db.employee_barcodes.push(record);
    }
    db.save();
    return record;
  }

  static async scanBarcode(codeOrPayload: string, requestedAction: 'auto' | 'check_in' | 'check_out' | 'verify' = 'auto') {
    let cleanCode = codeOrPayload.trim();

    // Try parsing if JSON QR code payload
    if (cleanCode.startsWith('{') && cleanCode.endsWith('}')) {
      try {
        const parsed = JSON.parse(cleanCode);
        if (parsed.code) cleanCode = parsed.code;
        else if (parsed.employee_code) cleanCode = parsed.employee_code;
      } catch (e) {
        // Fallback to raw string
      }
    }

    // Lookup employee by employee_code or id
    const employee = db.employees.find(
      e => e.employee_code.toLowerCase() === cleanCode.toLowerCase() || e.id === cleanCode
    );

    if (!employee) {
      throw new Error(`Invalid QR / Barcode: No employee matches "${cleanCode}"`);
    }

    const todayStatus = AttendanceService.getTodayStatus(employee.id);

    let actionTaken = 'VERIFIED';
    let attendanceResult = null;

    if (requestedAction === 'check_in' || (requestedAction === 'auto' && !todayStatus.isCheckedIn && !todayStatus.isCheckedOut)) {
      if (todayStatus.isCheckedIn) {
        throw new Error(`${employee.first_name} is already checked in for today`);
      }
      attendanceResult = AttendanceService.checkIn(employee.id);
      actionTaken = 'CHECK_IN_SUCCESS';
    } else if (requestedAction === 'check_out' || (requestedAction === 'auto' && todayStatus.isCheckedIn)) {
      attendanceResult = AttendanceService.checkOut(employee.id);
      actionTaken = 'CHECK_OUT_SUCCESS';
    }

    const updatedStatus = AttendanceService.getTodayStatus(employee.id);

    return {
      actionTaken,
      employee: {
        id: employee.id,
        employee_code: employee.employee_code,
        name: `${employee.first_name} ${employee.last_name}`,
        department: employee.department,
        designation: employee.designation,
        profile_image: employee.profile_image,
        email: employee.email,
      },
      currentStatus: updatedStatus,
      attendance: attendanceResult?.attendance || updatedStatus.record,
      timestamp: new Date().toISOString(),
    };
  }
}
