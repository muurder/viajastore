import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import TripList from './pages/TripList';
import TripDetails from './pages/TripDetails';
import AgencyList from './pages/AgencyList';
import AgencyProfile from './pages/AgencyProfile';
import AgencyDashboard from './pages/AgencyDashboard';
import AdminDashboard from './pages/AdminDashboard';
import ClientDashboard from './pages/ClientDashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { About, Contact, Terms, Help } from './pages/StaticPages';
import { NotFound, Unauthorized, CheckoutSuccess, ForgotPassword } from './pages/UtilityPages';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <DataProvider>
        <Router>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              
              {/* Main Content Routes */}
              <Route path="trips" element={<TripList />} />
              <Route path="trip/:id" element={<TripDetails />} />
              <Route path="agencies" element={<AgencyList />} />
              <Route path="agency/:id" element={<AgencyProfile />} />
              
              {/* Static Pages */}
              <Route path="about" element={<About />} />
              <Route path="contact" element={<Contact />} />
              <Route path="terms" element={<Terms />} />
              <Route path="help" element={<Help />} />
              
              {/* Utility Routes */}
              <Route path="checkout/success" element={<CheckoutSuccess />} />
              <Route path="unauthorized" element={<Unauthorized />} />
              <Route path="forgot-password" element={<ForgotPassword />} />
              
              {/* Auth Routes */}
              <Route path="login" element={<Login />} />
              <Route path="signup" element={<Signup />} />
              
              {/* Protected Routes */}
              <Route path="agency/dashboard" element={<AgencyDashboard />} />
              <Route path="admin/dashboard" element={<AdminDashboard />} />
              <Route path="client/dashboard" element={<ClientDashboard />} />

              {/* Catch all */}
              <Route path="*" element={<NotFound />} />
            </Route>
          </Routes>
        </Router>
      </DataProvider>
    </AuthProvider>
  );
};

export default App;