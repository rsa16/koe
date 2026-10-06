import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import ModerationQueuePage from "./pages/ModerationQueuePage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/queue" element={<ModerationQueuePage />} />
      <Route path="*" element={<Navigate to="/queue" replace />} />
    </Routes>
  );
}
