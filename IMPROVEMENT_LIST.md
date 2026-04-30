# 개선 사항 전체 목록

> 기준: Lam Research KTC Global Lab Automation MES Developer 포지션 (program_goal.md)

---

## 🔴 Critical — 데모 전 반드시 수정

### 1. DataId 하드코딩 (SEMI 규격 위반)
- **위치**: `src/SecsGemDemo.Host.Api/Services/ScenarioOrchestrator.cs` 라인 12
- **문제**: `private const uint DataId = 9001;` — 모든 트랜잭션에 동일한 ID 사용
- **규격**: SEMI E30 §8.3 — 각 트랜잭션마다 고유한 DATAID 요구
- **수정**:
  ```csharp
  private uint _nextDataId = 1000;
  private uint NextDataId() => Interlocked.Increment(ref _nextDataId);
  // SendDefineReportAsync, SendLinkEventAsync, SendEnableEventsAsync에서 DataId → NextDataId() 사용
  ```

### 2. Connect 이중 호출 시 Secs4Net 파이프 오류
- **위치**: `ScenarioOrchestrator.ConnectAsync`
- **현상**: 이미 Selected 상태에서 `Start()` 재호출 → `InvalidOperationException: Reading is already in progress`
- **재현**: 브라우저 새로고침 후 ① Connect 버튼 재클릭
- **수정**:
  ```csharp
  public async Task ConnectAsync(CancellationToken ct)
  {
      if (hsmsConnection.State != ConnectionState.Selected)
      {
          hsmsConnection.Start(ct);
          // ... wait loop
      }
      // S1F13 handshake
  }
  ```

### 3. Trace 스트리밍이 ProcessEnd에서 자동 종료 안 됨
- **위치**: `src/SecsGemDemo.Equipment/Services/ProcessSimulator.cs`
- **현상**: Process End 호출 후에도 1Hz S6F11 CEID=5 계속 전송
- **수정**: `ProcessSimulator`에 `_traceCts` 필드 추가, `TriggerProcessEndAsync()`에서 `_traceCts?.Cancel()` 호출

### 4. S2F37 CEED 타입 오류 (Binary vs Boolean)
- **위치**: `ScenarioOrchestrator.SendEnableEventsAsync`
- **현재**: `B(0x01)` — Binary 타입 (Item type code 0x21)
- **규격**: SEMI E5 S2F37 — `CEED = BOOLEAN[1]` (Item type code 0x11)
- **영향**: 기능은 동작하나 엄격한 장비 구현과의 통신에서 실패 가능
- **수정**: Secs4Net에서 Boolean Item 생성 방법 확인 후 교체

---

## 🟠 High — 면접 임팩트에 직결

### 5. 실시간 Trace 차트 없음 ← **가장 중요한 누락**
- **공고 연계**: *"enhance data visibility for process engineering teams"*, *"data orchestration across R&D labs"*
- **현재**: MessageLog에 S6F11 CEID=5가 텍스트 행으로 표시될 뿐
- **필요**:
  - `Host.Api`: EventSubscriber에서 CEID=5 수신 시 `TraceDataDto` 별도 SignalR 이벤트 브로드캐스트
  - `Angular`: `TraceChartComponent` — ng2-charts 라인 차트
    - X축: 시간, Y축: Temp(°C) / GasFlow(sccm) / Pressure(Torr)
    - 슬라이딩 윈도우 50포인트
- **설치**: `npm install ng2-charts chart.js`

### 6. 프로세스 이력(Genealogy) 패널 없음
- **공고 연계**: MES 핵심 개념 — *material movement, traceability, genealogy*
- **현재**: `MasterDataStore.GetHistory()` 존재하나 Angular에 전혀 노출 안 됨
- **필요**: `HistoryPanelComponent`
  ```
  LOT              Recipe       Wafers  Result
  LOT-2026-0430-001  RCP-PHOTO-A1  25    PASS
  Track-In:  2026-04-30T05:36:43Z
  Track-Out: 2026-04-30T05:36:48Z
  ```
- **연결**: `EventSubscriber`에서 ProcessEnd 처리 후 `HistoryUpdated(ProcessHistoryDto)` SignalR 브로드캐스트

### 7. SignalR 연결 상태 UI 표시 없음
- **현재**: 연결 실패 시 `console.error`만 출력, 사용자에게 피드백 없음
- **수정**: `SignalrService`에 `connectionState$: BehaviorSubject<HubConnectionState>` 추가
  - `reconnecting` / `reconnected` / `close` 이벤트 구독
  - 헤더 우상단: `● Connected` (초록) / `◌ Reconnecting...` (노랑) / `✕ Disconnected` (빨강)

### 8. Trace DV 값이 ASCII 문자열 — 숫자 타입이어야 함
- **위치**: `src/SecsGemDemo.Equipment/Services/EventEmitter.cs`
- **현재**: 모든 DV 값이 `A(string)` 타입으로 전송
  ```
  < A "204.14" >  ← 잘못된 타입
  ```
- **규격**: 온도·유량·압력 등 숫자 데이터는 `F4` 또는 `F8` 타입
  ```
  < F4 204.14 >  ← 올바른 타입
  ```
- **수정**: `dvValues` 딕셔너리를 `Dictionary<uint, object>`로 변경, 타입에 따라 `Item.F4()` 또는 `Item.A()` 선택

---

## 🟡 Medium — 완성도 향상

### 9. Alarm Handling 없음 (S5F1/S5F2)
- **공고 연계**: *"investigate and resolving problem areas"*, fault tolerance 시연
- **필요**:
  - Equipment: ChamberTemp > 220°C 조건 → S5F1 AlarmReport 발송 (`ALID=101`, `ALNAME="OverTemp"`)
  - Host: S5F2 ACK 처리, SignalR `AlarmRaised` 이벤트
  - Angular: 빨간 알람 배너, 시나리오 패널에 "⑧ Trigger Alarm" 버튼

### 10. 시나리오 재실행 불가 — 상태 초기화 없음
- **현재**: 시나리오 완료 후 재실행 시 MasterDataStore 상태(TrackIn 기록 등)가 남아 있음
- **수정**:
  - `POST /scenario/reset` API 추가 — MasterDataStore 및 GemStateTracker 재초기화
  - ScenarioPanel의 "Reset Scenario" 버튼에서 해당 API 호출 후 UI 상태 리셋

### 11. Angular 에러 처리 미흡
- **현재**: HTTP 에러 시 버튼이 빨간색으로만 변함, 이유를 알 수 없음
- **수정**: `step.errorMsg` 필드 추가, 에러 메시지를 버튼 하단에 표시
  ```typescript
  error: (err) => {
    step.state = 'error';
    step.errorMsg = err.error?.title ?? err.message ?? 'Unknown error';
  }
  ```

### 12. SVID/DVID 카탈로그 혼용 표기 불일치
- **위치**: `ScenarioOrchestrator.cs` L49~51
- **문제**: RPTID=1003의 변수들은 `SvidCatalog`(Status Variable)인데 파라미터 이름이 `dvids[]`(Data Variable)
- **SEMI E5 구분**: DVID ≠ SVID (Data Variable vs Status Variable)
- **수정**: 파라미터 이름 `varIds`로 통일 또는 Report 정의 메서드를 DVID/SVID 경로로 분리

### 13. Item.GetString() 숫자형에서 불안정
- **위치**: `EventSubscriber.ExtractFirstDvString`
- **문제**: 타입 8번(수정 후 F4)에 `.GetString()` 호출 시 빈 문자열 반환 가능
- **수정**:
  ```csharp
  private static string? ExtractDvAsString(Item item) =>
      item.Format == SecsFormat.ASCII
          ? item.FirstValue<string>()
          : item.FirstValue<float>().ToString("F2");
  ```

---

## Day 3 작업 우선순위

| 순서 | 작업 | 소요 | 효과 |
|---|---|---|---|
| 1 | Critical 버그 4개 수정 | 2h | 안정성 확보 |
| 2 | **실시간 Trace 차트** | 3h | 면접 임팩트 최대 |
| 3 | 프로세스 이력 패널 | 2h | MES traceability 시연 |
| 4 | 알람 처리 (S5F1/S5F2) | 1h | 예외 처리 시연 |

---

## 완성 후 면접 멘트 예시

> *"SECS/GEM 프로토콜로 장비와 직접 통신하여 공정 Track-In/Out을 처리하고,
> 수집된 온도·유량·압력 데이터를 실시간 차트로 시각화했습니다.
> 이력 추적(Genealogy)은 LOT 단위로 관리되며, 알람 발생 시 즉시 대시보드에 표시됩니다."*
