import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';


const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function calculateMovingAverage(sales, window = 7) {
  if (!sales.length) return 0;
  if (sales.length < window) {
    return sales.reduce((sum, sale) => sum + sale.quantity, 0) / sales.length;
  }

  const recentSales = sales.slice(-window);
  return recentSales.reduce((sum, sale) => sum + sale.quantity, 0) / window;
}

function calculateConfidence(productSales) {
  if (!productSales?.length) return 0.5;

  const n = productSales.length;

  const confidence = 0.5 + 0.5 * (1 - Math.exp(-n / 20));

  return Math.min(1, parseFloat(confidence.toFixed(2)));
}

export async function GET() {
  try {
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('*')
      .order('name');

    if (productsError) throw productsError;

    const { data: allSales, error: salesError } = await supabase
      .from('sales')
      .select('*')
      .order('date', { ascending: false });

    if (salesError) throw salesError;

    const stockData = products.map(product => {
      const productSales = allSales.filter(sale => sale.product_id === product.id);
      const predictedDemand = Math.round(calculateMovingAverage(productSales, 7));
      const daysOfStock = Math.round(product.stock / (predictedDemand || 1));

      let status;
      if (daysOfStock < 7) status = 'Low Stock';
      else if (daysOfStock < 14) status = 'In Stock';
      else if (daysOfStock > 30) status = 'High Stock';
      else status = 'In Stock';
      const confidence = calculateConfidence(productSales);

      return {
        id: product.id,
        name: product.name,
        stock: product.stock,
        predicted_demand: predictedDemand,
        days_of_stock: daysOfStock,
        status,
        confidence
      };
    });

    const overallInsight = {
      total_products: stockData.length,
      low_stock_count: stockData.filter(p => p.status === 'Low Stock' || p.status === 'In Stock').length,
      urgent_actions: stockData.filter(p => p.status === 'Low Stock').length,
      avg_confidence: (stockData.reduce((sum, i) => sum + i.confidence, 0) / stockData.length).toFixed(2)
    };

    return NextResponse.json({
      products: stockData,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching stock info:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock info: ' + error.message },
      { status: 500 }
    );
  }
}
