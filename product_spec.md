# Product Requirements Document (PRD): Web-Based Running Workout Builder

## 1. Product Overview
A single-page web application hosted on GitHub Pages. It allows runners to visually design custom treadmill interval workouts and export them as a standardized JSON file. This JSON file acts as the strictly typed input for a companion Flutter mobile fitness app. 

**Scope Restriction:** This application is strictly for running/treadmills. Do not include any logic, variables, or UI elements related to cycling, FTP, ERG mode, or watts.

## 2. Technical Stack & UI Guidelines (Cursor Constraints)
* **Framework:** Pure Vanilla JavaScript, HTML5, and CSS3. Do not use React, Vue, or heavy build tools (Webpack/Vite) to ensure instant, zero-config GitHub Pages deployment.
* **Styling:** Use Tailwind CSS via CDN for rapid, utility-first styling. 
* **Aesthetic:** Dark mode by default. Do not use ugly, "enterprise-style" vertical HTML forms for the intervals. The UI must feel like a premium, tactile, modern fitness app with a drag-and-drop/visual timeline aesthetic. 
* **Icons & Fonts:** Use Phosphor Icons or Heroicons (via CDN) and a clean, athletic font like Inter or Roboto.

## 3. The Data Contract (JSON Schema)
The app's primary output is a `.json` file. Cursor must ensure the export function generates exactly this format, using `start` and `end` keys to support both flat blocks and sloped ramps:

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
    },
    {
      "id": 2,
      "type": "active",
      "duration_seconds": 1200,
      "start_speed_kmh": 12.0,
      "end_speed_kmh": 12.0,
      "start_incline_pct": 3.0,
      "end_incline_pct": 3.0
    }
  ]
}
```

## 4. UI Layout & User Flow
The UI is split into three main areas: A sticky stats header, a large central visualizer, and a control sidebar.

### Area A: The Global Stats Bar (Sticky Header)
A persistent bar that instantly recalculates whenever any block is added, deleted, or edited. It must display:
* **Total Time:** (Format: `HH:MM:SS` or `MM:SS`)
* **Total Distance:** (km, rounded to 2 decimals)
* **Average Speed:** (km/h, rounded to 1 decimal)
* **Average Pace:** (Format: `MM:SS /km`)
* **Total Elevation Gain:** (Meters, rounded to whole number)

### Area B: The Canvas (Visual Timeline)
* **The Grid:** A large HTML `<canvas>` or CSS Flexbox container representing the workout timeline. 
* **The Blocks:** Each interval is a colored shape on the grid (e.g., Warmup = Gray, Active = Blue, Recovery = Green). 
    * *Width* represents Time.
    * *Height* represents Speed.
    * *Ramps:* If a block's `start_speed_kmh` and `end_speed_kmh` differ, the block must visually render as a sloped ramp (trapezoid).
* **Incline Visualization:** A secondary, translucent line or shaded area chart overlaid on the bottom of the canvas to represent the incline percentage independently of speed.
* **Interactivity:** Clicking a block on the canvas selects it, highlighting the block and loading its exact values into the Editor Panel.

### Area C: The Editor Panel (Sidebar)
* **Global Settings:** Text inputs for the Workout Name and Description.
* **Quick-Add Buttons:** Prominent buttons to append new blocks to the timeline: `+ Warmup`, `+ Active`, `+ Recovery`, `+ Cooldown`.
* **Block Inspector:** When a block on the canvas is selected, this area displays intuitive controls:
    * **Duration Input:** A clean number input or slider (in minutes/seconds).
    * **Speed Sliders:** Two sliders (Start Speed & End Speed). 
    * **Incline Sliders:** Two sliders (Start Incline & End Incline). 
    * **Actions:** `Duplicate Block` and `Delete Block` buttons.
* **Export:** A brightly colored "Download Workout (JSON)" button at the bottom of the sidebar.

## 5. Cursor Implementation Directives & Math Logic

### State Management
* Cursor must build a robust JavaScript array `let intervals = []` that acts as the single source of truth. Any change in the sidebar sliders must instantly trigger a re-render of the canvas and the Stats Bar.

### Mathematics for the Stats Bar
Cursor must implement these specific formulas in JavaScript to loop through the `intervals` array and calculate the totals:
1. **Total Time:** Sum the `duration_seconds` of all blocks.
2. **Total Distance (km):** * Calculate block avg speed: `(start_speed_kmh + end_speed_kmh) / 2`
   * Block distance: `Avg Speed * (duration_seconds / 3600)`
   * Sum all block distances.
3. **Average Speed (km/h):** `Total Distance / (Total Time / 3600)`
4. **Average Pace (Min/km):**
   * Decimal minutes: `60 / Average Speed`
   * Format correctly: Multiply the decimal remainder by 60 to get seconds (e.g., `5.5` becomes `5:30`).
5. **Total Elevation Gain (Meters):**
   * Block avg incline %: `(start_incline_pct + end_incline_pct) / 2`
   * Block distance in meters: `Block Distance (km) * 1000`
   * Elevation gained per block: `Distance_in_Meters * Math.sin(Math.atan(Avg_Incline_pct / 100))`
   * Sum all elevation gained.

### File Export Logic
* The "Download Workout" button must stringify the JSON payload and trigger a `Blob` download in the browser, prompting the user to save a file named `[workout_name].json`.
* The `metadata` object must include all five computed stats (`total_duration_seconds`, `total_distance_km`, `average_speed_kmh`, `average_pace`, `total_elevation_gain_m`) so the companion app can display workout summaries without recalculating.