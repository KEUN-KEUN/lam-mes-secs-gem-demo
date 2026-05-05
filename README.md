# LAM-MES: SECS/GEM Equipment–MES Communication Demo

A full-stack demonstration of **SEMI E5 (SECS-II) / E30 (GEM)** protocol communication between semiconductor manufacturing equipment and an MES host. Built with **.NET 8** (C#) and **Angular 17**, this system simulates real-world Track-In/Out, Recipe selection, Trace data collection, and Alarm handling using actual HSMS TCP connections — not mocks.

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [SECS/GEM Implementation](#secsgem-implementation)
- [Scenarios](#scenarios)
- [Prerequisites](#prerequisites)
- [Running the Project](#running-the-project)
- [UI Components](#ui-components)
- [Port Reference](#port-reference)

---

## Overview

### Purpose

This project demonstrates a realistic MES ↔ Equipment integration layer as implemented in semiconductor fabs. It covers the full lifecycle of a wafer lot:

| Phase | SECS Messages | Description |
|-------|--------------|-------------|
| Communication Setup | S1F13 ↔ S1F14 | HSMS establish communication |
| Report Definition | S2F33/35/37 ↔ S2F34/36/38 | Define event-linked variable reports |
| Carrier Arrived | S6F11 ↔ S6F12 | Equipment notifies HOST of carrier |
| Recipe Selection | S2F41 ↔ S2F42 | HOST sends PP-SELECT command |
| Process Start | S6F11 ↔ S6F12 | Equipment signals process start event |
| Trace Collection | S6F11 ↔ S6F12 | Streaming temperature / gas / pressure data |
| Alarm Handling | S5F1 ↔ S5F2 | Alarm set / clear with process pause |
| Process End | S6F11 ↔ S6F12 | Equipment signals process end event |

### Key Features

- **Real SECS/GEM protocol** over HSMS TCP (Secs4Net library, SEMI E37 compliant)
- **GEM State Machine** (SEMI E30) — CommState and ProcessState with Stateless library
- **Three automated scenarios** — Normal, Alarm Recovery, Alternative Recipe
- **Real-time UI** via SignalR WebSocket — message log, trace chart, alarm panel
- **Layered architecture** — Domain, Equipment simulator, Host MES API, Angular frontend

---

## Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│  Angular Frontend  (localhost:4200)                              │
│                                                                  │
│  ScenarioSelector  StatePanels  GemStateDiagram  MessageLog      │
│  ScenarioPanel     TraceChart   AlarmPanel       ProcessHistory  │
└────────┬──────────────────────────────────────┬─────────────────┘
         │  HTTP REST  (scenario trigger)        │  SignalR WebSocket
         │  localhost:5001                       │  (real-time updates)
         ▼                                       ▼
┌──────────────────────────────────────────────────────────────────┐
│  SecsGemDemo.Host.Api  (localhost:5001)                          │
│                                                                  │
│  ScenarioController ──► ScenarioOrchestrator                     │
│  EventSubscriber    ──► MessageBroadcaster ──► SignalR Hub       │
│  GemStateTracker        MasterDataStore                          │
│  ValidationEngine       EquipmentProxy (HTTP → :5002)            │
└────────┬──────────────────────────────────────────────────────────┘
         │  SECS/HSMS TCP (SEMI E37)
         │  localhost:5000
         ▼
┌──────────────────────────────────────────────────────────────────┐
│  SecsGemDemo.Equipment  (localhost:5000 / 5002)                  │
│                                                                  │
│  EquipmentWorker ──► MessageRouter ──► S1F13 / S2F33-37 / S2F41  │
│  GemStateMachine    ProcessSimulator   EventEmitter              │
│  ReportRegistry     RecipeStore        EquipmentSecsLogger       │
└──────────────────────────────────────────────────────────────────┘
```

### Communication Channels

| Channel | Protocol | Port | Purpose |
|---------|---------|------|---------|
| Equipment HSMS | TCP (SECS-II/HSMS) | 5000 | GEM message exchange |
| Equipment HTTP | REST | 5002 | HOST triggers equipment events |
| Host API | REST | 5001 | Frontend scenario control |
| Host SignalR | WebSocket | 5001/hubs/secs | Real-time UI push |
| Frontend | HTTP/WS | 4200 | Web UI (Angular dev server) |

---

## Technology Stack

### Backend (.NET 8 / C#)

| Package | Version | Purpose |
|---------|---------|---------|
| ASP.NET Core | 8.0 | Web host for both Equipment and Host services |
| [Secs4Net](https://github.com/mkc1370/secs4net) | 2.4.4 | SECS-II / HSMS TCP implementation |
| Stateless | 5.20.1 | GEM state machine (CommState, ProcessState) |
| Serilog | 10.0.0 | Structured logging to console + rolling file |
| Swashbuckle | 6.6.2 | Swagger UI for Host API |
| SignalR | (built-in) | Real-time WebSocket hub |

### Frontend (Angular 17)

| Package | Version | Purpose |
|---------|---------|---------|
| Angular | 17.3.0 | Standalone component framework |
| @microsoft/signalr | 10.0.0 | WebSocket client |
| RxJS | 7.8.0 | Reactive streams for real-time data |
| TypeScript | 5.4.2 | Type-safe scripting |

---

## Project Structure

```
LAM-MES/
├── src/
│   ├── SecsGemDemo.Domain/              # Shared models & catalogs
│   │   ├── Catalogs/                    # CEID, DVID, SVID, Alarm ID constants
│   │   ├── Enums/                       # CommState, ProcessState
│   │   └── Models/                      # Lot, Recipe, Equipment
│   │
│   ├── SecsGemDemo.Equipment/           # Equipment simulator
│   │   ├── Handlers/                    # S1F13, S2F33, S2F35, S2F37, S2F41
│   │   └── Services/
│   │       ├── GemStateMachine.cs       # Stateless state machine
│   │       ├── ProcessSimulator.cs      # Simulates wafer process steps
│   │       ├── EventEmitter.cs          # Sends S6F11 / S5F1 messages
│   │       ├── ReportRegistry.cs        # Stores HOST-defined report structure
│   │       ├── RecipeStore.cs           # In-memory recipe database
│   │       └── MessageRouter.cs         # Dispatches SECS messages to handlers
│   │
│   ├── SecsGemDemo.Host.Api/            # MES Host server
│   │   ├── Controllers/
│   │   │   └── ScenarioController.cs    # REST endpoints for scenario control
│   │   ├── Hubs/
│   │   │   └── SecsHub.cs               # SignalR hub
│   │   ├── Models/
│   │   │   └── ScenarioDefinition.cs    # Scenario data model
│   │   ├── Services/
│   │   │   ├── ScenarioOrchestrator.cs  # Core workflow engine
│   │   │   ├── EventSubscriber.cs       # Receives S6F11 / S5F1 from Equipment
│   │   │   ├── MessageBroadcaster.cs    # SignalR push to UI
│   │   │   ├── GemStateTracker.cs       # HOST-side state tracking
│   │   │   ├── MasterDataStore.cs       # In-memory lot/recipe/history DB
│   │   │   ├── ValidationEngine.cs      # Pre-run lot/recipe validation
│   │   │   ├── EquipmentProxy.cs        # HTTP client → Equipment :5002
│   │   │   └── ScenarioStore.cs         # Loads scenarios.json
│   │   └── scenarios.json               # Scenario definitions
│   │
│   └── SecsGemDemo.Frontend/            # Angular 17 web UI
│       └── src/app/
│           ├── components/
│           │   ├── scenario-selector/   # Scenario dropdown + Run button
│           │   ├── state-panel/         # COMM / PROCESS state indicators
│           │   ├── gem-state-diagram/   # SVG state machine visualization
│           │   ├── scenario-panel/      # 7 manual step buttons
│           │   ├── message-log/         # SECS S/F message table
│           │   ├── trace-chart/         # Real-time line chart
│           │   ├── alarm-panel/         # Alarm list
│           │   ├── process-history/     # Track-In/Out records
│           │   └── scenario-results/    # Completed run summary cards
│           └── services/
│               ├── signalr.service.ts   # WebSocket connection & observables
│               └── scenario.service.ts  # HTTP calls to Host API
│
├── SecsGemDemo.sln
├── DEMO_GUIDE.md
├── SECS_STREAM_FUNCTION.md
└── structure.md
```

---

## SECS/GEM Implementation

### GEM State Machine (SEMI E30)

Two independent state machines managed by Stateless:

**CommState**
```
NotCommunicating ──(S1F13 received)──► Communicating
Communicating    ──(connection lost)──► NotCommunicating
```

**ProcessState**
```
Idle ──► Setup ──► Ready ──► Executing ──► Idle
                               │
                           (alarm) ──► Pause ──► Executing
```

### SECS Message Flow

```
HOST (SecsGemDemo.Host.Api)          EQUIPMENT (SecsGemDemo.Equipment)
       │                                        │
       │──── S1F13 (Establish Comm) ───────────►│
       │◄─── S1F14 (Comm Ack) ─────────────────│
       │                                        │
       │──── S2F33 (Define Report) ────────────►│
       │◄─── S2F34 (Report Ack) ───────────────│
       │──── S2F35 (Link Event-Report) ────────►│
       │◄─── S2F36 (Link Ack) ─────────────────│
       │──── S2F37 (Enable Events) ────────────►│
       │◄─── S2F38 (Enable Ack) ───────────────│
       │                                        │
       │  [HOST triggers event via HTTP :5002]  │
       │                                        │
       │◄─── S6F11 (Event Report: Carrier) ────│ CEID=1
       │──── S6F12 (Event Ack) ────────────────►│
       │──── S2F41 (PP-SELECT Recipe) ─────────►│
       │◄─── S2F42 (PP-SELECT Ack) ────────────│
       │◄─── S6F11 (Event Report: Start) ──────│ CEID=2
       │──── S6F12 ─────────────────────────────►│
       │◄─── S6F11 (Trace: Temperature) ───────│ CEID=4  × N
       │──── S6F12 ─────────────────────────────►│
       │◄─── S5F1  (Alarm Set) ─────────────────│ [alarm scenario]
       │──── S5F2  (Alarm Ack) ─────────────────►│
       │◄─── S5F1  (Alarm Clear) ───────────────│
       │──── S5F2 ──────────────────────────────►│
       │◄─── S6F11 (Event Report: End) ─────────│ CEID=3
       │──── S6F12 ─────────────────────────────►│
```

---

## Scenarios

Three scenarios are defined in `src/SecsGemDemo.Host.Api/scenarios.json`:

| ID | Name | Lot | Recipe | Wafers | Alarm | Duration |
|----|------|-----|--------|--------|-------|---------|
| `normal` | Normal Process Run | LOT-2026-001 | RCP-PHOTO-A1 | 25 | No | ~20s |
| `alarm-scenario` | Alarm Recovery | LOT-2026-002 | RCP-PHOTO-A1 | 25 | Yes | ~25s |
| `alt-recipe` | Alternative Recipe | LOT-2026-003 | RCP-PHOTO-B2 | 13 | No | ~15s |

### Alarm Scenario Flow

The `alarm-scenario` injects a high-temperature alarm mid-process:
1. Process starts normally
2. After 5 seconds → `S5F1 ALCD=0x81` (Alarm Set) → ProcessState transitions to **Pause**
3. 3-second hold (simulating operator response)
4. `S5F1 ALCD=0x01` (Alarm Clear) → ProcessState resumes to **Executing**
5. Process completes normally

---

## Prerequisites

| Tool | Version | Notes |
|------|---------|-------|
| [.NET SDK](https://dotnet.microsoft.com/download) | 8.0+ | Required for both backend services |
| [Node.js](https://nodejs.org/) | 18+ | Required for Angular frontend |
| Angular CLI | 17.x | `npm install -g @angular/cli` |

Verify installations:
```bash
dotnet --version   # 8.x.x
node --version     # v18.x.x or higher
ng version         # Angular CLI 17.x
```

---

## Running the Project

Open **three separate terminals** and start services in the following order:

### Terminal 1 — Equipment Simulator

```bash
cd src/SecsGemDemo.Equipment
dotnet run
```

Expected output:
```
[INFO] HSMS passive server listening on port 5000
[INFO] Equipment HTTP API listening on http://localhost:5002
[INFO] CommState: NotCommunicating | ProcessState: Idle
```

### Terminal 2 — Host MES API

```bash
cd src/SecsGemDemo.Host.Api
dotnet run
```

Expected output:
```
[INFO] Host API listening on http://localhost:5001
[INFO] SignalR hub ready at /hubs/secs
[INFO] Swagger UI: http://localhost:5001/swagger
```

### Terminal 3 — Angular Frontend

```bash
cd src/SecsGemDemo.Frontend
npm install        # first time only
ng serve           # or: npm start
```

Open browser: **http://localhost:4200**

---

## Running a Scenario

### Automated Run (Recommended for demo)

1. Open `http://localhost:4200`
2. Select a scenario from the dropdown (Normal / Alarm Recovery / Alt Recipe)
3. Click **Run**
4. Observe real-time updates across all panels (~15–25 seconds)

### Manual Step-by-Step

Use the **Scenario Panel** buttons to execute each SECS message individually:

| Button | Action | SECS Message |
|--------|--------|-------------|
| Connect | Establish HSMS comm | S1F13 → S1F14 |
| Define Reports | Set up event-variable linking | S2F33/35/37 |
| Carrier Arrived | Notify lot arrival | S6F11 CEID=1 |
| Select Recipe | Send PP-SELECT | S2F41 → S2F42 |
| Process Start | Signal process begin | S6F11 CEID=2 |
| Trace | Collect parameter data | S6F11 CEID=4 |
| Process End | Signal process complete | S6F11 CEID=3 |

---

## UI Components

| Component | Description |
|-----------|-------------|
| **State Panel** | Live COMM STATE (red/green) and PROCESS STATE (color-coded) |
| **GEM State Diagram** | SVG visualization of the GEM state machine transitions |
| **Message Log** | Timestamped table of all SECS S#F# exchanges with direction |
| **Trace Chart** | Real-time line chart of Temperature, Gas Pressure, and other process parameters |
| **Alarm Panel** | List of active/cleared alarms with ALID and alarm text |
| **Process History** | Track-In/Out records: LotId, WaferCount, ProcessStep, timestamps, result |
| **Scenario Results** | Summary cards per run: scenario name, lot, PPID, duration, alarm count, result |

---

## Port Reference

| Service | Address | Purpose |
|---------|---------|---------|
| HSMS (Equipment) | `tcp://localhost:5000` | SECS/GEM protocol |
| Equipment HTTP | `http://localhost:5002` | Event trigger API |
| Host REST API | `http://localhost:5001` | Scenario control |
| Swagger UI | `http://localhost:5001/swagger` | API documentation |
| SignalR Hub | `ws://localhost:5001/hubs/secs` | Real-time push |
| Angular Dev | `http://localhost:4200` | Web UI |

---

## Logging

Log files are written to the `logs/` directory in each service root:

```
src/SecsGemDemo.Equipment/logs/equipment-YYYYMMDD.log
src/SecsGemDemo.Host.Api/logs/host-YYYYMMDD.log
```

Format: `[HH:mm:ss.fff] [LEVEL] Message`

All SECS message frames (S#F#) are logged at both the Equipment and Host side for full trace visibility.

---

## License

This project is for portfolio and educational purposes, demonstrating SEMI E5/E30 SECS/GEM protocol implementation in the context of semiconductor MES integration.
