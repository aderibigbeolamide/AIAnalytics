import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, DollarSign, Receipt, Calendar, Ticket } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function MyPayments() {
  const [email, setEmail] = useState("");
  const [searchEmail, setSearchEmail] = useState("");
  const { toast } = useToast();

  const { data: paymentsData, isLoading, refetch } = useQuery({
    queryKey: ["/api/payments/customer", searchEmail],
    enabled: !!searchEmail,
    retry: false,
    meta: {
      onError: () => {
        toast({
          title: "No payments found",
          description: "No payment records found for this email address",
          variant: "destructive",
        });
      }
    }
  });

  const handleSearch = () => {
    if (!email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your email address to search for payments",
        variant: "destructive",
      });
      return;
    }
    setSearchEmail(email.trim());
    refetch();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: currency || 'NGN'
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            My Payment History
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            View your ticket purchases and event registrations
          </p>
        </div>

        {/* Search Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="w-5 h-5" />
              Find Your Payments
            </CardTitle>
            <CardDescription>
              Enter your email address to view your payment history
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Input
                type="email"
                placeholder="Enter your email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                className="flex-1"
              />
              <Button onClick={handleSearch} disabled={isLoading}>
                {isLoading ? "Searching..." : "Search"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Section */}
        {searchEmail && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Receipt className="w-5 h-5" />
                Payment History for {searchEmail}
              </CardTitle>
              {paymentsData && (
                <CardDescription>
                  {paymentsData.totalPayments} payments • Total: {formatAmount(paymentsData.totalAmount, 'NGN')}
                </CardDescription>
              )}
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : !paymentsData || paymentsData.payments.length === 0 ? (
                <div className="text-center py-8">
                  <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-600 dark:text-gray-400">No payments found for this email</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Make sure you entered the correct email address
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {paymentsData.payments.map((payment: any) => (
                    <div key={payment.id} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          {payment.type === 'ticket' ? (
                            <Ticket className="w-5 h-5 text-blue-600" />
                          ) : (
                            <Calendar className="w-5 h-5 text-green-600" />
                          )}
                          <div>
                            <h4 className="font-medium text-gray-900 dark:text-white">
                              {payment.eventName}
                            </h4>
                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              {payment.type === 'ticket' ? (
                                <>Ticket: {payment.ticketNumber} • {payment.category}</>
                              ) : (
                                <>Registration: {payment.participantName}</>
                              )}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg text-gray-900 dark:text-white">
                            {formatAmount(payment.amount, payment.currency)}
                          </p>
                          <Badge variant={payment.status === 'paid' ? 'default' : 'secondary'}>
                            {payment.status.toUpperCase()}
                          </Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-300">
                        <div>
                          <span className="font-medium">Payment Method:</span> {payment.paymentMethod === 'paystack' ? 'Online Payment' : 'Manual Payment'}
                        </div>
                        <div>
                          <span className="font-medium">Date:</span> {formatDate(payment.createdAt)}
                        </div>
                        <div className="col-span-2">
                          <span className="font-medium">Reference:</span> {payment.reference}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}