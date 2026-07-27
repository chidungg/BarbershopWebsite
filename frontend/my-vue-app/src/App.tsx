import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./features/auth/LoginPage";
import SignupPage from "./features/auth/SignupPage";
import UndefPage from "./features/404";
import ForgotPassPage from "./features/auth/ForgotPasswordPage"



function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<SignupPage/>} />
      <Route path="/forgot-password" element={<ForgotPassPage />} /> 
      <Route path="*" element={< UndefPage />} />
    </Routes>
  );
}

export default App;