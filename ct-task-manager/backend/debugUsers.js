const jwt = require('jsonwebtoken');
require('dotenv').config({ path: './.env' });
const mongoose = require('mongoose');

async function testDeptAdminUsers() {
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DATABASE_NAME });
  const User = require('./src/models/User').default;
  const deptAdmin = await User.findOne({ role: 'department_admin' });

  const token = jwt.sign(
    { userId: deptAdmin._id.toString(), role: deptAdmin.role },
    process.env.JWT_SECRET,
    { expiresIn: '1h' }
  );

  try {
    const response = await fetch('http://localhost:5000/api/users?role=staff&limit=50', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const json = await response.json();
    if (!response.ok) throw new Error(json.message);
    
    console.log('Success! Users length:', json.data.users.length);
    console.log('Names:', json.data.users.map(u => u.name));
  } catch (err) {
    console.error('Error fetching users:', err.message);
  }
  process.exit(0);
}

testDeptAdminUsers();
