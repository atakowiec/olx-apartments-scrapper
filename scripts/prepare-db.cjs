const fs = require('node:fs');
const path = require('node:path');

// Prisma 5's SQLite migration engine can fail when the database file is absent.
// Append mode creates an empty file without truncating an existing database.
fs.closeSync(fs.openSync(path.join(__dirname, '../prisma/dev.db'), 'a'));
