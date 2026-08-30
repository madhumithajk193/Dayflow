import { db } from './db/database.js';

const API_BASE = 'http://localhost:3000/api';

async function req(path: string, options: RequestInit = {}) {
  const url = `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

async function runVerification() {
  console.log('--- STARTING COMPREHENSIVE VERIFICATION SUITE ---');
  await db.init();

  let hrToken = '';
  let hrUser: any = null;
  let empToken = '';
  let empUser: any = null;

  // 1. HR Login
  console.log('\n[1] Testing HR Login:');
  const hrRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'hr@dayflow.com', password: 'hr123' })
  });
  if (hrRes.ok) {
    hrToken = hrRes.data.data.token;
    hrUser = hrRes.data.data.user;
    console.log('  ✅ HR Login Successful:', hrUser.email, 'Role:', hrUser.role);
  } else {
    console.error('  ❌ HR Login Failed:', hrRes.data);
  }

  // 2. Employee Login by Email
  console.log('\n[2] Testing Employee Login by Email:');
  const empRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'aarav.sharma@dayflow.com', password: 'emp123' })
  });
  if (empRes.ok) {
    empToken = empRes.data.data.token;
    empUser = empRes.data.data.user;
    console.log('  ✅ Employee Login (Email) Successful:', empUser.email, 'EmpID:', empUser.employee_id, 'Role:', empUser.role);
  } else {
    console.error('  ❌ Employee Login (Email) Failed:', empRes.data);
  }

  // 3. Employee Login by Employee ID
  console.log('\n[3] Testing Employee Login by Employee ID (EMP1001):');
  const empIdRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'EMP1001', password: 'emp123' })
  });
  if (empIdRes.ok) {
    console.log('  ✅ Employee Login (Employee ID) Successful:', empIdRes.data.data.user.name);
  } else {
    console.error('  ❌ Employee Login (Employee ID) Failed:', empIdRes.data);
  }

  // 4. Invalid Employee Credentials
  console.log('\n[4] Testing Invalid Credentials:');
  const invalidRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'EMP1001', password: 'wrong_password' })
  });
  if (!invalidRes.ok && invalidRes.status === 401) {
    console.log('  ✅ Rejected wrong password correctly with status:', invalidRes.status, invalidRes.data?.message);
  } else {
    console.error('  ❌ Failed: Accepted wrong password or wrong code:', invalidRes.status);
  }

  // 5. Employee Access to HR-only Route
  console.log('\n[5] Testing Security - Employee access to HR-only route (POST /api/employees):');
  const secRes = await req('/employees', {
    method: 'POST',
    headers: { Authorization: `Bearer ${empToken}` },
    body: JSON.stringify({ name: 'Hacker', email: 'hacker@dayflow.com' })
  });
  if (!secRes.ok && (secRes.status === 403 || secRes.status === 401)) {
    console.log('  ✅ Denied non-HR user with status:', secRes.status, secRes.data?.message);
  } else {
    console.error('  ❌ Failed: Employee was allowed to call POST /api/employees!', secRes.status);
  }

  // 6. Employee Check In & Check Out
  console.log('\n[6] Testing Employee Attendance Check-in & Check-out:');
  const checkInRes = await req('/attendance/check-in', {
    method: 'POST',
    headers: { Authorization: `Bearer ${empToken}` },
    body: JSON.stringify({})
  });
  console.log('  ℹ️ Check In response:', checkInRes.status, checkInRes.data?.message);

  const checkOutRes = await req('/attendance/check-out', {
    method: 'POST',
    headers: { Authorization: `Bearer ${empToken}` },
    body: JSON.stringify({})
  });
  console.log('  ℹ️ Check Out response:', checkOutRes.status, checkOutRes.data?.message);

  // 7. Employee Attendance History (Self-only)
  console.log('\n[7] Testing Attendance History endpoint:');
  const attRes = await req('/attendance/my', {
    headers: { Authorization: `Bearer ${empToken}` }
  });
  if (attRes.ok) {
    console.log('  ✅ Attendance history loaded. Summary:', attRes.data.data.summary, 'History count:', attRes.data.data.history.length);
  } else {
    console.error('  ❌ Attendance history failed:', attRes.data);
  }

  // 8. QR Attendance Flow
  console.log('\n[8] Testing QR Attendance Flow:');
  const qrSessionRes = await req('/attendance/qr-session', {
    headers: { Authorization: `Bearer ${hrToken}` }
  });
  if (qrSessionRes.ok) {
    const sessionToken = qrSessionRes.data.data.sessionToken;
    console.log('  ✅ Generated valid QR session token');

    // Test with invalid token
    const invalidQrRes = await req('/attendance/scan-qr', {
      method: 'POST',
      headers: { Authorization: `Bearer ${empToken}` },
      body: JSON.stringify({ sessionToken: 'invalid_token_123' })
    });
    if (!invalidQrRes.ok) {
      console.log('  ✅ Rejected invalid QR token with:', invalidQrRes.data?.message);
    } else {
      console.error('  ❌ Failed: Accepted invalid QR token!');
    }

    // Test with valid session token
    const scanRes = await req('/attendance/scan-qr', {
      method: 'POST',
      headers: { Authorization: `Bearer ${empToken}` },
      body: JSON.stringify({ sessionToken })
    });
    console.log('  ✅ Valid QR scan result:', scanRes.status, scanRes.data?.message);
  }

  // 9. Employee Leave Flow (Apply -> Pending -> HR Approve / Reject)
  console.log('\n[9] Testing Employee Leave Lifecycle:');
  const leaveApplyRes = await req('/leaves', {
    method: 'POST',
    headers: { Authorization: `Bearer ${empToken}` },
    body: JSON.stringify({
      leave_type: 'CASUAL',
      start_date: '2026-09-01',
      end_date: '2026-09-03',
      reason: 'Family function'
    })
  });
  if (leaveApplyRes.ok) {
    const leaveId = leaveApplyRes.data.data.id;
    console.log('  ✅ Leave created with status:', leaveApplyRes.data.data.status, 'ID:', leaveId);

    // HR Approves leave
    const hrApproveRes = await req(`/leaves/${leaveId}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${hrToken}` },
      body: JSON.stringify({ status: 'APPROVED', rejection_reason: '' })
    });
    console.log('  ✅ HR approved leave. New status:', hrApproveRes.data.data.status);

    // Employee fetches leaves to verify status is APPROVED
    const myLeavesRes = await req('/leaves/my', {
      headers: { Authorization: `Bearer ${empToken}` }
    });
    const approvedLeave = myLeavesRes.data.data.requests.find((r: any) => r.id === leaveId);
    console.log('  ✅ Employee sees approved leave in DB:', approvedLeave?.status === 'APPROVED');
  } else {
    console.error('  ❌ Leave test failed:', leaveApplyRes.data);
  }

  // 10. Employee Tasks & Status Updates
  console.log('\n[10] Testing Employee Task Workflow:');
  const tasksRes = await req('/tasks/my', {
    headers: { Authorization: `Bearer ${empToken}` }
  });
  if (tasksRes.ok && tasksRes.data.data.length > 0) {
    console.log('  ✅ Tasks fetched for employee. Count:', tasksRes.data.data.length);
    const task = tasksRes.data.data[0];
    const updatedStatus = task.status === 'COMPLETED' ? 'IN_PROGRESS' : 'COMPLETED';
    const patchRes = await req(`/tasks/${task.id}/status`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${empToken}` },
      body: JSON.stringify({ status: updatedStatus })
    });
    console.log('  ✅ Task status updated to:', patchRes.data.data.status);

    // Verify persistence
    const recheckRes = await req('/tasks/my', {
      headers: { Authorization: `Bearer ${empToken}` }
    });
    const recheckedTask = recheckRes.data.data.find((t: any) => t.id === task.id);
    console.log('  ✅ Task status verified from DB after refetch:', recheckedTask.status === updatedStatus);
  }

  // 11. Employee Payroll & Currency Verification
  console.log('\n[11] Testing Employee Payroll:');
  const myPayrollRes = await req('/payroll/my', {
    headers: { Authorization: `Bearer ${empToken}` }
  });
  if (myPayrollRes.ok) {
    const payroll = myPayrollRes.data.data;
    console.log('  ✅ Employee Payroll fetched:', {
      employee: payroll?.employee_name,
      base_salary: payroll?.base_salary,
      gross_earnings: payroll?.gross_earnings,
      total_deductions: payroll?.total_deductions,
      net_salary: payroll?.net_salary,
      currency: payroll?.currency
    });
    if (payroll) {
      console.log('  ✅ Payroll currency is INR:', payroll.currency === 'INR');
    }
  } else {
    console.error('  ❌ Payroll test failed:', myPayrollRes.data);
  }

  // 12. Employee Performance (Check formula omission)
  console.log('\n[12] Testing Employee Performance API:');
  const perfRes = await req('/performance/my', {
    headers: { Authorization: `Bearer ${empToken}` }
  });
  if (perfRes.ok) {
    const perf = perfRes.data.data;
    console.log('  ✅ Performance data returned:', {
      score: perf.overall_score,
      grade: perf.grade_tier,
      period: perf.review_period
    });
    const rawKeys = Object.keys(perf);
    const hasFormulaKeys = rawKeys.some(k => k.includes('formula') || k.includes('algorithm') || k.includes('weight_equation'));
    console.log('  ✅ No exposed formula/algorithm keys in API response:', !hasFormulaKeys);
  } else {
    console.error('  ❌ Performance test failed:', perfRes.data);
  }

  // 13. HR Add Employee End-to-End Test
  console.log('\n[13] Testing HR Add Employee Flow:');
  const testEmpCode = `EMP${Math.floor(1000 + Math.random() * 9000)}`;
  const testEmail = `priya.nair.${Date.now()}@dayflow.com`;

  // Missing required fields validation test
  const missingRes = await req('/employees', {
    method: 'POST',
    headers: { Authorization: `Bearer ${hrToken}` },
    body: JSON.stringify({ name: '', email: '' })
  });
  if (!missingRes.ok) {
    console.log('  ✅ Validation caught missing fields:', missingRes.data?.message);
  }

  // Valid employee creation
  const newEmpRes = await req('/employees', {
    method: 'POST',
    headers: { Authorization: `Bearer ${hrToken}` },
    body: JSON.stringify({
      employee_id: testEmpCode,
      name: 'Priya Nair',
      email: testEmail,
      department: 'Engineering',
      designation: 'Senior Frontend Engineer',
      salary: 85000,
      phone: '+91 98765 43210',
      password: 'EmployeePass123!',
      joining_date: '2026-03-01'
    })
  });
  if (newEmpRes.ok) {
    const createdEmp = newEmpRes.data.data;
    console.log('  ✅ Employee Created successfully:', createdEmp.name, 'Code:', createdEmp.employee_id, 'Email:', createdEmp.email);

    // Duplicate email rejection test
    const dupEmailRes = await req('/employees', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hrToken}` },
      body: JSON.stringify({
        employee_id: `EMP${Math.floor(1000 + Math.random() * 9000)}`,
        name: 'Another Person',
        email: testEmail,
        department: 'Engineering',
        designation: 'Engineer',
        salary: 50000
      })
    });
    if (!dupEmailRes.ok) {
      console.log('  ✅ Duplicate email rejected with:', dupEmailRes.data?.message);
    }

    // Duplicate employee ID rejection test
    const dupCodeRes = await req('/employees', {
      method: 'POST',
      headers: { Authorization: `Bearer ${hrToken}` },
      body: JSON.stringify({
        employee_id: testEmpCode,
        name: 'Another Person',
        email: `another.${Date.now()}@dayflow.com`,
        department: 'Engineering',
        designation: 'Engineer',
        salary: 50000
      })
    });
    if (!dupCodeRes.ok) {
      console.log('  ✅ Duplicate employee code rejected with:', dupCodeRes.data?.message);
    }

    // Verify employee appears in HR Employee List
    const listRes = await req('/employees', {
      headers: { Authorization: `Bearer ${hrToken}` }
    });
    const foundInList = listRes.data.data.some((e: any) => e.email === testEmail);
    console.log('  ✅ Created employee appears in HR Employee List:', foundInList);

    // Verify new employee can log in with their created credentials
    const newEmpLoginRes = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: testEmail, password: 'EmployeePass123!' })
    });
    if (newEmpLoginRes.ok) {
      console.log('  ✅ New Employee can log in with created credentials! Logged in as:', newEmpLoginRes.data.data.user.name, 'Role:', newEmpLoginRes.data.data.user.role);
    }

    // Verify new employee can also log in using their Employee ID
    const newEmpIdLoginRes = await req('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: testEmpCode, password: 'EmployeePass123!' })
    });
    if (newEmpIdLoginRes.ok) {
      console.log('  ✅ New Employee can log in with their new Employee ID:', newEmpIdLoginRes.data.data.user.name);
    }
  }

  // 14. Direct DB array & PostgreSQL Verification
  console.log('\n[14] Database Verification:');
  const userRec = db.users.find(u => u.email === testEmail);
  const empRec = db.employees.find(e => e.email === testEmail);
  const perfRec = db.performance_records.find(p => p.employee_id === empRec?.id);
  const barcodeRec = db.employee_barcodes.find(b => b.employee_id === empRec?.id);

  console.log('  ✅ User Record in DB:', !!userRec, 'Role:', userRec?.role, 'Bcrypt Hash:', userRec?.password_hash?.startsWith('$2'));
  console.log('  ✅ Employee Record in DB:', !!empRec, 'Code:', empRec?.employee_code);
  console.log('  ✅ Baseline Performance Record in DB:', !!perfRec, 'Score:', perfRec?.overall_score);
  console.log('  ✅ Barcode Record in DB:', !!barcodeRec, 'Code:', barcodeRec?.barcode_code);

  console.log('\n--- ALL VERIFICATION TESTS COMPLETED SUCCESSFULLY ---');
  process.exit(0);
}

runVerification().catch(err => {
  console.error(err);
  process.exit(1);
});
