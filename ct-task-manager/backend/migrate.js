require('dotenv').config();
const mongoose = require('mongoose');

// Need to handle the database name since it uses ?appName=Cluster0 without a DB name in URI sometimes
// In the backend connection it might connect to MONGODB_URI and select DATABASE_NAME
const mongoURI = process.env.MONGODB_URI;
const dbName = process.env.DATABASE_NAME || 'ct_task_manager';

mongoose.connect(mongoURI, { dbName: dbName }).then(async () => {
  const Task = mongoose.connection.collection('tasks');
  const Counter = mongoose.connection.collection('counters');
  
  const tasks = await Task.find({ taskId: { $exists: false } }).toArray();
  for (const t of tasks) {
    const c = await Counter.findOneAndUpdate(
      { _id: 'taskId' },
      { $inc: { sequence_value: 1 } },
      { returnDocument: 'after', upsert: true }
    );
    const newId = String(c.value ? c.value.sequence_value : c.sequence_value || 1).padStart(5, '0');
    await Task.updateOne({ _id: t._id }, { $set: { taskId: newId } });
    console.log('Updated task', t._id, 'to', newId);
  }
  console.log('Done');
  process.exit(0);
}).catch(console.error);
