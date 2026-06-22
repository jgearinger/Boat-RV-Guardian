# Boat & Rv Guardian

A premium water safety and smart monitoring dashboard built for Boats and RVs. Convert standard smart-home hardware (LinkTap valves, Shelly sensors) into an premium-grade water safety and auto-shutoff system.

## Repository Structure

This project is organized as a monorepo containing:

- `/website` - The marketing and documentation site built with Astro.
- `/dashboard` - The core React/Vite web application, which compiles to Web, Desktop (Tauri), and Mobile (Capacitor).
- `/worker` - A Cloudflare Worker designed to receive HTTP Webhooks from Shelly sensors and route them to LinkTap.

## Technologies Used
- **Frontend:** React, Vite, TypeScript
- **Native Wrappers:** Tauri (Desktop), Capacitor (Mobile)
- **Backend & Auth:** Firebase (Auth, Firestore)
- **Serverless Webhooks:** Cloudflare Workers
- **Marketing Site:** Astro

## Getting Started

### 1. The Marketing Website
To run the marketing website locally:
```bash
cd website
npm install
npm run dev
```

### 2. The Dashboard App
To run the React web application locally:
```bash
cd dashboard
npm install
npm run dev
```
To run the Desktop native app:
```bash
cd dashboard
npm run tauri dev
```

### 3. The Webhook Worker
To deploy the webhook receiver:
```bash
cd worker
npm install
npm run deploy
```

## Setup Guides
For instructions on setting up the physical hardware, see:
- `PHYSICAL_SETUP.md`
- `LOCAL_API_SETUP.md`
- `PUSH_NOTIFICATIONS_SETUP.md`
