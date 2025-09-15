import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuthStore } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  CheckCircle, 
  QrCode, 
  Users, 
  Shield, 
  BarChart3, 
  Smartphone,
  Clock,
  Mail,
  Phone,
  MapPin,
  ArrowRight,
  Star,
  Zap,
  Target,
  Globe,
  Menu,
  X,
  Search,
  CreditCard,
  Ticket,
  Building
} from "lucide-react";
import ChatbotComponent from "@/components/chatbot";
import { EventImage } from "@/lib/event-utils";
// Logo image placed in public folder for proper asset handling
import mobileQRImage from "@assets/generated_images/Mobile_QR_scanning_interface_b03c5eb3.png";
import eventCheckinImage from "@assets/generated_images/Event_check-in_QR_scanning_f73d3b61.png";
import dashboardImage from "@assets/generated_images/Admin_dashboard_interface_90c21f99.png";
import conferenceVenueImage from "@assets/generated_images/Conference_venue_with_audience_a8e74952.png";
import mohammedHeadshot from "@assets/generated_images/Mohammed_Rahman_professional_headshot_7e78c2ea.png";
import aishaHeadshot from "@assets/generated_images/Aisha_Johnson_professional_headshot_6238ff87.png";
import davidHeadshot from "@assets/generated_images/David_Martinez_professional_headshot_7b3465b9.png";
import animationFrame1 from "@assets/generated_images/EventValidate_scanning_animation_frame_1_4738734f.png";
import animationFrame2 from "@assets/generated_images/EventValidate_scanning_animation_frame_2_788d3c55.png";
import animationFrame3 from "@assets/generated_images/EventValidate_scanning_animation_frame_3_480faa8e.png";

export function LandingPage() {
  const [activeTab, setActiveTab] = useState("features");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [ticketId, setTicketId] = useState("");
  const [foundTicket, setFoundTicket] = useState<any>(null);
  const [foundEvent, setFoundEvent] = useState<any>(null);
  const [ticketSearchLoading, setTicketSearchLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [publicEvents, setPublicEvents] = useState<any[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [currentAnimationFrame, setCurrentAnimationFrame] = useState(0);
  const { isAuthenticated, checkAuth } = useAuthStore();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
    fetchPublicEvents();
  }, [checkAuth]);

  // Animation cycle for demo frames
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentAnimationFrame((prev) => (prev + 1) % 3);
    }, 5000); // Change frame every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchPublicEvents = async () => {
    setEventsLoading(true);
    try {
      const response = await fetch('/api/events/public');
      if (response.ok) {
        const events = await response.json();
        // Filter to show ongoing and upcoming events (exclude only past events)
        const currentDate = new Date();
        const activeEvents = events
          .filter((event: any) => {
            const startDate = new Date(event.startDate);
            const endDate = event.endDate ? new Date(event.endDate) : new Date(startDate.getTime() + (24 * 60 * 60 * 1000)); // Default to 1 day if no end date
            // Show if event is ongoing (started but not ended) or upcoming
            return endDate > currentDate;
          })
          .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
          .slice(0, 6); // Show max 6 events
        setPublicEvents(activeEvents);
      }
    } catch (error) {
      console.error('Error fetching public events:', error);
    } finally {
      setEventsLoading(false);
    }
  };

  const handleFindTicket = async () => {
    if (!ticketId.trim()) {
      toast({
        title: "Ticket ID Required",
        description: "Please enter your ticket ID to search",
        variant: "destructive",
      });
      return;
    }

    setTicketSearchLoading(true);
    try {
      // Get ticket details
      const ticketResponse = await fetch(`/api/tickets/${ticketId.trim()}`);
      
      if (!ticketResponse.ok) {
        throw new Error("Ticket not found");
      }

      const ticket = await ticketResponse.json();
      
      // Get event details
      const eventResponse = await fetch(`/api/events/${ticket.eventId}/public`);
      const event = eventResponse.ok ? await eventResponse.json() : null;

      setFoundTicket(ticket);
      setFoundEvent(event);

    } catch (error) {
      toast({
        title: "Ticket Not Found",
        description: "Please check your ticket ID and try again",
        variant: "destructive",
      });
      setFoundTicket(null);
      setFoundEvent(null);
    } finally {
      setTicketSearchLoading(false);
    }
  };

  const handlePayNow = async () => {
    if (!foundTicket) return;

    // Check if ticket is already paid
    if (foundTicket.paymentStatus === 'paid') {
      toast({
        title: "Ticket Already Paid",
        description: "This ticket has already been paid for",
      });
      return;
    }

    setPaymentLoading(true);
    try {
      // Initialize payment with Paystack
      const response = await fetch('/api/tickets/initialize-payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ticketId: foundTicket.id,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to initialize payment');
      }

      const data = await response.json();
      
      if (data.authorization_url) {
        // Redirect to Paystack
        window.location.href = data.authorization_url;
      } else {
        throw new Error('Payment initialization failed');
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast({
        title: "Payment Error",
        description: "Failed to initialize payment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setPaymentLoading(false);
    }
  };

  const resetSearch = () => {
    setFoundTicket(null);
    setFoundEvent(null);
    setTicketId("");
  };

  const features = [
    {
      icon: <QrCode className="h-6 w-6" />,
      title: "QR Code Management",
      description: "Generate secure QR codes for events with encrypted validation and real-time scanning capabilities."
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Member Validation",
      description: "Comprehensive member database with auxiliary body classification and multi-tier verification system."
    },
    {
      icon: <Shield className="h-6 w-6" />,
      title: "AI-Powered Security",
      description: "Advanced validation using face recognition, CSV verification, and encrypted data transmission."
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      title: "Real-time Analytics",
      description: "Live attendance tracking, validation statistics, and comprehensive event reporting dashboard."
    },
    {
      icon: <Smartphone className="h-6 w-6" />,
      title: "Mobile Responsive",
      description: "Fully optimized for mobile devices with intuitive scanner interface and offline capabilities."
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: "Multi-Event Support",
      description: "Manage multiple events simultaneously with role-based access control and guest management."
    }
  ];

  const benefits = [
    {
      title: "Reduce Event Check-in Time",
      description: "Cut registration time by 80% with instant QR code validation",
      metric: "80% faster"
    },
    {
      title: "Eliminate Fraud",
      description: "Multi-layered security prevents unauthorized access and duplicate entries",
      metric: "99.9% secure"
    },
    {
      title: "Real-time Insights",
      description: "Live attendance data and analytics for immediate decision making",
      metric: "Live data"
    },
    {
      title: "Cost Effective",
      description: "Reduce staffing costs and eliminate paper-based registration systems",
      metric: "50% savings"
    }
  ];

  const pricingPlans = [
    {
      name: "Event Rental",
      price: "$50",
      period: "per event",
      description: "Perfect for single events and conferences",
      features: [
        "Up to 1,000 attendees",
        "QR code generation & validation",
        "Real-time analytics dashboard",
        "Mobile scanner app",
        "24/7 event support",
        "Custom branding"
      ],
      popular: false
    },
    {
      name: "Monthly License",
      price: "$150",
      period: "per month",
      description: "Ideal for organizations with regular events",
      features: [
        "Unlimited attendees",
        "Multiple concurrent events",
        "Advanced analytics & reporting",
        "Face recognition features",
        "CSV member validation",
        "API access",
        "Priority support",
        "Custom integrations"
      ],
      popular: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "contact us",
      description: "For large organizations with specific needs",
      features: [
        "Everything in Monthly License",
        "On-premise deployment option",
        "Custom feature development",
        "Dedicated support team",
        "SLA guarantees",
        "Training & onboarding",
        "Multi-tenant architecture"
      ],
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Navigation */}
      <nav className="bg-white/90 backdrop-blur-sm shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16 w-full">
            <Link href="/">
              <div className="flex items-center cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0">
                <img src="/logo.png" alt="Eventify AI Logo" className="h-8 w-auto" />
                <span className="ml-2 text-lg sm:text-xl font-bold text-gray-900 whitespace-nowrap">Eventify AI</span>
              </div>
            </Link>
            <div className="hidden md:flex items-center space-x-4 lg:space-x-6 ml-auto">
              <Link href="/about">
                <span className="text-sm lg:text-base text-gray-600 hover:text-gray-900 transition-colors cursor-pointer whitespace-nowrap">About</span>
              </Link>
              <Link href="/documentation">
                <span className="text-sm lg:text-base text-gray-600 hover:text-gray-900 transition-colors cursor-pointer whitespace-nowrap">Documentation</span>
              </Link>
              <a href="#events" className="text-sm lg:text-base text-gray-600 hover:text-gray-900 transition-colors whitespace-nowrap">Events</a>
              <a href="#features" className="text-sm lg:text-base text-gray-600 hover:text-gray-900 transition-colors whitespace-nowrap">Features</a>
              <a href="#pricing" className="text-sm lg:text-base text-gray-600 hover:text-gray-900 transition-colors whitespace-nowrap">Pricing</a>
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button size="sm" className="whitespace-nowrap">Dashboard</Button>
                </Link>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link href="/login">
                    <Button variant="outline" size="sm" className="whitespace-nowrap">Login</Button>
                  </Link>
                  <Link href="/organization-register">
                    <Button size="sm" className="whitespace-nowrap" data-testid="button-signup">Sign Up</Button>
                  </Link>
                </div>
              )}
            </div>
            
            {/* Mobile menu button */}
            <div className="md:hidden">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              >
                {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Mobile navigation menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 bg-white/95 backdrop-blur-sm">
            <div className="px-4 py-3 space-y-3">
              <Link href="/about">
                <span 
                  className="block text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  About
                </span>
              </Link>
              <Link href="/documentation">
                <span 
                  className="block text-gray-600 hover:text-gray-900 transition-colors cursor-pointer"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Documentation
                </span>
              </Link>
              <a 
                href="#events" 
                className="block text-gray-600 hover:text-gray-900 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Events
              </a>
              <a 
                href="#features" 
                className="block text-gray-600 hover:text-gray-900 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Features
              </a>
              <a 
                href="#pricing" 
                className="block text-gray-600 hover:text-gray-900 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Pricing
              </a>
              <div className="pt-2 border-t border-gray-200 space-y-2">
                {isAuthenticated ? (
                  <Link href="/dashboard">
                    <Button size="sm" className="w-full" onClick={() => setIsMobileMenuOpen(false)}>
                      Dashboard
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/login">
                      <Button variant="outline" size="sm" className="w-full" onClick={() => setIsMobileMenuOpen(false)}>
                        Login
                      </Button>
                    </Link>
                    <Link href="/organization-register">
                      <Button size="sm" className="w-full" onClick={() => setIsMobileMenuOpen(false)} data-testid="button-signup-mobile">
                        Sign Up
                      </Button>
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative py-24 px-4 sm:px-6 lg:px-8 overflow-hidden">
        <div className="absolute inset-0 hero-gradient opacity-5"></div>
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <Badge className="mb-6 bg-blue-100 text-blue-800 border-blue-200 px-4 py-2 text-sm font-medium">
            <Zap className="h-4 w-4 mr-2" />
            AI-Powered Event Validation Platform
          </Badge>
          <h1 className="hero-text text-4xl md:text-6xl lg:text-7xl font-bold text-high-contrast mb-8 leading-tight">
            Stop Event Fraud.
            <span className="text-gradient block mt-2">Start Smart Validation.</span>
          </h1>
          <p className="hero-subtitle text-xl md:text-2xl text-medium-contrast mb-8 max-w-4xl mx-auto leading-relaxed">
            Eventify AI eliminates unauthorized event access with AI-powered QR validation, 
            real-time attendance tracking, and comprehensive member verification for organizations.
          </p>

          {/* Mission & Objectives */}
          <div className="mb-12 bg-white/80 backdrop-blur-sm rounded-2xl p-6 max-w-5xl mx-auto border border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-center">
              <div className="space-y-2">
                <div className="mx-auto w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg">Our Mission</h3>
                <p className="text-sm text-gray-600">Empower African organizations with intelligent, secure event management solutions</p>
              </div>
              <div className="space-y-2">
                <div className="mx-auto w-12 h-12 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center">
                  <Globe className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg">Our Vision</h3>
                <p className="text-sm text-gray-600">Become Africa's leading event technology platform with global standards</p>
              </div>
              <div className="space-y-2">
                <div className="mx-auto w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <h3 className="font-bold text-gray-900 text-lg">Our Goal</h3>
                <p className="text-sm text-gray-600">Serve 10,000+ organizations with 99.9% platform reliability by 2027</p>
              </div>
            </div>
          </div>
          
          {/* Clear Value Proposition */}
          <div className="mb-12 bg-white/80 backdrop-blur-sm rounded-2xl p-8 max-w-4xl mx-auto border border-gray-200">
            <h2 className="text-2xl font-bold text-high-contrast mb-4">Perfect for:</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
              <div className="flex items-start space-x-3">
                <div className="bg-blue-100 rounded-full p-2 mt-1">
                  <Users className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-high-contrast">Religious Organizations</h3>
                  <p className="text-medium-contrast text-sm">Secure member validation for events and gatherings</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-green-100 rounded-full p-2 mt-1">
                  <Shield className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-high-contrast">Corporate Events</h3>
                  <p className="text-medium-contrast text-sm">Professional conferences and company meetings</p>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <div className="bg-purple-100 rounded-full p-2 mt-1">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-high-contrast">Educational Institutions</h3>
                  <p className="text-medium-contrast text-sm">Student events and academic conferences</p>
                </div>
              </div>
            </div>
          </div>

          {/* Animated System Demo */}
          <div className="mb-16 bg-gradient-to-br from-blue-50 to-purple-50 p-8 rounded-3xl">
            <div className="text-center mb-8">
              <Badge className="mb-4 bg-blue-100 text-blue-800 border-blue-200">
                <Star className="h-4 w-4 mr-2" />
                Live System Demo
              </Badge>
              <h3 className="text-4xl font-bold text-high-contrast mb-4">See Eventify AI in Action</h3>
              <p className="text-xl text-medium-contrast max-w-3xl mx-auto leading-relaxed">
                Watch how attendees scan QR codes and admins see real-time updates instantly
              </p>
            </div>
            <div className="relative bg-white rounded-3xl p-8 border-2 border-blue-200 shadow-2xl max-w-6xl mx-auto">
              <div className="relative overflow-hidden rounded-2xl bg-gray-100 min-h-[400px] flex items-center justify-center">
                <img 
                  src={[animationFrame1, animationFrame2, animationFrame3][currentAnimationFrame]} 
                  alt={[
                    "1. Attendee scans QR code at entrance",
                    "2. System validates and grants access", 
                    "3. Admin dashboard updates in real-time"
                  ][currentAnimationFrame]}
                  className="w-full h-auto transition-all duration-1000 transform"
                  style={{ maxHeight: '400px', objectFit: 'contain' }}
                />
                
                {/* Fallback content if images don't load */}
                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600 text-white text-2xl font-bold opacity-20">
                  Eventify AI Demo - Frame {currentAnimationFrame + 1}
                </div>
                
                <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/90 text-white px-8 py-4 rounded-full shadow-lg">
                  <p className="text-base font-medium">
                    {[
                      "🔍 Step 1: Attendee scans QR code at entrance",
                      "✅ Step 2: System validates and grants access", 
                      "📊 Step 3: Admin dashboard updates in real-time"
                    ][currentAnimationFrame]}
                  </p>
                </div>
                
                <div className="absolute top-6 right-6 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-full text-base font-bold animate-pulse shadow-lg">
                  ▶ Live Demo - Frame {currentAnimationFrame + 1}/3
                </div>
              </div>
              
              <div className="flex justify-center mt-8 space-x-3">
                {[0, 1, 2].map((index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentAnimationFrame(index)}
                    className={`w-4 h-4 rounded-full transition-all duration-300 ${
                      currentAnimationFrame === index 
                        ? 'bg-blue-600 scale-125 shadow-lg' 
                        : 'bg-gray-300 hover:bg-gray-400 cursor-pointer'
                    }`}
                  />
                ))}
              </div>
              
              <div className="text-center mt-6">
                <p className="text-sm text-gray-600 font-medium">
                  🔄 Animation cycles every 5 seconds • Click dots to view specific steps
                </p>
              </div>
            </div>
          </div>

          {/* Product Visual Showcase */}
          <div className="flex flex-col lg:flex-row items-center gap-12 mb-12">
            <div className="lg:w-1/2 text-left">
              <h3 className="text-2xl font-bold text-high-contrast mb-4">Mobile-First QR Validation</h3>
              <p className="text-lg text-medium-contrast mb-6 leading-relaxed">
                Your attendees simply scan QR codes with their mobile devices for instant, secure event registration. 
                Our AI-powered validation ensures only authorized members can access your events.
              </p>
              <div className="space-y-3 text-medium-contrast">
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                  <span>Instant QR code scanning and validation</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                  <span>Works on any smartphone or tablet</span>
                </div>
                <div className="flex items-center">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-3" />
                  <span>Real-time fraud detection and prevention</span>
                </div>
              </div>
            </div>
            <div className="lg:w-1/2 flex justify-center">
              <div className="relative">
                <img 
                  src={mobileQRImage} 
                  alt="Mobile QR scanning interface" 
                  className="w-80 h-auto rounded-2xl shadow-2xl transform hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute -top-4 -right-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-semibold animate-pulse">
                  Mobile App
                </div>
              </div>
            </div>
          </div>

          {/* Primary CTA - Optimized for Conversion */}
          <div className="text-center mb-8">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold px-12 py-5 text-xl rounded-full shadow-2xl transform hover:scale-105 transition-all duration-300 mb-4"
              onClick={() => window.open(`mailto:admin@eventifyai.com?subject=Eventify AI Free Demo Request&body=Hello,%0D%0A%0D%0AI would like to request a free demo of Eventify AI for my organization.%0D%0A%0D%0AOrganization Details:%0D%0A- Organization Name:%0D%0A- Expected number of attendees:%0D%0A- Event type:%0D%0A- Preferred demo date/time:%0D%0A%0D%0AThank you!`, '_blank')}
            >
              <Target className="h-6 w-6 mr-3" />
              Get Free Demo - Start Securing Your Events
            </Button>
            
            {/* Secondary Actions */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mt-4">
              <button
                onClick={() => window.open('https://wa.me/2348107183206?text=Hi! I would like to schedule a call to discuss Eventify AI for my organization.', '_blank')}
                className="text-blue-600 hover:text-blue-800 font-medium underline decoration-2 underline-offset-4 hover:decoration-blue-800 transition-colors flex items-center"
              >
                <Phone className="h-4 w-4 mr-2" />
                Schedule Call
              </button>
              <span className="text-gray-400 hidden sm:block">•</span>
              <button
                onClick={() => window.location.href = '/organization-register'}
                className="text-green-600 hover:text-green-800 font-medium underline decoration-2 underline-offset-4 hover:decoration-green-800 transition-colors flex items-center"
              >
                <Building className="h-4 w-4 mr-2" />
                Register Organization
              </button>
            </div>
            
            {/* Security Reassurance */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600 flex items-center justify-center">
                <Shield className="h-4 w-4 mr-2 text-green-600" />
                All data encrypted and GDPR-compliant • Enterprise-grade security
              </p>
            </div>
          </div>

          {/* Quick Access */}
          <div className="mb-12">
            <p className="text-medium-contrast mb-4 text-lg">Already have an event registration? Find your QR code:</p>
            <Link href="/guest-lookup">
              <Button variant="outline" size="lg" className="btn-secondary text-white font-semibold px-6 py-3 focus-visible:focus">
                <Search className="h-5 w-5 mr-2" />
                Find My Registration
              </Button>
            </Link>
          </div>

          {/* Social Proof */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div className="fade-in">
              <div className="text-4xl font-bold text-blue-600 mb-2">99.9%</div>
              <div className="text-medium-contrast font-medium">Security Rate</div>
            </div>
            <div className="fade-in">
              <div className="text-4xl font-bold text-green-600 mb-2">80%</div>
              <div className="text-medium-contrast font-medium">Faster Check-in</div>
            </div>
            <div className="fade-in">
              <div className="text-4xl font-bold text-purple-600 mb-2">500+</div>
              <div className="text-medium-contrast font-medium">Events Powered</div>
            </div>
            <div className="fade-in">
              <div className="text-4xl font-bold text-orange-600 mb-2">50K+</div>
              <div className="text-medium-contrast font-medium">Attendees Validated</div>
            </div>
          </div>

          {/* Social Proof - Trusted Organizations */}
          <div className="mt-16 pt-8 border-t border-gray-200">
            <p className="text-medium-contrast mb-6 text-lg font-medium">Trusted by 500+ organizations worldwide</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
              <div className="bg-white rounded-xl shadow-md border border-gray-200 px-6 py-4 text-center hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Building className="h-6 w-6 text-blue-600" />
                </div>
                <span className="text-gray-800 font-semibold text-sm">Religious Organizations</span>
                <p className="text-xs text-gray-600 mt-1">150+ Communities</p>
              </div>
              <div className="bg-white rounded-xl shadow-md border border-gray-200 px-6 py-4 text-center hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Shield className="h-6 w-6 text-green-600" />
                </div>
                <span className="text-gray-800 font-semibold text-sm">Corporate Events</span>
                <p className="text-xs text-gray-600 mt-1">200+ Companies</p>
              </div>
              <div className="bg-white rounded-xl shadow-md border border-gray-200 px-6 py-4 text-center hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="h-6 w-6 text-purple-600" />
                </div>
                <span className="text-gray-800 font-semibold text-sm">Educational Institutions</span>
                <p className="text-xs text-gray-600 mt-1">100+ Schools</p>
              </div>
              <div className="bg-white rounded-xl shadow-md border border-gray-200 px-6 py-4 text-center hover:shadow-lg transition-shadow">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="h-6 w-6 text-orange-600" />
                </div>
                <span className="text-gray-800 font-semibold text-sm">Non-Profits</span>
                <p className="text-xs text-gray-600 mt-1">50+ Organizations</p>
              </div>
            </div>
            
            {/* Key Achievement Badges */}
            <div className="flex flex-wrap justify-center gap-4">
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-medium">
                ✅ ISO 27001 Compliant
              </div>
              <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-full text-sm font-medium">
                🔒 GDPR Certified
              </div>
              <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-full text-sm font-medium">
                ⚡ 99.9% Uptime
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Public Events Section */}
      <section id="events" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-emerald-100 text-emerald-800 border-emerald-200">
              <Ticket className="h-4 w-4 mr-2" />
              Active & Upcoming Events
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-high-contrast mb-6">
              Join Live & Upcoming
              <span className="text-gradient block mt-2">Events</span>
            </h2>
            <p className="text-xl text-medium-contrast max-w-3xl mx-auto leading-relaxed">
              Discover ongoing and upcoming events powered by Eventify AI. 
              Experience secure, seamless event registration and validation.
            </p>
          </div>

          {eventsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[...Array(6)].map((_, index) => (
                <Card key={index} className="animate-pulse">
                  <div className="h-48 bg-gray-200 rounded-t-lg"></div>
                  <CardContent className="p-6">
                    <div className="h-6 bg-gray-200 rounded mb-3"></div>
                    <div className="h-4 bg-gray-200 rounded mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded mb-4 w-2/3"></div>
                    <div className="h-10 bg-gray-200 rounded"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : publicEvents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {publicEvents.map((event, index) => (
                <Card 
                  key={event.id} 
                  className="group event-card-hover hover:shadow-2xl hover:-translate-y-2 transition-all duration-300 border-0 shadow-lg bg-white overflow-hidden cursor-pointer transform hover:scale-[1.02] hover:border-blue-200 animate-in fade-in slide-in-from-bottom-4 duration-500"
                  style={{ animationDelay: `${index * 150}ms` }}
                >
                  <div className="relative h-48 overflow-hidden">
                    <EventImage 
                      event={event} 
                      className="w-full h-full object-cover group-hover:scale-110 group-hover:brightness-110 transition-all duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                    <div className="absolute top-4 right-4 space-y-2">
                      {(() => {
                        const now = new Date();
                        const startDate = new Date(event.startDate);
                        const endDate = event.endDate ? new Date(event.endDate) : new Date(startDate.getTime() + (24 * 60 * 60 * 1000));
                        
                        if (now >= startDate && now <= endDate) {
                          return (
                            <Badge className="bg-green-500/90 text-white border-0 animate-pulse">
                              Live Now
                            </Badge>
                          );
                        } else {
                          return (
                            <Badge className="bg-blue-500/90 text-white border-0">
                              Upcoming
                            </Badge>
                          );
                        }
                      })()}
                      <Badge className="bg-white/90 text-gray-800 border-0 block">
                        {event.eventType === 'ticket' ? 'Ticketed' : 'Registration'}
                      </Badge>
                    </div>
                  </div>
                  <CardContent className="p-6 group-hover:bg-gradient-to-br group-hover:from-blue-50 group-hover:to-purple-50 transition-all duration-300">
                    <h3 className="text-xl font-bold text-high-contrast mb-3 group-hover:text-blue-600 group-hover:scale-105 transform transition-all duration-300">
                      {event.name}
                    </h3>
                    {event.description && (
                      <p className="text-medium-contrast text-sm mb-4 line-clamp-2">
                        {event.description}
                      </p>
                    )}
                    <div className="space-y-2 mb-4">
                      <div className="flex items-center text-sm text-gray-600 group-hover:text-blue-700 transition-colors duration-300">
                        <MapPin className="h-4 w-4 mr-2 text-gray-400 group-hover:text-blue-500 group-hover:scale-110 transition-all duration-300" />
                        {event.location}
                      </div>
                      <div className="flex items-center text-sm text-gray-600 group-hover:text-blue-700 transition-colors duration-300">
                        <Clock className="h-4 w-4 mr-2 text-gray-400 group-hover:text-blue-500 group-hover:scale-110 transition-all duration-300" />
                        {new Date(event.startDate).toLocaleDateString('en-US', {
                          weekday: 'short',
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                    </div>
                    <Button 
                      className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold transform group-hover:scale-105 group-hover:shadow-lg transition-all duration-300"
                      onClick={() => window.location.href = `/event-view/${event.id}`}
                    >
                      <ArrowRight className="h-4 w-4 mr-2 group-hover:translate-x-1 transition-transform duration-300" />
                      View Details & Register
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="bg-gray-100 rounded-full p-8 w-24 h-24 mx-auto mb-6 flex items-center justify-center">
                <Ticket className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-600 mb-2">No Upcoming Events</h3>
              <p className="text-gray-500 mb-6">Check back soon for exciting new events!</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  size="lg"
                  className="btn-primary text-white font-semibold px-8 py-4 text-lg"
                  onClick={() => window.location.href = '/events'}
                >
                  View All Events
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="border-2 font-semibold px-8 py-4 text-lg"
                  onClick={() => window.open(`mailto:admin@eventifyai.com?subject=Eventify AI Event Inquiry&body=Hello,%0D%0A%0D%0AI would like to inquire about upcoming events on Eventify AI.%0D%0A%0D%0AThank you!`, '_blank')}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Get Notified of New Events
                </Button>
              </div>
            </div>
          )}

          <div className="text-center mt-12">
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {publicEvents.length > 0 && (
                <Button 
                  size="lg"
                  className="btn-primary text-white font-semibold px-8 py-4 text-lg"
                  onClick={() => window.location.href = '/events'}
                >
                  View All Events
                  <ArrowRight className="h-5 w-5 ml-2" />
                </Button>
              )}
              <Button 
                variant="outline"
                size="lg"
                className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold px-8 py-4 text-lg"
                onClick={() => window.open(`mailto:admin@eventifyai.com?subject=Eventify AI Free Demo Request&body=Hello,%0D%0A%0D%0AI would like to request a free demo of Eventify AI for my organization.%0D%0A%0D%0AOrganization Details:%0D%0A- Organization Name:%0D%0A- Expected number of attendees:%0D%0A- Event type:%0D%0A- Preferred demo date/time:%0D%0A%0D%0AThank you!`, '_blank')}
              >
                <Target className="h-5 w-5 mr-2" />
                Get Free Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <Badge className="mb-4 bg-blue-100 text-blue-800 border-blue-200">
              <Shield className="h-4 w-4 mr-2" />
              Advanced Security Features
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-high-contrast mb-6">
              Everything You Need for
              <span className="text-gradient block mt-2">Secure Event Management</span>
            </h2>
            <p className="text-xl text-medium-contrast max-w-3xl mx-auto leading-relaxed">
              From QR code generation to real-time analytics, Eventify AI provides comprehensive tools 
              that ensure your events are secure, efficient, and professionally managed.
            </p>
          </div>
          {/* Dashboard Preview */}
          <div className="mb-16 bg-white/90 backdrop-blur-sm rounded-3xl p-8 border border-gray-200">
            <div className="text-center mb-8">
              <h3 className="text-3xl font-bold text-high-contrast mb-4">Powerful Admin Dashboard</h3>
              <p className="text-lg text-medium-contrast max-w-2xl mx-auto">
                Get real-time insights, manage events, and track attendance with our comprehensive admin interface
              </p>
            </div>
            <div className="relative max-w-5xl mx-auto">
              <img 
                src={dashboardImage} 
                alt="Eventify AI admin dashboard interface" 
                className="w-full rounded-2xl shadow-2xl border border-gray-200"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent rounded-2xl"></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
              <div className="text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <BarChart3 className="h-6 w-6 text-blue-600" />
                </div>
                <h4 className="font-semibold text-high-contrast mb-2">Live Analytics</h4>
                <p className="text-medium-contrast text-sm">Real-time attendance tracking and event metrics</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <h4 className="font-semibold text-high-contrast mb-2">Member Management</h4>
                <p className="text-medium-contrast text-sm">Comprehensive member database and validation</p>
              </div>
              <div className="text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <Shield className="h-6 w-6 text-purple-600" />
                </div>
                <h4 className="font-semibold text-high-contrast mb-2">Security Controls</h4>
                <p className="text-medium-contrast text-sm">Advanced security settings and fraud prevention</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="group hover:shadow-xl transition-all duration-500 border-0 shadow-lg bg-white/80 backdrop-blur-sm hover:bg-white">
                <CardHeader className="pb-4">
                  <div className="h-14 w-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white mb-6 group-hover:scale-110 transition-transform duration-300">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl font-bold text-high-contrast group-hover:text-blue-600 transition-colors">
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-medium-contrast leading-relaxed">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          
          {/* How It Works Section - More Visual */}
          <div className="mt-24 bg-white/80 backdrop-blur-sm rounded-3xl p-12 border border-gray-200">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold text-high-contrast mb-4">How It Works</h3>
              <p className="text-lg text-medium-contrast max-w-2xl mx-auto">
                Get started with Eventify AI in just 3 simple steps - from setup to validation in minutes
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
              {/* Step 1 */}
              <div className="text-center relative">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg transform hover:scale-110 transition-transform duration-300">
                    <Building className="h-10 w-10 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-white">1</span>
                  </div>
                </div>
                <h4 className="text-xl font-semibold text-high-contrast mb-3">Admin Creates Event</h4>
                <p className="text-medium-contrast leading-relaxed">Set up your event with member eligibility rules, validation requirements, and security settings through our intuitive dashboard</p>
                <div className="mt-4 text-xs text-blue-600 font-medium">⏱️ Takes 5 minutes</div>
              </div>
              
              {/* Arrow 1 */}
              <div className="hidden md:block absolute top-10 left-1/3 transform -translate-x-1/2">
                <ArrowRight className="h-6 w-6 text-gray-400" />
              </div>
              
              {/* Step 2 */}
              <div className="text-center relative">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg transform hover:scale-110 transition-transform duration-300">
                    <QrCode className="h-10 w-10 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-green-600 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-white">2</span>
                  </div>
                </div>
                <h4 className="text-xl font-semibold text-high-contrast mb-3">Member Registers</h4>
                <p className="text-medium-contrast leading-relaxed">Members register using secure QR codes with AI-powered validation, face recognition, and real-time fraud detection</p>
                <div className="mt-4 text-xs text-green-600 font-medium">🔒 Instant validation</div>
              </div>
              
              {/* Arrow 2 */}
              <div className="hidden md:block absolute top-10 right-1/3 transform translate-x-1/2">
                <ArrowRight className="h-6 w-6 text-gray-400" />
              </div>
              
              {/* Step 3 */}
              <div className="text-center relative">
                <div className="relative">
                  <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg transform hover:scale-110 transition-transform duration-300">
                    <Smartphone className="h-10 w-10 text-white" />
                  </div>
                  <div className="absolute -top-2 -right-2 w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-sm font-bold text-white">3</span>
                  </div>
                </div>
                <h4 className="text-xl font-semibold text-high-contrast mb-3">Scan & Validate</h4>
                <p className="text-medium-contrast leading-relaxed">Scan attendees at the event entrance and track real-time attendance analytics with instant security verification</p>
                <div className="mt-4 text-xs text-purple-600 font-medium">📊 Live analytics</div>
              </div>
            </div>
            
            {/* Bottom CTA */}
            <div className="text-center mt-12 pt-8 border-t border-gray-200">
              <p className="text-medium-contrast mb-4">Ready to secure your next event?</p>
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Button 
                  size="lg"
                  className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold px-8 py-3 rounded-full shadow-lg transform hover:scale-105 transition-all duration-300"
                  onClick={() => window.open(`mailto:admin@eventifyai.com?subject=Eventify AI Free Demo Request&body=Hello,%0D%0A%0D%0AI would like to request a free demo of Eventify AI for my organization.%0D%0A%0D%0AOrganization Details:%0D%0A- Organization Name:%0D%0A- Expected number of attendees:%0D%0A- Event type:%0D%0A- Preferred demo date/time:%0D%0A%0D%0AThank you!`, '_blank')}
                  data-testid="button-demo-request"
                >
                  <Target className="h-5 w-5 mr-2" />
                  Start Your Free Demo
                </Button>
                <span className="text-medium-contrast text-sm">or</span>
                <Link href="/organization-register">
                  <Button 
                    variant="outline"
                    size="lg"
                    className="border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white font-semibold px-8 py-3 rounded-full shadow-lg transform hover:scale-105 transition-all duration-300"
                    data-testid="button-signup-hero"
                  >
                    <Building className="h-5 w-5 mr-2" />
                    Sign Up Now
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-green-100 text-green-800 border-green-200">
              <BarChart3 className="h-4 w-4 mr-2" />
              Proven Results
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-high-contrast mb-6">
              Why Organizations Choose
              <span className="text-gradient block mt-2">Eventify AI</span>
            </h2>
            <p className="text-xl text-medium-contrast max-w-3xl mx-auto leading-relaxed">
              Join hundreds of organizations that have transformed their event security 
              and achieved measurable improvements in efficiency and fraud prevention.
            </p>
          </div>

          {/* Real-World Event Context */}
          <div className="mb-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <img 
                  src={eventCheckinImage} 
                  alt="Professional event check-in with QR code scanning" 
                  className="w-full rounded-2xl shadow-2xl"
                />
              </div>
              <div>
                <img 
                  src={conferenceVenueImage} 
                  alt="Professional conference venue with attendees" 
                  className="w-full rounded-2xl shadow-2xl"
                />
              </div>
            </div>
            <div className="text-center mt-8">
              <p className="text-lg text-medium-contrast font-medium">
                From intimate gatherings to large conferences - Eventify AI scales with your needs
              </p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <Card key={index} className="text-center hover:shadow-xl transition-all duration-300 border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 group">
                <CardHeader className="pb-4">
                  <div className="text-4xl font-bold text-gradient mb-3 group-hover:scale-110 transition-transform duration-300">
                    {benefit.metric}
                  </div>
                  <CardTitle className="text-xl font-bold text-high-contrast mb-2">
                    {benefit.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-medium-contrast leading-relaxed">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Testimonials Section */}
          <div className="mt-24">
            <div className="text-center mb-16">
              <h3 className="text-3xl font-bold text-high-contrast mb-4">What Our Users Say</h3>
              <p className="text-lg text-medium-contrast">
                Real feedback from organizations using Eventify AI
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <Card className="bg-gradient-to-br from-blue-50 to-white border-0 shadow-lg">
                <CardContent className="p-8">
                  <div className="flex items-center mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-medium-contrast mb-6 leading-relaxed">
                    "Eventify AI completely transformed our event security. We eliminated unauthorized access 
                    and reduced check-in time by 75%. The QR validation is incredibly reliable."
                  </p>
                  <div className="flex items-center">
                    <img 
                      src={mohammedHeadshot} 
                      alt="Mohammed Rahman headshot" 
                      className="w-12 h-12 rounded-full mr-4 object-cover border-2 border-blue-200"
                    />
                    <div>
                      <p className="font-semibold text-high-contrast">Mohammed Rahman</p>
                      <p className="text-medium-contrast text-sm">Event Coordinator, Islamic Center</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-green-50 to-white border-0 shadow-lg">
                <CardContent className="p-8">
                  <div className="flex items-center mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-medium-contrast mb-6 leading-relaxed">
                    "The face recognition and CSV validation features are game-changers. 
                    We can now verify members instantly and prevent duplicate registrations."
                  </p>
                  <div className="flex items-center">
                    <img 
                      src={aishaHeadshot} 
                      alt="Aisha Johnson headshot" 
                      className="w-12 h-12 rounded-full mr-4 object-cover border-2 border-green-200"
                    />
                    <div>
                      <p className="font-semibold text-high-contrast">Aisha Johnson</p>
                      <p className="text-medium-contrast text-sm">IT Director, Community Organization</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-gradient-to-br from-purple-50 to-white border-0 shadow-lg">
                <CardContent className="p-8">
                  <div className="flex items-center mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="h-5 w-5 text-yellow-400 fill-current" />
                    ))}
                  </div>
                  <p className="text-medium-contrast mb-6 leading-relaxed">
                    "Real-time analytics give us insights we never had before. 
                    Eventify AI pays for itself with the efficiency gains alone."
                  </p>
                  <div className="flex items-center">
                    <img 
                      src={davidHeadshot} 
                      alt="David Martinez headshot" 
                      className="w-12 h-12 rounded-full mr-4 object-cover border-2 border-purple-200"
                    />
                    <div>
                      <p className="font-semibold text-high-contrast">David Martinez</p>
                      <p className="text-medium-contrast text-sm">Operations Manager, Conference Center</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Flexible Pricing Plans
            </h2>
            <p className="text-xl text-gray-600">
              Choose the perfect plan for your event needs
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {pricingPlans.map((plan, index) => (
              <Card key={index} className={`relative hover:shadow-xl transition-all duration-300 border-0 shadow-lg ${plan.popular ? 'ring-4 ring-blue-500 scale-105 bg-gradient-to-br from-blue-50 to-white' : 'bg-white'}`}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2">
                    ⚡ Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center pb-4">
                  <CardTitle className="text-2xl font-bold text-high-contrast">{plan.name}</CardTitle>
                  <div className="text-5xl font-bold text-gradient my-6">
                    {plan.price}
                    <span className="text-lg font-normal text-medium-contrast">/{plan.period}</span>
                  </div>
                  <CardDescription className="text-medium-contrast text-lg leading-relaxed">
                    {plan.description}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <ul className="space-y-4 mb-8">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                        <span className="text-medium-contrast leading-relaxed">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="space-y-3">
                    <Link href="/organization-register">
                      <Button 
                        className={`w-full font-semibold py-3 text-lg transition-all focus-visible:focus ${plan.popular ? 'btn-primary text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                        data-testid={`button-signup-${plan.name.toLowerCase().replace(/\s+/g, '-')}`}
                      >
                        {plan.price === "Custom" ? "Contact Sales" : "Sign Up Now"}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </Link>
                    <Button 
                      variant="outline"
                      className="w-full font-medium py-2 text-sm border-gray-300 text-gray-600 hover:bg-gray-50"
                      onClick={() => {
                        if (plan.price === "Custom") {
                          // Open WhatsApp for enterprise inquiries
                          window.open(`https://wa.me/2348107183206?text=Hi! I'm interested in the ${plan.name} plan for Eventify AI. Can you provide more details?`, '_blank');
                        } else {
                          // Open email for standard plans
                          window.open(`mailto:admin@eventifyai.com?subject=Eventify AI ${plan.name} Inquiry&body=Hello,%0D%0A%0D%0AI'm interested in the ${plan.name} plan (${plan.price}/${plan.period}) for Eventify AI.%0D%0A%0D%0APlease provide more information about:%0D%0A- Setup process%0D%0A- Payment options%0D%0A- Implementation timeline%0D%0A%0D%0AThank you!`, '_blank');
                        }
                      }}
                      data-testid={`button-contact-${plan.name.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      Learn More
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Ticket Payment Section */}
      <section className="py-20 bg-gradient-to-br from-blue-50 via-white to-purple-50">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <Badge className="mb-4 bg-purple-100 text-purple-800 border-purple-200">
              <CreditCard className="h-4 w-4 mr-2" />
              Ticket Payment
            </Badge>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Complete Your Ticket Payment
            </h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Already have a ticket but need to complete payment? Enter your ticket ID below to proceed with secure online payment.
            </p>
          </div>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-xl">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center mb-4">
                <Ticket className="h-8 w-8 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">Pay for Your Ticket</CardTitle>
              <CardDescription className="text-gray-600 mt-2">
                Enter your ticket ID to complete payment and secure your spot at the event
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-6">
                {!foundTicket ? (
                  /* Search Step */
                  <>
                    <div className="flex flex-col sm:flex-row gap-4">
                      <Input
                        placeholder="Enter your ticket ID (e.g., TKTPZIWI9)"
                        value={ticketId}
                        onChange={(e) => setTicketId(e.target.value.toUpperCase())}
                        className="flex-1 h-12 text-lg border-2 border-gray-200 focus:border-purple-500 transition-colors"
                      />
                      <Button 
                        onClick={handleFindTicket}
                        disabled={ticketSearchLoading}
                        className="h-12 px-8 bg-gradient-to-br from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg"
                      >
                        {ticketSearchLoading ? (
                          <>
                            <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                            Searching...
                          </>
                        ) : (
                          <>
                            <Search className="h-4 w-4 mr-2" />
                            Find My Ticket
                          </>
                        )}
                      </Button>
                    </div>
                    
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-2">Need Help?</h4>
                      <div className="text-sm text-blue-800 space-y-1">
                        <p>• Your ticket ID is found in your registration confirmation</p>
                        <p>• Check your email for the ticket details</p>
                        <p>• Contact event organizers if you can't find your ticket ID</p>
                      </div>
                    </div>
                  </>
                ) : (
                  /* Ticket Found - Payment Step */
                  <>
                    <div className="bg-green-50 border border-green-200 rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-green-900 flex items-center">
                          <CheckCircle className="h-5 w-5 mr-2" />
                          Ticket Found!
                        </h3>
                        <Button variant="ghost" size="sm" onClick={resetSearch} className="text-green-700 hover:text-green-900">
                          Search Different Ticket
                        </Button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                        <div>
                          <p className="text-sm text-green-700 font-medium">Ticket ID</p>
                          <p className="text-green-900 font-semibold">{foundTicket.ticketNumber}</p>
                        </div>
                        <div>
                          <p className="text-sm text-green-700 font-medium">Ticket Type</p>
                          <p className="text-green-900">{foundTicket.ticketType}</p>
                        </div>
                        {foundEvent && (
                          <>
                            <div>
                              <p className="text-sm text-green-700 font-medium">Event</p>
                              <p className="text-green-900">{foundEvent.name}</p>
                            </div>
                            <div>
                              <p className="text-sm text-green-700 font-medium">Date</p>
                              <p className="text-green-900">{new Date(foundEvent.startDate).toLocaleDateString()}</p>
                            </div>
                          </>
                        )}
                        <div>
                          <p className="text-sm text-green-700 font-medium">Price</p>
                          <p className="text-green-900 font-semibold">{foundTicket.currency} {foundTicket.price.toLocaleString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-green-700 font-medium">Payment Status</p>
                          <Badge variant={foundTicket.paymentStatus === 'paid' ? 'default' : 'secondary'} className="mt-1">
                            {foundTicket.paymentStatus === 'paid' ? 'Paid' : 'Pending Payment'}
                          </Badge>
                        </div>
                      </div>

                      {foundTicket.paymentStatus !== 'paid' ? (
                        <div className="space-y-4">
                          <div className="bg-white rounded-lg p-4 border border-green-200">
                            <h4 className="font-semibold text-green-900 mb-2">Ready to Complete Payment?</h4>
                            <p className="text-sm text-green-800 mb-4">
                              Click below to proceed to secure payment processing with Paystack
                            </p>
                            <Button 
                              onClick={handlePayNow}
                              disabled={paymentLoading}
                              className="w-full h-12 bg-gradient-to-br from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-semibold shadow-lg"
                            >
                              {paymentLoading ? (
                                <>
                                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                                  Redirecting...
                                </>
                              ) : (
                                <>
                                  <CreditCard className="h-4 w-4 mr-2" />
                                  Pay Now - {foundTicket.currency} {foundTicket.price.toLocaleString()}
                                </>
                              )}
                            </Button>
                          </div>
                          
                          <div className="text-center text-sm text-green-600 space-y-1">
                            <p>💳 Secure payment processing with Paystack</p>
                            <p>🔒 Your payment information is protected and encrypted</p>
                            <p>📧 You'll receive a confirmation email after successful payment</p>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-white rounded-lg p-4 border border-green-200 text-center">
                          <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-3" />
                          <h4 className="font-semibold text-green-900 mb-2">Payment Complete!</h4>
                          <p className="text-sm text-green-800 mb-4">
                            This ticket has already been paid for. You're all set for the event!
                          </p>
                          <Button 
                            onClick={() => window.location.href = `/ticket/${foundTicket.ticketNumber}`}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            View Full Ticket Details
                          </Button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to Transform Your Events?
            </h2>
            <p className="text-xl text-gray-300">
              Contact us today to discuss your event validation needs
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="bg-gray-800 border-gray-700 text-white">
              <CardHeader>
                <Phone className="h-8 w-8 text-blue-400 mb-2" />
                <CardTitle>Phone</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p>+ (234) 810-7183-206</p>
                <p>+ (234) 815-1163-966</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700 text-white">
              <CardHeader>
                <Mail className="h-8 w-8 text-blue-400 mb-2" />
                <CardTitle>Email</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <p>admin@eventifyai.com</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700 text-white">
              <CardHeader>
                <MapPin className="h-8 w-8 text-blue-400 mb-2" />
                <CardTitle>Office</CardTitle>
              </CardHeader>
              <CardContent>
                <p>No. 2 Alheri Close</p>
                <p>FCT, Abuja Nigeria</p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700 text-white">
              <CardHeader>
                <Clock className="h-8 w-8 text-blue-400 mb-2" />
                <CardTitle>Business Hours</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <p><strong>Monday - Friday</strong></p>
                <p>9:00 AM - 6:00 PM</p>
                <p><strong>Saturday</strong></p>
                <p>10:00 AM - 4:00 PM</p>
                <p><strong>Sunday</strong></p>
                <p>Closed</p>
              </CardContent>
            </Card>
          </div>
          <div className="text-center mt-12 space-y-4">
            <Button 
              size="lg" 
              className="btn-primary text-white font-semibold px-8 py-4 text-lg mr-4"
              onClick={() => window.open(`mailto:admin@eventifyai.com?subject=Eventify AI Free Demo Request&body=Hello,%0D%0A%0D%0AI would like to request a free demo of Eventify AI for my organization.%0D%0A%0D%0AOrganization Details:%0D%0A- Organization Name:%0D%0A- Expected number of attendees:%0D%0A- Event type:%0D%0A- Preferred demo date/time:%0D%0A%0D%0AThank you!`, '_blank')}
            >
              <Target className="h-5 w-5 mr-2" />
              Get Free Demo
            </Button>
            <Button 
              variant="outline"
              size="lg" 
              className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold px-8 py-4 text-lg"
              onClick={() => window.open('https://wa.me/2348107183206?text=Hi! I would like to schedule a call to discuss Eventify AI for my organization.', '_blank')}
            >
              <Phone className="h-5 w-5 mr-2" />
              Schedule Call
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-300 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Footer CTA */}
          <div className="text-center mb-12 pb-8 border-b border-gray-800">
            <h3 className="text-3xl font-bold text-white mb-4">
              Ready to Revolutionize Your Event Security?
            </h3>
            <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
              Join 500+ organizations already using Eventify AI to eliminate fraud and streamline event management.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg"
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold px-10 py-4 text-lg rounded-full shadow-2xl transform hover:scale-105 transition-all duration-300"
                onClick={() => window.open(`mailto:admin@eventifyai.com?subject=Eventify AI Free Demo Request&body=Hello,%0D%0A%0D%0AI would like to request a free demo of Eventify AI for my organization.%0D%0A%0D%0AOrganization Details:%0D%0A- Organization Name:%0D%0A- Expected number of attendees:%0D%0A- Event type:%0D%0A- Preferred demo date/time:%0D%0A%0D%0AThank you!`, '_blank')}
              >
                <Target className="h-6 w-6 mr-2" />
                Get Free Demo Now
              </Button>
              <Button 
                variant="outline"
                size="lg"
                className="border-2 border-white text-white hover:bg-white hover:text-gray-900 font-semibold px-10 py-4 text-lg rounded-full transition-all duration-300"
                onClick={() => window.open('https://wa.me/2348107183206?text=Hi! I would like to schedule a call to discuss Eventify AI for my organization.', '_blank')}
              >
                <Phone className="h-6 w-6 mr-2" />
                Schedule Call
              </Button>
            </div>
            <div className="mt-6">
              <p className="text-sm text-gray-400 flex items-center justify-center">
                <Shield className="h-4 w-4 mr-2 text-green-400" />
                Enterprise-grade security • GDPR compliant • 99.9% uptime guarantee
              </p>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row justify-between items-center">
            <Link href="/">
              <div className="flex items-center mb-4 md:mb-0 cursor-pointer hover:opacity-80 transition-opacity">
                <img src="/logo.png" alt="Eventify AI Logo" className="h-8 w-auto" />
                <span className="ml-2 text-lg font-semibold text-white">Eventify AI</span>
              </div>
            </Link>
            <div className="flex space-x-6">
              <Link href="/login" className="hover:text-white transition-colors">Login</Link>
              <a href="#features" className="hover:text-white transition-colors">Features</a>
              <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
              <a href="#contact" className="hover:text-white transition-colors">Contact</a>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center">
            <div className="mb-4">
              <p className="text-sm text-gray-400">
                Powered by{' '}
                <a 
                  href="https://technurture.onrender.com/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 font-semibold transition-colors"
                >
                  Technurture
                </a>
              </p>
            </div>
            <p>&copy; 2025 Eventify AI. All rights reserved. Empowering secure events worldwide.</p>
          </div>
        </div>
      </footer>
      
      {/* Chatbot Component */}
      <ChatbotComponent />
    </div>
  );
}