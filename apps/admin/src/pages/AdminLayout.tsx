import { useCallback, useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  AppBar,
  Box,
  Button,
  CircularProgress,
  Container,
  Tab,
  Tabs,
  Toolbar,
  Typography,
} from "@mui/material";
import type { User } from "@koe/core";
import { getSession, logout } from "../api/client";

export interface AdminOutletContext {
  user: User;
}

const ADMIN_NAV = [
  { label: "Moderation Queue", value: "/queue" },
  { label: "Users", value: "/users" },
  { label: "Settings", value: "/settings" },
];

const MODERATOR_NAV = [{ label: "Moderation Queue", value: "/queue" }];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const sessionUser = await getSession();
        if (!cancelled) {
          setUser(sessionUser);
        }
      } catch {
        if (!cancelled) {
          navigate("/login", { replace: true });
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } finally {
      navigate("/login", { replace: true });
    }
  }, [navigate]);

  if (loading || !user) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  const nav = user.role === "admin" ? ADMIN_NAV : MODERATOR_NAV;
  const activeTab =
    nav.find((item) => location.pathname.startsWith(item.value))?.value ?? false;

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "grey.100" }}>
      <AppBar position="static">
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" sx={{ mr: 2, whiteSpace: "nowrap" }}>
            Koe Admin
          </Typography>
          <Tabs
            value={activeTab}
            textColor="inherit"
            indicatorColor="secondary"
            sx={{ flexGrow: 1, minHeight: 48 }}
          >
            {nav.map((item) => (
              <Tab
                key={item.value}
                label={item.label}
                value={item.value}
                component={Link}
                to={item.value}
              />
            ))}
          </Tabs>
          <Typography variant="body2" sx={{ whiteSpace: "nowrap" }}>
            {user.name ?? user.email ?? user.id} ({user.role})
          </Typography>
          <Button color="inherit" onClick={handleLogout}>
            Sign out
          </Button>
        </Toolbar>
      </AppBar>

      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Outlet context={{ user } satisfies AdminOutletContext} />
      </Container>
    </Box>
  );
}
