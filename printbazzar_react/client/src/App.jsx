import { Route, Routes, useLocation, Navigate, useParams } from "react-router-dom";
import { useState, useEffect, lazy, Suspense } from "react";
import Home from "./Pages/Home";
import Header from "./Components/Header";
import FooterCom from "./Components/FooterComp";
import ScrollToTop from "./Components/ScrollToTop";
import Whatsapp from "./Components/WhatsappIcon";
import Search from "./Components/Search";
import { CartDrawer } from "./Components/CartDrawer";
import { CartProvider } from "./context/CartContext";
import { AuthProvider } from "./context/AuthContext";
import { CustomerAuthProvider } from "./context/CustomerAuthContext";
import { BusinessInfoProvider } from "./context/BusinessInfoContext";
import MobileBottomNav from "./Components/MobileBottomNav";

// Storefront Pages (Lazy Loaded Chunks)
const Category = lazy(() => import("./Pages/Category").then((m) => ({ default: m.Category })));
const Shop = lazy(() => import("./Pages/Shop"));
const ProductDetail = lazy(() => import("./Pages/ProductDetail"));
const Cart = lazy(() => import("./Pages/Cart"));
const Checkout = lazy(() => import("./Pages/Checkout"));
const OrderConfirmation = lazy(() => import("./Pages/OrderConfirmation"));
const TrackOrder = lazy(() => import("./Pages/TrackOrder"));
const Contact = lazy(() => import("./Pages/Contact"));
const AboutUs = lazy(() => import("./Pages/AboutUs"));
const Missing = lazy(() => import("./Pages/Missing"));
const InvoiceView = lazy(() => import("./Pages/InvoiceView"));
const PolicyPage = lazy(() => import("./Pages/PolicyPage"));
const QuoteRequestPage = lazy(() => import("./Pages/QuoteRequestPage"));

// Customer Auth & Portal Pages (Lazy Loaded)
const CustomerLogin = lazy(() => import("./Pages/CustomerLogin"));
const CustomerSignup = lazy(() => import("./Pages/CustomerSignup"));
const CustomerDashboard = lazy(() => import("./Pages/CustomerDashboard"));

// Admin Module (Lazy Loaded Chunks - Separated from Public Storefront Bundle)
const AdminLayout = lazy(() => import("./admin/AdminLayout"));
const AdminLogin = lazy(() => import("./admin/AdminLogin"));
const AdminDashboard = lazy(() => import("./admin/AdminDashboard"));
const AdminProducts = lazy(() => import("./admin/AdminProducts"));
const AdminProductEditor = lazy(() => import("./admin/AdminProductEditor"));
const AdminCategories = lazy(() => import("./admin/AdminCategories"));
const AdminBanners = lazy(() => import("./admin/AdminBanners"));
const AdminOrders = lazy(() => import("./admin/AdminOrders"));
const AdminOrderDetail = lazy(() => import("./admin/AdminOrderDetail"));
const AdminWorkflowBoard = lazy(() => import("./admin/AdminWorkflowBoard"));
const AdminStaffManagement = lazy(() => import("./admin/AdminStaffManagement"));
const AdminPriceManagement = lazy(() => import("./admin/AdminPriceManagement"));
const AdminDesignServices = lazy(() => import("./admin/AdminDesignServices"));
const AdminSettings = lazy(() => import("./admin/AdminSettings"));
const AdminFooterSettings = lazy(() => import("./admin/AdminFooterSettings"));
const AdminBusinessSettings = lazy(() => import("./admin/AdminBusinessSettings"));
const AdminAuditLogs = lazy(() => import("./admin/AdminAuditLogs"));
const AdminProductConfigurator = lazy(() => import("./admin/AdminProductConfigurator"));
const AdminOptionMasterManager = lazy(() => import("./admin/AdminOptionMasterManager"));
const AdminPOS = lazy(() => import("./admin/AdminPOS"));
const AdminFrontOfficeDashboard = lazy(() => import("./admin/AdminFrontOfficeDashboard"));
const StaffQueue = lazy(() => import("./Pages/StaffQueue"));

// Lightweight suspense placeholder for deferred route transitions
function RouteLoadingFallback() {
  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center py-16">
      <div className="w-8 h-8 border-3 border-yellow-400 border-t-transparent rounded-full animate-spin"></div>
      <p className="mt-3 text-xs text-gray-400 font-medium tracking-wide">Loading page...</p>
    </div>
  );
}

// Legacy route redirect component (e.g. /StandardCardDetails -> /product/standard-card)
function LegacyRouteRedirect({ targetSlug }) {
  return <Navigate to={`/product/${targetSlug}`} replace />;
}

function StorefrontLayout({ children }) {
  return (
    <>
      <ScrollToTop />
      <Header />
      <div className="block lg:hidden px-4 py-2 bg-black">
        <Search />
      </div>
      <main className="min-h-[70vh] pb-16 lg:pb-0">{children}</main>
      <FooterCom />
      <Whatsapp />
      <CartDrawer />
      <MobileBottomNav />
    </>
  );
}

function App() {
  const location = useLocation();
  const path = location.pathname;

  // Dynamic Document Title
  if (path === "/") {
    document.title = "Print Bazzar | Online Custom Printing & Graphic Design";
  } else if (path === "/shop") {
    document.title = "Print Catalogue & Categories | Print Bazzar";
  } else if (path.startsWith("/product/")) {
    document.title = "Customize & Order | Print Bazzar";
  } else if (path === "/cart") {
    document.title = "Shopping Cart | Print Bazzar";
  } else if (path === "/checkout") {
    document.title = "Secure Checkout | Print Bazzar";
  } else if (path.startsWith("/admin")) {
    document.title = "Print Bazzar Admin Control Panel";
  }

  const legacyRouteList = [
    { path: "/StandardCardDetails", target: "standard-card" },
    { path: "/LaminatedCardDetails", target: "laminated-card" },
    { path: "/EconomicalCardDetails", target: "economical-card" },
    { path: "/TexturedCardDetails", target: "textured-card" },
    { path: "/SquareCardDetails", target: "square-card" },
    { path: "/MetallicCardDetails", target: "metallic-card" },
    { path: "/FoilCardDetails", target: "foil-card" },
    { path: "/RaisedUVCardDetails", target: "raised-uv-card" },
    { path: "/SpotUVCardDetails", target: "spot-uv-card" },
    { path: "/SyntheticCardDetails", target: "synthetic-card" },
    { path: "/BulkSyntheticCardDetails", target: "bulk-synthetic-card" },
    { path: "/PremiumSpotUVCardDetails", target: "premium-spot-uv-card" },
    { path: "/DieCuttingCardDetails", target: "die-cutting-card" },
    { path: "/TranslucentCardDetails", target: "translucent-card" },
    { path: "/PerfumedCardDetails", target: "perfumed-card" },
    { path: "/PlantablePaperCardDetails", target: "plantable-paper-card" },
    { path: "/LetterHeadDetails", target: "letter-head" },
    { path: "/BillBookDetails", target: "bill-book" },
    { path: "/BannersDetails", target: "banners" },
    { path: "/CircleStickersDetails", target: "circle-stickers" },
    { path: "/CustomShapeStickersDetails", target: "custom-shape-stickers" },
    { path: "/CustomShapeStickers", target: "custom-shape-stickers" },
    { path: "/A4MultiColorFlyersDetails", target: "a4-multi-color-flyers" },
    { path: "/RollupStandeeDetails", target: "rollup-standee" },
    { path: "/IDCardDetails", target: "id-card" },
    { path: "/IDCardsSetDetails", target: "id-cards-set" },
    { path: "/LanyardsDetails", target: "lanyards" },
    { path: "/StandardCertificatesDetails", target: "standard-certificates" },
    { path: "/PremiumCertificatesDetails", target: "premium-certificates" },
    { path: "/WeddingInvitationDetails", target: "wedding-invitation" },
    { path: "/BirthdayInvitationDetails", target: "birthday-invitation" },
    { path: "/BusinessInvitationDetails", target: "business-invitation" },
  ];

  return (
    <BusinessInfoProvider>
      <CustomerAuthProvider>
        <AuthProvider>
          <CartProvider>
            <Suspense fallback={<RouteLoadingFallback />}>
              <Routes>
            {/* ========================================== */}
            {/* ADMIN PORTAL ROUTES */}
            {/* ========================================== */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/dashboard" replace />} />
              <Route path="dashboard" element={<AdminDashboard />} />
              <Route path="pos" element={<AdminPOS />} />
              <Route path="front-office" element={<AdminFrontOfficeDashboard />} />
              <Route path="workflow" element={<AdminWorkflowBoard />} />
              <Route path="queue" element={<StaffQueue />} />
              <Route path="staff" element={<AdminStaffManagement />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="pricing" element={<AdminPriceManagement />} />
              <Route path="design-services" element={<AdminDesignServices />} />
              <Route path="design-packages" element={<AdminDesignServices />} />
              <Route path="products/new" element={<AdminProductEditor />} />
              <Route path="products/edit/:id" element={<AdminProductEditor />} />
              <Route path="products/:id/configuration" element={<AdminProductConfigurator />} />
              <Route path="options-master" element={<AdminOptionMasterManager />} />
              <Route path="categories" element={<AdminCategories />} />
              <Route path="banners" element={<AdminBanners />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="orders/:id" element={<AdminOrderDetail />} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="footer-settings" element={<AdminFooterSettings />} />
              <Route path="business-settings" element={<AdminBusinessSettings />} />
              <Route path="audit-logs" element={<AdminAuditLogs />} />
            </Route>
          <Route path="/staff/queue" element={<StaffQueue />} />
          <Route path="/front-office" element={<Navigate to="/admin/front-office" replace />} />
          <Route path="/front-office/orders/new" element={<Navigate to="/admin/pos" replace />} />

          {/* ========================================== */}
          {/* CUSTOMER & CORPORATE PORTAL ROUTES */}
          {/* ========================================== */}
          <Route
            path="/account/login"
            element={
              <StorefrontLayout>
                <CustomerLogin />
              </StorefrontLayout>
            }
          />
          <Route
            path="/account/signup"
            element={
              <StorefrontLayout>
                <CustomerSignup />
              </StorefrontLayout>
            }
          />
          <Route
            path="/account/dashboard"
            element={
              <StorefrontLayout>
                <CustomerDashboard />
              </StorefrontLayout>
            }
          />
          <Route
            path="/account/orders"
            element={
              <StorefrontLayout>
                <CustomerDashboard />
              </StorefrontLayout>
            }
          />

          {/* ========================================== */}
          {/* STOREFRONT ROUTES */}
          {/* ========================================== */}
          <Route
            path="/"
            element={
              <StorefrontLayout>
                <Home />
              </StorefrontLayout>
            }
          />
          <Route
            path="/shop"
            element={
              <StorefrontLayout>
                <Shop />
              </StorefrontLayout>
            }
          />
          <Route
            path="/products"
            element={
              <StorefrontLayout>
                <Shop />
              </StorefrontLayout>
            }
          />
          <Route
            path="/category/:categoryName"
            element={
              <StorefrontLayout>
                <Category />
              </StorefrontLayout>
            }
          />
          <Route
            path="/product/:slug"
            element={
              <StorefrontLayout>
                <ProductDetail />
              </StorefrontLayout>
            }
          />
          <Route
            path="/cart"
            element={
              <StorefrontLayout>
                <Cart />
              </StorefrontLayout>
            }
          />
          <Route
            path="/checkout"
            element={
              <StorefrontLayout>
                <Checkout />
              </StorefrontLayout>
            }
          />
          <Route
            path="/order-confirmation/:orderNumber"
            element={
              <StorefrontLayout>
                <OrderConfirmation />
              </StorefrontLayout>
            }
          />
          <Route
            path="/invoice/:orderId"
            element={<InvoiceView />}
          />
          <Route
            path="/track-order"
            element={
              <StorefrontLayout>
                <TrackOrder />
              </StorefrontLayout>
            }
          />
          <Route
            path="/track-order/:orderIdentifier"
            element={
              <StorefrontLayout>
                <TrackOrder />
              </StorefrontLayout>
            }
          />
          <Route
            path="/about-us"
            element={
              <StorefrontLayout>
                <AboutUs />
              </StorefrontLayout>
            }
          />
          <Route
            path="/contact-us"
            element={
              <StorefrontLayout>
                <Contact />
              </StorefrontLayout>
            }
          />
          <Route
            path="/terms"
            element={
              <StorefrontLayout>
                <PolicyPage />
              </StorefrontLayout>
            }
          />
          <Route
            path="/privacy"
            element={
              <StorefrontLayout>
                <PolicyPage />
              </StorefrontLayout>
            }
          />
          <Route
            path="/shipping-policy"
            element={
              <StorefrontLayout>
                <PolicyPage />
              </StorefrontLayout>
            }
          />
          <Route
            path="/refund-policy"
            element={
              <StorefrontLayout>
                <PolicyPage />
              </StorefrontLayout>
            }
          />
          <Route
            path="/cancellation-policy"
            element={
              <StorefrontLayout>
                <PolicyPage />
              </StorefrontLayout>
            }
          />
          <Route
            path="/cookie-policy"
            element={
              <StorefrontLayout>
                <PolicyPage />
              </StorefrontLayout>
            }
          />
          <Route
            path="/policy/:slug"
            element={
              <StorefrontLayout>
                <PolicyPage />
              </StorefrontLayout>
            }
          />
          <Route
            path="/quote"
            element={
              <StorefrontLayout>
                <QuoteRequestPage />
              </StorefrontLayout>
            }
          />

          {/* Legacy Routes Redirects */}
          {legacyRouteList.map((leg, idx) => (
            <Route
              key={idx}
              path={leg.path}
              element={<LegacyRouteRedirect targetSlug={leg.target} />}
            />
          ))}

          {/* Catch-all dynamic product or 404 */}
          <Route
            path="/:legacySlug"
            element={
              <StorefrontLayout>
                <LegacyCatchAll />
              </StorefrontLayout>
            }
          />
          <Route
            path="*"
            element={
              <StorefrontLayout>
                <Missing />
              </StorefrontLayout>
            }
          />
          </Routes>
        </Suspense>
      </CartProvider>
        </AuthProvider>
      </CustomerAuthProvider>
    </BusinessInfoProvider>
  );
}

// Fallback helper for legacy CamelCase details URLs e.g. /ViboothiCoverSingleColorDetails
function LegacyCatchAll() {
  const { legacySlug } = useParams();
  if (legacySlug && legacySlug.toLowerCase().endsWith("details")) {
    const slug = legacySlug
      .replace(/Details$/i, "")
      .replace(/([a-z0-9])([A-Z])/g, "$1-$2")
      .toLowerCase();
    return <Navigate to={`/product/${slug}`} replace />;
  }
  return <Missing />;
}

export default App;
