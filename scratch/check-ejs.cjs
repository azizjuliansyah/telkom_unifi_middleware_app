const ejs = require('ejs');
const fs = require('fs');
const path = require('path');

const files = [
  'src/views/admin-dashboard.ejs',
  'src/views/admin-users.ejs',
  'src/views/admin-profile.ejs',
  'src/views/admin-login.ejs'
];

files.forEach(file => {
  const content = fs.readFileSync(file, 'utf8');
  try {
    ejs.compile(content, { filename: file });
    console.log(`${file}: OK`);
  } catch (err) {
    console.error(`${file}: ERROR`);
    console.error(err.message);
  }
});
