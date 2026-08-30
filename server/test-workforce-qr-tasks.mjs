import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000/api';

async function req(path, options = {}) {
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

async function run() {
  console.log('==================================================');
  console.log('--- TESTING WORKFORCE, QR SCANNER & TASK SUITE ---');
  console.log('==================================================');

  // 1. Log in as HR
  console.log('\n[1] Login as HR:');
  const hrRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'hr@dayflow.com', password: 'hr123', portal: 'hr' })
  });
  if (!hrRes.ok) {
    console.error('  ❌ HR Login Failed:', hrRes.data);
    process.exit(1);
  }
  const hrToken = hrRes.data.data.token;
  console.log('  ✅ PASS: HR Login Successful.');

  // 2. Log in as Employee
  console.log('\n[2] Login as Employee (aarav.sharma@dayflow.com / emp123):');
  const empRes = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'aarav.sharma@dayflow.com', password: 'emp123', portal: 'employee' })
  });
  if (!empRes.ok) {
    console.error('  ❌ Employee Login Failed:', empRes.data);
    process.exit(1);
  }
  const empToken = empRes.data.data.token;
  const empId = empRes.data.data.employee.id;
  console.log('  ✅ PASS: Employee Login Successful. Emp ID:', empId);

  // 3. RBAC Test: Employee CANNOT access GET /api/employees (Workforce Directory)
  console.log('\n[3] RBAC Test: Non-HR Employee blocked from Workforce Directory:');
  const empDirRes = await req('/employees', {
    headers: { Authorization: `Bearer ${empToken}` }
  });
  if (!empDirRes.ok && (empDirRes.status === 403 || empDirRes.status === 401)) {
    console.log('  ✅ PASS: Employee blocked with status', empDirRes.status, ':', empDirRes.data?.message);
  } else {
    console.error('  ❌ FAIL: Employee was allowed to fetch employee directory!', empDirRes.status);
    process.exit(1);
  }

  // 4. HR CAN access GET /api/employees (Workforce Directory)
  console.log('\n[4] HR Access to Workforce Directory:');
  const hrDirRes = await req('/employees', {
    headers: { Authorization: `Bearer ${hrToken}` }
  });
  if (hrDirRes.ok && Array.isArray(hrDirRes.data.data)) {
    console.log('  ✅ PASS: HR successfully retrieved Workforce directory. Count:', hrDirRes.data.data.length);
  } else {
    console.error('  ❌ FAIL: HR failed to get employee directory:', hrDirRes.data);
    process.exit(1);
  }

  // 5. Barcode & QR Generation & Kiosk Scan
  console.log('\n[5] Barcode & QR Code Generation for Employee:');
  const qrGenRes = await req('/barcode/generate', {
    method: 'POST',
    headers: { Authorization: `Bearer ${hrToken}` },
    body: JSON.stringify({ employee_id: empId })
  });
  if (qrGenRes.ok && qrGenRes.data.data?.qr_data) {
    console.log('  ✅ PASS: QR badge generated with valid payload.');
  } else {
    console.error('  ❌ FAIL: QR badge generation failed:', qrGenRes.data);
    process.exit(1);
  }

  // 6. Barcode Terminal Scan (Kiosk / Terminal Attendance)
  console.log('\n[6] Barcode Terminal Attendance Kiosk Scan (EMP1001):');
  const kioskScanRes = await req('/barcode/scan', {
    method: 'POST',
    headers: { Authorization: `Bearer ${hrToken}` },
    body: JSON.stringify({ code: 'EMP1001', action: 'auto' })
  });
  if (kioskScanRes.ok && kioskScanRes.data.data?.employee) {
    console.log('  ✅ PASS: Kiosk scan processed successfully. Action:', kioskScanRes.data.data.actionTaken, 'Status:', kioskScanRes.data.data.currentStatus?.record?.status);
  } else {
    console.error('  ❌ FAIL: Kiosk scan failed:', kioskScanRes.data);
    process.exit(1);
  }

  // 7. Live QR Attendance Scan (Employee Self-Scan via QR Scanner)
  console.log('\n[7] Live QR Attendance Session & Employee Self-Scan:');
  const qrSessionRes = await req('/attendance/qr-session', {
    headers: { Authorization: `Bearer ${empToken}` }
  });
  if (qrSessionRes.ok && qrSessionRes.data.data?.qrPayload) {
    const sessionPayload = qrSessionRes.data.data.qrPayload;
    console.log('  ✅ PASS: Retrieved active QR session payload.');

    const selfScanRes = await req('/attendance/scan-qr', {
      method: 'POST',
      headers: { Authorization: `Bearer ${empToken}` },
      body: JSON.stringify({ qrPayload: sessionPayload })
    });
    if (selfScanRes.ok) {
      console.log('  ✅ PASS: Employee self-scan QR attendance recorded successfully:', selfScanRes.data.message);
    } else {
      console.log('  ℹ️ INFO: Scan response (already marked or checked out):', selfScanRes.data?.message);
    }
  }

  // 8. Task Management: HR creates task and assigns to Employee
  console.log('\n[8] HR Creates Task for Employee:');
  const createTaskRes = await req('/tasks', {
    method: 'POST',
    headers: { Authorization: `Bearer ${hrToken}` },
    body: JSON.stringify({
      title: 'Complete System Verification & QR Badge Audit',
      description: 'Review system end-to-end and audit digital badges.',
      assigned_to: empId,
      priority: 'HIGH',
      due_date: '2026-09-01'
    })
  });
  let createdTaskId = '';
  if (createTaskRes.ok && createTaskRes.data.data?.id) {
    createdTaskId = createTaskRes.data.data.id;
    console.log('  ✅ PASS: HR created and assigned task. ID:', createdTaskId, 'Title:', createTaskRes.data.data.title);
  } else {
    console.error('  ❌ FAIL: HR task creation failed:', createTaskRes.data);
    process.exit(1);
  }

  // 9. Employee Cannot create task for others
  console.log('\n[9] RBAC Test: Non-HR Employee blocked from creating tasks:');
  const empTaskCreate = await req('/tasks', {
    method: 'POST',
    headers: { Authorization: `Bearer ${empToken}` },
    body: JSON.stringify({
      title: 'Unauthorized Employee Task Creation',
      assigned_to: 'emp_1',
      priority: 'LOW'
    })
  });
  if (!empTaskCreate.ok && (empTaskCreate.status === 403 || empTaskCreate.status === 401)) {
    console.log('  ✅ PASS: Employee denied task creation with status:', empTaskCreate.status);
  } else {
    console.error('  ❌ FAIL: Employee was allowed to create task:', empTaskCreate.status);
    process.exit(1);
  }

  // 10. Employee views own assigned tasks
  console.log('\n[10] Employee Views Assigned Tasks:');
  const myTasksRes = await req('/tasks/my', {
    headers: { Authorization: `Bearer ${empToken}` }
  });
  if (myTasksRes.ok && Array.isArray(myTasksRes.data.data)) {
    const found = myTasksRes.data.data.find(t => t.id === createdTaskId);
    if (found) {
      console.log('  ✅ PASS: Employee retrieved their assigned task in list. Title:', found.title, 'Status:', found.status);
    } else {
      console.error('  ❌ FAIL: Created task not in employee tasks list.');
      process.exit(1);
    }
  } else {
    console.error('  ❌ FAIL: Employee failed to get their tasks:', myTasksRes.data);
    process.exit(1);
  }

  // 11. Employee updates task status to IN_PROGRESS and COMPLETED
  console.log('\n[11] Employee Updates Task Status:');
  const updateStatus1 = await req(`/tasks/${createdTaskId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${empToken}` },
    body: JSON.stringify({ status: 'IN_PROGRESS' })
  });
  if (updateStatus1.ok && updateStatus1.data.data?.status === 'IN_PROGRESS') {
    console.log('  ✅ PASS: Task updated to IN_PROGRESS.');
  } else {
    console.error('  ❌ FAIL: Failed to update to IN_PROGRESS:', updateStatus1.data);
    process.exit(1);
  }

  const updateStatus2 = await req(`/tasks/${createdTaskId}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${empToken}` },
    body: JSON.stringify({ status: 'COMPLETED' })
  });
  if (updateStatus2.ok && updateStatus2.data.data?.status === 'COMPLETED') {
    console.log('  ✅ PASS: Task updated to COMPLETED.');
  } else {
    console.error('  ❌ FAIL: Failed to update to COMPLETED:', updateStatus2.data);
    process.exit(1);
  }

  console.log('\n==================================================');
  console.log('--- ALL WORKFORCE, QR & TASK TESTS PASSED! ---');
  console.log('==================================================\n');
}

run().catch(err => {
  console.error('Test execution error:', err);
  process.exit(1);
});
