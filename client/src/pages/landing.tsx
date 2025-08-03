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
// Logo image placed in public folder for proper asset handling

export function LandingPage() {
  const [activeTab, setActiveTab] = useState("features");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [ticketId, setTicketId] = useState("");
  const [foundTicket, setFoundTicket] = useState<any>(null);
  const [foundEvent, setFoundEvent] = useState<any>(null);
  const [ticketSearchLoading, setTicketSearchLoading] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);
  const { isAuthenticated, checkAuth } = useAuthStore();
  const { toast } = useToast();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

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
      
      if (data.authorizationUrl) {
        // Redirect to Paystack
        window.location.href = data.authorizationUrl;
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
          <div className="flex justify-between items-center h-16">
            <Link href="/">
              <div className="flex items-center cursor-pointer hover:opacity-80 transition-opacity">
                <img src="/logo.png" alt="EventValidate Logo" className="h-10 w-auto" />
                <span className="ml-2 text-xl font-bold text-gray-900">EventValidate</span>
              </div>
            </Link>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</a>
              <a href="#benefits" className="text-gray-600 hover:text-gray-900 transition-colors">Benefits</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900 transition-colors">Pricing</a>
              <a href="#contact" className="text-gray-600 hover:text-gray-900 transition-colors">Contact</a>
              {isAuthenticated ? (
                <Link href="/dashboard">
                  <Button size="sm">Dashboard</Button>
                </Link>
              ) : (
                <Link href="/login">
                  <Button variant="outline" size="sm">Login</Button>
                </Link>
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
              <a 
                href="#features" 
                className="block text-gray-600 hover:text-gray-900 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Features
              </a>
              <a 
                href="#benefits" 
                className="block text-gray-600 hover:text-gray-900 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Benefits
              </a>
              <a 
                href="#pricing" 
                className="block text-gray-600 hover:text-gray-900 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Pricing
              </a>
              <a 
                href="#contact" 
                className="block text-gray-600 hover:text-gray-900 transition-colors"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Contact
              </a>
              <div className="pt-2 border-t border-gray-200">
                {isAuthenticated ? (
                  <Link href="/dashboard">
                    <Button size="sm" className="w-full" onClick={() => setIsMobileMenuOpen(false)}>
                      Dashboard
                    </Button>
                  </Link>
                ) : (
                  <Link href="/login">
                    <Button variant="outline" size="sm" className="w-full" onClick={() => setIsMobileMenuOpen(false)}>
                      Login
                    </Button>
                  </Link>
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
          <p className="hero-subtitle text-xl md:text-2xl text-medium-contrast mb-12 max-w-4xl mx-auto leading-relaxed">
            EventValidate eliminates unauthorized event access with AI-powered QR validation, 
            real-time attendance tracking, and comprehensive member verification for organizations.
          </p>
          
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

          {/* Enhanced CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <Button 
              size="lg" 
              className="btn-primary text-white font-semibold px-8 py-4 text-lg focus-visible:focus"
              onClick={() => window.open(`mailto:hafiztech56@gmail.com?subject=EventValidate Free Demo Request&body=Hello,%0D%0A%0D%0AI would like to request a free demo of EventValidate for my organization.%0D%0A%0D%0AOrganization Details:%0D%0A- Organization Name:%0D%0A- Expected number of attendees:%0D%0A- Event type:%0D%0A- Preferred demo date/time:%0D%0A%0D%0AThank you!`, '_blank')}
            >
              <Target className="h-6 w-6 mr-2" />
              Get Free Demo
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              className="border-2 border-blue-600 text-blue-600 hover:bg-blue-50 font-semibold px-8 py-4 text-lg focus-visible:focus"
              onClick={() => window.open('https://wa.me/2348107183206?text=Hi! I would like to schedule a call to discuss EventValidate for my organization.', '_blank')}
            >
              <Phone className="h-6 w-6 mr-2" />
              Schedule Call
            </Button>
            <Button 
              size="lg"
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold px-8 py-4 text-lg focus-visible:focus"
              onClick={() => window.location.href = '/organization-register'}
            >
              <Building className="h-6 w-6 mr-2" />
              Register Organization
            </Button>
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

          {/* Trust indicators */}
          <div className="mt-16 pt-8 border-t border-gray-200">
            <p className="text-medium-contrast mb-4 text-lg">Trusted by organizations worldwide</p>
            <div className="flex flex-wrap justify-center items-center gap-8 opacity-60">
              <div className="bg-gray-100 px-4 py-2 rounded-lg">
                <span className="text-gray-600 font-medium">Religious Organizations</span>
              </div>
              <div className="bg-gray-100 px-4 py-2 rounded-lg">
                <span className="text-gray-600 font-medium">Corporate Events</span>
              </div>
              <div className="bg-gray-100 px-4 py-2 rounded-lg">
                <span className="text-gray-600 font-medium">Educational Institutions</span>
              </div>
              <div className="bg-gray-100 px-4 py-2 rounded-lg">
                <span className="text-gray-600 font-medium">Non-Profits</span>
              </div>
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
              From QR code generation to real-time analytics, EventValidate provides comprehensive tools 
              that ensure your events are secure, efficient, and professionally managed.
            </p>
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
          
          {/* How It Works Section */}
          <div className="mt-24 bg-white/80 backdrop-blur-sm rounded-3xl p-12 border border-gray-200">
            <div className="text-center mb-12">
              <h3 className="text-3xl font-bold text-high-contrast mb-4">How It Works</h3>
              <p className="text-lg text-medium-contrast max-w-2xl mx-auto">
                Get started with EventValidate in just 3 simple steps
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-600">1</span>
                </div>
                <h4 className="text-xl font-semibold text-high-contrast mb-2">Create Event</h4>
                <p className="text-medium-contrast">Set up your event with member eligibility rules and validation requirements</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-green-600">2</span>
                </div>
                <h4 className="text-xl font-semibold text-high-contrast mb-2">Share Registration</h4>
                <p className="text-medium-contrast">Members register using secure QR codes with AI-powered validation</p>
              </div>
              <div className="text-center">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-purple-600">3</span>
                </div>
                <h4 className="text-xl font-semibold text-high-contrast mb-2">Validate & Track</h4>
                <p className="text-medium-contrast">Scan attendees at the event and track real-time attendance analytics</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <Badge className="mb-4 bg-green-100 text-green-800 border-green-200">
              <BarChart3 className="h-4 w-4 mr-2" />
              Proven Results
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-high-contrast mb-6">
              Why Organizations Choose
              <span className="text-gradient block mt-2">EventValidate</span>
            </h2>
            <p className="text-xl text-medium-contrast max-w-3xl mx-auto leading-relaxed">
              Join hundreds of organizations that have transformed their event security 
              and achieved measurable improvements in efficiency and fraud prevention.
            </p>
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
                Real feedback from organizations using EventValidate
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
                    "EventValidate completely transformed our event security. We eliminated unauthorized access 
                    and reduced check-in time by 75%. The QR validation is incredibly reliable."
                  </p>
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                      <span className="text-blue-600 font-semibold">MR</span>
                    </div>
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
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                      <span className="text-green-600 font-semibold">AJ</span>
                    </div>
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
                    EventValidate pays for itself with the efficiency gains alone."
                  </p>
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4">
                      <span className="text-purple-600 font-semibold">DM</span>
                    </div>
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
                  <Button 
                    className={`w-full font-semibold py-3 text-lg transition-all focus-visible:focus ${plan.popular ? 'btn-primary text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`}
                    onClick={() => {
                      if (plan.price === "Custom") {
                        // Open WhatsApp for enterprise inquiries
                        window.open(`https://wa.me/2348107183206?text=Hi! I'm interested in the ${plan.name} plan for EventValidate. Can you provide more details?`, '_blank');
                      } else {
                        // Open email for standard plans
                        window.open(`mailto:hafiztech56@gmail.com?subject=EventValidate ${plan.name} Inquiry&body=Hello,%0D%0A%0D%0AI'm interested in the ${plan.name} plan (${plan.price}/${plan.period}) for EventValidate.%0D%0A%0D%0APlease provide more information about:%0D%0A- Setup process%0D%0A- Payment options%0D%0A- Implementation timeline%0D%0A%0D%0AThank you!`, '_blank');
                      }
                    }}
                  >
                    {plan.price === "Custom" ? "Contact Sales" : "Get Started"}
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
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
                <p>hafiztech56@gmail.com</p>
                <p>aderibigbeolamide56@gmail.com</p>
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
          <div className="text-center mt-12">
            <Button 
              size="lg" 
              className="bg-blue-600 hover:bg-blue-700"
              onClick={() => window.open(`mailto:hafiztech56@gmail.com?subject=EventValidate Free Consultation Request&body=Hello,%0D%0A%0D%0AI would like to request a free consultation about EventValidate for my organization.%0D%0A%0D%0APlease let me know:%0D%0A- Available consultation times%0D%0A- What information I should prepare%0D%0A- Expected duration%0D%0A%0D%0AOrganization: [Your organization name]%0D%0AContact: [Your phone number]%0D%0A%0D%0AThank you!`, '_blank')}
            >
              <Mail className="h-5 w-5 mr-2" />
              Get Free Consultation
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-950 text-gray-300 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <Link href="/">
              <div className="flex items-center mb-4 md:mb-0 cursor-pointer hover:opacity-80 transition-opacity">
                <img src="/logo.png" alt="EventValidate Logo" className="h-8 w-auto" />
                <span className="ml-2 text-lg font-semibold text-white">EventValidate</span>
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
            <p>&copy; 2025 EventValidate. All rights reserved. Empowering secure events worldwide.</p>
          </div>
        </div>
      </footer>
      
      {/* Chatbot Component */}
      <ChatbotComponent />
    </div>
  );
}