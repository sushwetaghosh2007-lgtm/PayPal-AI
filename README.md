# 🚀 PayPilot AI: Smart Invoice & Revenue Copilot
### *Built for the PayPal AI Hackathon*

> **Autonomous fintech workspace for SMBs, SaaS creators, and freelancer agencies combining Google Gemini 3.8 Flash function-calling with PayPal's REST APIs v2 (Invoicing, Payouts, Subscriptions, and Webhooks).**

---

## 💡 The Problem & The Solution

* **The Problem:** Freelance agencies and SaaS SMBs lose thousands of dollars each month to unpaid invoices and passive customer churn. Chasing late payments is awkward, time-consuming, and reactive. Furthermore, distributing collected revenue to contractors and agency partners is a tedious manual calculation prone to errors.
* **The Solution:** **PayPilot AI** serves as an autonomous revenue guardian:
  1. **Continuous Churn Risk Analysis:** Analyzes days overdue, communication gaps, and invoice sizes to predict churn risk.
  2. **Automated Early-Settlement Negotiation:** Uses **Gemini 3.8 Flash Function Calling** to craft and dispatch dynamic settlement incentives (e.g., 10–15% off) directly through the **PayPal Invoicing Remind API v2**.
  3. **Natural Language Invoicing:** Drafts, calculates, and dispatches compliant PayPal invoices via conversational prompts.
  4. **Multi-Party Revenue Splits:** Automates contractor splits and triggers bulk payouts via the **PayPal Payouts REST API v1**.
  5. **Live Sandbox Terminal & Webhook Reactor:** Transparently displays raw JSON payloads, curl commands, and webhook events (`INVOICING.INVOICE.PAID`).

---

## 🛠️ Architecture & Tech Stack

```
                     +---------------------------------------+
                     |         PayPilot AI Frontend          |
                     |  React + Tailwind CSS + Lucide Icons  |
                     +-------------------+-------------------+
                                         |
                                         v
                     +---------------------------------------+
                     |         Full-Stack Node/Express       |
                     |             (Port 3000)               |
                     +---------+-------------------+---------+
                               |                   |
            +------------------v--+             +--v------------------+
            |  Google Gemini API  |             |  PayPal REST APIs   |
            |  (gemini-3.8-flash) |             |  (Sandbox & Live)   |
            |  • Function Calling |             |  • Invoicing v2     |
            |  • Churn Reasoning  |             |  • Payouts v1       |
            |  • Split Modeling   |             |  • Webhooks Handler |
            +---------------------+             +---------------------+
```

### Backend & AI
* **Google Gemini 3.8 Flash (`@google/genai`):** Server-side function calling using `get_overdue_invoices`, `send_paypal_reminder`, `create_paypal_invoice`, and `calculate_revenue_splits`.
* **Express.js API Router:** Modular endpoints for invoices, payouts, webhook listeners, and sandbox telemetry.
* **PayPal REST API v2 Integration:** OAuth2 client credentials token manager with auto-refresh and high-fidelity Sandbox Simulator fallback for testing without credentials.

### Frontend
* **Fintech Dark Theme:** PayPal signature colors (`#003087` deep blue, `#0070BA` active blue, `#00457C` navy, and `#00CFD5` cyan).
* **Live Sandbox Debugger:** Collapsible bottom terminal displaying latency, status codes, JSON payloads, and executable cURL commands.
* **Interactive Invoicing Matrix:** Search, filter by churn risk (High/Med/Low), and trigger 1-click discount offers.
* **Revenue Split Studio:** Visual slider and percentage allocator that calculates fees and triggers bulk PayPal Payouts.

---

## 🔑 Environment Variables Setup

Create a `.env` file in the root directory (or use `.env.example`):

```bash
# Google Gemini API (Automatically injected by Google AI Studio)
GEMINI_API_KEY="your_gemini_api_key"

# App URL
APP_URL="http://localhost:3000"

# PayPal Developer Sandbox Credentials
# (If left empty, PayPilot AI seamlessly runs in high-fidelity Sandbox Simulator mode)
PAYPAL_CLIENT_ID="your_paypal_sandbox_client_id"
PAYPAL_CLIENT_SECRET="your_paypal_sandbox_client_secret"
PAYPAL_MODE="sandbox"

# Webhook Verification (Optional)
PAYPAL_WEBHOOK_ID="your_paypal_webhook_id"
```

---

## ⚡ Quickstart Guide

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Full-Stack Development Server
```bash
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### 3. Production Build
```bash
npm run build
npm start
```

---

## 🎯 Hackathon Demo Walkthrough (5-Minute Script)

1. **Step 1: Check KPI Header**
   * Review **Settled Revenue**, **Pending Receivables**, and **At-Risk Overdue Capital** ($12,800 across 3 high-risk invoices).
2. **Step 2: Engage the AI Copilot Drawer**
   * Click the prompt chip: *"🚨 Find high churn risk clients"*.
   * Gemini 3.8 Flash calls `get_overdue_invoices()`, flags Acme Cloud (86% churn risk) and HyperGrowth Labs (94% churn risk), and suggests a 15% early-settlement incentive.
3. **Step 3: Execute Early-Settlement Discount**
   * Click *"Confirm & Dispatch"* or open the *"Offer 15% Discount"* modal on Acme Cloud.
   * PayPilot AI calls `POST /v2/invoicing/invoices/{id}/remind` with the discounted rate. The client's churn score immediately drops from 86% to 25%!
4. **Step 4: Inspect Live PayPal Sandbox Terminal**
   * Click **"PayPal Sandbox REST API Debugger Terminal"** at the bottom to expand.
   * View the real-time request and response headers, latency, and click **"Copy cURL"** to verify the payload in your terminal.
5. **Step 5: Test Webhook Reactivity**
   * Click **"Simulate Webhook"** in the top bar. Select `INVOICING.INVOICE.PAID` and click **"Trigger Webhook Event"**.
   * Notice how the invoice flips to **PAID**, settled revenue increases, and the event is logged.
6. **Step 6: Payouts & Revenue Split Studio**
   * Switch to the **"Revenue Split & Payouts Studio"** tab.
   * Enter a project revenue of $10,000, adjust team percentages (50/30/20), and click **"Trigger PayPal Payouts Batch"** to test `/v1/payments/payouts`.

---

## 📜 License
Apache-2.0
