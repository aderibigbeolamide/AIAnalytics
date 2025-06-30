import { useState } from "react";
import { Navbar } from "@/components/navbar";
import { QRScanner } from "@/components/qr-scanner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Scanner() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">QR Code Scanner</h1>
          <p className="text-gray-600">Scan QR codes to validate event attendance</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Event Validation Scanner</CardTitle>
          </CardHeader>
          <CardContent>
            <QRScanner onClose={() => {}} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
