const mongoose = require('mongoose');
require('dotenv').config();

const VerifiedUserSchema = new mongoose.Schema({
  universityId: String,
  name: String,
  email: String,
  phone: String,
  department: String,
  isRegistered: { type: Boolean, default: false }
});

const VerifiedUser = mongoose.model('VerifiedUser', VerifiedUserSchema, 'verified_users');

async function seed() {
  try {
    const MONGODB_URI = process.env.MONGODB_URI;
    const DATABASE_NAME = process.env.DATABASE_NAME || 'ct_task_manager';
    await mongoose.connect(MONGODB_URI, { dbName: DATABASE_NAME });
    console.log('Connected to DB...');
    
    const user = {
      universityId: '10001',
      name: 'Arjun Sharma',
      email: 'arjun.sharma@ctuniversity.in',
      phone: '9876500001',
      department: 'Computer Science',
      isRegistered: false
    };

    await VerifiedUser.findOneAndUpdate({ universityId: user.universityId }, user, { upsert: true });
    console.log('✅ Successfully seeded Verified User! You can now register with these details:');
    console.log(user);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

seed();
