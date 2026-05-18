import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getAuthenticatedUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized. Session required.' }, { status: 401 });
    }

    const isRep = user.role === 'Sales Rep';
    const contactsFilter = isRep ? 'WHERE assigned_to = ? OR assigned_to IS NULL' : ''; 
    const tasksFilter = isRep ? 'WHERE assigned_to = ? OR assigned_to IS NULL' : '';
    const contactsParams = isRep ? [user.id] : [];
    const tasksParams = isRep ? [user.id] : [];

    // 1. Fetch KPI Summary Metrics
    const summaryData = await query<any[]>(`
      SELECT 
        COUNT(*) as totalContacts,
        SUM(CASE WHEN status = 'Lead' THEN 1 ELSE 0 END) as activeLeads,
        SUM(CASE WHEN status NOT IN ('Closed Won', 'Closed Lost') THEN deal_value ELSE 0 END) as openDealsValue,
        SUM(CASE WHEN status = 'Closed Won' THEN deal_value ELSE 0 END) as totalRevenue,
        SUM(CASE WHEN status = 'Closed Won' THEN 1 ELSE 0 END) as wonDealsCount,
        SUM(CASE WHEN status IN ('Closed Won', 'Closed Lost') THEN 1 ELSE 0 END) as closedDealsCount
      FROM contacts
      ${contactsFilter}
    `, contactsParams);

    const summary = summaryData[0] || {
      totalContacts: 0,
      activeLeads: 0,
      openDealsValue: 0.00,
      totalRevenue: 0.00,
      wonDealsCount: 0,
      closedDealsCount: 0,
    };

    // Calculate Conversion Rate: Won Deals / Total Contacts
    const totalContacts = summary.totalContacts || 0;
    const wonCount = summary.wonDealsCount || 0;
    const conversionRate = totalContacts > 0 ? Math.round((wonCount / totalContacts) * 100) : 0;

    // 2. Fetch Sales Pipeline Stage Distribution
    const pipelineData = await query<any[]>(`
      SELECT 
        status, 
        COUNT(*) as count, 
        SUM(deal_value) as value 
      FROM contacts 
      ${contactsFilter}
      GROUP BY status
    `, contactsParams);

    // Ensure all 6 standard stages exist in the response
    const standardStages = ['Lead', 'Contacted', 'Proposal', 'Negotiation', 'Closed Won', 'Closed Lost'];
    const pipeline = standardStages.map(stage => {
      const match = pipelineData.find(item => item.status === stage);
      return {
        stage,
        count: match ? parseInt(match.count) : 0,
        value: match ? parseFloat(match.value || '0.00') : 0.00
      };
    });

    // 3. Fetch Lead Sources Distribution
    const leadSources = await query<any[]>(`
      SELECT 
        source, 
        COUNT(*) as count, 
        SUM(deal_value) as value 
      FROM contacts 
      ${contactsFilter}
      GROUP BY source
      ORDER BY count DESC
    `, contactsParams);

    // 4. Fetch Monthly Sales Trend (last 12 months)
    const trendData = await query<any[]>(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as monthKey,
        DATE_FORMAT(created_at, '%b %Y') as month,
        SUM(CASE WHEN status = 'Closed Won' THEN deal_value ELSE 0 END) as revenue,
        SUM(deal_value) as pipelineValue
      FROM contacts
      ${contactsFilter}
      GROUP BY monthKey, month
      ORDER BY monthKey ASC
      LIMIT 12
    `, contactsParams);

    // 5. Fetch Tasks Statistics
    const taskStatsData = await query<any[]>(`
      SELECT 
        SUM(CASE WHEN status = 'Completed' THEN 1 ELSE 0 END) as completedTasks,
        SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pendingTasks
      FROM tasks
      ${tasksFilter}
    `, tasksParams);
    const taskStats = taskStatsData[0] || { completedTasks: 0, pendingTasks: 0 };

    return NextResponse.json({
      summary: {
        totalContacts: parseInt(summary.totalContacts || '0'),
        activeLeads: parseInt(summary.activeLeads || '0'),
        openDealsValue: parseFloat(summary.openDealsValue || '0.00'),
        totalRevenue: parseFloat(summary.totalRevenue || '0.00'),
        conversionRate,
        completedTasks: parseInt(taskStats.completedTasks || '0'),
        pendingTasks: parseInt(taskStats.pendingTasks || '0')
      },
      pipeline,
      leadSources: leadSources.map(item => ({
        source: item.source || 'Unknown',
        count: parseInt(item.count),
        value: parseFloat(item.value || '0.00')
      })),
      monthlySalesTrend: trendData.map(item => ({
        month: item.month,
        revenue: parseFloat(item.revenue || '0.00'),
        pipeline: parseFloat(item.pipelineValue || '0.00')
      }))
    });
  } catch (error: any) {
    console.error('Error calculating dashboard statistics:', error);
    return NextResponse.json({ error: error.message || 'Database error' }, { status: 500 });
  }
}
