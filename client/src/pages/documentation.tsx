import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Link } from "wouter";
import { PublicNavbar } from "@/components/public-navbar";
import { 
  BookOpen, 
  Users, 
  Settings, 
  QrCode, 
  CreditCard,
  BarChart3,
  Shield,
  HelpCircle,
  CheckCircle,
  ArrowRight,
  Download,
  Play,
  Monitor,
  Smartphone,
  Globe,
  Mail,
  Bell,
  Calendar,
  UserCheck,
  Ticket,
  Building,
  Key,
  Database,
  Zap,
  FileText,
  MessageSquare,
  AlertCircle,
  Search
} from "lucide-react";

export function DocumentationPage() {
  const [activeSection, setActiveSection] = useState("getting-started");

  const quickStartSteps = [
    {
      icon: <Building className="h-6 w-6" />,
      title: "Register Your Organization",
      description: "Sign up and get your organization verified by our admin team",
      action: "Start Registration",
      href: "/organization-register"
    },
    {
      icon: <Settings className="h-6 w-6" />,
      title: "Configure Your Dashboard",
      description: "Set up your organization profile, payment details, and preferences",
      action: "Access Dashboard",
      href: "/dashboard"
    },
    {
      icon: <Calendar className="h-6 w-6" />,
      title: "Create Your First Event",
      description: "Use our intuitive event builder to set up registration and validation",
      action: "Create Event",
      href: "/events"
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "Manage Members & Validate",
      description: "Add members, generate QR codes, and start validating attendees",
      action: "View Scanner",
      href: "/scanner"
    }
  ];

  const features = [
    {
      category: "Event Management",
      icon: <Calendar className="h-6 w-6" />,
      items: [
        {
          title: "Event Creation & Setup",
          description: "Create events with custom registration forms, pricing, and validation rules",
          features: ["Custom registration fields", "Flexible pricing models", "Capacity management", "Date & time scheduling"]
        },
        {
          title: "Registration Management",
          description: "Handle member registrations with automated workflows and notifications",
          features: ["Bulk member import via CSV", "Individual registration", "Payment integration", "Email confirmations"]
        },
        {
          title: "Ticket System",
          description: "Generate and manage digital tickets with QR codes and PDF downloads",
          features: ["QR code generation", "PDF ticket creation", "Payment tracking", "Refund management"]
        }
      ]
    },
    {
      category: "Member Validation",
      icon: <UserCheck className="h-6 w-6" />,
      items: [
        {
          title: "QR Code Scanning",
          description: "High-speed QR code validation with real-time attendance tracking",
          features: ["Mobile scanner app", "Bulk scanning support", "Offline capability", "Attendance analytics"]
        },
        {
          title: "AI-Powered Validation",
          description: "Advanced facial recognition and member verification systems",
          features: ["Face recognition matching", "Member photo verification", "Fraud detection", "Security alerts"]
        },
        {
          title: "Manual Validation",
          description: "Fallback validation methods for comprehensive member checking",
          features: ["ID verification", "Name-based lookup", "Guest management", "VIP handling"]
        }
      ]
    },
    {
      category: "Payment Processing",
      icon: <CreditCard className="h-6 w-6" />,
      items: [
        {
          title: "Paystack Integration",
          description: "Seamless payment processing optimized for African markets",
          features: ["Multiple payment methods", "Bank transfers", "Card payments", "Mobile money"]
        },
        {
          title: "Revenue Management",
          description: "Track revenue, commissions, and financial performance",
          features: ["5% platform commission", "Real-time revenue tracking", "Financial reporting", "Payout management"]
        },
        {
          title: "Pricing Flexibility",
          description: "Multiple pricing models to suit different organization needs",
          features: ["Pay-per-event (7% commission)", "Monthly subscriptions ($29-299)", "Volume discounts", "Enterprise contracts"]
        }
      ]
    },
    {
      category: "Analytics & Reporting",
      icon: <BarChart3 className="h-6 w-6" />,
      items: [
        {
          title: "Real-Time Analytics",
          description: "Live dashboards showing attendance, revenue, and engagement metrics",
          features: ["Live attendance tracking", "Revenue monitoring", "Registration trends", "Performance insights"]
        },
        {
          title: "Custom Reports",
          description: "Generate detailed reports for events, members, and financial performance",
          features: ["Attendance reports", "Financial summaries", "Member analytics", "Export capabilities"]
        },
        {
          title: "Seat Availability Heatmap",
          description: "AI-powered visualization of event capacity and seating patterns",
          features: ["Real-time capacity monitoring", "Occupancy predictions", "Space optimization", "Visual heatmaps"]
        }
      ]
    }
  ];

  const pricingPlans = [
    {
      name: "Pay-Per-Event",
      price: "$0/month",
      commission: "7% per registration",
      description: "Perfect for organizations with occasional events",
      features: [
        "Unlimited events",
        "Basic QR scanning",
        "Standard support",
        "Email notifications",
        "Basic analytics"
      ],
      popular: false
    },
    {
      name: "Starter",
      price: "$29/month",
      commission: "5% per registration",
      description: "Ideal for small to medium organizations",
      features: [
        "Up to 50 events/year",
        "Advanced QR scanning",
        "Priority support",
        "Custom email templates",
        "Advanced analytics",
        "Member management"
      ],
      popular: true
    },
    {
      name: "Professional",
      price: "$99/month",
      commission: "5% per registration",
      description: "Best for growing organizations",
      features: [
        "Up to 200 events/year",
        "AI validation features",
        "24/7 support",
        "White-label options",
        "Advanced reporting",
        "API access",
        "Custom integrations"
      ],
      popular: false
    },
    {
      name: "Enterprise",
      price: "$299/month",
      commission: "5% per registration",
      description: "For large organizations and institutions",
      features: [
        "Unlimited events",
        "Full AI suite",
        "Dedicated account manager",
        "Complete white-labeling",
        "Custom development",
        "SLA guarantees",
        "Multi-organization support"
      ],
      popular: false
    }
  ];

  const faqs = [
    {
      question: "How do I get started with Eventify AI?",
      answer: "Simply register your organization through our registration form. Once approved by our admin team, you'll receive login credentials and can start creating events immediately."
    },
    {
      question: "What is the commission structure?",
      answer: "We charge a 5% commission on all paid registrations for subscription plans, and 7% for pay-per-event usage. This commission covers payment processing, platform maintenance, and support services."
    },
    {
      question: "Can I import existing member data?",
      answer: "Yes! You can bulk import member data using our CSV upload feature. We support standard formats and provide templates to ensure smooth data migration."
    },
    {
      question: "How does the QR code validation work?",
      answer: "Each registration generates a unique, encrypted QR code. Our mobile scanner app validates these codes in real-time, checking against our database and updating attendance records instantly."
    },
    {
      question: "Is my data secure?",
      answer: "Absolutely. We use enterprise-grade security with JWT authentication, bcrypt encryption, and role-based access control. All data is stored securely and complies with international data protection standards."
    },
    {
      question: "Can I customize the registration forms?",
      answer: "Yes, our dynamic form builder allows you to create custom registration forms with various field types including text, dropdowns, checkboxes, and file uploads."
    },
    {
      question: "What payment methods are supported?",
      answer: "Through Paystack integration, we support bank transfers, card payments, and mobile money solutions optimized for African markets."
    },
    {
      question: "Can I use Eventify AI offline?",
      answer: "Our QR scanner has offline capabilities for basic validation. However, real-time features like live analytics require an internet connection."
    },
    {
      question: "Is there an API available?",
      answer: "Yes, Professional and Enterprise plans include API access for custom integrations and third-party application connectivity."
    },
    {
      question: "What kind of support do you provide?",
      answer: "We offer email support for all plans, priority support for Starter and Professional plans, and 24/7 dedicated support with account management for Enterprise customers."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <PublicNavbar />
      {/* Header */}
      <section className="py-12 sm:py-16 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center text-white">
            <Badge className="mb-4 bg-white/20 text-white border-white/30">
              <BookOpen className="h-4 w-4 mr-2" />
              Documentation
            </Badge>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6">
              Complete Platform Guide
            </h1>
            <p className="text-lg sm:text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed px-2">
              Everything you need to know about using Eventify AI to manage your events, 
              validate members, and grow your organization.
            </p>
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <Tabs value={activeSection} onValueChange={setActiveSection} className="space-y-8">
          {/* Navigation Tabs */}
          <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 h-auto p-1 bg-white shadow-lg rounded-xl">
            <TabsTrigger value="getting-started" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
              <Play className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Getting Started</span>
              <span className="sm:hidden">Start</span>
            </TabsTrigger>
            <TabsTrigger value="features" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
              <Zap className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Features
            </TabsTrigger>
            <TabsTrigger value="pricing" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
              <CreditCard className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Pricing
            </TabsTrigger>
            <TabsTrigger value="api" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
              <Database className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              API
            </TabsTrigger>
            <TabsTrigger value="support" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
              <MessageSquare className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              Support
            </TabsTrigger>
            <TabsTrigger value="faq" className="data-[state=active]:bg-blue-500 data-[state=active]:text-white rounded-lg py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm font-medium">
              <HelpCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
              FAQ
            </TabsTrigger>
          </TabsList>

          {/* Getting Started */}
          <TabsContent value="getting-started" className="space-y-8">
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-900 flex items-center">
                  <Play className="h-6 w-6 mr-3 text-blue-600" />
                  Quick Start Guide
                </CardTitle>
                <CardDescription className="text-lg">
                  Get your organization set up and running with Eventify AI in just 4 simple steps
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {quickStartSteps.map((step, index) => (
                    <Card key={index} className="border-2 border-gray-100 hover:border-blue-200 transition-all duration-300 hover:shadow-lg">
                      <CardContent className="p-6">
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0">
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white">
                              {step.icon}
                            </div>
                          </div>
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                            <p className="text-gray-600 mb-4">{step.description}</p>
                            <Link href={step.href}>
                              <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                                {step.action}
                                <ArrowRight className="ml-2 h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* System Requirements */}
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-xl font-bold text-gray-900 flex items-center">
                  <Monitor className="h-5 w-5 mr-3 text-blue-600" />
                  System Requirements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <Globe className="h-4 w-4 mr-2" />
                      Web Browser
                    </h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• Chrome 90+ (Recommended)</li>
                      <li>• Firefox 88+</li>
                      <li>• Safari 14+</li>
                      <li>• Edge 90+</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <Smartphone className="h-4 w-4 mr-2" />
                      Mobile Scanner
                    </h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• Android 8.0+</li>
                      <li>• iOS 12.0+</li>
                      <li>• Camera access required</li>
                      <li>• Internet connection</li>
                    </ul>
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                      <Zap className="h-4 w-4 mr-2" />
                      Performance
                    </h4>
                    <ul className="space-y-1 text-sm text-gray-600">
                      <li>• 2GB RAM minimum</li>
                      <li>• Stable internet (1 Mbps+)</li>
                      <li>• JavaScript enabled</li>
                      <li>• Local storage access</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Features */}
          <TabsContent value="features" className="space-y-8">
            {features.map((category, categoryIndex) => (
              <Card key={categoryIndex} className="border-0 shadow-xl">
                <CardHeader>
                  <CardTitle className="text-2xl font-bold text-gray-900 flex items-center">
                    {category.icon}
                    <span className="ml-3">{category.category}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {category.items.map((item, itemIndex) => (
                      <Card key={itemIndex} className="border-2 border-gray-100 hover:border-blue-200 transition-all duration-300">
                        <CardHeader>
                          <CardTitle className="text-lg font-semibold text-gray-900">{item.title}</CardTitle>
                          <CardDescription>{item.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <ul className="space-y-2">
                            {item.features.map((feature, featureIndex) => (
                              <li key={featureIndex} className="flex items-start">
                                <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                                <span className="text-sm text-gray-600">{feature}</span>
                              </li>
                            ))}
                          </ul>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          {/* Pricing */}
          <TabsContent value="pricing" className="space-y-8">
            <Card className="border-0 shadow-xl">
              <CardHeader className="text-center">
                <CardTitle className="text-3xl font-bold text-gray-900">Flexible Pricing Plans</CardTitle>
                <CardDescription className="text-lg">
                  Choose the perfect plan for your event needs
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {pricingPlans.map((plan, index) => (
                    <Card key={index} className={`relative border-2 transition-all duration-300 hover:shadow-xl ${
                      plan.popular 
                        ? 'border-blue-500 shadow-lg scale-105' 
                        : 'border-gray-200 hover:border-blue-300'
                    }`}>
                      {plan.popular && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                          <Badge className="bg-blue-500 text-white">Most Popular</Badge>
                        </div>
                      )}
                      <CardHeader className="text-center">
                        <CardTitle className="text-xl font-bold text-gray-900">{plan.name}</CardTitle>
                        <div className="space-y-1">
                          <div className="text-2xl font-bold text-blue-600">{plan.price}</div>
                          <div className="text-sm text-gray-600">{plan.commission}</div>
                        </div>
                        <CardDescription>{plan.description}</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-3">
                          {plan.features.map((feature, featureIndex) => (
                            <li key={featureIndex} className="flex items-start">
                              <CheckCircle className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                              <span className="text-sm text-gray-600">{feature}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="mt-6">
                          <Link href="/organization-register">
                            <Button className={`w-full ${
                              plan.popular 
                                ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                                : 'bg-gray-100 hover:bg-gray-200 text-gray-900'
                            }`}>
                              Get Started
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* API Documentation */}
          <TabsContent value="api" className="space-y-8">
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-900 flex items-center">
                  <Database className="h-6 w-6 mr-3 text-blue-600" />
                  API Documentation
                </CardTitle>
                <CardDescription className="text-lg">
                  Integrate Eventify AI with your existing systems using our RESTful API
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                      <Key className="h-4 w-4 mr-2" />
                      API Access
                    </h4>
                    <p className="text-blue-800 text-sm">
                      API access is available for Professional and Enterprise plans. 
                      Contact support to get your API credentials.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Card className="border-2 border-gray-100">
                      <CardHeader>
                        <CardTitle className="text-lg">Authentication</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3 text-sm">
                          <div>
                            <strong>Base URL:</strong>
                            <code className="block bg-gray-100 p-2 rounded mt-1">
                              https://api.eventvalidate.com/v1
                            </code>
                          </div>
                          <div>
                            <strong>Authentication:</strong>
                            <code className="block bg-gray-100 p-2 rounded mt-1">
                              Bearer {'{your-api-token}'}
                            </code>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="border-2 border-gray-100">
                      <CardHeader>
                        <CardTitle className="text-lg">Key Endpoints</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm">
                          <div><code>GET /events</code> - List events</div>
                          <div><code>POST /events</code> - Create event</div>
                          <div><code>GET /members</code> - List members</div>
                          <div><code>POST /registrations</code> - Create registration</div>
                          <div><code>POST /validate</code> - Validate QR code</div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="border-2 border-gray-100">
                    <CardHeader>
                      <CardTitle className="text-lg">Example Request</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-sm overflow-x-auto">
{`curl -X GET "https://api.eventvalidate.com/v1/events" \\
     -H "Authorization: Bearer your-api-token" \\
     -H "Content-Type: application/json"`}
                      </pre>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Support */}
          <TabsContent value="support" className="space-y-8">
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-900 flex items-center">
                  <MessageSquare className="h-6 w-6 mr-3 text-blue-600" />
                  Support & Help
                </CardTitle>
                <CardDescription className="text-lg">
                  Get the help you need to succeed with Eventify AI
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <Card className="border-2 border-gray-100 hover:border-blue-200 transition-all duration-300">
                    <CardContent className="p-6 text-center">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <Mail className="h-6 w-6 text-blue-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Email Support</h3>
                      <p className="text-gray-600 mb-4">Get help via email with response within 24 hours</p>
                      <Button variant="outline" className="w-full">
                        admin@eventifyai.com
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-gray-100 hover:border-blue-200 transition-all duration-300">
                    <CardContent className="p-6 text-center">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <MessageSquare className="h-6 w-6 text-green-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Live Chat</h3>
                      <p className="text-gray-600 mb-4">Chat with our support team in real-time</p>
                      <Button variant="outline" className="w-full">
                        Start Chat
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="border-2 border-gray-100 hover:border-blue-200 transition-all duration-300">
                    <CardContent className="p-6 text-center">
                      <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <BookOpen className="h-6 w-6 text-purple-600" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Knowledge Base</h3>
                      <p className="text-gray-600 mb-4">Browse articles and tutorials</p>
                      <Button variant="outline" className="w-full">
                        Browse Articles
                      </Button>
                    </CardContent>
                  </Card>
                </div>

                <div className="mt-8">
                  <h3 className="text-xl font-bold text-gray-900 mb-4">Support Plans</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Standard</h4>
                      <p className="text-sm text-gray-600">Email support, 24-48 hour response</p>
                      <p className="text-xs text-gray-500 mt-1">All plans included</p>
                    </div>
                    <div className="bg-blue-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Priority</h4>
                      <p className="text-sm text-gray-600">Email + chat support, 4-8 hour response</p>
                      <p className="text-xs text-gray-500 mt-1">Starter & Professional plans</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-4">
                      <h4 className="font-semibold text-gray-900 mb-2">Premium</h4>
                      <p className="text-sm text-gray-600">24/7 support, dedicated account manager</p>
                      <p className="text-xs text-gray-500 mt-1">Enterprise plan</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* FAQ */}
          <TabsContent value="faq" className="space-y-8">
            <Card className="border-0 shadow-xl">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-gray-900 flex items-center">
                  <HelpCircle className="h-6 w-6 mr-3 text-blue-600" />
                  Frequently Asked Questions
                </CardTitle>
                <CardDescription className="text-lg">
                  Find answers to common questions about Eventify AI
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="single" collapsible className="space-y-4">
                  {faqs.map((faq, index) => (
                    <AccordionItem key={index} value={`item-${index}`} className="border border-gray-200 rounded-lg px-4">
                      <AccordionTrigger className="text-left font-semibold text-gray-900 hover:text-blue-600">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-gray-600 leading-relaxed">
                        {faq.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Call to Action */}
        <Card className="border-0 shadow-xl bg-gradient-to-r from-blue-600 to-purple-600 text-white mt-12">
          <CardContent className="p-8 text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-xl text-blue-100 mb-6">
              Join thousands of organizations using Eventify AI to streamline their events
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/organization-register">
                <Button className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-3 rounded-xl font-semibold">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/about">
                <Button variant="outline" className="border-2 border-white text-white hover:bg-white/10 px-8 py-3 rounded-xl font-semibold">
                  Learn More
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}