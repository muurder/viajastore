
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import TripList from './pages/TripList';
import TripDetails from './pages/TripDetails';
import AgencyList from './pages/AgencyList';
import AgencyProfile from './pages/AgencyProfile';
import AgencyDashboard from './pages/AgencyDashboard';
import AgencyLandingPage from './pages/AgencyLandingPage'; // Import New Component
import AdminDashboard from './pages/AdminDashboard';
import ClientDashboard from './pages/ClientDashboard';
import Login from './pages/Login';
import Signup from './pages/Signup';
import { About, Contact, Terms, Help, Privacy, Blog, Careers, Press } from './pages/StaticPages';
import { NotFound, Unauthorized, CheckoutSuccess, ForgotPassword } from './pages/UtilityPages';

const App: React.FC = () => {
  return (
    <AuthProvider>
      <ThemeProvider>
        <ToastProvider>
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
                  <Route path="privacy" element={<Privacy />} />
                  <Route path="help" element={<Help />} />
                  <Route path="blog" element={<Blog />} />
                  <Route path="careers" element={<Careers />} />
                  <Route path="press" element={<Press />} />
                  
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

                  {/* Agency Landing Page by Slug (Dynamic) */}
                  {/* MUST be placed after specific paths to avoid collisions */}
                  <Route path=":slug" element={<AgencyLandingPage />} />

                  {/* Catch all (handled by 404 inside AgencyLandingPage if slug not found, or strictly here if needed) */}
                  {/* Note: With :slug being a catch-all for 1-level deep paths, real 404s will effectively go to AgencyLandingPage 
                      and render its internal "Not Found" state. We keep * for deep nested 404s. */}
                  <Route path="*" element={<NotFound />} />
                </Route>
              </Routes>
            </Router>
          </DataProvider>
        </ToastProvider>
      </ThemeProvider>
    </AuthProvider>
  );
};

export default App;
