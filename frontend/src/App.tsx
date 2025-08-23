
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Home from "./pages/Home";
import Races from "./pages/Races";
import RaceDetails from "./pages/RaceDetails";
import Forum from "./pages/Forum";
import Thread from "./pages/Thread";
import Ratings from "./pages/Ratings";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "@/contexts/AuthContext";
import ProtectedRoute from "@/components/ProtectedRoute";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <div className="min-h-screen bg-background">
              <Header />
              <Routes>
                {/* Public routes */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route path="/" element={<Home />} />
                {/* Protected routes */}
                <Route path="/races" element={<ProtectedRoute><Races /></ProtectedRoute>} />
                <Route path="/race-calendar" element={<ProtectedRoute><RaceDetails /></ProtectedRoute>} />
                <Route path="/races/:id" element={<ProtectedRoute><RaceDetails /></ProtectedRoute>} />
                <Route path="/forum" element={<ProtectedRoute><Forum /></ProtectedRoute>} />
                <Route path="/forum/thread/:id" element={<ProtectedRoute><Thread /></ProtectedRoute>} />
                <Route path="/ratings" element={<ProtectedRoute><Ratings /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
