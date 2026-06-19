# Boat & RV Guardian 🚤🚐

A beautiful, specialized smart dashboard that transforms the LinkTap ecosystem into an advanced auto-shutoff and monitoring system for Boats and RVs. 

Instead of dealing with generic gardening schedules, this app is specifically tailored for preventing catastrophic internal floods by monitoring marine and RV water hookups.

## 📥 Download App
Get the native app for the best experience (required for Local API support). All versions are available on the [GitHub Releases Page](https://github.com/jgearinger/Boat-RV-Guardian/releases/latest).

[![Download Android APK](https://img.shields.io/badge/Download-Android_APK-3DDC84?style=for-the-badge&logo=android&logoColor=white)](https://github.com/jgearinger/Boat-RV-Guardian/releases/latest)
[![Download macOS DMG](https://img.shields.io/badge/Download-macOS_DMG-000000?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/jgearinger/Boat-RV-Guardian/releases/latest)
[![Download Windows EXE](https://img.shields.io/badge/Download-Windows_EXE-0078D6?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/jgearinger/Boat-RV-Guardian/releases/latest)

## 🚀 Live Demo
You can try the web dashboard right now in your browser (Simulator mode enabled):
👉 **[Launch Live Demo](https://jgearinger.github.io/Boat-RV-Guardian/)**

## Features

*   **Flooding Auto-Guard Sentry**: Runs locally in your browser. Constantly monitors water flow rate and pipe integrity. If the flow speed exceeds your safety limit (e.g. from a burst pipe inside the boat), it immediately shuts off the main valve.
*   **Offline & Theft Alerts**: Immediately warns you if the physical TapLinker loses connection or triggers a physical fall/tamper alarm.
*   **Tank Fill Mode**: Precisely fill your onboard fresh water tanks. Set a target volume (e.g., 50 Gallons) and the valve will automatically shut off when the exact amount is reached. Features a visual progress ring and remaining time estimator.
*   **Delayed Start**: Set a precise minutes/seconds countdown before a tank fill begins, giving you time to hook up hoses or walk away.
*   **Wash Down Mode**: Instantly open the valve for a preset time (5m up to 24h) to wash down the deck or flush the engine.
*   **Normal Run Mode**: An always-on or cycled profile for providing city water to your boat. You can set it to auto-restart its cycle.
*   **API Agnostic**: Connect directly over your Local Network (`http://192.168.x.x`) for instant, ultra-low latency commands, or use the **LinkTap Cloud API** to monitor and control your water from anywhere in the world!

---

## 🛠 Hardware Setup & Compatibility

> [!IMPORTANT]  
> **Physical Setup is Crucial:** To properly protect your Boat or RV from flooding, the smart valve must be placed at the source spigot, not on the vehicle inlet!
> 
> 📖 **[Read the Full Physical Setup & Best Practices Guide](PHYSICAL_SETUP.md)**

### Supported Hardware
This application utilizes advanced API endpoints that are only available on newer LinkTap hardware.
*   **Gateway**: You must have the **LinkTap G2S** Gateway or newer.
*   **TapLinker**: You must have a **TapLinker with Flow Meter** (e.g., G2S TapLinker). Older generations (like G1) do not report real-time flow speed and cannot trigger the burst pipe Sentry.

### Connecting the App to your Hardware
You can use the **Cloud API** (works anywhere) or the **Local API** (works only on your home network/boat router).

#### Option 1: Cloud API (Recommended)
This is the easiest method and allows the dashboard to be used from any web browser without security restrictions.
1. Open the official LinkTap Mobile App.
2. Go to **Settings** -> **API Configuration**.
3. Generate an API Key. Note your **Username** and **API Key**.
4. Open the **Boat & RV Guardian** dashboard.
5. Open **Settings** -> **Hardware Connections**.
6. Select **Cloud API** from the dropdown.
7. Enter your Username and API Key, then click **📡 Auto-Discover Devices**.
8. Select your Gateway and TapLinker from the new dropdowns, and click **▶ Apply & Connect**.

#### Option 2: Local HTTP API (Native App / Localhost only)
The Local API is incredibly fast but does not work on public web versions (like GitHub Pages) due to browser CORS security policies. 
1. Assign a **Static IP** to your LinkTap Gateway via your router's DHCP reservation page.
2. Ensure you know your Gateway's IP address (e.g., `192.168.1.100`).
3. You will need your 16-character **Gateway ID** and **TapLinker ID** (printed on the stickers on the back of the physical devices).
4. Enter these into the Hardware Connections panel and click **▶ Apply & Connect**.

---

## 🌐 Web Version Notice
If you are using the public web-hosted version of this app (e.g., on GitHub Pages), **the Local HTTP API is disabled**. Modern web browsers physically block websites on the internet from connecting directly to local devices (like `192.168.x.x`) for security reasons. 

To use the Local API, you must either download the native desktop/mobile app version of this dashboard or run the source code on your local machine using Node.js.

## Running Locally for Development

```bash
npm install
npm run dev
```

## Building for Production / GitHub Pages

```bash
npm run build
```
Push the `dist` folder to your static host.
