import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  TextField,
  Card,
  CardContent,
  Grid,
  CircularProgress,
  Tabs,
  Tab
} from '@mui/material';
import { LocalizationProvider } from '@mui/x-date-pickers';
import { DateTimePicker } from '@mui/x-date-pickers';
import { AdapterMoment } from '@mui/x-date-pickers/AdapterMoment';
import moment from 'moment';
import { loadStripe } from '@stripe/stripe-js';
import { Elements } from '@stripe/react-stripe-js';
import PaymentForm from './components/PaymentForm';
import Login from './components/Login';
import Register from './components/Register';
import axios from 'axios';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

function App() {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    dueDate: moment(),
    amount: ''
  });
  const [loading, setLoading] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [user, setUser] = useState(null);
  const [authTab, setAuthTab] = useState(0);
  const [currentTaskId, setCurrentTaskId] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetchUserProfile();
    }
  }, []);

  const fetchUserProfile = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5001/api/auth/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data.user);
      fetchTasks();
    } catch (error) {
      console.error('Error fetching user profile:', error);
      localStorage.removeItem('token');
      setUser(null);
    }
  };

  const fetchTasks = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:5001/api/tasks', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTasks(response.data);
    } catch (error) {
      console.error('Error fetching tasks:', error);
    }
  };

  const handleLoginSuccess = (userData) => {
    setUser(userData);
    fetchTasks();
  };

  const handleRegisterSuccess = (userData) => {
    setUser(userData);
    fetchTasks();
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setTasks([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post('http://localhost:5001/api/tasks', newTask, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setClientSecret(response.data.clientSecret);
      setCurrentTaskId(response.data.task._id);
      setShowPayment(true);
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentResult) => {
    if (paymentResult.error) {
      console.error('Payment error:', paymentResult.error);
    } else {
      setTasks([...tasks, paymentResult.task]);
      setNewTask({
        title: '',
        description: '',
        dueDate: moment(),
        amount: ''
      });
      setShowPayment(false);
      setCurrentTaskId(null);
    }
  };

  const handleComplete = async (taskId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `http://localhost:5001/api/tasks/${taskId}/complete`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const updatedTasks = tasks.map(task => 
        task._id === taskId ? response.data.task : task
      );
      setTasks(updatedTasks);
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  if (!user) {
    return (
      <Container maxWidth="sm">
        <Box sx={{ my: 4 }}>
          <Typography variant="h3" component="h1" gutterBottom align="center">
            Anti-Procrastination App
          </Typography>
          <Tabs
            value={authTab}
            onChange={(e, newValue) => setAuthTab(newValue)}
            centered
            sx={{ mb: 3 }}
          >
            <Tab label="Login" />
            <Tab label="Register" />
          </Tabs>
          {authTab === 0 ? (
            <Login onLoginSuccess={handleLoginSuccess} />
          ) : (
            <Register onRegisterSuccess={handleRegisterSuccess} />
          )}
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ my: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
          <Typography variant="h3" component="h1">
            Anti-Procrastination App
          </Typography>
          <Button variant="outlined" color="primary" onClick={handleLogout}>
            Logout
          </Button>
        </Box>

        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h5" component="h2" gutterBottom>
              Add New Task
            </Typography>
            <form onSubmit={handleSubmit}>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Task Title"
                    value={newTask.title}
                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                    required
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    label="Description"
                    multiline
                    rows={3}
                    value={newTask.description}
                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <LocalizationProvider dateAdapter={AdapterMoment}>
                    <DateTimePicker
                      label="Due Date"
                      value={newTask.dueDate}
                      onChange={(newValue) => setNewTask({ ...newTask, dueDate: newValue })}
                      textField={(params) => <TextField {...params} fullWidth />}
                    />
                  </LocalizationProvider>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Amount ($)"
                    type="number"
                    value={newTask.amount}
                    onChange={(e) => setNewTask({ ...newTask, amount: e.target.value })}
                    required
                  />
                </Grid>
                {showPayment && clientSecret && (
                  <Grid item xs={12}>
                    <Elements stripe={stripePromise} options={{ clientSecret }}>
                      <PaymentForm 
                        onPaymentSuccess={handlePaymentSuccess} 
                        taskId={currentTaskId}
                        paymentIntentId={clientSecret.split('_secret_')[0]}
                      />
                    </Elements>
                  </Grid>
                )}
                <Grid item xs={12}>
                  <Button
                    type="submit"
                    variant="contained"
                    color="primary"
                    disabled={loading}
                    fullWidth
                  >
                    {loading ? <CircularProgress size={24} /> : (showPayment ? 'Process Payment' : 'Create Task')}
                  </Button>
                </Grid>
              </Grid>
            </form>
          </CardContent>
        </Card>

        <Typography variant="h5" component="h2" gutterBottom>
          Your Tasks
        </Typography>
        <Grid container spacing={3}>
          {tasks.map((task) => (
            <Grid item xs={12} key={task._id}>
              <Card>
                <CardContent>
                  <Typography variant="h6" component="h3">
                    {task.title}
                  </Typography>
                  <Typography color="textSecondary" gutterBottom>
                    Due: {moment(task.dueDate).format('MMMM Do YYYY, h:mm a')}
                  </Typography>
                  <Typography variant="body2" paragraph>
                    {task.description}
                  </Typography>
                  <Typography variant="body1">
                    Amount at stake: ${task.amount}
                  </Typography>
                  {!task.completed && (
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() => handleComplete(task._id)}
                      sx={{ mt: 2 }}
                    >
                      Mark as Complete
                    </Button>
                  )}
                  {task.completed && (
                    <Typography color="success.main" sx={{ mt: 2 }}>
                      Completed {moment(task.dueDate).isBefore(moment()) ? '(after deadline)' : '(on time)'}
                    </Typography>
                  )}
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Container>
  );
}

export default App;
