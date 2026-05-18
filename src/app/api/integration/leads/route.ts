import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { triggerWebhookBroadcast } from '@/lib/webhooks';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
};

/**
 * Handle OPTIONS preflight requests gracefully for CORS compliance.
 */
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: corsHeaders,
  });
}

/**
 * Handle incoming third-party lead imports.
 * Secured by an API Key passed via Bearer authorization token or URL query parameter.
 * Optimized specifically for external automation suites like Zapier.
 */
export async function POST(request: Request) {
  let requestPayload: any = null;
  let targetApiKey = '';

  try {
    // 1. Read request body safely
    try {
      requestPayload = await request.json();
    } catch (e) {
      return NextResponse.json(
        { error: 'Invalid JSON body payload.' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!requestPayload) {
      return NextResponse.json(
        { error: 'Request body cannot be empty.' },
        { status: 400, headers: corsHeaders }
      );
    }

    // 2. Extract API Key from Authorization Header or URL Query Parameter
    const authHeader = request.headers.get('Authorization');
    if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
      targetApiKey = authHeader.substring(7).trim();
    } else {
      const { searchParams } = new URL(request.url);
      targetApiKey = searchParams.get('api_key') || '';
    }

    if (!targetApiKey) {
      // Log failed authorization attempt
      await query(
        `INSERT INTO integration_logs (direction, url, event_type, payload, status_code, status_message) 
         VALUES ('incoming', '/api/integration/leads', 'lead:received', ?, 401, 'Unauthorized: Missing API Key')`,
        [JSON.stringify(requestPayload)]
      );
      return NextResponse.json(
        { error: 'Unauthorized. API Key is required.' },
        { status: 401, headers: corsHeaders }
      );
    }

    // 3. Verify API Key against database records
    const keyMatch = await query<any[]>(
      'SELECT id FROM integration_settings WHERE api_key = ?',
      [targetApiKey]
    );

    if (!keyMatch || keyMatch.length === 0) {
      // Log failed key match
      await query(
        `INSERT INTO integration_logs (direction, url, event_type, payload, status_code, status_message) 
         VALUES ('incoming', '/api/integration/leads', 'lead:received', ?, 401, 'Unauthorized: Invalid API Key')`,
        [JSON.stringify(requestPayload)]
      );
      return NextResponse.json(
        { error: 'Unauthorized. Invalid API Key provided.' },
        { status: 401, headers: corsHeaders }
      );
    }

    // 4. Extract and Sanitize Fields (Optimized for Zapier dynamic strings)
    const { name, email, phone, company, status, lead_score, source, deal_value } = requestPayload;

    if (!name || !String(name).trim()) {
      return NextResponse.json(
        { error: 'Missing required field: name' },
        { status: 400, headers: corsHeaders }
      );
    }
    if (!email || !String(email).trim()) {
      return NextResponse.json(
        { error: 'Missing required field: email' },
        { status: 400, headers: corsHeaders }
      );
    }

    const sanitizedName = String(name).trim();
    const sanitizedEmail = String(email).toLowerCase().trim();

    // Safely parse numbers from possible dynamic strings (Zapier string format compatibility)
    let parsedDealValue = 0.00;
    if (deal_value !== undefined && deal_value !== null && deal_value !== '') {
      const cleanString = String(deal_value).replace(/[^0-9.]/g, '');
      parsedDealValue = parseFloat(cleanString) || 0.00;
    }

    let parsedLeadScore = 50;
    if (lead_score !== undefined && lead_score !== null && lead_score !== '') {
      const cleanString = String(lead_score).replace(/[^0-9]/g, '');
      parsedLeadScore = parseInt(cleanString, 10) || 50;
    }

    // Gracefully parse optional fields (defaulting safely to null or standard default values)
    const valPhone = (phone && String(phone).trim()) ? String(phone).trim() : null;
    const valCompany = (company && String(company).trim()) ? String(company).trim() : null;
    const valStatus = (status && String(status).trim()) ? String(status).trim() : 'Lead';
    const valSource = (source && String(source).trim()) ? String(source).trim() : 'Third Party API';

    // 5. Smart Lead Merging Logic (Check duplicate email using sanitized lower-case email)
    const existing = await query<any[]>(
      'SELECT id, name, phone, company, deal_value, status, lead_score, source FROM contacts WHERE email = ?',
      [sanitizedEmail]
    );

    if (existing && existing.length > 0) {
      // Merge: Update values and append deal values instead of duplicating
      const record = existing[0];
      const mergedValue = Number(record.deal_value || 0) + parsedDealValue;

      await query(
        `UPDATE contacts 
         SET name = ?, phone = ?, company = ?, deal_value = ?, status = ?, lead_score = ? 
         WHERE id = ?`,
        [
          sanitizedName || record.name,
          valPhone || record.phone,
          valCompany || record.company,
          mergedValue,
          valStatus || record.status,
          parsedLeadScore || record.lead_score,
          record.id
        ]
      );

      // Log system activity history trail
      await query(
        `INSERT INTO activities (contact_id, type, description) 
         VALUES (?, 'Lead Updated', ?)`,
        [
          record.id,
          `Lead folder updated via third-party API integration. New deal value added: $${parsedDealValue.toFixed(2)}.`
        ]
      );

      const updatedLead = {
        id: record.id,
        name: sanitizedName || record.name,
        email: sanitizedEmail,
        phone: valPhone || record.phone,
        company: valCompany || record.company,
        status: valStatus || record.status,
        lead_score: parsedLeadScore || record.lead_score,
        deal_value: mergedValue,
        source: record.source
      };

      // Outbound Webhook Broadcast update notification
      triggerWebhookBroadcast('contact:update', updatedLead);

      // Audit log integration logs
      await query(
        `INSERT INTO integration_logs (direction, url, event_type, payload, status_code, status_message) 
         VALUES ('incoming', '/api/integration/leads', 'contact:update', ?, 200, 'Success: Lead Merged')`,
        [JSON.stringify(updatedLead)]
      );

      return NextResponse.json(
        {
          success: true,
          action: 'merged',
          lead: updatedLead
        },
        { status: 200, headers: corsHeaders }
      );

    } else {
      // Insert: Create new lead contact folder
      const result = await query<any>(
        `INSERT INTO contacts (name, email, phone, company, status, lead_score, source, deal_value) 
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          sanitizedName,
          sanitizedEmail,
          valPhone,
          valCompany,
          valStatus,
          parsedLeadScore,
          valSource,
          parsedDealValue
        ]
      );

      const newId = result.insertId;

      // Log system activity history trail
      await query(
        `INSERT INTO activities (contact_id, type, description) 
         VALUES (?, 'Lead Created', ?)`,
        [
          newId,
          `New lead successfully captured via third-party API integration. Source: ${valSource}.`
        ]
      );

      const newLead = {
        id: newId,
        name: sanitizedName,
        email: sanitizedEmail,
        phone: valPhone,
        company: valCompany,
        status: valStatus,
        lead_score: parsedLeadScore,
        source: valSource,
        deal_value: parsedDealValue
      };

      // Outbound Webhook Broadcast creation notification
      triggerWebhookBroadcast('contact:create', newLead);

      // Audit log integration logs
      await query(
        `INSERT INTO integration_logs (direction, url, event_type, payload, status_code, status_message) 
         VALUES ('incoming', '/api/integration/leads', 'contact:create', ?, 201, 'Success: Lead Created')`,
        [JSON.stringify(newLead)]
      );

      return NextResponse.json(
        {
          success: true,
          action: 'created',
          lead: newLead
        },
        { status: 201, headers: corsHeaders }
      );
    }

  } catch (error: any) {
    console.error('Incoming lead API error:', error);
    
    // Log exception
    try {
      await query(
        `INSERT INTO integration_logs (direction, url, event_type, payload, status_code, status_message) 
         VALUES ('incoming', '/api/integration/leads', 'lead:error', ?, 500, ?)`,
        [JSON.stringify(requestPayload || {}), error.message || 'Internal Server Error']
      );
    } catch (e) {}

    return NextResponse.json(
      { error: 'Internal server error processing incoming lead.' },
      { status: 500, headers: corsHeaders }
    );
  }
}
