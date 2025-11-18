import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import TripList from './pages/TripList';
import TripDetails from './pages/TripDetails';
import AgencyDashboard from './pages/AgencyDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ClientDashboard from './pages/ClientDashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <DataProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="trips" element={<TripList />} />
              <Route path="trip/:id" element={<TripDetails />} />
              <Route path="agencies" element={<div className="p-8 text-center">Lista de agências (Em construção)</div>} />
              
              {/* Auth Routes */}
              <Route path="login" element={<Login />} />
              <Route path="signup" element={<Signup />} />
              
              {/* Protected Routes */}
              <Route path="agency/dashboard" element={<AgencyDashboard />} />
              <Route path="admin/dashboard" element={<AdminDashboard />} />
              <Route path="client/dashboard" element={<ClientDashboard />} />
            </Route>
          </Routes>
        </Router>
      </DataProvider>
    </AuthProvider>
  );
};

export default App;