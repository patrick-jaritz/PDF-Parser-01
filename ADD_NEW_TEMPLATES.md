# How to Add New Output Structure Templates

## 📋 Current Templates

You currently have **1 template**:
- **Exam Questions** - Extracts exam questions with answers, topics, and difficulty

## 🎯 How Templates Work

Templates are stored in the `structure_templates` table in Supabase with:
- **name**: Display name (e.g., "Invoice", "Receipt")
- **description**: What the template extracts
- **template_schema**: JSON Schema defining the structure
- **is_public**: Whether all users can see it
- **user_id**: NULL for public templates

## 📝 Ways to Add New Templates

### Option 1: Create SQL Migration (Recommended for Deployment)

Create a new file: `supabase/migrations/YYYYMMDDHHMMSS_add_custom_templates.sql`

```sql
-- Add your new templates here
INSERT INTO structure_templates (name, description, template_schema, is_public, user_id)
VALUES
  -- Template 1: Invoice
  (
    'Invoice',
    'Extract invoice details including items, amounts, dates, and vendor info',
    '{
      "type": "object",
      "properties": {
        "invoice_number": {"type": "string"},
        "invoice_date": {"type": "string"},
        "due_date": {"type": "string"},
        "vendor_name": {"type": "string"},
        "vendor_address": {"type": "string"},
        "customer_name": {"type": "string"},
        "customer_address": {"type": "string"},
        "items": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "description": {"type": "string"},
              "quantity": {"type": "number"},
              "unit_price": {"type": "number"},
              "total": {"type": "number"}
            }
          }
        },
        "subtotal": {"type": "number"},
        "tax": {"type": "number"},
        "total_amount": {"type": "number"},
        "payment_terms": {"type": "string"},
        "notes": {"type": "string"}
      }
    }'::jsonb,
    true,
    NULL
  ),
  
  -- Template 2: Receipt
  (
    'Receipt',
    'Extract receipt information including store, date, items, and total',
    '{
      "type": "object",
      "properties": {
        "store_name": {"type": "string"},
        "store_address": {"type": "string"},
        "transaction_date": {"type": "string"},
        "transaction_time": {"type": "string"},
        "receipt_number": {"type": "string"},
        "items": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": {"type": "string"},
              "quantity": {"type": "number"},
              "price": {"type": "number"}
            }
          }
        },
        "subtotal": {"type": "number"},
        "tax": {"type": "number"},
        "total": {"type": "number"},
        "payment_method": {"type": "string"}
      }
    }'::jsonb,
    true,
    NULL
  ),
  
  -- Template 3: Contract
  (
    'Contract',
    'Extract contract details including parties, dates, terms, and clauses',
    '{
      "type": "object",
      "properties": {
        "contract_title": {"type": "string"},
        "contract_date": {"type": "string"},
        "effective_date": {"type": "string"},
        "expiration_date": {"type": "string"},
        "party_1": {
          "type": "object",
          "properties": {
            "name": {"type": "string"},
            "address": {"type": "string"},
            "role": {"type": "string"}
          }
        },
        "party_2": {
          "type": "object",
          "properties": {
            "name": {"type": "string"},
            "address": {"type": "string"},
            "role": {"type": "string"}
          }
        },
        "terms": {
          "type": "array",
          "items": {"type": "string"}
        },
        "payment_terms": {"type": "string"},
        "termination_clause": {"type": "string"},
        "governing_law": {"type": "string"}
      }
    }'::jsonb,
    true,
    NULL
  ),
  
  -- Template 4: Resume/CV
  (
    'Resume/CV',
    'Extract resume information including personal details, education, and experience',
    '{
      "type": "object",
      "properties": {
        "full_name": {"type": "string"},
        "email": {"type": "string"},
        "phone": {"type": "string"},
        "address": {"type": "string"},
        "summary": {"type": "string"},
        "education": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "degree": {"type": "string"},
              "institution": {"type": "string"},
              "graduation_year": {"type": "string"},
              "gpa": {"type": "string"}
            }
          }
        },
        "work_experience": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "job_title": {"type": "string"},
              "company": {"type": "string"},
              "start_date": {"type": "string"},
              "end_date": {"type": "string"},
              "responsibilities": {
                "type": "array",
                "items": {"type": "string"}
              }
            }
          }
        },
        "skills": {
          "type": "array",
          "items": {"type": "string"}
        },
        "certifications": {
          "type": "array",
          "items": {"type": "string"}
        }
      }
    }'::jsonb,
    true,
    NULL
  ),
  
  -- Template 5: Meeting Minutes
  (
    'Meeting Minutes',
    'Extract meeting notes including attendees, agenda, and action items',
    '{
      "type": "object",
      "properties": {
        "meeting_title": {"type": "string"},
        "date": {"type": "string"},
        "time": {"type": "string"},
        "location": {"type": "string"},
        "attendees": {
          "type": "array",
          "items": {"type": "string"}
        },
        "agenda_items": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "topic": {"type": "string"},
              "discussion": {"type": "string"},
              "decision": {"type": "string"}
            }
          }
        },
        "action_items": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "task": {"type": "string"},
              "assignee": {"type": "string"},
              "due_date": {"type": "string"},
              "status": {"type": "string"}
            }
          }
        },
        "next_meeting": {"type": "string"}
      }
    }'::jsonb,
    true,
    NULL
  )
ON CONFLICT DO NOTHING;
```

### Option 2: Insert via Supabase Dashboard (Quick for Testing)

1. Go to: https://supabase.com/dashboard/project/lbjjzisqbihrlosozfgr
2. Click: **Table Editor** (left sidebar)
3. Select: **structure_templates** table
4. Click: **Insert** → **Insert row**
5. Fill in:
   - **name**: "Invoice" (or your template name)
   - **description**: "Extract invoice details..."
   - **template_schema**: Paste JSON schema
   - **is_public**: true
   - **user_id**: NULL

### Option 3: Programmatic (via API or Script)

```typescript
// Run this in browser console or create a script
const { data, error } = await supabase
  .from('structure_templates')
  .insert({
    name: 'Invoice',
    description: 'Extract invoice details including items and amounts',
    template_schema: {
      type: 'object',
      properties: {
        invoice_number: { type: 'string' },
        invoice_date: { type: 'string' },
        vendor_name: { type: 'string' },
        total_amount: { type: 'number' },
        items: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              description: { type: 'string' },
              quantity: { type: 'number' },
              price: { type: 'number' }
            }
          }
        }
      }
    },
    is_public: true,
    user_id: null
  });

console.log('Template added:', data, error);
```

## 🎨 Template Examples

### Simple Document Summary
```json
{
  "type": "object",
  "properties": {
    "title": {"type": "string"},
    "date": {"type": "string"},
    "author": {"type": "string"},
    "summary": {"type": "string"},
    "key_points": {
      "type": "array",
      "items": {"type": "string"}
    }
  }
}
```

### Product Catalog
```json
{
  "type": "object",
  "properties": {
    "catalog_name": {"type": "string"},
    "products": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "product_name": {"type": "string"},
          "product_code": {"type": "string"},
          "price": {"type": "number"},
          "description": {"type": "string"},
          "category": {"type": "string"}
        }
      }
    }
  }
}
```

### Medical Record
```json
{
  "type": "object",
  "properties": {
    "patient_name": {"type": "string"},
    "patient_id": {"type": "string"},
    "date_of_visit": {"type": "string"},
    "diagnosis": {"type": "string"},
    "medications": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "name": {"type": "string"},
          "dosage": {"type": "string"},
          "frequency": {"type": "string"}
        }
      }
    },
    "notes": {"type": "string"}
  }
}
```

### Real Estate Listing
```json
{
  "type": "object",
  "properties": {
    "property_address": {"type": "string"},
    "price": {"type": "number"},
    "bedrooms": {"type": "number"},
    "bathrooms": {"type": "number"},
    "square_footage": {"type": "number"},
    "property_type": {"type": "string"},
    "features": {
      "type": "array",
      "items": {"type": "string"}
    },
    "description": {"type": "string"}
  }
}
```

## ✅ Best Practices

### Template Design Tips:
1. **Use descriptive field names** - `invoice_number` not `num`
2. **Match expected data types** - numbers for amounts, strings for names
3. **Use arrays for lists** - items, attendees, tags, etc.
4. **Nest objects for complex data** - addresses, contacts, etc.
5. **Keep it simple** - Don't over-structure, LLM might miss fields

### Field Types:
- `{"type": "string"}` - Text, dates, names
- `{"type": "number"}` - Numbers, amounts, quantities
- `{"type": "boolean"}` - True/false values
- `{"type": "array", "items": {...}}` - Lists of items
- `{"type": "object", "properties": {...}}` - Nested structures

## 🚀 Quick Add via Browser Console

Want to add a template right now? Open browser console (F12) and run:

```javascript
// Example: Add "Invoice" template
const { data, error } = await supabase
  .from('structure_templates')
  .insert({
    name: 'Invoice',
    description: 'Extract invoice details including items, amounts, and dates',
    template_schema: {
      type: 'object',
      properties: {
        invoice_number: { type: 'string' },
        invoice_date: { type: 'string' },
        vendor_name: { type: 'string' },
        total_amount: { type: 'number' },
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
        }
      }
    },
    is_public: true
  });

console.log('Result:', data, error);

// Reload the page to see the new template!
```

Then just **reload the page** and the new template will appear!

## 🎯 What Do You Want to Create?

Tell me what kind of documents you want to process and I can:
1. Create the perfect template schema for you
2. Add it to the database
3. Test it with your documents

**What types of templates do you need?** 
- Invoices?
- Receipts?
- Contracts?
- Resumes?
- Medical records?
- Custom business forms?

I'll create the exact templates you need! 🚀

