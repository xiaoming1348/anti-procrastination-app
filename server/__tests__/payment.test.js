const request = require('supertest');
jest.mock('stripe'); // Use the global Stripe mock
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../server');
const User = require('../models/User');
const Task = require('../models/Task');

let mongoServer;
let authToken;
let testUser;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  await mongoose.connect(mongoServer.getUri());

  // Register and login user via API
  const registerResponse = await request(app)
    .post('/api/auth/register')
    .send({
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123'
    });

  authToken = registerResponse.body.token;
  testUser = registerResponse.body.user;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('Payment Flow', () => {
  let taskId;
  let paymentIntentId;

  test('should create a task with payment intent', async () => {
    const response = await request(app)
      .post('/api/tasks')
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        title: 'Test Task',
        description: 'Test Description',
        dueDate: new Date(Date.now() + 86400000), // Tomorrow
        amount: 10
      });

    console.log('Create task response:', response.body);
    expect(response.status).toBe(200);
    expect(response.body.task).toBeDefined();
    expect(response.body.clientSecret).toBeDefined();
    expect(response.body.paymentIntentId).toBeDefined();

    taskId = response.body.task._id;
    paymentIntentId = response.body.paymentIntentId;
  });

  test('should confirm payment for task', async () => {
    // First, verify the task exists and get its current state
    const taskBefore = await Task.findById(taskId);
    console.log('Task before confirmation:', taskBefore);

    const response = await request(app)
      .post(`/api/tasks/${taskId}/confirm-payment`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({ paymentIntentId: 'pi_test_123' });

    console.log('Confirm payment response:', response.body);
    expect(response.status).toBe(200);
    expect(response.body.task.status).toBe('active');

    // Verify the task was updated
    const taskAfter = await Task.findById(taskId);
    console.log('Task after confirmation:', taskAfter);
  });

  test('should complete task and process refund', async () => {
    // First, verify the task exists and is active
    const taskBefore = await Task.findById(taskId);
    console.log('Task before completion:', taskBefore);

    const response = await request(app)
      .post(`/api/tasks/${taskId}/complete`)
      .set('Authorization', `Bearer ${authToken}`);

    console.log('Complete task response:', response.body);
    expect(response.status).toBe(200);
    expect(response.body.task.status).toBe('completed');
    expect(response.body.task.refundId).toBeDefined();

    // Verify the task was updated
    const taskAfter = await Task.findById(taskId);
    console.log('Task after completion:', taskAfter);
  });
}); 