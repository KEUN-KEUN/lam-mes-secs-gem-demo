# 기술 Q&A — 설계 결정 및 구현 배경

> SECS/GEM Equipment–MES 통신 데모의 주요 기술 질문과 구현 배경을 정리합니다.

---

### Q1. S2F33/S2F35/S2F37이 뭔가요? 왜 이게 중요한가요?

**한 줄 답**: Report를 동적으로 정의하는 3단계 핸드셰이크입니다.

**상세 설명**:

SECS/GEM에서 장비가 공정 데이터를 보내는 방식은 두 가지가 있습니다.
- 하드코딩: 장비가 항상 정해진 데이터만 보냄
- 동적 정의: Host가 "이 이벤트 때 이 데이터를 보내라"고 런타임에 지시

이 프로젝트는 동적 정의 방식을 구현했습니다. 3단계 흐름은 이렇습니다.

```
S2F33 — Report 템플릿 정의
  "Report #1001 = [LOT_ID, PPID, START_TIME] 이라고 이름 붙여둬라"
  "Report #1002 = [LOT_ID, WAFER_COUNT, END_TIME, RESULT] 이라고 이름 붙여둬라"

S2F35 — 이벤트와 Report 연결
  "PROCESS_START 이벤트가 발생하면 Report #1001을 보내라"
  "PROCESS_END 이벤트가 발생하면 Report #1002를 보내라"

S2F37 — 이벤트 감시 시작
  "PROCESS_START, PROCESS_END 이벤트를 이제부터 감시해라"
```

이 3단계가 끝나면, 이후 장비에서 공정이 시작될 때 S6F11 메시지에
Report #1001의 변수들(LOT_ID, PPID, START_TIME)이 자동으로 조립되어 옵니다.

**왜 중요한가**:  
하드코딩 방식은 장비 펌웨어를 수정해야 데이터 수집 항목을 바꿀 수 있습니다.  
동적 정의 방식은 MES(Host)가 런타임에 장비에 지시하므로,
장비 펌웨어 변경 없이 수집 데이터를 유연하게 변경할 수 있습니다.  
이것이 GEM 표준의 핵심 설계 철학입니다.

---

### Q2. GEM 상태 머신을 왜 Stateless 라이브러리로 구현했나요?

**한 줄 답**: SEMI E30 표준이 허용하는 상태 전이를 코드 레벨에서 강제하기 위해서입니다.

**상세 설명**:

SEMI E30은 장비의 Communication State와 Process State를 정의합니다.

```
Communication State:
  NotCommunicating → [S1F13 수신] → Communicating
  Communicating    → [HSMS 단절]  → NotCommunicating

Process State:
  Idle → Setup → Ready → Executing → Idle
                              ↓
                           Pause (알람) → Executing
```

if-else로 구현하면 이렇게 됩니다:
```csharp
// 나쁜 예 — 상태 전이 조건이 코드 전체에 흩어짐
if (currentState == "Executing") {
    if (someCondition) currentState = "Idle";  // 여기도
}
// ... 다른 파일에서
if (currentState == "Executing") {
    currentState = "NotCommunicating";  // 잘못된 전이인데 막을 방법 없음
}
```

Stateless 라이브러리로 구현하면:
```csharp
// 좋은 예 — 허용 전이만 선언, 나머지는 자동으로 예외
_processSm.Configure(ProcessState.Executing)
    .Permit(ProcessTrigger.ProcessComplete, ProcessState.Idle)
    .Permit(ProcessTrigger.AlarmRaised, ProcessState.Pause);
    // Executing → NotCommunicating 전이는 선언 안 했으므로 시도 시 예외 발생
```

SEMI E30 표준의 상태 다이어그램을 코드로 그대로 옮긴 것입니다.
허용되지 않은 전이를 시도하면 예외가 발생해서 표준 위반을 런타임에 잡을 수 있습니다.

---

### Q3. 실시간 데이터 전송에 SignalR를 선택한 이유는?

**한 줄 답**: 장비 이벤트는 서버가 브라우저로 밀어넣어야 하는데, HTTP는 브라우저가 먼저 요청해야 하는 구조이기 때문입니다.

**상세 설명**:

데이터 흐름을 보면:
```
Equipment → (SECS/GEM TCP 메시지) → Host API → (실시간) → 브라우저
```

문제: 장비가 S6F11을 보내는 타이밍을 브라우저가 알 수 없습니다.
브라우저가 1초마다 "데이터 왔어요?" HTTP 요청을 보내는 방식(Polling)은:
- 데이터가 없어도 요청을 보냄 → 낭비
- 1초 간격이면 실시간이 아님

SignalR는 WebSocket 기반으로 서버→브라우저 방향 push가 가능합니다:
```
S6F11 수신
  → EventSubscriber.HandleAsync()
  → MessageBroadcaster.BroadcastMessageAsync()  ← 여기서 SignalR로 push
  → 브라우저의 message$ Subject에 즉시 도달
  → 화면 업데이트
```

장비 이벤트 기반 시스템에 SignalR(또는 WebSocket)은 자연스러운 선택입니다.

---

### Q4. HSMS가 뭔가요?

**한 줄 답**: SECS 메시지를 TCP/IP로 전송하기 위한 프로토콜입니다.

**상세 설명**:

SECS/GEM은 계층 구조로 되어 있습니다:
```
SEMI E30 (GEM)     — 장비가 어떻게 행동해야 하는가 (상태, 이벤트, 보고)
SEMI E5  (SECS-II) — 메시지 포맷 (S/F 번호, Item 타입, 데이터 구조)
SEMI E37 (HSMS)    — TCP/IP 전송 계층 (연결, 세션 관리, framing)
```

HSMS는 두 가지 역할:
- **Active (Host)**: TCP Connect를 먼저 시도하는 쪽
- **Passive (Equipment)**: Listen하며 연결을 기다리는 쪽

이 프로젝트에서 Secs4Net 라이브러리가 HSMS를 처리합니다.
직접 소켓 코딩 없이 `GetPrimaryMessageAsync()`로 메시지만 꺼내쓰면 됩니다.

---

### Q5. DVID와 SVID의 차이가 뭔가요?

**한 줄 답**: DVID는 이벤트 발생 시 동적으로 수집하는 값, SVID는 언제든 조회할 수 있는 현재 장비 상태값입니다.

| | DVID (Data Variable) | SVID (Status Variable) |
|---|---|---|
| 수집 시점 | 이벤트(S6F11) 발생 시 | 언제든 S1F3으로 조회 |
| 예시 | LOT_ID, START_TIME, RESULT | CHAMBER_TEMP, EQUIPMENT_STATE |
| SEMI 정의 | E5/E30 | E5/E30 |

> **구현 메모**: RPTID=1003의 CHAMBER_TEMP는 엄밀히 SVID인데 코드에서 DVID로 처리하고 있습니다. 실제 업무에서는 Report 정의 시 구분이 필요합니다.

---

### Q6. 현재 알려진 한계

1. **DataId 하드코딩**: SEMI E30은 트랜잭션마다 고유 DataId를 요구하는데, 현재 모두 9001로 고정되어 있습니다. `Interlocked.Increment`로 쉽게 수정 가능합니다.
2. **CEED 타입 오류**: S2F37의 CEED 값이 Boolean이어야 하는데 Binary로 구현되어 있습니다.
3. **영속화 없음**: In-Memory로만 동작해서 프로세스 재시작 시 데이터가 사라집니다.
4. **CEID/DVID 상수 관리**: 실무에서는 DB에서 관리해야 장비 교체 시 대응 가능합니다.

---

## 포트 및 ID 레퍼런스

| 항목 | 값 |
|---|---|
| Equipment Port (HSMS Passive) | 5000 |
| Host API Port | 5001 |
| Equipment HTTP Port | 5002 |
| Angular Port | 4200 |
| CEID: CarrierArrived | 1 |
| CEID: ProcessStart | 2 |
| CEID: ProcessEnd | 3 |
| CEID: Trace | 5 |
| RPTID: ProcessStart 데이터 | 1001 |
| RPTID: ProcessEnd 데이터 | 1002 |
| RPTID: Trace 데이터 | 1003 |
