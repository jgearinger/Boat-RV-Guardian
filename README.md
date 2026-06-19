# LinkTap Boat & RV Guardian ⚓🚐

A high-performance, local-only PWA dashboard built using **React**, **TypeScript**, and **Vite**. This application polls the local HTTP API of a **LinkTap G2S wireless gateway** to monitor real-time water flow rates, volume consumption, signal quality, and battery parameters, specifically tuned for RV and marine safety (leak and pipe burst warnings to prevent sinking or flooding).

![App Preview](public/app_icon.jpg)

## Core Safety Features

*   **Real-time Flow Speed Gauge**: Displays current flow rates in Liters/minute with a dynamic wave visualization.
*   **Canvas-based History Graph**: Renders a custom HTML5 canvas graph detailing the history of water usage trends.
*   **Emergency Valve Shutoff (cmd: 7)**: A prominent glowing red panic button triggers immediate closure of the gateway's valve.
*   **Safety Sentry Auto-Guard**: A local rule engine that monitors flow and automatically shuts off the valve if:
    *   Flow rate exceeds a user-defined threshold (e.g., > 15 L/min).
    *   Gateway signals a pipe rupture (`is_broken`).
    *   Gateway signals a slow weeping leak (`is_leak`).
*   **Mock Simulator Console**: Easily test safety functions (burst, slow leak, battery drop) in a simulated local state without being connected to physical hardware.
*   **Progressive Web App (PWA)**: Fully responsive layouts, offline capability, and mobile-addable shortcut settings.

---

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start the Local Server
```bash
npm run dev
```
Open your browser to the URL displayed (usually `http://localhost:5173`).

### 3. Build for Production
To bundle the static application for GitHub hosting or local compilation:
```bash
npm run build
```

---

## Local LinkTap G2S API Integration

The app communicates directly with your local LinkTap G2S gateway (e.g., `GW_02`) via HTTP POST requests on your local network.

*   **Endpoint URL**: `http://<GATEWAY_IP>/api.shtml`
*   **Method**: `POST`
*   **Content-Type**: `application/json`

### Command Examples

#### 1. Retrieve Status (`cmd: 3`)
**Request:**
```json
{
  "cmd": 3,
  "gw_id": "GW_YOUR_ID",
  "dev_id": "TAP_YOUR_ID"
}
```

**Response (JSON, sometimes wrapped inside HTML page):**
```json
{
  "dev_id": "71577F1F004B1200",
  "is_rf_linked": true,
  "is_flm_plugin": true,
  "is_fall": false,
  "is_broken": false,
  "is_cutoff": false,
  "is_leak": false,
  "is_clog": false,
  "signal": 85,
  "battery": 95,
  "is_watering": false,
  "speed": 0.00,
  "volume": 0.00,
  "remain_duration": 0
}
```

#### 2. Open Valve (`cmd: 6`)
**Request:**
```json
{
  "cmd": 6,
  "gw_id": "GW_YOUR_ID",
  "dev_id": "TAP_YOUR_ID",
  "duration": 15
}
```

#### 3. Close Valve (Emergency Shutoff - `cmd: 7`)
**Request:**
```json
{
  "cmd": 7,
  "gw_id": "GW_YOUR_ID",
  "dev_id": "TAP_YOUR_ID"
}
```

---

## Handling Browser CORS Issues

Because this dashboard is built as a static client-side web application, modern web browsers will enforce **CORS (Cross-Origin Resource Sharing)** safety rules. This means a webpage loaded from a hosted environment (like GitHub Pages or localhost) may be blocked from sending direct `fetch()` POST requests to your local IP address (e.g., `192.168.1.100`) because the Gateway does not append CORS headers in its responses.

### Solutions:
1.  **Development Extension**: Install a browser extension such as *Allow CORS: Access-Control-Allow-Origin* to bypass browser checks during local testing.
2.  **Lightweight Node Proxy**: Run a basic proxy script on your machine to bypass the browser constraint:
    ```javascript
    // save as proxy.js and run "node proxy.js"
    const express = require('express');
    const cors = require('cors');
    const fetch = require('node-fetch');
    const app = express();

    app.use(cors());
    app.use(express.json());

    app.post('/api', async (req, res) => {
      try {
        const response = await fetch('http://192.168.1.100/api.shtml', {
          method: 'POST',
          body: JSON.stringify(req.body)
        });
        const text = await response.text();
        res.send(text);
      } catch (err) {
        res.status(500).send(err.message);
      }
    });

    app.listen(3001, () => console.log("CORS Bypass Proxy active on port 3001"));
    ```
