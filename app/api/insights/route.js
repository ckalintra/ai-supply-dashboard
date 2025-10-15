import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

function calculateMovingAverage(sales, window = 7) {
  if (sales.length < window) {
    return sales.reduce((sum, sale) => sum + sale.quantity, 0) / sales.length;
  }

  const recentSales = sales.slice(-window);
  return recentSales.reduce((sum, sale) => sum + sale.quantity, 0) / window;
}

function generateRecommendation(product, predictedDemand) {
  const daysOfStock = product.stock / (predictedDemand || 1);

  if (daysOfStock < 7) {
    return {
      text: `Increase production of ${product.name}. Current stock will last only ${Math.round(daysOfStock)} days.`,
      type: 'urgent'
    };
  } else if (daysOfStock < 14) {
    return {
      text: `Monitor ${product.name} closely. Stock levels adequate for ${Math.round(daysOfStock)} days.`,
      type: 'warning'
    };
  } else if (daysOfStock > 30) {
    return {
      text: `Consider reducing production of ${product.name}. High inventory levels detected.`,
      type: 'info'
    };
  } else {
    return {
      text: `${product.name} stock levels are optimal. Continue current production schedule.`,
      type: 'success'
    };
  }
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

    const insights = [];

    for (const product of products) {
      const productSales = allSales.filter(sale => sale.product_id === product.id);
      const predictedDemand = Math.round(calculateMovingAverage(productSales, 7));
      const recommendation = generateRecommendation(product, predictedDemand);

      const confidence = calculateConfidence(productSales);

      insights.push({
        product_id: product.id,
        product_name: product.name,
        current_stock: product.stock,
        predicted_demand: predictedDemand,
        recommendation: recommendation.text,
        recommendation_type: recommendation.type,
        confidence: confidence,
        days_of_stock: Math.round(product.stock / (predictedDemand || 1))
      });
    }

    const overallInsight = {
      total_products: products.length,
      low_stock_count: products.filter(p => p.status === 'Low Stock' || p.status === 'Out of Stock').length,
      urgent_actions: insights.filter(i => i.recommendation_type === 'urgent').length,
      avg_confidence: (insights.reduce((sum, i) => sum + i.confidence, 0) / insights.length).toFixed(2)
    };

    return NextResponse.json({
      insights,
      summary: overallInsight,
      generated_at: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating insights:', error);
    return NextResponse.json(
      { error: 'Failed to generate insights: ' + error },
      { status: 500 }
    );
  }
}
