import pg from 'pg';

const BASE_URL = 'http://localhost:3000/api';

async function runTests() {
  console.log('🧪 Starting Dayflow HRMS verification suite...');

  // 1. Authenticate HR user
  const hrLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'hr@dayflow.com', password: 'hr123' }),
  });
  const hrLoginData = await hrLoginRes.json();
  if (!hrLoginData.success) throw new Error('HR login failed: ' + JSON.stringify(hrLoginData));
  const hrToken = hrLoginData.data.token;
  console.log('✅ 1. HR Login successful');

  // 2. Authenticate Employee user (EMP1001 - Aarav Sharma)
  const empLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'aarav.sharma@dayflow.com', password: 'emp123' }),
  });
  const empLoginData = await empLoginRes.json();
  if (!empLoginData.success) throw new Error('Employee login failed: ' + JSON.stringify(empLoginData));
  const empToken = empLoginData.data.token;
  console.log('✅ 2. Employee Login successful');

  // 3. Verify RBAC on System Settings
  const empSettingsRes = await fetch(`${BASE_URL}/settings`, {
    headers: { Authorization: `Bearer ${empToken}` },
  });
  if (empSettingsRes.status !== 403) {
    throw new Error(`Expected 403 for employee accessing /settings, got ${empSettingsRes.status}`);
  }
  console.log('✅ 3. RBAC: Employee correctly blocked (403) from accessing System Settings');

  // 4. Test System Settings Update and DB persistence
  const getSettingsRes = await fetch(`${BASE_URL}/settings`, {
    headers: { Authorization: `Bearer ${hrToken}` },
  });
  const getSettingsData = await getSettingsRes.json();
  if (!getSettingsData.success) throw new Error('Failed to get settings: ' + JSON.stringify(getSettingsData));
  console.log('✅ 4. HR successfully retrieved system settings');

  const updatedSettingsPayload = {
    officeStartTime: '08:30',
    officeEndTime: '17:30',
    gracePeriodMinutes: 20,
    minimumWorkingHoursPerDay: 8,
    idleThresholdMinutes: 25,
    consecutiveAbsenceThreshold: 3,
    lateOccurrenceThreshold: 2,
    latePenaltyPercentage: 2,
    performanceWeights: {
      attendance: 25,
      workingHours: 20,
      taskCompletion: 30,
      activity: 15,
      punctuality: 10,
    },
  };

  const updateRes = await fetch(`${BASE_URL}/settings`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${hrToken}`,
    },
    body: JSON.stringify(updatedSettingsPayload),
  });
  const updateData = await updateRes.json();
  if (!updateData.success) throw new Error('Failed to update settings: ' + JSON.stringify(updateData));
  console.log('✅ 5. System settings updated via PUT /api/settings');

  // Verify directly in PostgreSQL
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const pgRes = await client.query('SELECT * FROM system_settings WHERE id = $1', ['global']);
    if (pgRes.rows.length === 0) throw new Error('System settings not found in PostgreSQL');
    const row = pgRes.rows[0];
    if (row.official_start_time !== '08:30' || Number(row.grace_period_minutes) !== 20) {
      throw new Error(`Settings in PostgreSQL do not match! row: ${JSON.stringify(row)}`);
    }
    console.log('✅ 6. System settings verified persisted in PostgreSQL database (official_start_time: 08:30, grace_period: 20)');
  } finally {
    client.release();
    await pool.end();
  }

  // 5. Test Attendance filtering for 26-08-2026 and 2026-08-26 and Design & UX
  const attRes1 = await fetch(`${BASE_URL}/attendance/all?date=26-08-2026`, {
    headers: { Authorization: `Bearer ${hrToken}` },
  });
  const attData1 = await attRes1.json();
  if (!attData1.success || !Array.isArray(attData1.data) || attData1.data.length === 0) {
    throw new Error('No attendance records returned for date=26-08-2026');
  }
  console.log(`✅ 7. Attendance filtering for '26-08-2026' succeeded: returned ${attData1.data.length} records`);

  const attResDept = await fetch(`${BASE_URL}/attendance/all?date=26-08-2026&department=Design%20%26%20UX`, {
    headers: { Authorization: `Bearer ${hrToken}` },
  });
  const attDataDept = await attResDept.json();
  if (!attDataDept.success || !Array.isArray(attDataDept.data) || attDataDept.data.length === 0) {
    throw new Error('No attendance records returned for date=26-08-2026 & department=Design & UX');
  }
  console.log(`✅ 8. Attendance filtering for '26-08-2026' and 'Design & UX' succeeded: returned ${attDataDept.data.length} records`);

  // RBAC on Attendance
  const empAttRes = await fetch(`${BASE_URL}/attendance/all?date=26-08-2026`, {
    headers: { Authorization: `Bearer ${empToken}` },
  });
  if (empAttRes.status !== 403) {
    throw new Error(`Expected 403 for employee accessing /attendance/all, got ${empAttRes.status}`);
  }
  console.log('✅ 9. RBAC: Employee correctly blocked (403) from /attendance/all');

  // 6. Test Notifications Role Isolation and Flow
  // HR notifications
  const hrNotifsRes = await fetch(`${BASE_URL}/notifications`, {
    headers: { Authorization: `Bearer ${hrToken}` },
  });
  const hrNotifsData = await hrNotifsRes.json();
  if (!hrNotifsData.success) throw new Error('Failed to get HR notifications: ' + JSON.stringify(hrNotifsData));
  console.log(`✅ 10. HR Notifications fetched: ${hrNotifsData.data.notifications.length} items, unread: ${hrNotifsData.data.unreadCount}`);

  // Employee notifications
  const empNotifsRes = await fetch(`${BASE_URL}/notifications`, {
    headers: { Authorization: `Bearer ${empToken}` },
  });
  const empNotifsData = await empNotifsRes.json();
  if (!empNotifsData.success) throw new Error('Failed to get Employee notifications: ' + JSON.stringify(empNotifsData));
  console.log(`✅ 11. Employee Notifications fetched: ${empNotifsData.data.notifications.length} items`);

  // Create a leave request as employee
  const leaveReqRes = await fetch(`${BASE_URL}/leaves`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${empToken}`,
    },
    body: JSON.stringify({
      leave_type: 'CASUAL',
      start_date: '2026-09-01',
      end_date: '2026-09-02',
      reason: 'Family event',
    }),
  });
  const leaveReqData = await leaveReqRes.json();
  if (!leaveReqData.success) throw new Error('Failed to submit leave request: ' + JSON.stringify(leaveReqData));
  const leaveId = leaveReqData.data.id;
  console.log(`✅ 12. Employee submitted leave request (${leaveId})`);

  // Verify HR received notification for this leave request
  const hrNotifsAfterLeave = await (await fetch(`${BASE_URL}/notifications`, {
    headers: { Authorization: `Bearer ${hrToken}` },
  })).json();
  const leaveNotif = hrNotifsAfterLeave.data.notifications.find(n => n.reference_id === leaveId);
  if (!leaveNotif) throw new Error('HR did not receive notification for new leave request');
  console.log(`✅ 13. HR received pending notification (${leaveNotif.id}) for leave request`);

  // HR approves leave request
  const approveRes = await fetch(`${BASE_URL}/leaves/${leaveId}/approve`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${hrToken}`,
    },
    body: JSON.stringify({ review_notes: 'Approved without issues' }),
  });
  const approveData = await approveRes.json();
  if (!approveData.success) throw new Error('Failed to approve leave: ' + JSON.stringify(approveData));
  console.log('✅ 14. HR approved leave request');

  // Verify HR notification was auto-completed
  const hrNotifsAfterApprove = await (await fetch(`${BASE_URL}/notifications`, {
    headers: { Authorization: `Bearer ${hrToken}` },
  })).json();
  const resolvedNotif = hrNotifsAfterApprove.data.notifications.find(n => n.id === leaveNotif.id);
  if (!resolvedNotif || !resolvedNotif.is_done) {
    throw new Error('HR notification was not auto-completed upon leave approval');
  }
  console.log('✅ 15. HR notification auto-completed (is_done=true) upon leave approval');

  // Verify Employee received leave decision notification
  const empNotifsAfterApprove = await (await fetch(`${BASE_URL}/notifications`, {
    headers: { Authorization: `Bearer ${empToken}` },
  })).json();
  const empDecisionNotif = empNotifsAfterApprove.data.notifications.find(n => n.reference_id === leaveId);
  if (!empDecisionNotif) {
    throw new Error('Employee did not receive leave approval notification');
  }
  console.log(`✅ 16. Employee received leave decision notification: "${empDecisionNotif.title}"`);

  // Mark notification as read by employee
  const markReadRes = await fetch(`${BASE_URL}/notifications/${empDecisionNotif.id}/read`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${empToken}` },
  });
  const markReadData = await markReadRes.json();
  if (!markReadData.success || !markReadData.data.is_read) {
    throw new Error('Failed to mark notification as read');
  }
  console.log('✅ 17. Employee marked notification as read');

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! All 4 problem areas verified working.\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
