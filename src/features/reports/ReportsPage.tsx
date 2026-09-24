import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart, LineChart, PieChart, Download } from 'lucide-react';
import { formatINR } from '@/domain/money';

export function ReportsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Reports & Analytics</h2>
          <p className="text-muted-foreground">
            Key performance indicators and financial summaries.
          </p>
        </div>
        <div className="space-x-2">
          <Button variant="outline"><Download className="w-4 h-4 mr-2"/> Export CSV</Button>
          <Button><Download className="w-4 h-4 mr-2"/> Download PDF Report</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Daily Revenue (Rooms)</CardTitle>
            <div className="text-2xl font-bold text-primary">{formatINR(12500000)}</div> {/* ₹1,25,000 */}
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Daily Revenue (F&B)</CardTitle>
            <div className="text-2xl font-bold text-primary">{formatINR(4500000)}</div> {/* ₹45,000 */}
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">Occupancy Rate</CardTitle>
            <div className="text-2xl font-bold">85%</div>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">RevPAR</CardTitle>
            <div className="text-2xl font-bold">{formatINR(350000)}</div> {/* ₹3,500 */}
          </CardHeader>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="h-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LineChart className="w-5 h-5 text-muted-foreground" />
              7-Day Revenue Trend
            </CardTitle>
            <CardDescription>Room vs F&B Revenue</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-64 border-t border-dashed m-4 bg-muted/20">
            <span className="text-muted-foreground">Chart Visualization Area (Recharts/Chart.js)</span>
          </CardContent>
        </Card>

        <Card className="h-96">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-muted-foreground" />
              Revenue by Source
            </CardTitle>
            <CardDescription>Walk-in, OTA, Corporate</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-64 border-t border-dashed m-4 bg-muted/20">
            <span className="text-muted-foreground">Chart Visualization Area</span>
          </CardContent>
        </Card>

        <Card className="h-96 md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart className="w-5 h-5 text-muted-foreground" />
              Monthly Expenses vs Revenue
            </CardTitle>
            <CardDescription>Profitability Tracking</CardDescription>
          </CardHeader>
          <CardContent className="flex items-center justify-center h-64 border-t border-dashed m-4 bg-muted/20">
            <span className="text-muted-foreground">Chart Visualization Area</span>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
