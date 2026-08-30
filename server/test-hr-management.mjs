// Comprehensive Test Suite for ADMIN-Only HR Management
const BASE_URL = 'http://localhost:3000/api';

async function req(endpoint, options = {}) {
  const url = `${BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, status: res.status, data };
  } catch (err) {
    return { ok: false, status: 0, error: err.message };
  }
}

async function runHRManagementTests() {
  console.log('======================================================================');
  console.log('--- ADMIN-ONLY HR MANAGEMENT END-TO-END VERIFICATION SUITE ---');
  console.log('======================================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName, details = '') {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`  ✅ PASS: ${testName} ${details}`);
    } else {
      console.error(`  ❌ FAIL: ${testName} ${details}`);
      throw new Error(`Test failed: ${testName}`);
    }
  }

  // 1. Authentication for test actors
  console.log('[1] Initializing Actor Tokens:');
  
  // Admin
  const adminLogin = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'admin@dayflow.com', password: 'admin123', portal: 'hr' }),
  });
  assert(adminLogin.ok && adminLogin.data?.data?.user?.role === 'ADMIN', 'Admin Login', `User: ${adminLogin.data?.data?.user?.email}`);
  const adminToken = adminLogin.data?.data?.token;

  // Regular Employee
  const empLogin = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'aarav.sharma@dayflow.com', password: 'emp123', portal: 'employee' }),
  });
  assert(empLogin.ok && empLogin.data?.data?.user?.role === 'EMPLOYEE', 'Employee Login', `User: ${empLogin.data?.data?.user?.email}`);
  const empToken = empLogin.data?.data?.token;

  // Standard HR
  const hrLogin = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: 'hr@dayflow.com', password: 'hr123', portal: 'hr' }),
  });
  assert(hrLogin.ok && hrLogin.data?.data?.user?.role === 'HR', 'Standard HR Login', `User: ${hrLogin.data?.data?.user?.email}`);
  const hrToken = hrLogin.data?.data?.token;

  // 2. Security & RBAC Enforcement (Negative Authorization Tests)
  console.log('\n[2] Security & RBAC Tests (Only ADMIN can access HR Management):');

  // 2a. Unauthenticated request
  const unauthRes = await req('/admin/hr');
  assert(unauthRes.status === 401, 'Unauthenticated access to GET /admin/hr is rejected (401)', `Status: ${unauthRes.status}`);

  // 2b. Employee access to GET /admin/hr
  const empGetRes = await req('/admin/hr', {
    headers: { Authorization: `Bearer ${empToken}` },
  });
  assert(empGetRes.status === 403, 'Employee access to GET /admin/hr is rejected (403)', `Status: ${empGetRes.status}`);

  // 2c. Employee access to POST /admin/hr
  const empPostRes = await req('/admin/hr', {
    method: 'POST',
    headers: { Authorization: `Bearer ${empToken}` },
    body: JSON.stringify({
      first_name: 'Hacker',
      last_name: 'User',
      email: 'hacker@dayflow.com',
      employee_code: 'HR9999',
      password: 'password123',
      department: 'HR',
      designation: 'HR Lead',
    }),
  });
  assert(empPostRes.status === 403, 'Employee cannot create HR via POST /admin/hr (403)', `Status: ${empPostRes.status}`);

  // 2d. Standard HR access to GET /admin/hr
  const hrGetRes = await req('/admin/hr', {
    headers: { Authorization: `Bearer ${hrToken}` },
  });
  assert(hrGetRes.status === 403, 'Standard HR access to GET /admin/hr is rejected (403)', `Status: ${hrGetRes.status}`);

  // 2e. Standard HR access to POST /admin/hr
  const hrPostRes = await req('/admin/hr', {
    method: 'POST',
    headers: { Authorization: `Bearer ${hrToken}` },
    body: JSON.stringify({
      first_name: 'Attempt',
      last_name: 'Create',
      email: 'attempt@dayflow.com',
      employee_code: 'HR9998',
      password: 'password123',
      department: 'HR',
      designation: 'HR Lead',
    }),
  });
  assert(hrPostRes.status === 403, 'Standard HR cannot create HR via POST /admin/hr (403)', `Status: ${hrPostRes.status}`);

  // 3. Validation Tests
  console.log('\n[3] Validation Tests on POST /admin/hr:');

  // 3a. Missing required fields
  const missingRes = await req('/admin/hr', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({ first_name: 'Incomplete' }),
  });
  assert(missingRes.status === 400, 'Rejects payload with missing required fields (400)', `Status: ${missingRes.status}`);

  // 3b. Invalid email format
  const invalidEmailRes = await req('/admin/hr', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      first_name: 'Test',
      last_name: 'User',
      email: 'not-an-email',
      employee_code: 'HR7701',
      password: 'validpassword123',
      department: 'HR',
      designation: 'Officer',
    }),
  });
  assert(invalidEmailRes.status === 400, 'Rejects invalid email address format (400)', `Status: ${invalidEmailRes.status}`);

  // 3c. Password too short (< 6 chars)
  const shortPassRes = await req('/admin/hr', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      first_name: 'Test',
      last_name: 'User',
      email: 'test.user@dayflow.com',
      employee_code: 'HR7702',
      password: '123',
      department: 'HR',
      designation: 'Officer',
    }),
  });
  assert(shortPassRes.status === 400, 'Rejects password shorter than 6 characters (400)', `Status: ${shortPassRes.status}`);

  // 3d. Duplicate email
  const dupEmailRes = await req('/admin/hr', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      first_name: 'Duplicate',
      last_name: 'Email',
      email: 'hr@dayflow.com', // Already exists!
      employee_code: 'HR7703',
      password: 'validpassword123',
      department: 'HR',
      designation: 'Officer',
    }),
  });
  assert(dupEmailRes.status === 409, 'Rejects duplicate email (409)', `Status: ${dupEmailRes.status}`);

  // 3e. Duplicate employee code
  const dupCodeRes = await req('/admin/hr', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify({
      first_name: 'Duplicate',
      last_name: 'Code',
      email: 'unique.code.test@dayflow.com',
      employee_code: 'EMP1001', // Already exists!
      password: 'validpassword123',
      department: 'HR',
      designation: 'Officer',
    }),
  });
  assert(dupCodeRes.status === 409, 'Rejects duplicate HR/Employee code (409)', `Status: ${dupCodeRes.status}`);

  // 4. Successful HR Creation by Admin
  console.log('\n[4] ADMIN Creates New HR Account:');

  const uniqueSuffix = Date.now().toString().slice(-4);
  const testHRData = {
    first_name: 'Kavita',
    last_name: 'Deshmukh',
    email: `kavita.deshmukh_${uniqueSuffix}@dayflow.com`,
    employee_code: `HR9${uniqueSuffix}`,
    password: 'KavitaHrSecure2026!',
    department: 'People & Culture',
    designation: 'Lead HR Operations Manager',
    phone: '+1 (555) 789-0123',
    address: 'Austin, TX',
  };

  const createRes = await req('/admin/hr', {
    method: 'POST',
    headers: { Authorization: `Bearer ${adminToken}` },
    body: JSON.stringify(testHRData),
  });

  assert(createRes.status === 201, 'Admin successfully creates new HR account (201)', `Status: ${createRes.status}`);
  assert(createRes.data?.message === 'HR created successfully.', 'Returns exact success message', `Message: "${createRes.data?.message}"`);
  
  const createdHR = createRes.data?.data;
  assert(createdHR?.email === testHRData.email, 'Created HR has correct email', `Email: ${createdHR?.email}`);
  assert(createdHR?.employee_code === testHRData.employee_code, 'Created HR has correct code', `Code: ${createdHR?.employee_code}`);
  assert(createdHR?.role === 'HR', 'Created user has enforced role = "HR"', `Role: ${createdHR?.role}`);
  assert(!createdHR?.password && !createdHR?.password_hash, 'Password & password_hash are NEVER returned in API response', 'Security Passed');

  // 5. Verify HR list contains newly created HR
  console.log('\n[5] Verify HR List Refreshed from Database:');
  const hrListRes = await req('/admin/hr', {
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert(hrListRes.ok, 'Admin retrieves HR staff list (200)');
  const hrList = hrListRes.data?.data || [];
  const foundHR = hrList.find(h => h.email === testHRData.email);
  assert(Boolean(foundHR), 'Newly created HR is present in HR management list', `Found: ${foundHR?.first_name} ${foundHR?.last_name} (${foundHR?.employee_code})`);

  // 6. Verify New HR Can Log In through HR Portal
  console.log('\n[6] New HR Login Verification:');

  // 6a. Login by Email
  const newHrEmailLogin = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: testHRData.email,
      password: testHRData.password,
      portal: 'hr',
    }),
  });
  assert(newHrEmailLogin.ok, 'New HR logs in using Email + Password through HR Portal', `Token issued: ${Boolean(newHrEmailLogin.data?.data?.token)}`);
  const newHrToken = newHrEmailLogin.data?.data?.token;

  // 6b. Login by Staff Code
  const newHrCodeLogin = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      identifier: testHRData.employee_code,
      password: testHRData.password,
      portal: 'hr',
    }),
  });
  assert(newHrCodeLogin.ok, 'New HR logs in using Staff Code + Password through HR Portal', `Staff Code: ${testHRData.employee_code}`);

  // 6c. Invalid password check
  const badPassLogin = await req('/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: testHRData.email,
      password: 'wrongpassword123',
      portal: 'hr',
    }),
  });
  assert(badPassLogin.status === 401, 'Rejects invalid password on new HR account (401)');

  // 7. Verify New HR Can Access HR Management Portal Views & APIs
  console.log('\n[7] New HR Portal API Operations:');

  const statsRes = await req('/dashboard/stats', {
    headers: { Authorization: `Bearer ${newHrToken}` },
  });
  assert(statsRes.ok, 'New HR accesses HR Dashboard stats', `Total employees: ${statsRes.data?.data?.totalEmployees}`);

  const employeesRes = await req('/employees', {
    headers: { Authorization: `Bearer ${newHrToken}` },
  });
  assert(employeesRes.ok && employeesRes.data?.data?.length > 0, 'New HR accesses employee roster', `Count: ${employeesRes.data?.data?.length}`);

  const alertsRes = await req('/attendance/three-day-alerts', {
    headers: { Authorization: `Bearer ${newHrToken}` },
  });
  assert(alertsRes.ok, 'New HR accesses attendance consecutive absence review system');

  // 8. Verify New HR CANNOT Create Another HR (Admin-Only Restriction)
  console.log('\n[8] Verify New HR is Restricted from Creating HR Accounts:');
  const newHrCreateAttempt = await req('/admin/hr', {
    method: 'POST',
    headers: { Authorization: `Bearer ${newHrToken}` },
    body: JSON.stringify({
      first_name: 'Unauthorized',
      last_name: 'SubHR',
      email: 'unauth.subhr@dayflow.com',
      employee_code: 'HR0099',
      password: 'password123',
      department: 'HR',
      designation: 'Coordinator',
    }),
  });
  assert(newHrCreateAttempt.status === 403, 'New HR cannot create other HR accounts (403 Forbidden)', `Status: ${newHrCreateAttempt.status}`);

  console.log('\n======================================================================');
  console.log(`--- ALL TESTS PASSED: ${passedTests}/${totalTests} CHECKS SUCCESSFUL ---`);
  console.log('======================================================================\n');
}

runHRManagementTests().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
