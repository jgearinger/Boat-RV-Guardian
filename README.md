# Boat & RV Guardian 🚤🚐

A free, open-source water safety dashboard using LinkTap hardware. This specialized application transforms the standard LinkTap ecosystem into an advanced auto-shutoff and monitoring system specifically tailored to protect Boats and RVs from catastrophic internal floods.

Unlike traditional gardening irrigation, this application monitors municipal water hookups for marine and RV use, offering granular control, flow monitoring, and real-time safety automation.

## 📥 Download App
Get the native app for the best experience (required for Local API support). All versions are available on the [GitHub Releases Page](https://github.com/jgearinger/Boat-RV-Guardian/releases/latest).

[![Download Android APK](https://img.shields.io/badge/Download-Android_APK-3DDC84?style=for-the-badge&logo=android&logoColor=white)](https://github.com/jgearinger/Boat-RV-Guardian/releases/latest)
[![Download macOS DMG](https://img.shields.io/badge/Download-macOS_DMG-000000?style=for-the-badge&logo=apple&logoColor=white)](https://github.com/jgearinger/Boat-RV-Guardian/releases/latest)
[![Download Windows EXE](https://img.shields.io/badge/Download-Windows_EXE-0078D6?style=for-the-badge&logo=windows&logoColor=white)](https://github.com/jgearinger/Boat-RV-Guardian/releases/latest)

## 🌐 Website & Live Demo
Read the full setup guide, see how the system works, and launch the live web dashboard (Simulator mode enabled) directly from our website:

👉 **[View Documentation Website](https://jgearinger.github.io/Boat-RV-Guardian/)**
👉 **[Launch Live Web Dashboard](https://jgearinger.github.io/Boat-RV-Guardian/app/)**

## 🌟 Key Features

*   **Flooding Auto-Guard Sentry**: Runs locally in your browser. Constantly monitors water flow rate and pipe integrity. If the flow speed exceeds your safety limit (e.g. from a burst pipe inside the boat), it immediately shuts off the main valve.
*   **Granular Local Notifications & Alarms**: Opt-in to specific alerts like Fall/Theft detection, Device Offline warnings, Low Battery states, or Water Start/Stop events. Complete with customizable alert volume and sounds (Beep or Siren).
*   **Tank Fill Mode**: Precisely fill your onboard fresh water tanks. Set a target volume (e.g., 50 Gallons) and the valve will automatically shut off when the exact amount is reached. Features a visual progress ring and remaining time estimator.
*   **Delayed Start**: Set a precise minutes/seconds countdown before a tank fill begins, giving you time to hook up hoses or walk away.
*   **Wash Down Mode**: Instantly open the valve for a preset time (5m up to 24h) to wash down the deck or flush the engine.
*   **API Agnostic**: Connect directly over your Local Network (`http://192.168.x.x`) for instant, ultra-low latency commands, or use the **LinkTap Cloud API** to monitor and control your water from anywhere in the world!
*   **Modern, Dynamic UI**: A premium dark-mode interface with beautiful glassmorphism, responsive micro-animations, and real-time data visualization.

---

## 🛠 Hardware Setup & Compatibility

> [!IMPORTANT]  
> **Physical Setup is Crucial:** To properly protect your Boat or RV from flooding, the smart valve must be placed at the source spigot, not on the vehicle inlet!
> 
> 📖 **[Read the Full Physical Setup & Best Practices Guide](PHYSICAL_SETUP.md)**

### Required Hardware
This application utilizes advanced API endpoints that require specific hardware components:
1. **LinkTap Gateway (GW-01 or GW-02)**: Bridges your Wi-Fi network to the smart valve. Required for both Cloud and Local API communication.
2. **LinkTap Smart Valve (G2S)**: You must use a valve *with a built-in Flow Meter* (like the G2S). Older models cannot report real-time flow speed and cannot trigger the burst pipe Sentry.
3. **Pressure Regulator**: A standard 40-50 PSI brass water pressure regulator placed *before* the smart valve is highly recommended to protect both the valve and your vehicle's plumbing.

### Connecting the App to your Hardware
You can use the **Cloud API** (works anywhere) or the **Local API** (works only on your home network/boat router).

#### Option 1: Cloud API (Recommended)
This is the easiest method and allows the dashboard to be used from any web browser.
1. Log into the [LinkTap Web Portal](https://www.link-tap.com/#!/api-for-developers) from a desktop or tablet browser. (The API key is no longer accessible via the mobile app).
2. Go to **Settings** and generate your API Key. 
3. Note your **Username** and **API Key**.
4. Open the **Boat & RV Guardian** dashboard.
5. Open **Settings** -> **Hardware Connections**.
6. Select **Cloud API** from the dropdown.
7. Enter your Username and API Key, then click **📡 Auto-Discover Devices**.
8. Select your Gateway and TapLinker from the new dropdowns, and click **▶ Apply & Connect**.

#### Option 2: Local HTTP API (Native App / Localhost only)
The Local API is incredibly fast but does not work on public web versions (like GitHub Pages) due to browser CORS security policies. 
1. Assign a **Static IP** to your LinkTap Gateway via your router's DHCP reservation page.
2. Ensure you know your Gateway's IP address (e.g., `192.168.1.100`).
3. Find your 16-character **Gateway ID** and **TapLinker ID** (printed on the stickers on the back of the physical devices).
4. Enter these into the Hardware Connections panel and click **▶ Apply & Connect**.

---

## 💻 Development & Building

If you are using the public web-hosted version of this app (e.g., on GitHub Pages), **the Local HTTP API is disabled** due to browser security policies. To use the Local API, download the native desktop/mobile app version or run the source code locally.

### Running Locally for Development
```bash
npm install
npm run dev
```

### Building for Production
```bash
npm run build
npm run tauri build
```
