# Anti-Procrastination App

A web application that helps users overcome procrastination by implementing a monetary incentive system. Users can create tasks with deadlines and stake money on their completion.

## Features

- User authentication and authorization
- Task creation and management
- Payment integration with Stripe
- Automatic refunds for completed tasks
- Responsive Material-UI interface

## Tech Stack

- Frontend: React, Material-UI, Stripe Elements
- Backend: Node.js, Express
- Database: MongoDB
- Authentication: JWT
- Payment Processing: Stripe
- Containerization: Docker
- Orchestration: Kubernetes
- CI/CD: GitHub Actions

## Prerequisites

- Node.js (v20 or later)
- MongoDB
- Docker and Docker Compose
- Kubernetes cluster (for production)
- Stripe account
- Docker Hub account

## Local Development Setup

1. Clone the repository:
```bash
git clone https://github.com/xiaoming1348/anti-procrastination-app
cd anti-procrastination-app
```

2. Install dependencies:
```bash
# Install backend dependencies
cd server
npm install

# Install frontend dependencies
cd ../src
npm install
```

3. Set up environment variables:
Create `.env` files in both `server` and `src` directories with the following variables:

Server (.env):
```
MONGODB_URI=mongodb://localhost:27017/anti-procrastination
JWT_SECRET=your_jwt_secret
STRIPE_SECRET_KEY=your_stripe_secret_key
```

Frontend (.env):
```
REACT_APP_API_URL=http://localhost:5001
REACT_APP_STRIPE_PUBLIC_KEY=your_stripe_public_key
```

4. Start the development servers:
```bash
# Start backend server
cd server
npm run dev

# Start frontend server
cd ../src
npm start
```

## Docker Setup

Build and run with Docker Compose:
```bash
docker-compose up --build
```

## Kubernetes Deployment

1. Create Kubernetes secrets:
```bash
kubectl create secret generic app-secrets \
  --from-literal=mongodb-uri='mongodb://mongodb-service:27017/anti-procrastination' \
  --from-literal=jwt-secret='your_jwt_secret' \
  --from-literal=stripe-secret-key='your_stripe_secret_key'
```

2. Apply Kubernetes manifests:
```bash
kubectl apply -f k8s/
```

## Testing

Run the test suite:
```bash
cd server
npm test
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.
