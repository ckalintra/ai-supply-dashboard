'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TrendingUp, Package, AlertCircle, RefreshCw, Activity } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface Product {
  id: string;
  name: string;
  stock: number;
  status: string;
}

interface Sale {
  id: string;
  product_id: string;
  quantity: number;
  date: string;
  revenue: number;
}

interface Insight {
  product_id: string;
  product_name: string;
  current_stock: number;
  predicted_demand: number;
  recommendation: string;
  recommendation_type: string;
  confidence: number;
  days_of_stock: number;
}

interface InsightsData {
  insights: Insight[];
  summary: {
    total_products: number;
    low_stock_count: number;
    urgent_actions: number;
    avg_confidence: string;
  };
  generated_at: string;
}

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [insights, setInsights] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [productDatas, salesRes] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase.from('sales').select('*').order('date', { ascending: true })
      ]);

      const response = await fetch('/api/stocks');

      const productsRes = await response.json();
console.log(productsRes.products, 'zaazas')
      if (productsRes?.products) setProducts(productsRes.products);
      if (salesRes.data) setSales(salesRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchInsights = async () => {
    setRefreshing(true);
    try {
      const response = await fetch('/api/insights');
      console.log(response, 'aaa');
      const data = await response.json();

      setInsights(data);
    } catch (error) {
      console.error('Error fetching insights:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchInsights();
  }, []);

  useEffect(() => {
    const datas = sales.reduce((acc, sale) => {
      const date = new Date(sale.date).toISOString().split('T')[0];

      const existing = acc.find(item => item.date === date);
      if (existing) {
        existing.sales += sale.quantity;
        existing.revenue += Number(sale.revenue);
      } else {
        acc.push({
          date,
          sales: sale.quantity,
          revenue: Number(sale.revenue),
        });
      }
      return acc;
    }, [] as { date: string; sales: number; revenue: number }[])
    .slice(-14);
    console.table(datas);
    setChartData(datas);
  }, [sales]);

  const getStatusBadge = (status: string) => {
    const variants = {
      'High Stock': 'default',
      'In Stock': 'outline',
      'Low Stock': 'destructive'
    };
    return (
      <Badge variant={variants[status as keyof typeof variants] as any}>
        {status}
      </Badge>
    );
  };

  const getRecommendationColor = (type: string) => {
    const colors = {
      urgent: 'text-red-600 bg-red-50 border-red-200',
      warning: 'text-yellow-600 bg-yellow-50 border-yellow-200',
      info: 'text-blue-600 bg-blue-50 border-blue-200',
      success: 'text-green-600 bg-green-50 border-green-200'
    };
    return colors[type as keyof typeof colors] || colors.info;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <Activity className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="max-w-7xl mx-auto p-6 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-slate-900 flex items-center gap-3">
              <Activity className="w-10 h-10 text-blue-600" />
              AI Supply Dashboard
            </h1>
            <p className="text-slate-600 mt-2">
              Real-time manufacturing intelligence and demand forecasting
            </p>
          </div>
          {insights && (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-slate-500">Last Updated</p>
                <p className="text-sm font-medium text-slate-700">
                  {new Date(insights.generated_at).toLocaleTimeString()}
                </p>
              </div>
            </div>
          )}
        </div>

        {insights && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Total Products</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold text-slate-900">{insights.summary.total_products}</p>
                  <Package className="w-8 h-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Low Stock Items</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold text-orange-600">{insights.summary.low_stock_count}</p>
                  <AlertCircle className="w-8 h-8 text-orange-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Urgent Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold text-red-600">{insights.summary.urgent_actions}</p>
                  <TrendingUp className="w-8 h-8 text-red-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-slate-200 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Avg Confidence</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <p className="text-3xl font-bold text-green-600">{(parseFloat(insights.summary.avg_confidence) * 100).toFixed(0)}%</p>
                  <Activity className="w-8 h-8 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="bg-white border-slate-200 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-600" />
                Current Stock
              </CardTitle>
              <CardDescription>Real-time inventory levels</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead className="text-right">Stock</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell className="text-right tabular-nums">{product.stock}</TableCell>
                      <TableCell className="text-right">{getStatusBadge(product.status)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {chartData.length > 0 &&
            <Card className="bg-white border-slate-200 shadow-md">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  Recent Sales Trend
                </CardTitle>
                <CardDescription>Last 14 days of sales activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="w-full h-[250px] sm:h-[300px] md:h-[350px] lg:h-[400px]">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={chartData} width={554} height={300}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="date"
                        tick={{ fontSize: 12 }}
                        tickFormatter={(value) => new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '1px solid #e2e8f0',
                          borderRadius: '8px'
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="sales"
                        stroke="#3b82f6"
                        strokeWidth={2}
                        dot={{ fill: '#3b82f6', r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          }
        </div>

        {insights && (
          <Card className="bg-white border-slate-200 shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-blue-600" />
                AI Insights & Recommendations
              </CardTitle>
              <CardDescription>
                Machine learning-powered demand forecasting and inventory optimization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {insights.insights.map((insight) => (
                  <div
                    key={insight.product_id}
                    className={`p-4 rounded-lg border ${getRecommendationColor(insight.recommendation_type)}`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h4 className="font-semibold text-lg">{insight.product_name}</h4>
                        <p className="text-sm opacity-80">
                          Current Stock: {insight.current_stock} units |
                          Predicted Daily Demand: {insight.predicted_demand} units |
                          Days of Stock: {insight.days_of_stock}
                        </p>
                      </div>
                      <Badge variant="secondary" className="ml-2">
                        {(insight.confidence * 100).toFixed(0)}% confident
                      </Badge>
                    </div>
                    <p className="mt-2">{insight.recommendation}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
