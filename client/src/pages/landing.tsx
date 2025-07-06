import { useState, useEffect } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  X
} from "lucide-react";
import logoPath from "@assets/Screenshot from 2025-07-06 08-06-04_1751785727840.png";

export function LandingPage() {
  const [activeTab, setActiveTab] = useState("features");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { isAuthenticated, checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

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
      price: "$50,000",
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
      price: "$150,000",
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
                <img src={logoPath} alt="EventValidate Logo" className="h-10 w-auto" />
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
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <Badge className="mb-4 bg-blue-100 text-blue-800 border-blue-200">
            <Zap className="h-3 w-3 mr-1" />
            AI-Powered Event Validation
          </Badge>
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Transform Your Event
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600"> Security</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            EventValidate is an AI-powered member validation system that revolutionizes event check-ins with secure QR codes, 
            real-time analytics, and comprehensive attendance tracking for organizations worldwide.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              onClick={() => window.open(`mailto:hafiztech56@gmail.com?subject=EventValidate Free Demo Request&body=Hello,%0D%0A%0D%0AI would like to request a free demo of EventValidate for my organization.%0D%0A%0D%0AOrganization Details:%0D%0A- Organization Name:%0D%0A- Expected number of attendees:%0D%0A- Event type:%0D%0A- Preferred demo date/time:%0D%0A%0D%0AThank you!`, '_blank')}
            >
              <Target className="h-5 w-5 mr-2" />
              Start Free Demo
            </Button>
            <Button 
              variant="outline" 
              size="lg"
              onClick={() => window.open('https://wa.me/2348107183206?text=Hi! I would like to schedule a call to discuss EventValidate for my organization.', '_blank')}
            >
              <Phone className="h-5 w-5 mr-2" />
              Schedule Call
            </Button>
          </div>
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-600">99.9%</div>
              <div className="text-gray-600">Security Rate</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600">80%</div>
              <div className="text-gray-600">Faster Check-in</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-600">500+</div>
              <div className="text-gray-600">Events Powered</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-600">50K+</div>
              <div className="text-gray-600">Attendees Validated</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Powerful Features for Modern Events
            </h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Everything you need to manage, validate, and track event attendance with cutting-edge technology.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="group hover:shadow-lg transition-all duration-300 border-0 shadow-md">
                <CardHeader>
                  <div className="h-12 w-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform">
                    {feature.icon}
                  </div>
                  <CardTitle className="text-xl">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Why Choose EventValidate?
            </h2>
            <p className="text-xl text-gray-600">
              Measurable improvements for your events and organization
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {benefits.map((benefit, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="text-3xl font-bold text-blue-600 mb-2">{benefit.metric}</div>
                  <CardTitle className="text-lg">{benefit.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600">{benefit.description}</p>
                </CardContent>
              </Card>
            ))}
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
              <Card key={index} className={`relative hover:shadow-lg transition-all ${plan.popular ? 'ring-2 ring-blue-500 scale-105' : ''}`}>
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-500">
                    Most Popular
                  </Badge>
                )}
                <CardHeader className="text-center">
                  <CardTitle className="text-2xl">{plan.name}</CardTitle>
                  <div className="text-4xl font-bold text-gray-900 my-4">
                    {plan.price}
                    <span className="text-lg font-normal text-gray-600">/{plan.period}</span>
                  </div>
                  <CardDescription>{plan.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-500 mr-3 flex-shrink-0" />
                        <span className="text-gray-700">{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button 
                    className={`w-full ${plan.popular ? 'bg-blue-600 hover:bg-blue-700' : ''}`}
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
                <img src={logoPath} alt="EventValidate Logo" className="h-8 w-auto" />
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
    </div>
  );
}