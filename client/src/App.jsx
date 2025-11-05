import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import Landing from "./pages/Landing.jsx";
import SignIn from "./pages/SignIn.jsx";
import OnboardPatient from "./pages/OnboardPatient.jsx";
import OnboardResearcher from "./pages/OnboardResearcher.jsx";
import DashboardPatient from "./pages/DashboardPatient.jsx";
import DashboardResearcher from "./pages/DashboardResearcher.jsx";
import Trials from "./pages/Trials.jsx";
import Publications from "./pages/Publications.jsx";
import Experts from "./pages/Experts.jsx";
import Forums from "./pages/Forums.jsx";
import Favorites from "./pages/Favorites.jsx";
import ManageTrials from "./pages/ManageTrials.jsx";
import Insights from "./pages/Insights.jsx";
import "./App.css";
import Navbar from "./components/Navbar.jsx";

const App = () => {
  return (
    <BrowserRouter>
      <div>
        <Navbar />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3000,
            style: {
              background: '#fff',
              color: '#92400e',
              border: '1px solid #fbbf24',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/onboard/patient" element={<OnboardPatient />} />
          <Route path="/onboard/researcher" element={<OnboardResearcher />} />
          <Route path="/dashboard/patient" element={<DashboardPatient />} />
          <Route
            path="/dashboard/researcher"
            element={<DashboardResearcher />}
          />
          <Route path="/trials" element={<Trials />} />
          <Route path="/publications" element={<Publications />} />
          <Route path="/experts" element={<Experts />} />
          <Route path="/forums" element={<Forums />} />
          <Route path="/favorites" element={<Favorites />} />
          <Route path="/manage-trials" element={<ManageTrials />} />
          <Route path="/insights" element={<Insights />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        {/* Nav is provided by Navbar in Layout */}
      </div>
    </BrowserRouter>
  );
};

export default App;
