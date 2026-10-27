import { BrowserRouter, Routes, Route } from "react-router-dom";

import DashboardPI from "./landing_page/dashboard_pi/DashboardPI";
import DashboardRND from "./landing_page/dashboard_rnd/DashboardRND";
import DashboardDORD from "./landing_page/dashboard_DORD/DashboardDORD";
import DashboardDRRD from "./landing_page/dashboard_DRRD/DashboardDRRD";
import ProjectRegistrationForm from "./landing_page/dashboard_pi/ProjectRegistrationForm";
import ProjectSummary from "./landing_page/dashboard_pi/ProjectSummary";
import FundBookingPage from "./landing_page/FundBookingPage";
import PurchaseRequisitionForm from "./landing_page/process_forms/PurchaseRequisitionForm";
import NavBar from "./NavBar";
import Footer from "./Footer";
import AuthPageWrapper from "./components/AuthPageWrapper";
import GenerateKey from "./landing_page/key_gen/GenerateKey";
import ManpowerHiringForm from "./landing_page/process_forms/ManpowerHiringForms";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicRoute from "./components/PublicRoute";
import ProjectRegistrationStatus from "./landing_page/dashboard_pi/ProjectRegistrationStatus";
import MyRecruitmentRequests from "./landing_page/dashboard_pi/MyRecruitmentRequests";
import DashboardMediaCell from "./landing_page/dashboard_MediaCell/DashboardMediaCell";

function App() {
  return (
    <BrowserRouter>
      <NavBar />

      <Routes>
        <Route
          path="/"
          element={
            <PublicRoute>
              <AuthPageWrapper />
            </PublicRoute>
          }
        />

        <Route path="/generate-key" element={<GenerateKey />} />

        <Route
          path="/pi-dashboard"
          element={
            <ProtectedRoute allowedRole="PI">
              <DashboardPI />
            </ProtectedRoute>
          }
        />

        <Route
          path="/rnd-dashboard"
          element={
            <ProtectedRoute allowedRole="RND">
              <DashboardRND />
            </ProtectedRoute>
          }
        />

        <Route
          path="/DORD-dashboard"
          element={
            <ProtectedRoute allowedRole="DORD">
              <DashboardDORD />
            </ProtectedRoute>
          }
        />

        <Route
          path="/DRRD-dashboard"
          element={
            <ProtectedRoute allowedRole="DRRD">
              <DashboardDRRD />
            </ProtectedRoute>
          }
        />
        <Route
          path="/media-cell-dashboard"
          element={
            <ProtectedRoute allowedRole="MEDIA_CELL">
              <DashboardMediaCell />
            </ProtectedRoute>
          }
        />

        <Route path="/projects" element={<ProjectRegistrationForm />} />
        <Route path="/summary/:id" element={<ProjectSummary />} />
        <Route path="/manpower-hiring" element={<ManpowerHiringForm />} />
        <Route path="/fund-booking/:id" element={<FundBookingPage />} />
        <Route path="/project-registration-status" element={<ProjectRegistrationStatus />} />
        <Route
          path="/my-recruitment-requests"
          element={
            <ProtectedRoute allowedRole="PI">
              <MyRecruitmentRequests />
            </ProtectedRoute>
          }
        />
      </Routes>

      <Footer />
    </BrowserRouter>
  );
}

export default App;
