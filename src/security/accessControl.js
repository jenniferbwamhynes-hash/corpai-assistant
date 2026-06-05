// Document access control — enforces classification-based filtering before
// query results are passed to Claude. Prevents confidential documents from
// being surfaced to users without the required access level (CORPAI-35).

const ACCESS_LEVELS = {
  PUBLIC:       0,  // all employees
  INTERNAL:     1,  // all employees (non-public but not sensitive)
  RESTRICTED:   2,  // managers and above
  CONFIDENTIAL: 3,  // HR director and above only
};

const ROLE_ACCESS = {
  employee:    ACCESS_LEVELS.INTERNAL,
  manager:     ACCESS_LEVELS.RESTRICTED,
  hr_director: ACCESS_LEVELS.CONFIDENTIAL,
  admin:       ACCESS_LEVELS.CONFIDENTIAL,
};

// Documents whose titles match these patterns are classified as CONFIDENTIAL
// at ingest time and blocked from general employee queries.
const CONFIDENTIAL_PATTERNS = [
  /salary/i,
  /compensation/i,
  /pay.?band/i,
  /bonus.?target/i,
  /equity.?grant/i,
  /performance.?rating.?distribution/i,
];

function classifyDocument(title, content) {
  if (CONFIDENTIAL_PATTERNS.some(p => p.test(title))) {
    return ACCESS_LEVELS.CONFIDENTIAL;
  }
  return ACCESS_LEVELS.INTERNAL;
}

function filterByAccess(documents, userRole = 'employee') {
  const userLevel = ROLE_ACCESS[userRole] ?? ACCESS_LEVELS.INTERNAL;
  return documents.filter(doc => (doc.accessLevel ?? ACCESS_LEVELS.INTERNAL) <= userLevel);
}

module.exports = { ACCESS_LEVELS, classifyDocument, filterByAccess };
