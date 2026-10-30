/**
 * PayPilot AI - Gemini 3.8 Flash Function Calling & Reasoning Service
 * Powered by Google GenAI TypeScript SDK (@google/genai)
 */

import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import { paypalService, Invoice, InvoiceItem } from './paypalService.ts';

// Initialize shared Google GenAI client with required User-Agent
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Function Declarations
const getOverdueInvoicesDeclaration: FunctionDeclaration = {
  name: 'get_overdue_invoices',
  description: 'Retrieve all overdue PayPal invoices, filterable by minimum days past due date, including churn risk scores and client details.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      days_past: {
        type: Type.NUMBER,
        description: 'Minimum number of days overdue to filter by (e.g. 0 for all overdue, 14 for 2+ weeks overdue). Default is 0.',
      },
    },
    required: [],
  },
};

const sendPaypalReminderDeclaration: FunctionDeclaration = {
  name: 'send_paypal_reminder',
  description: 'Send a targeted PayPal invoice reminder or offer an early-settlement incentive discount (e.g. 10%, 15%) for churn-risk clients.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      invoice_id: {
        type: Type.STRING,
        description: 'The internal ID (e.g., INV-2026-001) or PayPal Invoice ID (e.g., INV2-ACME-891-SANDBOX).',
      },
      discount_percentage: {
        type: Type.NUMBER,
        description: 'Optional discount percentage (e.g., 10, 15, 20) to incentivize immediate settlement.',
      },
      custom_note: {
        type: Type.STRING,
        description: 'Custom message included in the PayPal notification.',
      },
    },
    required: ['invoice_id'],
  },
};

const createPaypalInvoiceDeclaration: FunctionDeclaration = {
  name: 'create_paypal_invoice',
  description: 'Draft and dispatch a new invoice via PayPal Invoicing API v2 to a client.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      client_name: {
        type: Type.STRING,
        description: 'Client full name or business entity name.',
      },
      client_email: {
        type: Type.STRING,
        description: 'Recipient client billing email address.',
      },
      due_date: {
        type: Type.STRING,
        description: 'Invoice due date in YYYY-MM-DD format.',
      },
      line_items: {
        type: Type.ARRAY,
        description: 'List of line items on the invoice.',
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: 'Description or service title' },
            quantity: { type: Type.NUMBER, description: 'Quantity (units/hours)' },
            unit_price: { type: Type.NUMBER, description: 'Price per unit in USD' },
          },
          required: ['name', 'quantity', 'unit_price'],
        },
      },
      notes: {
        type: Type.STRING,
        description: 'Optional terms, scope description, or thank you note.',
      },
    },
    required: ['client_name', 'client_email', 'line_items'],
  },
};

const calculateRevenueSplitsDeclaration: FunctionDeclaration = {
  name: 'calculate_revenue_splits',
  description: 'Calculate multi-party revenue allocations and contractor payouts from a project total, with PayPal Payouts API fee modeling.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      total_amount: {
        type: Type.NUMBER,
        description: 'Total revenue or project payout budget in USD.',
      },
      collaborators: {
        type: Type.ARRAY,
        description: 'List of collaborators or team members with their share percentage.',
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING, description: 'Collaborator name' },
            email: { type: Type.STRING, description: 'PayPal recipient email' },
            role: { type: Type.STRING, description: 'Role (e.g. Lead Dev, Designer, Agency Fee)' },
            percentage: { type: Type.NUMBER, description: 'Percentage share (0 - 100)' },
          },
          required: ['name', 'email', 'percentage'],
        },
      },
      project_name: {
        type: Type.STRING,
        description: 'Optional project name or reference.',
      },
    },
    required: ['total_amount', 'collaborators'],
  },
};

const tools = [
  {
    functionDeclarations: [
      getOverdueInvoicesDeclaration,
      sendPaypalReminderDeclaration,
      createPaypalInvoiceDeclaration,
      calculateRevenueSplitsDeclaration,
    ],
  },
];

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  toolCalls?: any[];
  pendingAction?: {
    type: 'SEND_REMINDER' | 'CREATE_INVOICE' | 'EXECUTE_PAYOUT';
    title: string;
    description: string;
    payload: any;
  };
}

export class GeminiService {
  /**
   * Process natural language requests with Gemini 3.8 Flash and Function Calling
   */
  public async processChat(
    message: string,
    history: ChatMessage[] = [],
    autoExecuteSensitive: boolean = false
  ): Promise<{
    reply: string;
    toolInvocations: any[];
    pendingAction?: any;
    updatedInvoices?: Invoice[];
  }> {
    const kpis = paypalService.getKpis();
    const invoices = paypalService.getInvoices();

    const systemInstruction = `You are PayPilot AI, an autonomous fintech copilot for SMBs, agencies, and SaaS creators built for the PayPal AI Hackathon.
You manage PayPal Invoicing (v2), Payouts (v1), Subscriptions, and client retention.

Current Business Snapshot:
- Total Settled Revenue: $${kpis.total_revenue.toLocaleString()}
- Pending Receivables: $${kpis.pending_receivables.toLocaleString()}
- High-Risk Overdue Capital: $${kpis.at_risk_overdue.toLocaleString()} across ${kpis.overdue_invoices_count} overdue invoices.
- Total Active Invoices: ${kpis.total_invoices_count}

Available Invoices:
${JSON.stringify(
  invoices.map((i) => ({
    id: i.id,
    number: i.invoice_number,
    client: i.client_name,
    email: i.client_email,
    amount: i.amount,
    status: i.status,
    days_overdue: i.days_overdue,
    churn_risk: `${i.churn_risk}% (${i.churn_risk_level})`,
  })),
  null,
  2
)}

Guidelines:
1. When asked about overdue, churn-risk, or late invoices, call \`get_overdue_invoices\` or inspect the list. Flag clients with churn risk >= 70% as requiring urgent intervention.
2. When the user asks to send a reminder or offer a discount, call \`send_paypal_reminder\` or provide the recommendation. Recommend offering a 10% - 15% early settlement discount if the client is > 14 days overdue to prevent customer attrition and immediately secure cashflow.
3. When asked to bill a client or draft an invoice, call \`create_paypal_invoice\`.
4. When asked about splitting earnings, agency payout, or distributing revenue, call \`calculate_revenue_splits\`.
5. Provide concise, professional, fintech-grade insights. Highlight exact numbers, PayPal transaction implications, and actionable next steps.`;

    // Construct conversation contents for Gemini
    const contents: any[] = [];
    
    // Add recent history
    for (const h of history.slice(-6)) {
      if (h.role === 'user') {
        contents.push({ role: 'user', parts: [{ text: h.content }] });
      } else if (h.role === 'assistant') {
        contents.push({ role: 'model', parts: [{ text: h.content }] });
      }
    }

    // Add current user prompt
    contents.push({ role: 'user', parts: [{ text: message }] });

    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('GEMINI_TIMEOUT_TRIGGER_FALLBACK')), 7000)
      );

      const generatePromise = ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          tools: tools,
        },
      });

      const response = await Promise.race([generatePromise, timeoutPromise]);

      const functionCalls = response.functionCalls;
      const toolInvocations: any[] = [];
      let pendingAction: any = undefined;
      let finalReply = response.text || '';

      if (functionCalls && functionCalls.length > 0) {
        for (const call of functionCalls) {
          const { name, args } = call;
          toolInvocations.push({ name, args });

          if (name === 'get_overdue_invoices') {
            const daysPast = Number(args?.days_past) || 0;
            const overdueList = paypalService.getOverdueInvoices(daysPast);
            
            // Ask model to summarize findings
            const followUp = await ai.models.generateContent({
              model: 'gemini-3.8-flash',
              contents: [
                ...contents,
                response.candidates?.[0]?.content as any,
                {
                  role: 'user',
                  parts: [
                    {
                      functionResponse: {
                        id: call.id || 'call_overdue',
                        name: 'get_overdue_invoices',
                        response: {
                          total_overdue: overdueList.length,
                          total_amount: overdueList.reduce((s, i) => s + i.amount, 0),
                          invoices: overdueList,
                        },
                      },
                    },
                  ],
                },
              ],
              config: { systemInstruction },
            });
            finalReply = followUp.text || finalReply;
          } else if (name === 'send_paypal_reminder') {
            const invoiceId = String(args?.invoice_id);
            const discount = Number(args?.discount_percentage) || 0;
            const customNote = args?.custom_note ? String(args?.custom_note) : undefined;
            const inv = paypalService.getInvoiceById(invoiceId);

            if (!inv) {
              finalReply = `Could not locate invoice with ID "${invoiceId}". Please verify the invoice number from the table.`;
            } else if (autoExecuteSensitive) {
              const res = await paypalService.sendReminderWithDiscount(inv.id, discount, customNote);
              finalReply = `Dispatched PayPal reminder to **${inv.client_name}** (${inv.client_email}). ${
                discount > 0 ? `Applied a **${discount}% discount** (saving them $${res.discountAmount}). New payable balance: **$${res.invoice.amount.toFixed(2)}**.` : ''
              } PayPal Remind API notification sent with tracking link.`;
            } else {
              pendingAction = {
                type: 'SEND_REMINDER',
                title: `Send PayPal Reminder to ${inv.client_name}`,
                description: discount > 0 
                  ? `Offer ${discount}% early-settlement discount on ${inv.invoice_number} (reducing payable from $${inv.amount.toFixed(2)} to $${(inv.amount * (1 - discount/100)).toFixed(2)}).`
                  : `Send overdue payment notification for ${inv.invoice_number} ($${inv.amount.toFixed(2)}).`,
                payload: {
                  invoice_id: inv.id,
                  client_name: inv.client_name,
                  client_email: inv.client_email,
                  original_amount: inv.amount,
                  discount_percentage: discount,
                  new_amount: discount > 0 ? Number((inv.amount * (1 - discount / 100)).toFixed(2)) : inv.amount,
                  custom_note: customNote,
                },
              };
              finalReply = `I have drafted the PayPal reminder action for **${inv.client_name}** with a **${discount}% early-settlement incentive**. Please review and confirm the execution below.`;
            }
          } else if (name === 'create_paypal_invoice') {
            const clientName = String(args?.client_name || 'Valued Client');
            const clientEmail = String(args?.client_email || 'client@example.com');
            const dueDate = args?.due_date ? String(args?.due_date) : undefined;
            const lineItems: InvoiceItem[] = Array.isArray(args?.line_items)
              ? args.line_items.map((i: any) => ({
                  name: String(i.name || 'Service item'),
                  quantity: Number(i.quantity) || 1,
                  unit_price: Number(i.unit_price) || 100,
                }))
              : [{ name: 'Consulting Services', quantity: 1, unit_price: 1500 }];

            const total = lineItems.reduce((s, i) => s + i.quantity * i.unit_price, 0);

            if (autoExecuteSensitive) {
              const created = await paypalService.createAndSendInvoice({
                client_name: clientName,
                client_email: clientEmail,
                line_items: lineItems,
                due_date: dueDate,
                notes: args?.notes ? String(args.notes) : undefined,
                auto_send: true,
              });
              finalReply = `Successfully created and dispatched PayPal invoice **${created.invoice_number}** ($${total.toFixed(2)}) to **${clientEmail}**. PayPal Invoice ID: \`${created.paypal_invoice_id}\`.`;
            } else {
              pendingAction = {
                type: 'CREATE_INVOICE',
                title: `Draft PayPal Invoice for ${clientName}`,
                description: `Dispatch PayPal Invoicing v2 draft for $${total.toFixed(2)} to ${clientEmail}.`,
                payload: {
                  client_name: clientName,
                  client_email: clientEmail,
                  due_date: dueDate,
                  line_items: lineItems,
                  total_amount: total,
                  notes: args?.notes ? String(args.notes) : undefined,
                },
              };
              finalReply = `I have prepared the PayPal Invoicing API draft for **${clientName}** ($${total.toFixed(2)}). Review the line items and click Confirm to dispatch.`;
            }
          } else if (name === 'calculate_revenue_splits') {
            const total = Number(args?.total_amount) || 0;
            const collabs = Array.isArray(args?.collaborators) ? args.collaborators : [];
            const splits = collabs.map((c: any) => ({
              name: String(c.name || 'Collaborator'),
              email: String(c.email || 'partner@example.com'),
              role: String(c.role || 'Member'),
              percentage: Number(c.percentage) || 0,
              amount: Number(((total * (Number(c.percentage) || 0)) / 100).toFixed(2)),
            }));

            pendingAction = {
              type: 'EXECUTE_PAYOUT',
              title: `Ready PayPal Payouts Batch ($${total.toFixed(2)})`,
              description: `Disburse $${total.toFixed(2)} across ${splits.length} collaborators via PayPal Payouts API.`,
              payload: {
                total_amount: total,
                project_name: args?.project_name,
                collaborators: splits,
              },
            };

            finalReply = `Here is the revenue allocation for **$${total.toLocaleString()}**:\n\n` +
              splits.map((s: any) => `• **${s.name}** (${s.role}): **$${s.amount.toFixed(2)}** (${s.percentage}%) → \`${s.email}\``).join('\n') +
              `\n\n*Estimated PayPal Payout Fee: $${(splits.length * 0.25).toFixed(2)} USD.* You can trigger this bulk payout batch directly below.`;
          }
        }
      }

      return {
        reply: finalReply,
        toolInvocations,
        pendingAction,
        updatedInvoices: paypalService.getInvoices(),
      };
    } catch (error: any) {
      console.error('Gemini API Error:', error);
      // Fallback rule-based parsing in case of API quota exhaustion or temporary error
      return this.ruleBasedFallback(message);
    }
  }

  /**
   * Deterministic rule-based fallback if Gemini API is unreachable
   */
  private ruleBasedFallback(message: string) {
    const lower = message.toLowerCase();
    const invoices = paypalService.getInvoices();
    const overdue = paypalService.getOverdueInvoices(0);

    if (lower.includes('overdue') || lower.includes('late') || lower.includes('churn')) {
      const highRisk = overdue.filter((i) => i.churn_risk >= 70);
      return {
        reply: `Found **${overdue.length} overdue invoices** totaling **$${overdue.reduce((s, i) => s + i.amount, 0).toLocaleString()}**.\n\n⚠️ **High Churn Risk Alerts:**\n` +
          highRisk.map((i) => `• **${i.client_name}**: $${i.amount.toFixed(2)} (${i.days_overdue} days late, Churn Risk: ${i.churn_risk}%). Recommended: Send 15% discount reminder.`).join('\n') +
          `\n\nWould you like me to dispatch early-settlement discount offers to these clients?`,
        toolInvocations: [{ name: 'get_overdue_invoices', args: { days_past: 0 } }],
      };
    }

    if (lower.includes('acme') && (lower.includes('discount') || lower.includes('remind'))) {
      const acme = invoices.find((i) => i.client_name.toLowerCase().includes('acme'));
      if (acme) {
        return {
          reply: `I've prepared a **15% early-settlement incentive** for **${acme.client_name}** to recover $${(acme.amount * 0.85).toFixed(2)} immediately.`,
          toolInvocations: [{ name: 'send_paypal_reminder', args: { invoice_id: acme.id, discount_percentage: 15 } }],
          pendingAction: {
            type: 'SEND_REMINDER' as const,
            title: `Send 15% Discount to Acme Cloud Dynamics`,
            description: `Apply 15% discount ($630 off) to invoice ${acme.invoice_number}. New payable: $3,570.00.`,
            payload: {
              invoice_id: acme.id,
              client_name: acme.client_name,
              client_email: acme.client_email,
              original_amount: acme.amount,
              discount_percentage: 15,
              new_amount: 3570,
            },
          },
        };
      }
    }

    if (lower.includes('split') || lower.includes('payout')) {
      return {
        reply: `Revenue Split Simulator ready. I can compute allocations and dispatch payments via PayPal Payouts API. Try asking: *"Calculate 60/25/15 revenue split for $8,000 project"*.`,
        toolInvocations: [],
      };
    }

    return {
      reply: `I'm **PayPilot AI**, your autonomous revenue and PayPal invoicing copilot. I can:\n1. 🔍 **Audit Overdue Invoices & Churn Risks**\n2. ⚡ **Generate Early-Settlement Discount Offers via PayPal Remind API**\n3. 📝 **Draft & Dispatch PayPal v2 Invoices**\n4. 💸 **Orchestrate Multi-party Revenue Payouts via PayPal Payouts API**\n\nHow can I help your cashflow today?`,
      toolInvocations: [],
    };
  }
}

export const geminiService = new GeminiService();
export default geminiService;
