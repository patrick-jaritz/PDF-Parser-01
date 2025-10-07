import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

const TEMPLATES = [
  {
    name: 'Invoice',
    description: 'Extract invoice details including items, amounts, dates, and vendor information',
    template_schema: {
      type: 'object',
      properties: {
        invoice_number: { type: 'string' },
        invoice_date: { type: 'string' },
        due_date: { type: 'string' },
        vendor_name: { type: 'string' },
        vendor_address: { type: 'string' },
        customer_name: { type: 'string' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              quantity: { type: 'number' },
              unit_price: { type: 'number' },
              total: { type: 'number' }
            }
          }
        },
        subtotal: { type: 'number' },
        tax: { type: 'number' },
        total_amount: { type: 'number' }
      }
    }
  },
  {
    name: 'Receipt',
    description: 'Extract receipt information including store details, items, and payment',
    template_schema: {
      type: 'object',
      properties: {
        store_name: { type: 'string' },
        store_address: { type: 'string' },
        transaction_date: { type: 'string' },
        transaction_time: { type: 'string' },
        receipt_number: { type: 'string' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              quantity: { type: 'number' },
              unit_price: { type: 'number' },
              total_price: { type: 'number' }
            }
          }
        },
        subtotal: { type: 'number' },
        tax: { type: 'number' },
        total: { type: 'number' },
        payment_method: { type: 'string' }
      }
    }
  },
  {
    name: 'Contract',
    description: 'Extract contract details including parties, dates, terms, and clauses',
    template_schema: {
      type: 'object',
      properties: {
        contract_title: { type: 'string' },
        contract_date: { type: 'string' },
        effective_date: { type: 'string' },
        party_1: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            address: { type: 'string' },
            role: { type: 'string' }
          }
        },
        party_2: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            address: { type: 'string' },
            role: { type: 'string' }
          }
        },
        terms: {
          type: 'array',
          items: { type: 'string' }
        },
        payment_terms: { type: 'string' }
      }
    }
  },
  {
    name: 'Document Summary',
    description: 'Extract a general summary with title, dates, authors, and key points',
    template_schema: {
      type: 'object',
      properties: {
        title: { type: 'string' },
        date: { type: 'string' },
        author: { type: 'string' },
        summary: { type: 'string' },
        key_points: {
          type: 'array',
          items: { type: 'string' }
        }
      }
    }
  },
  {
    name: 'Business Card',
    description: 'Extract business card information including contact details',
    template_schema: {
      type: 'object',
      properties: {
        full_name: { type: 'string' },
        job_title: { type: 'string' },
        company_name: { type: 'string' },
        email: { type: 'string' },
        phone: { type: 'string' },
        website: { type: 'string' },
        address: { type: 'string' }
      }
    }
  }
];

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '' // Uses service role to bypass RLS
    );

    const results = {
      added: [] as string[],
      skipped: [] as string[],
      failed: [] as string[]
    };

    for (const template of TEMPLATES) {
      try {
        const { data, error } = await supabaseClient
          .from('structure_templates')
          .insert({
            name: template.name,
            description: template.description,
            template_schema: template.template_schema,
            is_public: true,
            user_id: null
          });

        if (error) {
          if (error.code === '23505') { // Unique violation
            results.skipped.push(template.name);
          } else {
            results.failed.push(template.name);
            console.error(`Failed to add ${template.name}:`, error);
          }
        } else {
          results.added.push(template.name);
        }
      } catch (err) {
        results.failed.push(template.name);
        console.error(`Error adding ${template.name}:`, err);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: `Added ${results.added.length} templates`,
        results
      }),
      {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to add templates'
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});

