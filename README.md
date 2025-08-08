# Stock Management System

A comprehensive stock management system built with MERN stack (MongoDB, Express.js, React, Node.js) and Electron.js, supporting both web (PWA) and desktop applications.

## Features

- **Multi-platform**: Runs as both a Progressive Web App (PWA) and Desktop application
- **Complete CRUD Operations**: Manage suppliers, parts, assemblies, and transactions
- **Stock Tracking**: Real-time inventory management with low stock alerts
- **Assembly Management**: Create complex assemblies with bill of materials
- **Transaction History**: Track all stock movements with detailed logging
- **Modern UI**: Built with React and Tailwind CSS for a responsive design

## Tech Stack

### Backend
- Node.js + Express.js
- MongoDB with Mongoose ODM
- GraphQL API (planned for future)
- CORS enabled for cross-origin requests

### Frontend
- React.js with Hooks
- Tailwind CSS for styling
- React Router for navigation
- Axios for API calls
- PWA capabilities (service worker, manifest)

### Desktop App
- Electron.js for cross-platform desktop application
- Electron Packager for distribution

## Project Structure

```
stock-management/
├── backend/           # Node.js + Express API
│   ├── models/       # MongoDB schemas
│   ├── routes/       # API endpoints
│   ├── middleware/   # Custom middleware
│   └── config/       # Database and app configuration
├── frontend/         # React app + Electron
│   ├── public/       # Static files and PWA manifest
│   ├── src/          # React components and logic
│   ├── electron/     # Electron main process
│   └── build/        # Production build (generated)
└── docs/            # Documentation
```

## Database Collections

- **Suppliers**: Supplier management with contact details
- **Parts**: Inventory items with stock levels and alerts
- **Assemblies**: Complex parts made from multiple components
- **Assembly_Details**: Bill of materials linking assemblies to parts
- **Stock_Transactions**: Complete transaction history

## Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd stock-management
   ```

2. **Install dependencies**
   ```bash
   # Install backend dependencies
   cd backend
   npm install

   # Install frontend dependencies
   cd ../frontend
   npm install
   ```

3. **Environment Setup**
   ```bash
   # Backend (.env file in backend folder)
   cp backend/.env.example backend/.env
   # Edit backend/.env with your MongoDB URI and port

   # Frontend (.env file in frontend folder)
   cp frontend/.env.example frontend/.env
   # Edit frontend/.env with your backend API URL
   ```

4. **Start the application**
   ```bash
   # Start backend (from backend folder)
   npm start

   # Start frontend (from frontend folder)
   npm start

   # For desktop app (from frontend folder)
   npm run electron
   ```

## Development

### Backend Development
```bash
cd backend
npm run dev  # Development with nodemon
npm start    # Production
```

### Frontend Development
```bash
cd frontend
npm start    # Development server
npm run build  # Production build
npm run electron  # Desktop app
```

### Building for Production
```bash
# Build frontend
cd frontend
npm run build

# Package desktop app
npm run electron:build
```

## API Endpoints

### Suppliers
- `GET /api/suppliers` - Get all suppliers
- `POST /api/suppliers` - Create supplier
- `PUT /api/suppliers/:id` - Update supplier
- `DELETE /api/suppliers/:id` - Delete supplier

### Parts
- `GET /api/parts` - Get all parts
- `POST /api/parts` - Create part
- `PUT /api/parts/:id` - Update part
- `DELETE /api/parts/:id` - Delete part
- `GET /api/parts/low-stock` - Get low stock alerts

### Assemblies
- `GET /api/assemblies` - Get all assemblies
- `POST /api/assemblies` - Create assembly
- `PUT /api/assemblies/:id` - Update assembly
- `DELETE /api/assemblies/:id` - Delete assembly
- `POST /api/assemblies/:id/build` - Build assembly (decrement stock)

### Transactions
- `GET /api/transactions` - Get all transactions
- `POST /api/transactions` - Create transaction

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

MIT License - see LICENSE file for details