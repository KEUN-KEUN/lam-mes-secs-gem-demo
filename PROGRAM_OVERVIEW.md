# LAM-MES 프로그램 전체 구조 이해 문서

> 대상: React 경험 있음 / C# WPF 기초 / Angular 처음 / SECS/GEM 실무 지식 있음

---

## 1. 전체 아키텍처 한눈에 보기

```
┌─────────────────────────────────────────────────────────────┐
│  브라우저 http://localhost:4200                              │
│  Angular 17 (SecsGemDemo.Frontend)                          │
│    SignalrService ──────── ScenarioService                  │
│    StatePanelComponent     ScenarioPanelComponent           │
│    MessageLogComponent                                      │
└────────────┬────────────────────┬───────────────────────────┘
             │ WebSocket (SignalR)│ HTTP REST
             ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│  Host.Api  http://localhost:5001                            │
│  (SecsGemDemo.Host.Api) — HSMS Active (능동 연결)           │
│                                                             │
│  ScenarioOrchestrator   → SECS 메시지 전송                  │
│  EventSubscriber        → SECS 메시지 수신 (BackgroundService)│
│  MessageBroadcaster     → SignalR push                      │
│  GemStateTracker        → 현재 상태 보관                    │
│  ValidationEngine       → LOT·Recipe 검증                   │
│  MasterDataStore        → 인메모리 데이터                    │
└────────────────────────────┬────────────────────────────────┘
                             │ HSMS (TCP:5000) — SECS/GEM 프로토콜
                             ▼
┌─────────────────────────────────────────────────────────────┐
│  Equipment  http://localhost:5002                           │
│  (SecsGemDemo.Equipment) — HSMS Passive (수동 대기)         │
│                                                             │
│  EquipmentWorker        → HSMS Accept 루프 (BackgroundService)│
│  GemStateMachine        → 장비 내부 상태 관리               │
│  ReportRegistry         → 동적 Report 정의 보관             │
│  EventEmitter           → S6F11 이벤트 조립·발송            │
│  ProcessSimulator       → 시나리오 HTTP 트리거              │
│  Handlers               → 각 SECS 메시지 처리               │
└─────────────────────────────────────────────────────────────┘
```

**데이터 흐름 방향 정리**
```
사용자 버튼 클릭
  → Angular ScenarioService (HTTP POST)
    → Host.Api ScenarioController
      → ScenarioOrchestrator (SECS 메시지 H→E 전송)
        → Equipment Handler (처리 후 응답 E→H)
          → Host MessageBroadcaster (SignalR push)
            → Angular MessageLogComponent (실시간 표시)

Equipment 자체 이벤트 (S6F11)
  → Host.Api EventSubscriber (수신)
    → MasterDataStore (Track-In/Out 기록)
    → MessageBroadcaster (SignalR push)
      → Angular (상태·메시지 업데이트)
```

---

## 2. SECS/GEM 용어 정리

### 전송 계층 (SEMI E37 — HSMS)

| 용어 | 뜻 | 이 프로젝트에서 |
|---|---|---|
| **HSMS** | High-Speed Message Services. TCP 위에서 SECS-II 메시지를 주고받는 전송 규격 | Equipment↔Host 간 TCP:5000 연결 |
| **Active** | 먼저 TCP 연결을 시도하는 쪽 | Host.Api (`IsActive: true`) |
| **Passive** | TCP 연결을 기다리는 쪽 (서버 역할) | Equipment (`IsActive: false`) |
| **SelectRequest / SelectResponse** | HSMS 연결 수립 후 "데이터를 주고받을 준비 완료"를 알리는 제어 메시지 | TCP 연결 직후 자동 처리 (Secs4Net) |
| **ConnectionState** | NotConnected → Connecting → Connected → Selected | `hsmsConnection.State` 로 확인 |

### 메시지 계층 (SEMI E5 — SECS-II)

| 용어 | 뜻 | 예시 |
|---|---|---|
| **S#F#** | Stream(카테고리) + Function(기능) | S1F13 = Stream1 Function13 |
| **W bit** | Reply Expected — 응답을 기다리는 메시지 | `replyExpected: true` |
| **Primary** | 요청 메시지 (홀수 F번호) | S1F13, S2F33, S6F11 |
| **Secondary** | 응답 메시지 (짝수 F번호) | S1F14, S2F34, S6F12 |
| **SML** | SECS Message Language — 사람이 읽을 수 있는 메시지 표현 형식 | `< L < U4 1001 > >` |

### 주요 메시지 스트림

| Stream | 의미 |
|---|---|
| S1 | 장비 초기화, 통신 수립 |
| S2 | 장비 제어, Report 정의 |
| S5 | Alarm |
| S6 | Data Collection — 이벤트 보고 |

### Item 타입 (SECS-II 데이터 타입)

| Secs4Net 코드 | SEMI 타입 | 설명 |
|---|---|---|
| `L(...)` | List | 여러 Item의 묶음 (배열과 유사) |
| `U4(값)` | Unsigned 4-byte | ID, Count 등 양의 정수 |
| `A("문자열")` | ASCII | 문자열 (LOT_ID, PPID 등) |
| `B(0x00)` | Binary | ACK 코드, 플래그 |
| `F4(값)` | Float 4-byte | 온도, 유량 등 실수 |
| `F8(값)` | Float 8-byte | 압력 등 정밀 실수 |

### GEM 개념 (SEMI E30)

| 용어 | 뜻 | 이 프로젝트에서 |
|---|---|---|
| **CEID** | Collection Event ID — 장비에서 발생하는 이벤트 번호 | `CeidCatalog.cs` (1=CarrierArrived 등) |
| **RPTID** | Report ID — 이벤트에 연결되는 데이터 묶음 번호 | 1001, 1002, 1003 |
| **DVID** | Data Variable ID — Report에 포함되는 개별 데이터 항목 번호 | `DvidCatalog.cs` (1=LotId 등) |
| **SVID** | Status Variable ID — 장비 상태 변수 번호 | `SvidCatalog.cs` (1=ChamberTemp 등) |
| **CommState** | GEM 통신 상태 (NotCommunicating ↔ Communicating) | `GemStateMachine.cs` |
| **ProcessState** | GEM 공정 상태 (Idle→Setup→Ready→Executing→Pause) | `GemStateMachine.cs` |

### 동적 Report 흐름 (핵심)

```
[Host → Equipment]
S2F33: "RPTID=1001에 LOT_ID, PPID, START_TIME 데이터를 담아라"
         ↓
S2F35: "CEID=2(ProcessStart) 이벤트 발생 시 RPTID=1001을 보내라"
         ↓
S2F37: "CEID 1,2,3,5를 활성화해라"

[이후 장비에서 CEID=2 이벤트 발생하면]
Equipment → Host
S6F11: DATAID, CEID=2, L[L[RPTID=1001, L[LOT_ID값, PPID값, START_TIME값]]]
```

---

## 3. MES 용어 정리

| 용어 | 뜻 | 이 프로젝트에서 |
|---|---|---|
| **Track-In** | LOT이 장비에 들어가 공정 시작 | ProcessStart S6F11 수신 시 `RecordTrackIn()` |
| **Track-Out** | LOT이 장비에서 나와 공정 완료 | ProcessEnd S6F11 수신 시 `RecordTrackOut()` |
| **LOT** | 함께 처리되는 웨이퍼 묶음 | `LOT-2026-0430-001` |
| **Recipe (PPID)** | 공정 파라미터 집합 (어떻게 처리할지) | `RCP-PHOTO-A1` |
| **Genealogy** | LOT → 웨이퍼 → 공정 → 결과의 이력 추적 | `ProcessHistory` record |
| **CEID** | 장비 이벤트 (CarrierArrived, ProcessStart 등) | `CeidCatalog.cs` |
| **Carrier** | 웨이퍼를 담는 물리적 용기 (FOUP 등) | Step 3 시나리오 |

---

## 4. 시나리오 흐름 — 7단계 상세

```
① Connect
   Host가 Equipment TCP:5000에 연결
   HSMS SelectRequest/SelectResponse 자동 교환
   Host → Equipment: S1F13 (Establish Communication)
   Equipment → Host: S1F14 (COMMACK=0)
   CommState: NotCommunicating → Communicating

② Define Reports
   S2F33 ×3: 3개 Report 정의
     RPTID=1001: LOT_ID, PPID, START_TIME
     RPTID=1002: LOT_ID, WAFER_COUNT, END_TIME, RESULT
     RPTID=1003: CHAMBER_TEMP, GAS_FLOW, PRESSURE
   S2F35 ×3: CEID-RPTID 연결
     CEID=2(ProcessStart) → RPTID=1001
     CEID=3(ProcessEnd)   → RPTID=1002
     CEID=5(Trace)        → RPTID=1003
   S2F37 ×1: CEID 1,2,3,5 활성화

③ Carrier Arrived
   Host → Equipment HTTP: POST /equipment/carrier-arrived
   Equipment 자체 발생: S6F11 CEID=1
   Host 수신: LOT 존재 + CurrentStep 검증

④ Select Recipe
   Host → Equipment: S2F41 RCMD=PP-SELECT PPID=RCP-PHOTO-A1
   Equipment: Recipe 검증 → ProcessState: Idle→Setup(200ms)→Ready
   Equipment → Host: S2F42 HCACK=0

⑤ Process Start
   Host → Equipment HTTP: POST /equipment/process-start
   Equipment 자체 발생: S6F11 CEID=2 (LOT_ID, PPID, START_TIME 포함)
   Host 수신: RecordTrackIn() 호출
   ProcessState: Ready → Executing
   동시에 Trace 시작: 1Hz로 S6F11 CEID=5 발송 (Temp, GasFlow, Pressure)

⑥ Process End
   Host → Equipment HTTP: POST /equipment/process-end
   Equipment 자체 발생: S6F11 CEID=3 (LOT_ID, WAFER_COUNT, END_TIME, RESULT 포함)
   Host 수신: RecordTrackOut() 호출
   ProcessState: Executing → Idle

⑦ Disconnect
   GemStateTracker 초기화
   IAsyncDisposable.DisposeAsync() 호출 → TCP 종료
```

---

## 5. 프로젝트 코드 구조

### SecsGemDemo.Domain (공유 상수·모델)

```
Domain/
├── Catalogs/
│   ├── CeidCatalog.cs      ← 이벤트 ID 상수 (CarrierArrived=1, ProcessStart=2 ...)
│   ├── DvidCatalog.cs      ← 데이터 변수 ID (LotId=1, Ppid=2 ...)
│   ├── SvidCatalog.cs      ← 상태 변수 ID (ChamberTemp=1, GasFlow=2 ...)
│   └── HostCommandCatalog.cs ← 호스트 명령 (PpSelect = "PP-SELECT")
├── Enums/
│   ├── CommState.cs        ← NotCommunicating, Communicating
│   └── ProcessState.cs     ← Idle, Setup, Ready, Executing, Pause
└── Models/
    ├── Equipment.cs        ← record Equipment(string Id, string Name)
    ├── Lot.cs              ← record Lot(string LotId, string CurrentStep, int WaferCount)
    └── Recipe.cs           ← record Recipe(string Ppid, string Hash)
```

**왜 Domain 프로젝트가 분리되어 있나?**
Equipment와 Host.Api 둘 다 같은 CEID 번호, 같은 DVID 번호를 써야 합니다. 각자 정의하면 불일치 발생 → 공유 프로젝트로 분리.

---

### SecsGemDemo.Equipment

```
Equipment/
├── Program.cs                   ← WebApplication 빌드, DI 등록, HTTP 엔드포인트
├── appsettings.json             ← IsActive:false (Passive), Port:5000, Urls:5002
├── Services/
│   ├── SecsExtensions.cs        ← AddSecs4Net<T>() DI 등록 헬퍼 (NuGet에 없어서 직접 구현)
│   ├── EquipmentWorker.cs       ← BackgroundService: HSMS Accept 루프 + 이벤트 구독
│   ├── GemStateMachine.cs       ← Stateless: CommState + ProcessState 상태 머신
│   ├── ReportRegistry.cs        ← S2F33/35/37 결과 보관 (RPTID→DVIDs, CEID→RPTIDs)
│   ├── EventEmitter.cs          ← CEID 기반으로 S6F11 메시지 조립·발송
│   ├── ProcessSimulator.cs      ← HTTP 트리거 → S6F11 발생 시뮬레이션
│   ├── RecipeStore.cs           ← 등록된 Recipe 관리
│   └── EquipmentSecsLogger.cs   ← ISecsGemLogger 구현 (Serilog 연동)
└── Handlers/
    ├── MessageRouter.cs         ← 수신 메시지 → 올바른 Handler로 라우팅
    ├── S1F13Handler.cs          ← Establish Communication 처리 → S1F14 응답
    ├── S2F33Handler.cs          ← Define Report 처리 → ReportRegistry 등록
    ├── S2F35Handler.cs          ← Link Event 처리 → CEID-RPTID 연결
    ├── S2F37Handler.cs          ← Enable/Disable Events 처리
    └── S2F41Handler.cs          ← Remote Command (PP-SELECT) → 레시피 선택 + 상태 전이
```

**핵심 파일: EquipmentWorker.cs**
```csharp
// BackgroundService: 앱 시작 시 자동 실행, 앱 종료 시 자동 중지
protected override async Task ExecuteAsync(CancellationToken stoppingToken)
{
    // HSMS 연결 이벤트 구독
    hsmsConnection.ConnectionChanged += (_, state) => {
        // 크리티컬: Communicating 상태일 때만 OnDisconnected 호출
        // (Connecting 이벤트에서 호출하면 상태 머신 예외 → AcceptAsync 루프 크래시)
        if ((state == ConnectionState.Retry || state == ConnectionState.Connecting)
            && stateMachine.CommState == CommState.Communicating)
            stateMachine.OnDisconnected();
    };

    await hsmsConnection.StartAsync(stoppingToken); // HSMS Passive: TCP:5000 Listen 시작

    // 수신 메시지 처리 루프
    await foreach (var msg in hsmsConnection.GetPrimaryMessageAsync(stoppingToken))
        await router.RouteAsync(msg, stoppingToken);
}
```

**핵심 파일: GemStateMachine.cs**
```csharp
// Stateless 라이브러리: if-else 없이 상태·트리거·전이를 선언적으로 정의
// CommState 머신
_commSm.Configure(CommState.NotCommunicating)
    .Permit(CommTrigger.CommunicationEstablished, CommState.Communicating);

_commSm.Configure(CommState.Communicating)
    .Permit(CommTrigger.Disconnected, CommState.NotCommunicating)
    .OnEntry(() => _processSm.Fire(ProcessTrigger.GoOnlineRemote)); // 자동 전이

// ProcessState 머신
_processSm.Configure(ProcessState.Idle)
    .Permit(ProcessTrigger.StartSetup, ProcessState.Setup);
// ... 등
```

**핵심 파일: ReportRegistry.cs**
```csharp
// S2F33로 정의된 Report 보관
private readonly Dictionary<uint, List<uint>> _reports = new();   // RPTID → [DVID...]
private readonly Dictionary<uint, List<uint>> _ceidToRptIds = new(); // CEID → [RPTID...]
private readonly HashSet<uint> _enabledCeids = new();

// S6F11을 만들 때: EventEmitter가 이 데이터를 조회해서 메시지 조립
```

---

### SecsGemDemo.Host.Api

```
Host.Api/
├── Program.cs                   ← WebApplication 빌드, SignalR, HttpClient, CORS 설정
├── appsettings.json             ← IsActive:true (Active), Port:5000, Urls:5001
├── Controllers/
│   └── ScenarioController.cs    ← REST API 7개 엔드포인트
├── Hubs/
│   └── SecsHub.cs               ← SignalR Hub (빈 클래스 — 서버→클라이언트 push 전용)
├── Dtos/
│   ├── SecsMessageDto.cs        ← Direction, S, F, Name, Sml, Timestamp
│   └── GemStateDto.cs           ← CommState, ProcessState
└── Services/
    ├── SecsExtensions.cs        ← AddSecs4Net<T>() (Equipment와 동일)
    ├── HostSecsLogger.cs        ← ISecsGemLogger 구현
    ├── ScenarioOrchestrator.cs  ← 시나리오 단계별 SECS 메시지 전송
    ├── EventSubscriber.cs       ← BackgroundService: 수신 S6F11 처리
    ├── MessageBroadcaster.cs    ← IHubContext<SecsHub>로 SignalR push
    ├── GemStateTracker.cs       ← 호스트 측 상태 추적 (인메모리)
    ├── MasterDataStore.cs       ← Equipment·Lot·Recipe·ProcessHistory 인메모리 보관
    └── ValidationEngine.cs     ← LOT CurrentStep 검증, Recipe 등록 검증
```

**핵심 파일: ScenarioOrchestrator.cs — SendAndLogAsync 패턴**
```csharp
// 모든 SECS 메시지 전송을 이 메서드를 통해 수행
// → 전송 전후로 SignalR 브로드캐스트 자동 처리
private async Task<SecsMessage> SendAndLogAsync(SecsMessage msg, CancellationToken ct)
{
    // 1. H→E 메시지를 브라우저에 push
    await broadcaster.BroadcastMessageAsync(new SecsMessageDto("H→E", ..., FormatSml(msg)), ct);
    
    // 2. 실제 SECS 전송
    var reply = await secsGem.SendAsync(msg, ct);
    
    // 3. E→H 응답을 브라우저에 push
    await broadcaster.BroadcastMessageAsync(new SecsMessageDto("E→H", ..., FormatSml(reply)), ct);
    
    return reply;
}
```

**핵심 파일: EventSubscriber.cs**
```csharp
// BackgroundService: 앱이 실행되는 동안 계속 수신 대기
protected override async Task ExecuteAsync(CancellationToken stoppingToken)
{
    // IAsyncEnumerable: Equipment에서 메시지가 올 때마다 await foreach가 깨어남
    await foreach (var e in secsGem.GetPrimaryMessageAsync(stoppingToken))
    {
        using var msg = e.PrimaryMessage; // using: 처리 완료 후 메모리 자동 해제
        await HandleAsync(msg, e, stoppingToken);
    }
}
```

---

### SecsGemDemo.Frontend (Angular 17)

```
Frontend/src/app/
├── app.config.ts                ← 전역 설정 (provideHttpClient 등록)
├── app.component.ts             ← 루트 컴포넌트 (레이아웃)
├── app.component.html           ← 레이아웃 템플릿
├── app.component.scss           ← 레이아웃 스타일
├── services/
│   ├── signalr.service.ts       ← HubConnection 관리, message$/state$ Subject 노출
│   └── scenario.service.ts     ← 7개 HTTP POST 메서드
└── components/
    ├── state-panel/
    │   └── state-panel.component.ts    ← Comm/Process 상태 색상 박스
    ├── message-log/
    │   └── message-log.component.ts   ← 메시지 테이블 + SML 모달
    └── scenario-panel/
        └── scenario-panel.component.ts ← 순차 버튼 ①~⑦
```

---

## 6. Angular 개념 — React와 비교

| 개념 | React | Angular 17 (이 프로젝트) |
|---|---|---|
| 컴포넌트 선언 | `function MyComp() {}` | `@Component({ selector, template, styles })` 데코레이터 |
| 상태 | `useState()` | 클래스 멤버 변수 (일반 필드) |
| 부모→자식 데이터 | `props` | `@Input() 변수명` |
| 자식→부모 이벤트 | `props.onEvent()` | `@Output() event = new EventEmitter()` |
| 조건부 렌더링 | `{condition && <div>}` | `*ngIf="condition"` (구조 디렉티브) |
| 리스트 렌더링 | `.map((item) => <div>)` | `*ngFor="let item of items"` |
| 클래스 바인딩 | `className={condition ? 'a' : 'b'}` | `[ngClass]="condition ? 'a' : 'b'"` |
| 이벤트 바인딩 | `onClick={handler}` | `(click)="handler()"` |
| 데이터 바인딩 | `{변수}` | `{{ 변수 }}` |
| HTTP | `fetch()` / axios | `HttpClient.post()` (Observable 반환) |
| 전역 상태 | Context / Redux | `@Injectable({ providedIn: 'root' })` 서비스 |
| 라이프사이클 | `useEffect(() => {}, [])` | `ngOnInit()` / `ngOnDestroy()` |
| Standalone | (기본) | `standalone: true` in @Component (Angular 17 기본) |

**이 프로젝트의 Angular 핵심 패턴**

```typescript
// 1. Injectable 서비스 — React의 Context와 유사
@Injectable({ providedIn: 'root' })  // 전체 앱에서 싱글턴
export class SignalrService {
  readonly message$ = new Subject<SecsMessageDto>(); // RxJS Subject = EventEmitter와 유사
  
  constructor() {
    this.hub.on('MessageLogged', (dto) => this.message$.next(dto)); // SignalR 이벤트 → Subject
  }
}

// 2. 컴포넌트에서 서비스 구독
export class MessageLogComponent implements OnInit, OnDestroy {
  private sub?: Subscription;
  
  constructor(private signalr: SignalrService) {} // 생성자 주입 (DI)
  
  ngOnInit() {
    this.sub = this.signalr.message$.subscribe(m => {
      this.messages.push(m); // 새 메시지 올 때마다 배열에 추가
    });
  }
  
  ngOnDestroy() { this.sub?.unsubscribe(); } // 메모리 누수 방지 — 반드시 해제
}

// 3. Observable (RxJS) — Promise와 비슷하지만 여러 값을 연속으로 방출
scenario.connect().subscribe({
  next: () => { step.state = 'done'; },   // 성공
  error: () => { step.state = 'error'; }, // 실패
});
// ↑ React에서 .then().catch()와 동일한 역할
```

---

## 7. C# 패턴 — WPF와 비교

| 패턴 | WPF에서 익숙한 것 | 이 프로젝트 |
|---|---|---|
| DI (의존성 주입) | `new` 직접 생성 | `builder.Services.AddSingleton<T>()` → 생성자에서 자동 주입 |
| 비동기 | `Task.Run()` | `async/await` 끝까지 (`.Result` 금지) |
| 백그라운드 실행 | `BackgroundWorker` | `BackgroundService` (IHostedService) |
| 이벤트 | `event EventHandler` | `event Action<ConnectionState>` |
| 설정 | App.config | `appsettings.json` + `IConfiguration` |
| 로깅 | `Debug.WriteLine` | Serilog (`Log.Information(...)`) |

**Primary Constructor (C# 12 신문법 — 이 프로젝트 전체에서 사용)**
```csharp
// WPF 방식 (기존)
public class MyService {
    private readonly ISecsGem _secsGem;
    public MyService(ISecsGem secsGem) {
        _secsGem = secsGem;
    }
}

// 이 프로젝트 방식 (Primary Constructor)
public sealed class MyService(ISecsGem secsGem) {
    // secsGem이 자동으로 멤버처럼 사용 가능
    public async Task DoSomething() => await secsGem.SendAsync(...);
}
```

**record 타입 (불변 데이터 객체)**
```csharp
// 이 프로젝트에서 DTO, 도메인 모델에 사용
public record ProcessHistory(
    string LotId,
    string Ppid,
    string StartTime,
    string? EndTime = null,  // nullable, 기본값 있음
    string? Result  = null
);

// with 표현식으로 일부만 변경한 새 객체 생성
var updated = existing with { EndTime = "2026-04-30T05:36:48Z", Result = "PASS" };
```

**BackgroundService 패턴**
```csharp
// IHostedService를 쉽게 구현하는 추상 클래스
// 앱 시작 시 자동 실행, 앱 종료 시 stoppingToken이 Cancel됨
public class EquipmentWorker(ISecsConnection conn) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        // stoppingToken이 Cancel되면 await가 OperationCanceledException 던지고 종료
        await conn.StartAsync(stoppingToken);
    }
}
```

**IAsyncEnumerable — 실시간 스트림**
```csharp
// 일반 IEnumerable: 모든 데이터가 이미 메모리에 있음
// IAsyncEnumerable: 데이터가 올 때마다 비동기로 하나씩 처리

await foreach (var message in secsGem.GetPrimaryMessageAsync(stoppingToken))
{
    // 새 SECS 메시지가 Equipment에서 올 때마다 이 블록 실행
    // stoppingToken Cancel 시 foreach 자동 종료
    await HandleAsync(message);
}
```

---

## 8. Secs4Net API 핵심 정리

### 주요 인터페이스

| 인터페이스 | 역할 | 등록 |
|---|---|---|
| `ISecsConnection` | TCP 연결 관리 (`Start`, `State`, `ConnectionChanged`) | `HsmsConnection` 구현체 |
| `ISecsGem` | SECS-II 메시지 전송/수신 (`SendAsync`, `GetPrimaryMessageAsync`) | `SecsGem` 구현체 |

### Item 생성 (static import 사용)

```csharp
using static Secs4Net.Item; // 파일 상단 — 이후 L(), U4(), A() 등 바로 사용 가능

// S6F11 예시: L[DATAID, CEID, L[L[RPTID, L[DV1, DV2]]]]
SecsItem = L(
    U4(9001),         // DATAID
    U4(2),            // CEID = ProcessStart
    L(                // Report 목록
        L(            // 첫 번째 Report
            U4(1001), // RPTID
            L(        // DV 목록
                A("LOT-2026-0430-001"),  // LOT_ID
                A("RCP-PHOTO-A1"),       // PPID
                A("2026-04-30T05:36:43Z") // START_TIME
            )
        )
    )
)

// Item 값 읽기
var ceid = root.Items[1].FirstValue<uint>();  // U4 → uint
var lotId = vars[0].GetString();              // A → string
var temp = vars[0].FirstValue<float>();       // F4 → float
```

### 메시지 전송

```csharp
// 전송 (reply 대기)
var reply = await secsGem.SendAsync(new SecsMessage(1, 13, replyExpected: true)
{
    Name = "Establish Communication",
    SecsItem = L(L())
}, cancellationToken);

// 수신 후 응답
await primaryMsgWrapper.TryReplyAsync(new SecsMessage(1, 14, replyExpected: false)
{
    SecsItem = L(B(0x00), L())  // COMMACK=0
}, cancellationToken);
```

---

## 9. SignalR 흐름

```
[서버 측]
MessageBroadcaster.BroadcastMessageAsync(dto)
  → hub.Clients.All.SendAsync("MessageLogged", dto)
    → 연결된 모든 브라우저 클라이언트에게 push

[클라이언트 측 — Angular]
this.hub.on('MessageLogged', (dto: SecsMessageDto) => {
    this.message$.next(dto);  // Subject가 새 값 방출
});

// 컴포넌트에서 구독
this.signalr.message$.subscribe(m => {
    this.messages.push(m);  // 화면 자동 업데이트
});
```

**SignalR 이벤트 목록**
| 이벤트 이름 | 발생 시점 | 페이로드 |
|---|---|---|
| `MessageLogged` | H→E 또는 E→H 메시지 전송/수신 시 | `SecsMessageDto` |
| `StateChanged` | CommState 또는 ProcessState 변경 시 | `GemStateDto` |

---

## 10. 주요 설정 파일

### Equipment appsettings.json
```json
{
  "secs4net": {
    "DeviceId": 1,
    "IsActive": false,   ← Passive (서버, 연결 대기)
    "IpAddress": "127.0.0.1",
    "Port": 5000         ← HSMS TCP 포트
  },
  "Urls": "http://localhost:5002"  ← Equipment HTTP API 포트
}
```

### Host.Api appsettings.json
```json
{
  "secs4net": {
    "DeviceId": 1,
    "IsActive": true,    ← Active (클라이언트, 연결 시도)
    "IpAddress": "127.0.0.1",
    "Port": 5000         ← Equipment의 HSMS 포트로 연결
  },
  "Urls": "http://localhost:5001"  ← Host.Api HTTP/SignalR 포트
}
```

---

## 11. 서비스 실행 순서 및 의존성

```
1. Equipment 먼저 실행 (HSMS Passive: TCP:5000 Listen 시작)
2. Host.Api 실행 (HSMS Active: Equipment에 연결 시도)
   → 이 시점에는 아직 데이터 안 보냄. 단지 TCP 연결만 수립
3. Angular 실행 (SignalR WebSocket 연결)
4. 브라우저에서 ① Connect 클릭
   → 그제서야 S1F13 전송 → 실제 SECS 통신 시작
```

**중요**: Equipment가 먼저 실행되지 않으면 Host.Api가 TCP 연결을 못 합니다. 반대로 Host.Api가 먼저 실행되면 Equipment 시작 후 자동 재연결 시도합니다 (T5 Timer).

---

## 12. Day 3 테스트 케이스 목록

### 정상 시나리오
- [ ] 전체 7단계 순서대로 실행
- [ ] MessageLog에 모든 H→E, E→H 메시지 표시 확인
- [ ] StatePanel Comm/Process 상태 색상 변화 확인
- [ ] SML 모달 클릭 시 메시지 구조 표시 확인
- [ ] Trace S6F11이 1Hz로 수신되는지 확인 (MessageLog)

### 엣지 케이스
- [ ] ① Connect → 새로고침 → 재시도 (이중 호출 Guard 확인)
- [ ] 시나리오 완료 후 Reset → 재실행
- [ ] Process End 후 Trace S6F11이 멈추는지 확인
- [ ] Disconnect 후 CommState = NotCommunicating으로 변경 확인

### 오류 시나리오
- [ ] Equipment 중단 상태에서 Connect 시도 → 타임아웃 에러 처리
- [ ] 잘못된 Recipe로 Select Recipe → ValidationEngine 오류 응답
- [ ] Define Reports 없이 Process Start → Equipment의 CEID=2 비활성화 상태

### 데이터 검증
- [ ] Track-In 후 `/scenario/status` → lot/step/commState 확인
- [ ] Track-Out 후 ProcessHistory Result=PASS 확인
- [ ] Trace 값이 sin파 기반 노이즈인지 (Temp 200±10, GasFlow 50±5, Pressure 1.1±0.1)

---

## 13. 자주 발생하는 문제 해결

| 문제 | 원인 | 해결 |
|---|---|---|
| Connect 500 에러 (NullReference) | 이전 Equipment 프로세스가 살아있음 | 포트 5000/5001/5002 점유 프로세스 모두 Kill 후 재시작 |
| "Reading is already in progress" | Connect를 이미 연결된 상태에서 재호출 | Connect Guard 구현 (개선 목록 항목 2) |
| SignalR 이벤트 수신 안 됨 | CORS AllowCredentials 누락 또는 Origin 불일치 | Program.cs CORS 설정 확인 (WithOrigins("http://localhost:4200")) |
| Equipment HTTP 404 | Equipment 프로세스 미실행 | localhost:5002 포트 열려있는지 확인 |
| Trace 값이 안 나옴 | S2F37로 CEID=5 활성화 안 됨 | ② Define Reports 단계 먼저 실행 확인 |
