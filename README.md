# Sub3

*Bhaag DK Bose.*

![Sub3](https://img.shields.io/badge/Status-Active-success) ![Vanilla JS](https://img.shields.io/badge/Tech-Vanilla_JS-f7df1e) ![Tailwind CSS](https://img.shields.io/badge/Style-Tailwind-38bdf8)

Sub3 is a lightweight, web-based visual workout builder designed specifically for smart treadmills. 

Instead of typing numbers into endless spreadsheet grids, Sub3 provides a tactile, drag-and-drop timeline to design interval runs, tempo workouts, and hill climbs. It calculates your workout stats in real-time and exports a strictly-typed JSON file, ready to be executed by companion BLE (Bluetooth Low Energy) fitness apps.

## ✨ Features

* **Visual Timeline:** Design workouts using a block-based timeline canvas.
* **Ramp Support:** Visually create sloped speed/incline ramps (e.g., gradually increasing speed over 5 minutes).
* **Live Telemetry Engine:** Instantly calculates Total Distance, Average Pace, Total Time, and Elevation Gain as you adjust blocks.
* **Dark-Mode Native:** A sleek, modern UI built with Tailwind CSS.
* **Zero Dependencies:** 100% Vanilla HTML, CSS, and JavaScript. No build steps, no package managers.

## 🚀 Usage

1.  Open the web app (hosted via GitHub Pages).
2.  Set your Workout Name and Description.
3.  Click `+ Warmup`, `+ Active`, or `+ Recovery` to drop blocks onto the timeline.
4.  Select a block to adjust its Duration, Start/End Speed, and Start/End Incline using the sidebar Editor.
5.  Click **Download Workout** to export your `.json` file.

## 📄 The Data Contract (JSON)

Sub3 acts as the creator, exporting a strict JSON schema designed to be easily parsed by mobile apps (like Flutter/Dart) to control FTMS-enabled treadmills via Bluetooth.

```json
{
  "metadata": {
    "name": "Tempo with Hills",
    "description": "A classic tempo run with rolling inclines.",
    "total_duration_seconds": 1800,
    "total_distance_km": 6.5,
    "average_speed_kmh": 13.0,
    "average_pace": "4:37 /km",
    "total_elevation_gain_m": 45
  },
  "intervals": [
    {
      "id": 1,
      "type": "warmup", 
      "duration_seconds": 300,
      "start_speed_kmh": 5.0,
      "end_speed_kmh": 8.0,
      "start_incline_pct": 0.0,
      "end_incline_pct": 1.0
    }
  ]
}
```

## 🛠️ Local Development

Because this project is built with Vanilla JS, there is no `npm install` or build process required. 

1. Clone the repository:
   ```bash
   git clone [https://github.com/yourusername/sub3.git](https://github.com/yourusername/sub3.git)
   ```
2. Open `index.html` in your browser, or use an extension like VS Code Live Server for hot-reloading.