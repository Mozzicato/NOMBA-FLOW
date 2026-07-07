# Nomba Flow — Demo App

A visual automation platform where businesses build payment workflows with drag-and-drop — no code required. This is the hackathon demo frontend (Vite + React + React Flow + Framer Motion).

## Run it

```bash
cd app
npm install
npm run dev
```

Then open http://localhost:5173.

Or from the repo root: `npm run app:dev`.

## Demo script

1. The canvas loads with the **Cake Order Automation** workflow already wired: Payment Received → Verify Payment → AI Receipt → Notify Merchant → Success.
2. Click any node to open the inspector and tweak its configuration (amount, AI prompt, notification channel…).
3. Hit **Run Workflow** — nodes light up one by one, edges glow, the console streams live logs, and a toast + confetti land when it completes.
4. For the showstopper: type into **Build with AI** at the top, e.g.

   > When someone pays ₦2,500 for a cake order, verify the payment, generate a thank-you receipt, and notify me.

   and click **Generate** — the workflow assembles itself on the canvas, node by node.

5. Clear the canvas (select nodes, press Delete) to show the empty state, then drag nodes back in from the left sidebar.

## Notes

- Execution is simulated client-side with realistic demo data (Sarah Johnson / Mozzicato Cakes / ₦2,500 / NMB-458921) so the demo never depends on network or API availability on stage.
- No API credentials live in this app. Keep it that way — the real keys in `docs/technical_keys.md` are gitignored and must never ship to a frontend.

## Closing line

> Today, Nomba lets developers integrate payments. **Nomba Flow lets anyone automate their business with payments — no code required.**
