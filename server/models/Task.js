const mongoose = require('mongoose');

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  dueDate: { type: Date, required: true },
  amount: { type: Number, required: true },
  completed: { type: Boolean, default: false },
  paymentIntentId: String,
  refundId: String,
  refundError: String,
  status: { 
    type: String, 
    enum: ['pending_payment', 'active', 'completed', 'completed_late'],
    default: 'pending_payment'
  },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Task', taskSchema); 