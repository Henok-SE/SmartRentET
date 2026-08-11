import { BrowserRouter, Routes, Route } from "react-router-dom";

import AdminLogin from "./pages/auth/AdminLogin";
import OfficerLogin from "./pages/auth/OfficerLogin";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AdminLogin />} />
        <Route path="/admin-login" element={<AdminLogin />} />
        <Route path="/officer-login" element={<OfficerLogin />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;