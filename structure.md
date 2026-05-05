                     LAM-MES/                                                                                                             
  ├── src/                                                                                                             
  │   ├── SecsGemDemo.Domain/          ← 공통 상수 정의 (공유 레이어)
  │   ├── SecsGemDemo.Equipment/       ← 설비 시뮬레이터
  │   ├── SecsGemDemo.Host.Api/        ← MES (HOST) 서버
  │   └── SecsGemDemo.Frontend/        ← 화면 (Angular)
  └── scenarios.json                   ← 시나리오 정의

  ---
  1. SecsGemDemo.Domain — 공통 상수 정의

  ▎ 역할: 설비와 HOST가 공통으로 쓰는 번호표

  Domain/
  ├── Catalogs/
  │   ├── CeidCatalog.cs     ← 이벤트 ID 번호표
  │   ├── DvidCatalog.cs     ← 데이터 항목 ID 번호표
  │   ├── SvidCatalog.cs     ← 상태 변수 ID 번호표
  │   ├── AlarmCatalog.cs    ← 알람 ID 번호표
  │   └── ...
  ├── Models/
  │   └── Lot.cs             ← Lot 데이터 구조
  └── Enums/
      ├── CommState.cs        ← 통신 상태 (NotCommunicating/Communicating)
      └── ProcessState.cs     ← 공정 상태 (Idle/Setup/Ready/Executing/Pause)

  핵심 파일 내용:
  CeidCatalog:  CarrierArrived=1, ProcessStart=2, ProcessEnd=3, Trace=5
  DvidCatalog:  LotId=1, Ppid=2, WaferCount=3, StartTime=4, EndTime=5, Result=6

  ▎ MES 의미: 실무에서는 이 번호들이 DB에 설비별로 저장됩니다. 이 프로젝트에서는 코드 상수로 고정되어 있습니다.        

  ---
  2. SecsGemDemo.Equipment — 설비 시뮬레이터

  ▎ 역할: 실제 반도체 설비처럼 동작. HSMS Passive로 대기하며 HOST 명령에 응답

  Equipment/
  ├── Program.cs              ← 서비스 시작점, 레시피 등록, HTTP 엔드포인트 정의
  │
  ├── Handlers/               ← HOST에서 오는 각 SECS 메시지 처리
  │   ├── S1F13Handler.cs     ← 통신수립 요청 수신 → S1F14 응답
  │   ├── S2F33Handler.cs     ← 리포트 정의 수신 → S2F34 응답
  │   ├── S2F35Handler.cs     ← 이벤트-리포트 연결 수신 → S2F36 응답
  │   ├── S2F37Handler.cs     ← 이벤트 활성화 수신 → S2F38 응답
  │   └── S2F41Handler.cs     ← 레시피 선택 명령 수신 → S2F42 응답
  │
  └── Services/
      ├── EquipmentWorker.cs  ← HSMS 연결 대기 + 수신 메시지를 Handler로 전달
      ├── MessageRouter.cs    ← S/F 번호 보고 담당 Handler에게 라우팅
      ├── GemStateMachine.cs  ← 설비 GEM 상태 관리 (Idle→Setup→Ready→Executing→Pause)
      ├── ProcessSimulator.cs ← 공정 이벤트 발생 (Track-In/Out, Trace, 알람)
      ├── ReportRegistry.cs   ← HOST가 설정한 리포트 구조 저장
      ├── EventEmitter.cs     ← S6F11, S5F1 메시지 생성·전송
      └── RecipeStore.cs      ← 레시피 목록 관리 (존재 여부 확인)

  ---
  3. SecsGemDemo.Host.Api — MES (HOST) 서버

  ▎ 역할: 실제 MES처럼 동작. 설비에 명령을 보내고 이벤트를 수신하여 처리

  Host.Api/
  ├── Program.cs              ← 서비스 시작점, 의존성 등록
  │
  ├── Controllers/
  │   └── ScenarioController.cs  ← UI 버튼 클릭 → API 엔드포인트
  │                                 (connect, define-reports, carrier-arrived 등)
  │
  ├── Hubs/
  │   └── SecsHub.cs          ← SignalR Hub (UI와 실시간 연결 통로)
  │
  ├── Models/
  │   ├── ScenarioDefinition.cs  ← 시나리오 구조 정의
  │   └── ScenarioRunResult.cs   ← 시나리오 실행 결과 구조
  │
  ├── Dtos/                   ← UI로 전달하는 데이터 구조
  │   ├── GemStateDto.cs      ← 상태 정보 (commState, processState)
  │   ├── SecsMessageDto.cs   ← 메시지 로그용 (S번호, F번호, SML 내용)
  │   ├── TraceDataDto.cs     ← Trace 데이터 (온도, 가스, 압력)
  │   ├── AlarmDto.cs         ← 알람 정보
  │   ├── LotHistoryDto.cs    ← Track-In/Out 이력
  │   └── ScenarioResultDto.cs← 시나리오 결과 카드
  │
  └── Services/
      ├── ScenarioOrchestrator.cs ← 시나리오 실행 총괄 (SECS 메시지 순서 관리)
      ├── EventSubscriber.cs      ← 설비에서 오는 S6F11, S5F1 수신·처리
      ├── MessageBroadcaster.cs   ← 처리 결과를 SignalR로 UI에 전송
      ├── GemStateTracker.cs      ← HOST 쪽 GEM 상태 추적
      ├── MasterDataStore.cs      ← LOT/레시피/이력 정보 관리 (MES DB 역할)
      ├── MessageBroadcaster.cs   ← 처리 결과를 SignalR로 UI에 전송
      ├── GemStateTracker.cs      ← HOST 쪽 GEM 상태 추적
      ├── MasterDataStore.cs      ← LOT/레시피/이력 정보 관리 (MES DB 역할)
      ├── ValidationEngine.cs     ← Lot/레시피 유효성 검증
  │   ├── S2F33Handler.cs     ← 리포트 정의 수신 → S2F34 응답
  │   ├── S2F35Handler.cs     ← 이벤트-리포트 연결 수신 → S2F36 응답
  │   ├── S2F37Handler.cs     ← 이벤트 활성화 수신 → S2F38 응답
  │   └── S2F41Handler.cs     ← 레시피 선택 명령 수신 → S2F42 응답
  │
  └── Services/
      ├── EquipmentWorker.cs  ← HSMS 연결 대기 + 수신 메시지를 Handler로 전달
      ├── MessageRouter.cs    ← S/F 번호 보고 담당 Handler에게 라우팅
      ├── GemStateMachine.cs  ← 설비 GEM 상태 관리 (Idle→Setup→Ready→Executing→Pause)    
      ├── ProcessSimulator.cs ← 공정 이벤트 발생 (Track-In/Out, Trace, 알람)
      ├── ReportRegistry.cs   ← HOST가 설정한 리포트 구조 저장
      ├── EventEmitter.cs     ← S6F11, S5F1 메시지 생성·전송
      └── RecipeStore.cs      ← 레시피 목록 관리 (존재 여부 확인)

  ---
  3. SecsGemDemo.Host.Api — MES (HOST) 서버

  ▎ 역할: 실제 MES처럼 동작. 설비에 명령을 보내고 이벤트를 수신하여 처리

  Host.Api/
  ├── Program.cs              ← 서비스 시작점, 의존성 등록
  │
  ├── Controllers/
  │   └── ScenarioController.cs  ← UI 버튼 클릭 → API 엔드포인트
  │                                 (connect, define-reports, carrier-arrived 등)        
  │
  ├── Hubs/
  │   └── SecsHub.cs          ← SignalR Hub (UI와 실시간 연결 통로)
  │
  ├── Models/
  │   ├── ScenarioDefinition.cs  ← 시나리오 구조 정의
  │   └── ScenarioRunResult.cs   ← 시나리오 실행 결과 구조
  │
  ├── Dtos/                   ← UI로 전달하는 데이터 구조
  │   ├── GemStateDto.cs      ← 상태 정보 (commState, processState)
  │   ├── SecsMessageDto.cs   ← 메시지 로그용 (S번호, F번호, SML 내용)
  │   ├── TraceDataDto.cs     ← Trace 데이터 (온도, 가스, 압력)
  │   ├── AlarmDto.cs         ← 알람 정보
  │   ├── LotHistoryDto.cs    ← Track-In/Out 이력
  │   └── ScenarioResultDto.cs← 시나리오 결과 카드
  │
  └── Services/
      ├── ScenarioOrchestrator.cs ← 시나리오 실행 총괄 (SECS 메시지 순서 관리)
      ├── EventSubscriber.cs      ← 설비에서 오는 S6F11, S5F1 수신·처리
      ├── MessageBroadcaster.cs   ← 처리 결과를 SignalR로 UI에 전송
      ├── GemStateTracker.cs      ← HOST 쪽 GEM 상태 추적
      ├── MasterDataStore.cs      ← LOT/레시피/이력 정보 관리 (MES DB 역할)
      ├── ValidationEngine.cs     ← Lot/레시피 유효성 검증
      ├── ScenarioStore.cs        ← scenarios.json 로드 + 실행 결과 저장
      ├── EquipmentProxy.cs       ← 설비 HTTP API 호출 (공정 이벤트 트리거)
      └── EquipmentSecsLogger.cs  ← SECS 메시지 로깅

  ---
  4. SecsGemDemo.Frontend — 화면

  ▎ 역할: 실시간으로 통신 상황, 상태, 이력을 시각화

  Frontend/src/app/
  ├── services/
  │   ├── signalr.service.ts    ← HOST와 WebSocket 연결, 이벤트 수신
  │   └── scenario.service.ts   ← HOST API 호출 (버튼 동작)
  │
  └── components/
      ├── scenario-selector/    ← Auto Scenario 드롭다운 + Run 버튼
      ├── scenario-panel/       ← 수동 7단계 버튼
      ├── state-panel/          ← COMM/PROCESS 상태 표시
      ├── gem-state-diagram/    ← GEM 상태머신 SVG 다이어그램
      ├── trace-chart/          ← 실시간 온도/가스/압력 차트
      ├── alarm-panel/          ← 알람 발생/해제
      ├── message-log/          ← SECS 메시지 로그 테이블
      ├── process-history/      ← Track-In/Out 이력 테이블
      └── scenario-results/     ← Auto Scenario 결과 카드

  ---
  데이터 흐름 한 눈에 보기

  [UI 버튼 클릭]
        ↓ HTTP
  [ScenarioController]  ─→  [ScenarioOrchestrator]  ─→  SECS 메시지 전송
                                     ↓                         ↓ HSMS TCP
                            [EquipmentProxy]          [Equipment Handlers]
                            (공정 이벤트 트리거)              ↓
                                                [ProcessSimulator + EventEmitter]
                                                      ↓ S6F11 / S5F1
                            [EventSubscriber]  ←───────────────
                                  ↓
                      [MasterDataStore] (Track-In/Out 기록)
                      [GemStateTracker] (상태 업데이트)
                      [MessageBroadcaster]
                                  ↓ SignalR WebSocket
                            [Angular UI 실시간 업데이트]