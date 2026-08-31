
const mongoose = require('mongoose');
mongoose.connect('mongodb+srv://NavjjotSingh:Navjot123@cluster0.ex7whxc.mongodb.net/?appName=Cluster0', { dbName: 'ct_task_manager' }).then(async () => {
  const db = mongoose.connection.db;
  await db.collection('users').updateOne({ name: 'Rahul Kumar' }, { $set: { department: 'School Of Engineering And Technology' } });
  console.log('Updated Rahul Kumar department');
  process.exit(0);
});

