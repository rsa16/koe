import { Navigate, Route, Routes } from "react-router-dom";
import AdminLayout from "./pages/AdminLayout";
import CommentsPage from "./pages/CommentsPage";
import LoginPage from "./pages/LoginPage";
import ModerationQueuePage from "./pages/ModerationQueuePage";
import NetworkBlocksPage from "./pages/NetworkBlocksPage";
import SettingsPage from "./pages/SettingsPage";
import UsersPage from "./pages/UsersPage";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<AdminLayout />}>
        <Route path="/queue" element={<ModerationQueuePage />} />
        <Route path="/comments" element={<CommentsPage />} />
        <Route path="/users" element={<UsersPage />} />
        <Route path="/network-blocks" element={<NetworkBlocksPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/queue" replace />} />
    </Routes>
  );
}
