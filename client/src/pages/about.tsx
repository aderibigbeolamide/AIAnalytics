import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";
import { 
  Target, 
  Eye, 
  Heart, 
  Users, 
  Globe, 
  Shield,
  Zap,
  BarChart3,
  CheckCircle,
  Award,
  Building,
  ArrowRight,
  Lightbulb,
  Rocket,
  Star
} from "lucide-react";

export function AboutPage() {
  const teamValues = [
    {
      icon: <Shield className="h-6 w-6" />,
      title: "Security First",
      description: "Every feature is built with enterprise-grade security and data protection at its core."
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: "User-Centric",
      description: "We prioritize user experience and accessibility in every design decision we make."
    },
    {
      icon: <Zap className="h-6 w-6" />,
      title: "Innovation",
      description: "Leveraging cutting-edge AI and technology to solve real-world event management challenges."
    },
    {
      icon: <Globe className="h-6 w-6" />,
      title: "Scalability",
      description: "Built to grow with your organization from small events to large-scale international conferences."
    }
  ];

  const achievements = [
    {
      icon: <Users className="h-8 w-8" />,
      number: "25,000+",
      label: "Attendees Validated",
      description: "Successfully processed and validated"
    },
    {
      icon: <Building className="h-8 w-8" />,
      number: "150+",
      label: "Events Powered",
      description: "Across multiple organizations"
    },
    {
      icon: <CheckCircle className="h-8 w-8" />,
      number: "99.8%",
      label: "Platform Uptime",
      description: "Reliable service guarantee"
    },
    {
      icon: <Award className="h-8 w-8" />,
      number: "4.8/5",
      label: "Customer Satisfaction",
      description: "Based on user feedback"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      {/* Hero Section */}
      <section className="relative py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-600/10 to-purple-600/10"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Badge className="mb-6 bg-blue-100 text-blue-800 border-blue-200">
              <Heart className="h-4 w-4 mr-2" />
              About EventValidate
            </Badge>
            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Transforming Event
              <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent block mt-2">
                Management in Africa
              </span>
            </h1>
            <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed mb-8">
              We're on a mission to revolutionize how organizations across Africa manage their events, 
              validate members, and create seamless experiences through cutting-edge AI technology and 
              user-centric design.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/organization-register">
                <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 rounded-xl font-semibold shadow-lg transform hover:scale-105 transition-all duration-300">
                  Join Our Platform
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/documentation">
                <Button variant="outline" className="border-2 border-blue-200 text-blue-700 hover:bg-blue-50 px-8 py-3 rounded-xl font-semibold">
                  View Documentation
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Mission, Vision & Goals */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Mission */}
            <Card className="text-center border-0 shadow-xl bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-2xl transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center mb-4">
                  <Target className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">Our Mission</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">
                  To empower organizations across Africa with intelligent, secure, and scalable event 
                  management solutions that eliminate operational inefficiencies and enhance member experiences 
                  through innovative AI-powered validation systems.
                </p>
              </CardContent>
            </Card>

            {/* Vision */}
            <Card className="text-center border-0 shadow-xl bg-gradient-to-br from-purple-50 to-purple-100 hover:shadow-2xl transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
                  <Eye className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">Our Vision</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700 leading-relaxed">
                  To become Africa's leading event technology platform, setting the global standard 
                  for member validation and event management solutions, while fostering digital 
                  transformation across diverse organizational landscapes.
                </p>
              </CardContent>
            </Card>

            {/* Goals */}
            <Card className="text-center border-0 shadow-xl bg-gradient-to-br from-emerald-50 to-emerald-100 hover:shadow-2xl transition-all duration-300">
              <CardHeader className="pb-4">
                <div className="mx-auto w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full flex items-center justify-center mb-4">
                  <Rocket className="h-8 w-8 text-white" />
                </div>
                <CardTitle className="text-2xl font-bold text-gray-900">Our Goals</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="text-gray-700 leading-relaxed text-left space-y-2">
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-emerald-600 mr-2 mt-0.5 flex-shrink-0" />
                    Serve 10,000+ organizations by 2027
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-emerald-600 mr-2 mt-0.5 flex-shrink-0" />
                    Expand across 15 African countries
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-emerald-600 mr-2 mt-0.5 flex-shrink-0" />
                    Process 1M+ event registrations annually
                  </li>
                  <li className="flex items-start">
                    <CheckCircle className="h-5 w-5 text-emerald-600 mr-2 mt-0.5 flex-shrink-0" />
                    Maintain 99.9% platform reliability
                  </li>
                </ul>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Our Values */}
      <section className="py-20 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-indigo-100 text-indigo-800 border-indigo-200">
              <Star className="h-4 w-4 mr-2" />
              Core Values
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              What Drives Us
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Our values guide every decision we make and every feature we build
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {teamValues.map((value, index) => (
              <Card key={index} className="text-center border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-white/80 backdrop-blur-sm">
                <CardHeader className="pb-4">
                  <div className="mx-auto w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center mb-3">
                    {value.icon}
                  </div>
                  <CardTitle className="text-lg font-bold text-gray-900">{value.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-600 text-sm leading-relaxed">{value.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Achievements */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-green-100 text-green-800 border-green-200">
              <BarChart3 className="h-4 w-4 mr-2" />
              Our Impact
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              Platform Achievements
            </h2>
            <p className="text-xl text-gray-600 max-w-3xl mx-auto leading-relaxed">
              Real numbers that demonstrate our commitment to excellence and growth
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {achievements.map((achievement, index) => (
              <Card key={index} className="text-center border-0 shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-to-br from-blue-50 to-purple-50">
                <CardContent className="pt-8 pb-6">
                  <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mb-4">
                    {achievement.icon}
                  </div>
                  <div className="text-3xl font-bold text-gray-900 mb-2">{achievement.number}</div>
                  <div className="text-lg font-semibold text-gray-800 mb-1">{achievement.label}</div>
                  <div className="text-sm text-gray-600">{achievement.description}</div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Technology & Innovation */}
      <section className="py-20 bg-gradient-to-br from-purple-50 to-blue-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <Badge className="mb-4 bg-purple-100 text-purple-800 border-purple-200">
                <Lightbulb className="h-4 w-4 mr-2" />
                Innovation
              </Badge>
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Cutting-Edge Technology
              </h2>
              <p className="text-xl text-gray-600 leading-relaxed mb-8">
                Built with modern technologies and designed for the African market, 
                our platform combines AI-powered validation, real-time analytics, 
                and seamless payment integration to deliver unmatched performance.
              </p>
              
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">AI-Powered Member Validation</h3>
                    <p className="text-gray-600">Advanced facial recognition and QR code systems</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-purple-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Real-Time Analytics</h3>
                    <p className="text-gray-600">Live attendance tracking and comprehensive reporting</p>
                  </div>
                </div>
                
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center mr-3 mt-0.5">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">Local Payment Integration</h3>
                    <p className="text-gray-600">Seamless Paystack integration for African markets</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="lg:pl-8">
              <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
                <CardContent className="p-8">
                  <h3 className="text-2xl font-bold text-gray-900 mb-6">Technology Stack</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                      <div className="font-semibold text-gray-800">Frontend</div>
                      <div className="text-gray-600">React + TypeScript</div>
                      <div className="text-gray-600">Tailwind CSS</div>
                      <div className="text-gray-600">Radix UI</div>
                    </div>
                    <div className="space-y-2">
                      <div className="font-semibold text-gray-800">Backend</div>
                      <div className="text-gray-600">Node.js + Express</div>
                      <div className="text-gray-600">MongoDB Atlas</div>
                      <div className="text-gray-600">WebSocket</div>
                    </div>
                    <div className="space-y-2">
                      <div className="font-semibold text-gray-800">Security</div>
                      <div className="text-gray-600">JWT Authentication</div>
                      <div className="text-gray-600">bcrypt Encryption</div>
                      <div className="text-gray-600">Role-based Access</div>
                    </div>
                    <div className="space-y-2">
                      <div className="font-semibold text-gray-800">Integrations</div>
                      <div className="text-gray-600">Paystack API</div>
                      <div className="text-gray-600">Cloudinary</div>
                      <div className="text-gray-600">Email Services</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="py-20 bg-gradient-to-r from-blue-600 to-purple-600">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Ready to Transform Your Events?
          </h2>
          <p className="text-xl text-blue-100 mb-8 leading-relaxed">
            Join thousands of organizations already using EventValidate to streamline 
            their event management and create exceptional member experiences.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/organization-register">
              <Button className="bg-white text-blue-600 hover:bg-blue-50 px-8 py-3 rounded-xl font-semibold shadow-lg transform hover:scale-105 transition-all duration-300">
                Get Started Today
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
            <Link href="/documentation">
              <Button variant="outline" className="border-2 border-white text-white hover:bg-white/10 px-8 py-3 rounded-xl font-semibold">
                Explore Documentation
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}