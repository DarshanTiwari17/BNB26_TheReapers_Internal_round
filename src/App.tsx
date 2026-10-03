import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import Home from "./pages/Home";
import Placeholder from "./pages/Placeholder";
import SessionCreation from "./pages/SessionCreation";
import HostLobby from "./pages/HostLobby";

function ScrollManager() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) {
      const el = document.querySelector(hash);
      if (el) {
        el.scrollIntoView({ behavior: "smooth" });
        return;
      }
    }
    window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <ScrollManager />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/join" element={<Placeholder title="Join Session" body="Join Session is coming soon. This placeholder route reserves the future Join Session page." />} />
        <Route path="/create-session" element={<SessionCreation />} />
        <Route path="/host-lobby" element={<HostLobby />} />
        <Route path="/roundtable" element={<Placeholder title="Live Roundtable" body="Live Roundtable is coming soon. This placeholder route reserves the future live session experience." />} />
        <Route path="/results" element={<Placeholder title="Meeting Results" body="Meeting Results is coming soon. This placeholder route reserves the future transcript results page." />} />
        <Route path="*" element={<Placeholder title="Not found" body="This page does not exist yet." />} />
      </Routes>
    </BrowserRouter>
  );
}
