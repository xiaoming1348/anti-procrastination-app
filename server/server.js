require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('./models/User');
const Task = require('./models/Task');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  }
};

// Only connect to MongoDB if we're not in a test environment
if (process.env.NODE_ENV !== 'test') {
  connectDB();
}

// Authentication Middleware
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      throw new Error();
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      throw new Error();
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Please authenticate' });
  }
};

// Auth Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = new User({
      name,
      email,
      password: hashedPassword
    });

    await user.save();

    // Generate token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error creating user' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error logging in' });
  }
});

app.get('/api/auth/profile', auth, async (req, res) => {
  try {
    res.json({
      user: {
        id: req.user._id,
        name: req.user.name,
        email: req.user.email
      }
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile' });
  }
});

// Task Routes
app.post('/api/tasks', auth, async (req, res) => {
  try {
    const { title, description, dueDate, amount } = req.body;
    
    // Create a payment intent with Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100), // Convert to cents and ensure integer
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never'
      },
      metadata: {
        userId: req.user._id.toString(),
        taskTitle: title
      }
    });

    const task = new Task({
      title,
      description,
      dueDate,
      amount,
      paymentIntentId: paymentIntent.id,
      userId: req.user._id,
      status: 'pending_payment'
    });

    await task.save();
    res.json({ 
      task, 
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tasks/:taskId/confirm-payment', auth, async (req, res) => {
  try {
    const { paymentIntentId } = req.body;
    const task = await Task.findOne({ 
      _id: req.params.taskId,
      userId: req.user._id,
      paymentIntentId: paymentIntentId
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Verify the payment intent status
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    
    if (paymentIntent.status === 'succeeded') {
      task.status = 'active';
      await task.save();
      res.json({ task });
    } else {
      res.status(400).json({ error: 'Payment not completed' });
    }
  } catch (error) {
    console.error('Error confirming payment:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/tasks/:id/complete', auth, async (req, res) => {
  try {
    const task = await Task.findOne({ 
      _id: req.params.id, 
      userId: req.user._id,
      status: 'active'
    });

    if (!task) {
      return res.status(404).json({ error: 'Task not found or not active' });
    }

    const now = new Date();
    const dueDate = new Date(task.dueDate);
    const isOnTime = now <= dueDate;

    if (isOnTime) {
      try {
        // Create a refund for the payment
        const refund = await stripe.refunds.create({
          payment_intent: task.paymentIntentId,
          reason: 'requested_by_customer'
        });

        task.completed = true;
        task.status = 'completed';
        task.refundId = refund.id;
        await task.save();
        
        res.json({ 
          message: 'Task completed and payment refunded', 
          task,
          refund: {
            id: refund.id,
            amount: refund.amount / 100,
            status: refund.status
          }
        });
      } catch (refundError) {
        console.error('Error processing refund:', refundError);
        task.completed = true;
        task.status = 'completed';
        task.refundError = refundError.message;
        await task.save();
        
        res.json({ 
          message: 'Task completed but refund failed', 
          task,
          refundError: refundError.message
        });
      }
    } else {
      task.completed = true;
      task.status = 'completed_late';
      await task.save();
      res.json({ 
        message: 'Task completed but deadline missed - no refund', 
        task 
      });
    }
  } catch (error) {
    console.error('Error completing task:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/tasks', auth, async (req, res) => {
  try {
    const tasks = await Task.find({ userId: req.user._id });
    res.json(tasks);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5001;
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

module.exports = app; 