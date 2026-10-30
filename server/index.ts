/**
 * PayPilot AI - Express API Router & Route Handlers
 */

import { Router, Request, Response } from 'express';
import { paypalService } from './paypalService.ts';
import { geminiService } from './geminiService.ts';

export const apiRouter = Router();

// GET /api/kpis - Financial & Churn health metrics
apiRouter.get('/kpis', (_req: Request, res: Response) => {
  try {
    const kpis = paypalService.getKpis();
    const mode = paypalService.getMode();
    res.json({ success: true, kpis, mode });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/invoices - List all invoices with churn risk
apiRouter.get('/invoices', (_req: Request, res: Response) => {
  try {
    const invoices = paypalService.getInvoices();
    res.json({ success: true, count: invoices.length, invoices });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/paypal/create-invoice - Draft & Send invoice via PayPal Invoicing API v2
apiRouter.post('/paypal/create-invoice', async (req: Request, res: Response) => {
  try {
    const { client_name, client_email, line_items, due_date, notes, auto_send } = req.body;
    if (!client_name || !client_email || !line_items || !Array.isArray(line_items)) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: client_name, client_email, and line_items array.',
      });
    }

    const invoice = await paypalService.createAndSendInvoice({
      client_name,
      client_email,
      line_items,
      due_date,
      notes,
      auto_send: auto_send !== false,
    });

    res.status(201).json({
      success: true,
      message: `Invoice ${invoice.invoice_number} created and dispatched via PayPal Invoicing API.`,
      invoice,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/paypal/send-discount - Send reminder with discount to reduce churn risk
apiRouter.post('/paypal/send-discount', async (req: Request, res: Response) => {
  try {
    const { invoice_id, discount_percentage, custom_note } = req.body;
    if (!invoice_id) {
      return res.status(400).json({ success: false, error: 'invoice_id is required' });
    }

    const result = await paypalService.sendReminderWithDiscount(
      invoice_id,
      Number(discount_percentage) || 0,
      custom_note
    );

    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/paypal/payout - Execute bulk or split payouts via PayPal Payouts API v1
apiRouter.post('/paypal/payout', async (req: Request, res: Response) => {
  try {
    const { total_amount, collaborators, currency, note } = req.body;
    if (!total_amount || !collaborators || !Array.isArray(collaborators)) {
      return res.status(400).json({
        success: false,
        error: 'total_amount and collaborators array are required.',
      });
    }

    const batch = await paypalService.executePayout({
      total_amount: Number(total_amount),
      collaborators,
      currency,
      note,
    });

    res.status(201).json({
      success: true,
      message: `PayPal Payouts batch ${batch.batch_id} processed successfully.`,
      batch,
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/paypal/webhook - Incoming webhook notification receiver
apiRouter.post('/paypal/webhook', (req: Request, res: Response) => {
  try {
    const result = paypalService.handleWebhook(req.headers, req.body);
    res.status(200).json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/paypal/simulate-webhook - Interactive simulation of PayPal webhooks for testing
apiRouter.post('/paypal/simulate-webhook', (req: Request, res: Response) => {
  try {
    const { event_type, invoice_id } = req.body;
    const event = paypalService.simulateWebhook(event_type || 'INVOICING.INVOICE.PAID', invoice_id);
    res.json({
      success: true,
      message: `Simulated PayPal webhook ${event.event_type} processed.`,
      event,
      updated_invoices: paypalService.getInvoices(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/paypal/logs - Raw PayPal Sandbox request/response logs for live terminal
apiRouter.get('/paypal/logs', (_req: Request, res: Response) => {
  try {
    const logs = paypalService.getLogs();
    res.json({ success: true, count: logs.length, logs });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/paypal/logs/clear - Clear debug logs
apiRouter.post('/paypal/logs/clear', (_req: Request, res: Response) => {
  paypalService.clearLogs();
  res.json({ success: true, message: 'Sandbox logs cleared' });
});

// GET /api/paypal/webhooks - List received webhook events
apiRouter.get('/paypal/webhooks', (_req: Request, res: Response) => {
  res.json({ success: true, webhooks: paypalService.getWebhooks() });
});

// POST /api/ai/chat - Natural language conversation with Gemini function calling
apiRouter.post('/ai/chat', async (req: Request, res: Response) => {
  try {
    const { message, history, autoExecuteSensitive } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, error: 'message is required' });
    }

    const aiResponse = await geminiService.processChat(
      message,
      history || [],
      Boolean(autoExecuteSensitive)
    );

    res.json({
      success: true,
      ...aiResponse,
      kpis: paypalService.getKpis(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/ai/execute-action - Confirmed user execution of a pending AI proposal
apiRouter.post('/ai/execute-action', async (req: Request, res: Response) => {
  try {
    const { action_type, payload } = req.body;
    if (!action_type || !payload) {
      return res.status(400).json({ success: false, error: 'action_type and payload are required' });
    }

    let result: any = null;
    let message = '';

    if (action_type === 'SEND_REMINDER') {
      result = await paypalService.sendReminderWithDiscount(
        payload.invoice_id,
        payload.discount_percentage || 0,
        payload.custom_note
      );
      message = `Executed: PayPal reminder dispatched with ${payload.discount_percentage || 0}% discount incentive.`;
    } else if (action_type === 'CREATE_INVOICE') {
      result = await paypalService.createAndSendInvoice({
        client_name: payload.client_name,
        client_email: payload.client_email,
        line_items: payload.line_items,
        due_date: payload.due_date,
        notes: payload.notes,
        auto_send: true,
      });
      message = `Executed: Invoice ${result.invoice_number} drafted and dispatched via PayPal Invoicing API v2.`;
    } else if (action_type === 'EXECUTE_PAYOUT') {
      result = await paypalService.executePayout({
        total_amount: payload.total_amount,
        collaborators: payload.collaborators,
        currency: payload.currency || 'USD',
        note: payload.note || payload.project_name,
      });
      message = `Executed: PayPal Payouts batch ${result.batch_id} disbursed across ${payload.collaborators.length} recipients.`;
    } else {
      return res.status(400).json({ success: false, error: `Unknown action type ${action_type}` });
    }

    res.json({
      success: true,
      message,
      result,
      invoices: paypalService.getInvoices(),
      kpis: paypalService.getKpis(),
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default apiRouter;
