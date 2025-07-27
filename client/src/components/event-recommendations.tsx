import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { 
  Brain, 
  Calendar, 
  MapPin, 
  Users, 
  Star, 
  Clock, 
  DollarSign, 
  Heart,
  Settings,
  Sparkles,
  TrendingUp,
  Eye,
  CheckCircle,
  X
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';

interface EventRecommendation {
  id: number;
  eventId: number;
  score: number;
  reasons: string[];
  status: 'pending' | 'viewed' | 'registered' | 'ignored';
  createdAt: string;
  event: {
    id: number;
    name: string;
    description: string;
    location: string;
    startDate: string;
    endDate: string;
    eligibleAuxiliaryBodies: string[];
    paymentSettings: {
      requiresPayment: boolean;
      amount?: string;
      currency?: string;
    };
  };
}

interface UserPreferences {
  auxiliaryBodies: string[];
  eventTypes: string[];
  locations: string[];
  timePreferences: string[];
  interests: string[];
  priceRange: { min: number; max: number };
  notificationSettings: {
    email: boolean;
    sms: boolean;
    push: boolean;
  };
}

interface EventRecommendationsProps {
  userId?: number;
  limit?: number;
}

const EventRecommendations: React.FC<EventRecommendationsProps> = ({ 
  userId, 
  limit = 5 
}) => {
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<UserPreferences>({
    auxiliaryBodies: [],
    eventTypes: [],
    locations: [],
    timePreferences: [],
    interests: [],
    priceRange: { min: 0, max: 1000 },
    notificationSettings: { email: true, sms: false, push: true }
  });
  
  const queryClient = useQueryClient();

  // Fetch user preferences (public endpoint)
  const { data: userPreferences } = useQuery({
    queryKey: ['/api/users/preferences/public'],
    queryFn: async () => {
      const response = await fetch('/api/users/preferences/public');
      if (!response.ok) throw new Error('Failed to fetch preferences');
      return response.json();
    },
    onSuccess: (data) => {
      if (data.preferences) {
        setPreferences(data.preferences);
      }
    }
  });

  // Fetch personalized recommendations (public endpoint)
  const { data: recommendations, isLoading } = useQuery({
    queryKey: ['/api/recommendations/public', limit],
    queryFn: async () => {
      const response = await fetch(`/api/recommendations/public?limit=${limit}`);
      if (!response.ok) throw new Error('Failed to fetch recommendations');
      return response.json() as EventRecommendation[];
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Note: For public users, we don't support preference updates or recommendation tracking
  // These features require authentication

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-blue-600 bg-blue-50 border-blue-200';
    if (score >= 40) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-gray-600 bg-gray-50 border-gray-200';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 80) return <Sparkles className="h-4 w-4" />;
    if (score >= 60) return <TrendingUp className="h-4 w-4" />;
    if (score >= 40) return <Star className="h-4 w-4" />;
    return <Eye className="h-4 w-4" />;
  };

  // Simplified handlers for public users (no mutation actions)
  const handlePreferencesUpdate = () => {
    setShowPreferences(false);
  };

  const markAsViewed = (recommendationId: number) => {
    // For public users, just dismiss visually (no server update)
    console.log('Viewed recommendation:', recommendationId);
  };

  const ignoreRecommendation = (recommendationId: number) => {
    // For public users, just dismiss visually (no server update)
    console.log('Ignored recommendation:', recommendationId);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Personalized Event Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Personalized Event Recommendations
            </CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreferences(!showPreferences)}
              className="flex items-center gap-2"
            >
              <Settings className="h-4 w-4" />
              Preferences
            </Button>
          </div>
          <p className="text-sm text-gray-600">
            AI-powered recommendations based on your interests and behavior
          </p>
        </CardHeader>
        <CardContent>
          {/* Preferences Panel */}
          {showPreferences && (
            <div className="mb-6 p-4 border rounded-lg bg-gray-50">
              <h3 className="font-medium mb-4">Update Your Preferences</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Interests (comma-separated)</Label>
                  <Textarea
                    value={preferences.interests.join(', ')}
                    onChange={(e) => setPreferences({
                      ...preferences,
                      interests: e.target.value.split(',').map(s => s.trim())
                    })}
                    placeholder="Technology, Sports, Education, Arts..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Preferred Locations</Label>
                  <Textarea
                    value={preferences.locations.join(', ')}
                    onChange={(e) => setPreferences({
                      ...preferences,
                      locations: e.target.value.split(',').map(s => s.trim())
                    })}
                    placeholder="Lagos, Abuja, Online..."
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label>Price Range</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      type="number"
                      placeholder="Min"
                      value={preferences.priceRange.min}
                      onChange={(e) => setPreferences({
                        ...preferences,
                        priceRange: { ...preferences.priceRange, min: parseInt(e.target.value) || 0 }
                      })}
                    />
                    <Input
                      type="number"
                      placeholder="Max"
                      value={preferences.priceRange.max}
                      onChange={(e) => setPreferences({
                        ...preferences,
                        priceRange: { ...preferences.priceRange, max: parseInt(e.target.value) || 1000 }
                      })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Notification Preferences</Label>
                  <div className="space-y-2 mt-2">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={preferences.notificationSettings.email}
                        onCheckedChange={(checked) => setPreferences({
                          ...preferences,
                          notificationSettings: { 
                            ...preferences.notificationSettings, 
                            email: !!checked 
                          }
                        })}
                      />
                      <label className="text-sm">Email notifications</label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        checked={preferences.notificationSettings.push}
                        onCheckedChange={(checked) => setPreferences({
                          ...preferences,
                          notificationSettings: { 
                            ...preferences.notificationSettings, 
                            push: !!checked 
                          }
                        })}
                      />
                      <label className="text-sm">Push notifications</label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <Button onClick={handlePreferencesUpdate}>
                  Save Preferences
                </Button>
                <Button variant="outline" onClick={() => setShowPreferences(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Recommendations List */}
          {!recommendations || recommendations.length === 0 ? (
            <div className="text-center py-8">
              <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-2">No personalized recommendations yet</p>
              <p className="text-sm text-gray-500">
                Update your preferences or register for more events to get better recommendations
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {recommendations.map((recommendation) => (
                <div 
                  key={recommendation.id} 
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Badge className={getScoreColor(recommendation.score)}>
                        {getScoreIcon(recommendation.score)}
                        {recommendation.score}% Match
                      </Badge>
                      {recommendation.status === 'viewed' && (
                        <Badge variant="outline" className="text-blue-600">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Viewed
                        </Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => ignoreRecommendation(recommendation.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <h3 className="font-medium text-lg mb-2">{recommendation.event.name}</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3 text-sm">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(recommendation.event.startDate), 'MMM dd, yyyy')}
                    </div>
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="h-4 w-4" />
                      {recommendation.event.location}
                    </div>
                    {recommendation.event.paymentSettings.requiresPayment && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <DollarSign className="h-4 w-4" />
                        {recommendation.event.paymentSettings.currency} {recommendation.event.paymentSettings.amount}
                      </div>
                    )}
                  </div>

                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {recommendation.event.description}
                  </p>

                  {/* Recommendation Reasons */}
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-500 mb-2">Why this was recommended:</p>
                    <div className="flex flex-wrap gap-2">
                      {recommendation.reasons.map((reason, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {reason}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      size="sm"
                      onClick={() => {
                        markAsViewed(recommendation.id);
                        window.location.href = `/events/${recommendation.event.id}`;
                      }}
                    >
                      View Event
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => markAsViewed(recommendation.id)}
                    >
                      <Heart className="h-4 w-4 mr-2" />
                      Interested
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Refresh Note */}
          <div className="mt-6 text-center text-sm text-gray-500">
            <span className="flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              Recommendations update every 30 seconds based on your activity
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EventRecommendations;