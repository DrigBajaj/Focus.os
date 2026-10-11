import assert from 'node:assert';
import {
  hashPassword,
  verifyPassword,
  hashPasswordSync,
  verifyPasswordSync,
  generateSessionToken,
  validateRegistrationInput,
  validateLoginInput,
  DatabaseService,
} from '../server/db';

async function runAuthTests() {
  console.log('🧪 Starting FOCUS.OS Secure Authentication & Validation Test Suite...\n');

  // 1. Password Hashing with async crypto.scrypt
  console.log('Test 1: crypto.scrypt password hashing and verification');
  const password = 'CorrectHorseBatteryStaple!42';
  const { salt, hash } = await hashPassword(password);
  assert.strictEqual(typeof salt, 'string', 'Salt must be a string');
  assert.strictEqual(salt.length, 32, 'Salt should be 16 bytes (32 hex chars)');
  assert.strictEqual(typeof hash, 'string', 'Hash must be a string');
  assert.strictEqual(hash.length, 128, 'Hash should be 64 bytes (128 hex chars)');

  // Async Verification
  assert.strictEqual(await verifyPassword(password, salt, hash), true, 'Correct password must verify successfully');
  assert.strictEqual(await verifyPassword('WrongPassword', salt, hash), false, 'Incorrect password must fail verification');
  assert.strictEqual(await verifyPassword('', salt, hash), false, 'Empty password must fail verification');

  // Sync Verification
  assert.strictEqual(verifyPasswordSync(password, salt, hash), true, 'Sync verification must match');
  console.log('  ✅ PASS: crypto.scrypt hashing, salts, and timing-safe verification work as expected');

  // 2. Cryptographically random session tokens
  console.log('Test 2: Cryptographically random session tokens');
  const token1 = generateSessionToken();
  const token2 = generateSessionToken();
  assert.strictEqual(token1.length, 64, 'Token must be 64 hex characters (256 bits)');
  assert.strictEqual(token2.length, 64, 'Token must be 64 hex characters (256 bits)');
  assert.notStrictEqual(token1, token2, 'Two generated tokens must be completely distinct');
  console.log('  ✅ PASS: Session tokens generated with 256 bits of cryptographic entropy');

  // 3. Registration validation
  console.log('Test 3: Registration input validation');
  // Missing fields
  const emptyCheck = validateRegistrationInput({});
  assert.strictEqual(emptyCheck.valid, false, 'Empty registration must be invalid');
  assert.ok(emptyCheck.errors.username, 'Must require username');
  assert.ok(emptyCheck.errors.email, 'Must require email');
  assert.ok(emptyCheck.errors.password, 'Must require password');
  assert.ok(emptyCheck.errors.name, 'Must require name');

  // Invalid username characters
  const badUser = validateRegistrationInput({
    username: 'user with spaces!',
    email: 'test@example.com',
    password: 'validPassword123',
    name: 'Test User',
  });
  assert.strictEqual(badUser.valid, false);
  assert.ok(badUser.errors.username.includes('only contain letters'));

  // Short password
  const shortPass = validateRegistrationInput({
    username: 'validuser',
    email: 'test@example.com',
    password: '123',
    name: 'Test User',
  });
  assert.strictEqual(shortPass.valid, false);
  assert.ok(shortPass.errors.password.includes('at least 6 characters'));

  // Invalid email
  const badEmail = validateRegistrationInput({
    username: 'validuser',
    email: 'not-an-email',
    password: 'validPassword123',
    name: 'Test User',
  });
  assert.strictEqual(badEmail.valid, false);
  assert.ok(badEmail.errors.email.includes('valid email address'));

  // Valid registration
  const validReg = validateRegistrationInput({
    username: 'focus_coder',
    email: 'coder@focus.os',
    password: 'superSecretPassword!',
    name: 'Dev Taylor',
    studyMajor: 'Computer Science',
    dailyGoalMinutes: 60,
  });
  assert.strictEqual(validReg.valid, true, 'Valid registration payload should pass');
  assert.strictEqual(Object.keys(validReg.errors).length, 0);
  console.log('  ✅ PASS: Registration validation enforces username, email, password length, and name bounds');

  // 4. Login validation
  console.log('Test 4: Login input validation');
  const emptyLogin = validateLoginInput({});
  assert.strictEqual(emptyLogin.valid, false);
  assert.ok(emptyLogin.errors.identifier);
  assert.ok(emptyLogin.errors.password);

  const validLogin = validateLoginInput({ identifier: 'student', password: 'password123' });
  assert.strictEqual(validLogin.valid, true);
  console.log('  ✅ PASS: Login validation requires both identifier and password');

  // 5. Database session storage and lifecycle in isolated test DB
  console.log('Test 5: Database session lifecycle and storage');
  const testDb = new DatabaseService(':memory:');

  // Create user with async crypto.scrypt
  const newUser = await testDb.createUser({
    username: 'testpilot',
    name: 'Test Pilot',
    email: 'pilot@focus.test',
    password: 'securePass123!',
    studyMajor: 'Aerospace',
    dailyGoalMinutes: 50,
  });
  assert.strictEqual(newUser.username, 'testpilot');
  assert.ok(newUser.id.startsWith('usr-'));

  // Look up user
  const foundUser = testDb.findUserByUsernameOrEmail('pilot@focus.test');
  assert.ok(foundUser);
  assert.strictEqual(await verifyPassword('securePass123!', foundUser.password_salt, foundUser.password_hash), true);

  // Create session
  const session = testDb.createSession(newUser.id, 'FOCUS.OS Test Agent/1.0', 7);
  assert.ok(session.token);
  assert.ok(session.expiresAt > Date.now());

  // Validate session
  const sessionUser = testDb.validateSession(session.token);
  assert.ok(sessionUser, 'Valid token must return safe user');
  assert.strictEqual(sessionUser.id, newUser.id);
  assert.strictEqual(sessionUser.username, 'testpilot');

  // Invalidate / Logout session
  testDb.deleteSession(session.token);
  const afterLogout = testDb.validateSession(session.token);
  assert.strictEqual(afterLogout, null, 'Deleted session token must be rejected');
  console.log('  ✅ PASS: Session records persisted, validated, and deleted upon logout');

  // 6. Demo accounts pre-seeded with scrypt hashes
  console.log('Test 6: Pre-seeded demo user accounts');
  const demoStudent = testDb.findUserByUsernameOrEmail('student');
  assert.ok(demoStudent, 'Default demo user student must exist');
  assert.strictEqual(await verifyPassword('password123', demoStudent.password_salt, demoStudent.password_hash), true);

  const demoUsers = testDb.getDemoUsers();
  assert.strictEqual(demoUsers.length, 3, 'All 3 demo users must be available');
  console.log('  ✅ PASS: Pre-seeded accounts exist with proper scrypt password hashes');

  console.log('\n========================================');
  console.log('All 6 Authentication & Validation Tests Passed!');
  console.log('========================================\n');
}

runAuthTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
