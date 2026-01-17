import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import CartDrawer from "@/components/cart/CartDrawer";
import ChatBot from "@/components/chat/ChatBot";
import HomePage from "@/pages/HomePage";
import MenuPage from "@/pages/MenuPage";
import ReservationsPage from "@/pages/ReservationsPage";
import AboutPage from "@/pages/AboutPage";
import CheckoutPage from "@/pages/CheckoutPage";
import OrderConfirmationPage from "@/pages/OrderConfirmationPage";
import AdminLoginPage from "@/pages/admin/AdminLoginPage";
import AdminLayout from "@/pages/admin/AdminLayout";
import AdminDashboardPage from "@/pages/admin/AdminDashboardPage";
import AdminOrdersPage from "@/pages/admin/AdminOrdersPage";
import AdminMenuPage from "@/pages/admin/AdminMenuPage";
import AdminReservationsPage from "@/pages/admin/AdminReservationsPage";
import AdminSettingsPage from "@/pages/admin/AdminSettingsPage";
import AdminAnalyticsPage from "@/pages/admin/AdminAnalyticsPage";
import ContactFormPage from "@/pages/ContactFormPage";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "@/hooks/useAuth";

const queryClient = new QueryClient();

// Layout wrapper for customer pages
function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header />
      {children}
      <Footer />
      <CartDrawer />
      <ChatBot />
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner position="top-right" />
        <BrowserRouter>
          <Routes>
            {/* Customer routes */}
            <Route path="/" element={<CustomerLayout><HomePage /></CustomerLayout>} />
            <Route path="/menu" element={<CustomerLayout><MenuPage /></CustomerLayout>} />
            <Route path="/reservations" element={<CustomerLayout><ReservationsPage /></CustomerLayout>} />
            <Route path="/about" element={<CustomerLayout><AboutPage /></CustomerLayout>} />
            <Route path="/checkout" element={<CustomerLayout><CheckoutPage /></CustomerLayout>} />
            <Route path="/order-confirmation" element={<CustomerLayout><OrderConfirmationPage /></CustomerLayout>} />
            <Route path="/contact" element={<ContactFormPage />} />
            
            {/* Admin routes */}
            <Route path="/admin" element={<AdminLoginPage />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route path="dashboard" element={<AdminDashboardPage />} />
              <Route path="orders" element={<AdminOrdersPage />} />
              <Route path="menu" element={<AdminMenuPage />} />
              <Route path="reservations" element={<AdminReservationsPage />} />
              <Route path="analytics" element={<AdminAnalyticsPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
