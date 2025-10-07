/*
  # Add Comprehensive Document Templates
  
  Adds a complete set of output structure templates for common document types:
  - Invoice
  - Receipt
  - Contract
  - Resume/CV
  - Meeting Minutes
  - Product Catalog
  - Medical Record
  - Real Estate Listing
  - Document Summary
*/

-- Insert all templates
INSERT INTO structure_templates (name, description, template_schema, is_public, user_id)
VALUES
  -- Template 1: Invoice
  (
    'Invoice',
    'Extract invoice details including items, amounts, dates, and vendor information',
    '{
      "type": "object",
      "properties": {
        "invoice_number": {"type": "string"},
        "invoice_date": {"type": "string"},
        "due_date": {"type": "string"},
        "vendor_name": {"type": "string"},
        "vendor_address": {"type": "string"},
        "vendor_email": {"type": "string"},
        "vendor_phone": {"type": "string"},
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
        "tax_rate": {"type": "number"},
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
    'Extract receipt information including store details, items, and payment',
    '{
      "type": "object",
      "properties": {
        "store_name": {"type": "string"},
        "store_address": {"type": "string"},
        "store_phone": {"type": "string"},
        "transaction_date": {"type": "string"},
        "transaction_time": {"type": "string"},
        "receipt_number": {"type": "string"},
        "cashier_name": {"type": "string"},
        "items": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": {"type": "string"},
              "quantity": {"type": "number"},
              "unit_price": {"type": "number"},
              "total_price": {"type": "number"}
            }
          }
        },
        "subtotal": {"type": "number"},
        "tax": {"type": "number"},
        "total": {"type": "number"},
        "payment_method": {"type": "string"},
        "card_last_4": {"type": "string"}
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
        "contract_type": {"type": "string"},
        "contract_number": {"type": "string"},
        "contract_date": {"type": "string"},
        "effective_date": {"type": "string"},
        "expiration_date": {"type": "string"},
        "party_1": {
          "type": "object",
          "properties": {
            "name": {"type": "string"},
            "address": {"type": "string"},
            "role": {"type": "string"},
            "representative": {"type": "string"}
          }
        },
        "party_2": {
          "type": "object",
          "properties": {
            "name": {"type": "string"},
            "address": {"type": "string"},
            "role": {"type": "string"},
            "representative": {"type": "string"}
          }
        },
        "terms": {
          "type": "array",
          "items": {"type": "string"}
        },
        "payment_terms": {"type": "string"},
        "termination_clause": {"type": "string"},
        "renewal_terms": {"type": "string"},
        "governing_law": {"type": "string"},
        "jurisdiction": {"type": "string"}
      }
    }'::jsonb,
    true,
    NULL
  ),
  
  -- Template 4: Resume/CV
  (
    'Resume/CV',
    'Extract resume information including personal details, education, work experience, and skills',
    '{
      "type": "object",
      "properties": {
        "full_name": {"type": "string"},
        "email": {"type": "string"},
        "phone": {"type": "string"},
        "address": {"type": "string"},
        "linkedin": {"type": "string"},
        "website": {"type": "string"},
        "professional_summary": {"type": "string"},
        "education": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "degree": {"type": "string"},
              "field_of_study": {"type": "string"},
              "institution": {"type": "string"},
              "graduation_year": {"type": "string"},
              "gpa": {"type": "string"},
              "honors": {"type": "string"}
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
              "location": {"type": "string"},
              "start_date": {"type": "string"},
              "end_date": {"type": "string"},
              "responsibilities": {
                "type": "array",
                "items": {"type": "string"}
              },
              "achievements": {
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
          "items": {
            "type": "object",
            "properties": {
              "name": {"type": "string"},
              "issuer": {"type": "string"},
              "date": {"type": "string"}
            }
          }
        },
        "languages": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "language": {"type": "string"},
              "proficiency": {"type": "string"}
            }
          }
        }
      }
    }'::jsonb,
    true,
    NULL
  ),
  
  -- Template 5: Meeting Minutes
  (
    'Meeting Minutes',
    'Extract meeting notes including attendees, agenda items, decisions, and action items',
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
        "absent": {
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
              "decision": {"type": "string"},
              "vote_result": {"type": "string"}
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
              "priority": {"type": "string"},
              "status": {"type": "string"}
            }
          }
        },
        "next_meeting": {"type": "string"},
        "notes": {"type": "string"}
      }
    }'::jsonb,
    true,
    NULL
  ),
  
  -- Template 6: Product Catalog
  (
    'Product Catalog',
    'Extract product catalog information including items, prices, and specifications',
    '{
      "type": "object",
      "properties": {
        "catalog_name": {"type": "string"},
        "catalog_date": {"type": "string"},
        "company_name": {"type": "string"},
        "products": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "product_name": {"type": "string"},
              "product_code": {"type": "string"},
              "category": {"type": "string"},
              "price": {"type": "number"},
              "description": {"type": "string"},
              "specifications": {
                "type": "array",
                "items": {"type": "string"}
              },
              "availability": {"type": "string"},
              "dimensions": {"type": "string"},
              "weight": {"type": "string"}
            }
          }
        }
      }
    }'::jsonb,
    true,
    NULL
  ),
  
  -- Template 7: Medical Record
  (
    'Medical Record',
    'Extract medical record information including patient details, diagnosis, and treatment',
    '{
      "type": "object",
      "properties": {
        "patient_name": {"type": "string"},
        "patient_id": {"type": "string"},
        "date_of_birth": {"type": "string"},
        "date_of_visit": {"type": "string"},
        "doctor_name": {"type": "string"},
        "facility_name": {"type": "string"},
        "chief_complaint": {"type": "string"},
        "symptoms": {
          "type": "array",
          "items": {"type": "string"}
        },
        "diagnosis": {"type": "string"},
        "medications": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "name": {"type": "string"},
              "dosage": {"type": "string"},
              "frequency": {"type": "string"},
              "duration": {"type": "string"}
            }
          }
        },
        "tests_ordered": {
          "type": "array",
          "items": {"type": "string"}
        },
        "follow_up": {"type": "string"},
        "notes": {"type": "string"}
      }
    }'::jsonb,
    true,
    NULL
  ),
  
  -- Template 8: Real Estate Listing
  (
    'Real Estate Listing',
    'Extract property listing details including features, price, and specifications',
    '{
      "type": "object",
      "properties": {
        "property_address": {"type": "string"},
        "listing_price": {"type": "number"},
        "property_type": {"type": "string"},
        "bedrooms": {"type": "number"},
        "bathrooms": {"type": "number"},
        "square_footage": {"type": "number"},
        "lot_size": {"type": "string"},
        "year_built": {"type": "number"},
        "features": {
          "type": "array",
          "items": {"type": "string"}
        },
        "appliances": {
          "type": "array",
          "items": {"type": "string"}
        },
        "description": {"type": "string"},
        "hoa_fees": {"type": "number"},
        "property_taxes": {"type": "number"},
        "agent_name": {"type": "string"},
        "agent_contact": {"type": "string"},
        "showing_instructions": {"type": "string"}
      }
    }'::jsonb,
    true,
    NULL
  ),
  
  -- Template 9: Document Summary
  (
    'Document Summary',
    'Extract a general summary with title, dates, authors, and key points',
    '{
      "type": "object",
      "properties": {
        "title": {"type": "string"},
        "document_type": {"type": "string"},
        "date": {"type": "string"},
        "author": {"type": "string"},
        "organization": {"type": "string"},
        "summary": {"type": "string"},
        "key_points": {
          "type": "array",
          "items": {"type": "string"}
        },
        "conclusions": {"type": "string"},
        "recommendations": {
          "type": "array",
          "items": {"type": "string"}
        },
        "references": {
          "type": "array",
          "items": {"type": "string"}
        }
      }
    }'::jsonb,
    true,
    NULL
  ),
  
  -- Template 10: Business Card
  (
    'Business Card',
    'Extract business card information including contact details',
    '{
      "type": "object",
      "properties": {
        "full_name": {"type": "string"},
        "job_title": {"type": "string"},
        "company_name": {"type": "string"},
        "email": {"type": "string"},
        "phone": {"type": "string"},
        "mobile": {"type": "string"},
        "fax": {"type": "string"},
        "website": {"type": "string"},
        "address": {"type": "string"},
        "linkedin": {"type": "string"},
        "other_social": {"type": "string"}
      }
    }'::jsonb,
    true,
    NULL
  ),
  
  -- Template 11: Purchase Order
  (
    'Purchase Order',
    'Extract purchase order details including items, quantities, and delivery info',
    '{
      "type": "object",
      "properties": {
        "po_number": {"type": "string"},
        "po_date": {"type": "string"},
        "buyer_name": {"type": "string"},
        "buyer_address": {"type": "string"},
        "supplier_name": {"type": "string"},
        "supplier_address": {"type": "string"},
        "ship_to_address": {"type": "string"},
        "delivery_date": {"type": "string"},
        "items": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "item_code": {"type": "string"},
              "description": {"type": "string"},
              "quantity": {"type": "number"},
              "unit_price": {"type": "number"},
              "total": {"type": "number"}
            }
          }
        },
        "subtotal": {"type": "number"},
        "shipping": {"type": "number"},
        "tax": {"type": "number"},
        "total_amount": {"type": "number"},
        "payment_terms": {"type": "string"},
        "special_instructions": {"type": "string"}
      }
    }'::jsonb,
    true,
    NULL
  ),
  
  -- Template 12: Lab Report
  (
    'Lab Report',
    'Extract laboratory test results and findings',
    '{
      "type": "object",
      "properties": {
        "patient_name": {"type": "string"},
        "patient_id": {"type": "string"},
        "test_date": {"type": "string"},
        "report_date": {"type": "string"},
        "ordering_physician": {"type": "string"},
        "lab_name": {"type": "string"},
        "test_results": {
          "type": "array",
          "items": {
            "type": "object",
            "properties": {
              "test_name": {"type": "string"},
              "result": {"type": "string"},
              "normal_range": {"type": "string"},
              "units": {"type": "string"},
              "flag": {"type": "string"}
            }
          }
        },
        "overall_findings": {"type": "string"},
        "recommendations": {"type": "string"},
        "technician_name": {"type": "string"}
      }
    }'::jsonb,
    true,
    NULL
  )
ON CONFLICT DO NOTHING;

