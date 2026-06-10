
import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Skeleton } from "@/components/ui/skeleton";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { queryClient, persistOptions } from "@/lib/queryClient";
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

// Data-heavy pages are code-split so the initial bundle stays lean.
const RaceCenterIndex = lazy(() => import("./pages/RaceCenterIndex"));
const RaceCenter = lazy(() => import("./pages/RaceCenter"));
const DriverProfile = lazy(() => import("./pages/DriverProfile"));
const ConstructorProfile = lazy(() => import("./pages/ConstructorProfile"));
const News = lazy(() => import("./pages/News"));

const RouteFallback = () => (
  <div className="container mx-auto px-4 py-8 space-y-4">
    <Skeleton className="h-10 w-2/3" />
    <Skeleton className="h-64 w-full" />
  </div>
);

function App() {
  return (
    <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
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
                <Route path="/news" element={<Suspense fallback={<RouteFallback />}><News /></Suspense>} />
                {/* Protected routes */}
                <Route path="/races" element={<ProtectedRoute><Races /></ProtectedRoute>} />
                <Route path="/race-calendar" element={<ProtectedRoute><RaceDetails /></ProtectedRoute>} />
                <Route path="/races/:id" element={<ProtectedRoute><RaceDetails /></ProtectedRoute>} />
                <Route path="/race-center" element={<ProtectedRoute><Suspense fallback={<RouteFallback />}><RaceCenterIndex /></Suspense></ProtectedRoute>} />
                <Route path="/race/:meetingKey" element={<ProtectedRoute><Suspense fallback={<RouteFallback />}><RaceCenter /></Suspense></ProtectedRoute>} />
                <Route path="/driver/:driverId" element={<ProtectedRoute><Suspense fallback={<RouteFallback />}><DriverProfile /></Suspense></ProtectedRoute>} />
                <Route path="/constructor/:constructorId" element={<ProtectedRoute><Suspense fallback={<RouteFallback />}><ConstructorProfile /></Suspense></ProtectedRoute>} />
                <Route path="/forum" element={<ProtectedRoute><Forum /></ProtectedRoute>} />
                <Route path="/forum/thread/:id" element={<ProtectedRoute><Thread /></ProtectedRoute>} />
                <Route path="/ratings" element={<ProtectedRoute><Ratings /></ProtectedRoute>} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </div>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </PersistQueryClientProvider>
  );
}

export default App;
