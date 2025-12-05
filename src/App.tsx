
import React from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { DataProvider } from './context/DataContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import Layout from './components/Layout';
import Home from './pages/Home';
import { TripList } from './pages/TripList';
import TripDetails from './pages/TripDetails';
import AgencyList from './pages/AgencyList';
import AgencyProfile from './pages/AgencyProfile';
import { AdminDashboard } from './pages/AdminDashboard'; 
import { AgencyLandingPage } from './pages/AgencyLandingPage';
import AgencyDashboard from './pages/AgencyDashboard';
import { ClientDashboard } from './pages/ClientDashboard';
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
                  
                  {/* Global Routes (ViajaStore Context) */}
                  <Route path="trips" element={<TripList />} />
                  <Route path="viagem/:slug" element={<TripDetails />} />
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
                  
                  {/* Protected Routes */}
                  <Route path="agency/dashboard" element={<AgencyDashboard />} />
                  <Route path="admin/dashboard" element={<AdminDashboard />} />
                  <Route path="client/dashboard/:tab?" element={<ClientDashboard />} />

                  {/* --- AGENCY MODE ROUTES --- */}
                  {/* Captura /:agencySlug e suas sub-rotas */}
                  <Route path=":agencySlug" element={<AgencyLandingPage />} />
                  <Route path=":agencySlug/trips" element={<TripList />} />
                  <Route path=":agencySlug/viagem/:tripSlug" element={<TripDetails />} />
                  <Route path=":agencySlug/checkout/success" element={<CheckoutSuccess />} />
                  
                  {/* Microsite Client Dashboard */}
                  <Route path=":agencySlug/client/:tab?" element={<ClientDashboard />} />

                  {/* Catch all */}
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
