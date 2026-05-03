# SECS/GEM Track-In/Out Demo — 시연 시나리오

> 대상: 면접관 앞 라이브 데모 (5~7분)  
> 준비: Equipment 프로세스, Host API, Angular 앱 모두 실행 상태

---

## 사전 준비 (시연 전)

```bash
# 터미널 1 — Equipment
cd src/SecsGemDemo.Equipment
dotnet run

# 터미널 2 — Host API
cd src/SecsGemDemo.Host.Api
dotnet run

# 터미널 3 — Angular
cd src/SecsGemDemo.Frontend
npm start
```

브라우저 `http://localhost:4200` 열기  
헤더에 **SignalR Connected** (초록 점) 확인

---

## 화면 구성 (3분할 레이아웃)

```
┌──────────────────────────┬─────────────────────────────────────┐
│  LEFT SIDEBAR            │  TOP: [Trace | GEM States | Results]│
│  - Auto Scenario         ├─────────────────────────────────────┤
│  - COMM / PROCESS STATE  │  BOTTOM-LEFT: Message Log           │
│  - Manual Steps (7개)    │  BOTTOM-RIGHT: Process History      │
│  - Alarm Panel           │                                     │
└──────────────────────────┴─────────────────────────────────────┘
```

---

## Option A — Auto Scenario (권장: 임팩트 최대)

### 사전 연결 (한 번만)

1. 좌측 **Scenario Steps** → **① Connect** 클릭
2. **② Define Reports** 클릭

### Auto Scenario 실행

1. 좌측 상단 **Auto Scenario** 드롭다운에서 시나리오 선택
2. **Run Scenario** 버튼 클릭 → 전체 시나리오 자동 실행 (~15초)
3. 우측 상단 **Results 탭** 클릭 → 결과 카드 실시간 확인

### 3개 시나리오 설명

| 시나리오 | LOT | Recipe | 특징 |
|---|---|---|---|
| Normal Process Run | LOT-2026-001 | RCP-PHOTO-A1 | 정상 공정 |
| Alarm Recovery | LOT-2026-002 | RCP-PHOTO-A1 | 중간 온도 알람 + 복구 |
| Alternative Recipe | LOT-2026-003 | RCP-PHOTO-B2 | 다른 레시피 + 13 wafer |

**설명 포인트:**
> "각 시나리오마다 LOT ID, Recipe, Wafer Count가 다릅니다. 코드 수정 없이 JSON으로 시나리오를 정의해 실행 가능합니다. 실제 MES에서는 이 정의가 DB에 저장됩니다."

---

## Option B — 단계별 수동 시연 (흐름 설명 시)

### Step 1 — ① Connect 버튼

**설명 포인트:**
> "Host가 HSMS Active로 설비에 TCP 연결 시도합니다. 연결 후 S1F13 메시지로 통신 수립을 요청하고, 설비는 S1F14 COMMACK=0x00으로 승인합니다."

**화면 확인:**
- 좌측 COMM 패널: `NotCommunicating` → `Communicating` (초록색)
- **GEM States 탭**: NotCommunicating 박스가 빨간색으로 강조 → Communicating 박스가 초록색으로 전환
- 메시지 로그: `H→E S1F13`, `E→H S1F14` 순서로 표시

---

### Step 2 — ② Define Reports 버튼

**설명 포인트:**
> "SEMI GEM 표준의 동적 Report 설정입니다. S2F33으로 RPTID별 데이터 항목을 정의하고, S2F35로 이벤트(CEID)와 연결하고, S2F37로 활성화합니다. 코드 수정 없이 설비가 보낼 데이터를 런타임에 구성합니다."

**화면 확인:**
- 메시지 로그에 S2F33×3, S2F35×3, S2F37 순서로 7개 메시지

---

### Step 3 — ③ Carrier Arrived 버튼

**설명 포인트:**
> "OHT가 캐리어를 설비 포트에 내려놓은 이벤트입니다. 설비가 S6F11 CEID=1로 Host에 통보하고, Host는 MES에서 해당 Lot의 공정 단계를 검증합니다."

**화면 확인:**
- 메시지 로그: `E→H S6F11` (Event Report CEID=1)
- Process History 패널에 Lot 행 나타남

---

### Step 4 — ④ Select Recipe 버튼

**설명 포인트:**
> "Host가 S2F41 PP-SELECT 명령으로 레시피를 선택합니다. 설비는 레시피 존재 여부를 확인하고 ProcessState를 Idle → Setup → Ready로 전이합니다."

**화면 확인:**
- **GEM States 탭**: Process State 흐름 — Setup(노란색) → Ready(보라색) 강조
- 우측 PROCESS 패널: `Idle` → `Ready`

---

### Step 5 — ⑤ Process Start 버튼 (Track-In)

**설명 포인트:**
> "공정이 시작됩니다. 설비가 S6F11 CEID=2로 Track-In 이벤트를 보내면서 LotId, Recipe, 시작시각을 실어 보냅니다. 동시에 Trace 스트리밍이 시작되어 1초마다 온도/가스유량/압력이 실시간으로 올라옵니다."

**화면 확인:**
- **GEM States 탭**: Executing(파란색) 강조
- **Trace 탭**: 3개 라인 실시간 업데이트 시작
- Process History: Track-In 시각 기록됨

**[대기 20~30초 — Trace 파형 보여주기]**

---

### Step 6(선택) — 알람 Trigger/Clear

**순서:**
1. Alarm Panel → **Trigger Alarm** 클릭
2. **GEM States 탭**: Executing → Pause(주황색) 전이 확인
3. **Clear Alarm** → Pause → Executing 복귀

---

### Step 7 — ⑥ Process End 버튼 (Track-Out)

**설명 포인트:**
> "공정이 완료됩니다. 설비가 S6F11 CEID=3으로 Track-Out 이벤트를 보내면서 WaferCount, 종료시각, Result를 실어 보냅니다. Trace 스트리밍도 자동으로 중단됩니다."

**화면 확인:**
- **GEM States 탭**: Executing → Idle 복귀 (점선 화살표 경로)
- **Results 탭**: 결과 카드 PASS 배지

---

### Step 8 — ⑦ Disconnect 버튼

**화면 확인:**
- COMM 패널: `Communicating` → `NotCommunicating`
- **GEM States 탭**: Communicating(초록) → NotCommunicating(빨간색)

---

## 시각화 탭 설명 포인트

### Trace 탭
> "공정 중 설비의 온도/가스유량/압력을 1초마다 수신해 실시간으로 그래프화합니다. 실제 환경에서는 레시피 파라미터 준수 여부를 모니터링하는 데 씁니다."

### GEM States 탭
> "SEMI E30 GEM 표준의 두 독립 상태 머신입니다. Comm State는 HSMS 연결 상태, Process State는 공정 진행 상태입니다. 현재 활성 상태가 색깔로 강조 표시됩니다."

### Results 탭
> "자동 실행된 시나리오의 결과를 카드로 표시합니다. LOT ID, Recipe, Wafer Count, 알람 발생 횟수, 총 소요 시간이 기록됩니다."

---

## 면접 예상 질문 & 답변 포인트

| 질문 | 핵심 답변 |
|---|---|
| S2F33/35/37이 뭔가요? | 동적 Report 설정 3단계: 정의→연결→활성화. 코드 변경 없이 런타임 구성 |
| S6F11이 뭔가요? | 설비→Host 이벤트 리포트. CEID로 이벤트 종류, RPTID로 데이터 구조 식별 |
| S5F1은 뭔가요? | 알람 리포트. ALCD 0x80=SET, 0x00=CLEAR. GEM 상태 Pause 전이 트리거 |
| HSMS Active/Passive? | Host=Active(연결 시도), Equipment=Passive(대기). appsettings의 IsActive로 설정 |
| 실무와 다른 점? | CEID/DVID를 코드에 상수로 정의. 실무는 DB에서 관리해 설비 교체 대응 |
| SignalR 선택 이유? | 설비 이벤트는 서버 Push 필요. Polling보다 WebSocket이 적합 |
| 여러 시나리오 관리? | scenarios.json으로 외부 정의. DB로 이관 가능한 구조. Auto Scenario는 전체 공정을 한 번에 실행 |
| GEM 상태 머신을 Stateless로? | SEMI E30 상태 전이를 Fire()로 표현. 상태 오류는 예외로 자동 검출. 직접 구현 대비 코드 50% 감소 |
| 3일 만에 만든 소감? | SEMI 표준 문서 + Secs4Net 라이브러리로 프로토콜 레이어를 빠르게 구축. 실무 MES 경험으로 비즈니스 로직(Track-In/Out, Genealogy, Alarm)은 바로 구현 가능했음 |

---

## 구현 완료 목록

| 항목 | 상태 |
|---|---|
| S1F13/14 통신 수립 | ✅ |
| S2F33/35/37 동적 Report | ✅ |
| S6F11 이벤트 리포트 (CEID 1/2/3) | ✅ |
| S2F41/42 PP-SELECT | ✅ |
| S5F1/S5F2 알람 처리 | ✅ |
| GEM 상태 머신 (Comm + Process) | ✅ |
| Trace 실시간 차트 (SVG) | ✅ |
| Process History / Genealogy 패널 | ✅ |
| Alarm 패널 (Set/Clear) | ✅ |
| **GEM State Diagram (라이브 강조)** | ✅ 신규 |
| **Auto Scenario (JSON 기반 자동 실행)** | ✅ 신규 |
| **Scenario Results 패널 (카드 UI)** | ✅ 신규 |
| **다중 Recipe 지원 (RCP-PHOTO-B2)** | ✅ 신규 |
| **파라미터화된 Equipment API** | ✅ 신규 |
| Trace 자동 종료 (ProcessEnd 연동) | ✅ |
| 이중 Connect 방지 | ✅ |
| 메시지 로그 상한 (1000건) | ✅ |
| SignalR 연결 상태 UI | ✅ |
