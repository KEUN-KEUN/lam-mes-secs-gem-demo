# 구현 현황

> 마지막 업데이트: 2026-05-03  
> 목적: 레이어별 구현 완료 항목 추적

---

## 전체 진행률

```
구현 완료도      ████████████░░░  80%
코드 분석        ████████████░░░  80%
```

---

## 1. 개념 학습 현황

| 주제 | 상태 | 메모 |
|---|---|---|
| SEMI E5 (SECS-II) 기초 | ✅ 완료 | Stream/Function 구조, Item 타입, W-bit |
| PPID vs Recipe 관계 | ✅ 완료 | 같은 것, 표현 레벨 차이 |
| CEID / DVID / SVID / RPTID 의미 | ✅ 완료 | 공식 SEMI 표준 용어 |
| S2F33/35/37 동적 Report 흐름 | ✅ 완료 | 이 데모의 핵심, TECHNICAL_QA.md 참조 |
| Stateless 라이브러리 | ✅ 완료 | GEM 상태 머신 구현 도구, 범용 .NET 라이브러리 |
| SignalR 선택 이유 | ✅ 완료 | 서버 push 필요 → Polling 대신 WebSocket |
| HSMS Active/Passive 개념 | ✅ 완료 | Host=Active(연결 시도), Equipment=Passive(대기) |
| SEMI E30 (GEM) 상태 머신 | ⚠️ 개념만 | Comm State / Process State 전이 다이어그램 이해. 코드 미분석 |
| SEMI E37 (HSMS) | ⚠️ 개념만 | TCP 전송 계층임은 앎. 내부 동작 미파악 |
| Critical Manufacturing 플랫폼 | ❌ 미구현 | 향후 확장 가능한 영역 |

---

## 2. 코드 분석 현황 (Phase별)

### Phase 1 — Domain 모델 (데이터 어휘)
| 파일 | 상태 | 핵심 내용 |
|---|---|---|
| `Domain/Catalogs/CeidCatalog.cs` | ✅ 완료 | CEID 번호표: CarrierArrived=1, ProcessStart=2, ProcessEnd=3 |
| `Domain/Catalogs/DvidCatalog.cs` | ✅ 완료 | 이벤트 리포트 데이터 항목 번호표: LotId~Result(1~6) |
| `Domain/Catalogs/SvidCatalog.cs` | ✅ 완료 | 설비 실시간 상태값 번호표: Temp/GasFlow/Pressure/State |
| `Domain/Models/Lot.cs` 외 | ✅ 완료 | Lot(불변 VO), Recipe(Ppid+Checksum), Equipment(EqpId+Name) |

### Phase 2 — HSMS/SECS 레이어
| 파일 | 상태 | 핵심 내용 |
|---|---|---|
| `Equipment/Services/EquipmentWorker.cs` | ✅ 완료 | `GetPrimaryMessageAsync()` 무한 루프 = HSMS Passive 수신 핵심. 연결 끊기면 상태 머신 통보 |
| `Equipment/Services/MessageRouter.cs` | ✅ 완료 | (S,F) switch → 핸들러 라우팅. S1F13/S2F33/35/37/41 담당 |
| `Equipment/Services/GemStateMachine.cs` | ✅ 완료 | CommState(NotComm↔Comm) + ProcessState(Idle→Setup→Ready→Executing) 두 개 독립 운영 |
| `Equipment/Handlers/S1F13Handler.cs` | ✅ 완료 | S1F14(COMMACK=0x00) 응답 → CommState NotCommunicating→Communicating 전이 |

### Phase 3 — Equipment GEM 핵심 로직
| 파일 | 상태 | 핵심 내용 |
|---|---|---|
| `Equipment/Services/ReportRegistry.cs` | ❌ 미분석 | S2F33으로 쌓이는 in-memory dict |
| `Equipment/Handlers/S2F33Handler.cs` | ❌ 미분석 | |
| `Equipment/Handlers/S2F35Handler.cs` | ❌ 미분석 | |
| `Equipment/Handlers/S2F37Handler.cs` | ❌ 미분석 | |
| `Equipment/Services/EventEmitter.cs` | ❌ 미분석 | CEID → S6F11 동적 조립 핵심 |
| `Equipment/Services/ProcessSimulator.cs` | ❌ 미분석 | Track-In/Trace/Track-Out 타이밍 |

### Phase 4 — Host API 레이어
| 파일 | 상태 | 핵심 내용 |
|---|---|---|
| `Host.Api/Program.cs` | ❌ 미분석 | DI 등록, CORS, SignalR 설정 |
| `Host.Api/Services/MasterDataStore.cs` | ❌ 미분석 | Seed 데이터 (LOT, Recipe, Equipment) |
| `Host.Api/Services/ScenarioOrchestrator.cs` | ✅ 완료 | 시나리오 단계별 메서드, SendAndLogAsync 패턴 |
| `Host.Api/Services/EventSubscriber.cs` | ❌ 미분석 | S6F11 수신 후 처리 |
| `Host.Api/Controllers/ScenarioController.cs` | ✅ 완료 | REST 엔드포인트 7개 확인 |

### Phase 5 — SignalR 브릿지
| 파일 | 상태 | 핵심 내용 |
|---|---|---|
| `Host.Api/Hubs/SecsHub.cs` | ❌ 미분석 | |
| `Host.Api/Services/MessageBroadcaster.cs` | ❌ 미분석 | |
| `Host.Api/Dtos/` | ❌ 미분석 | |

### Phase 6 — Angular 프론트엔드
| 파일 | 상태 | 핵심 내용 |
|---|---|---|
| `services/signalr.service.ts` | ❌ 미분석 | |
| `services/scenario.service.ts` | ❌ 미분석 | |
| `components/state-panel/` | ❌ 미분석 | |
| `components/message-log/` | ❌ 미분석 | |
| `components/scenario-panel/` | ❌ 미분석 | |

---

## 3. 시나리오 7단계 구현 현황

| 단계 | 버튼 | 핵심 메시지 | 구현 상태 |
|---|---|---|---|
| **Step 1** | Connect | S1F13 → S1F14 | ✅ 완료 |
| **Step 2** | Define Reports | S2F33×3, S2F35×3, S2F37 | ✅ 완료 |
| **Step 3** | Carrier Arrived | S6F11 CEID=1 | ✅ 완료 |
| **Step 4** | Select Recipe | S2F41 → S2F42 | ✅ 완료 |
| **Step 5** | Process Start | S6F11 CEID=2 (Track-In) | ✅ 완료 |
| **Step 6** | Process End | S6F11 CEID=3 (Track-Out) | ✅ 완료 |
| **Step 7** | Disconnect | HSMS Separate | ✅ 완료 |

---

## 4. 기술 문서 현황

| 주제 | 상태 | 파일 |
|---|---|---|
| S2F33/35/37 동적 Report | ✅ 완료 | TECHNICAL_QA.md Q1 |
| GEM 상태 머신 (Stateless) | ✅ 완료 | TECHNICAL_QA.md Q2 |
| SignalR 설계 결정 | ✅ 완료 | TECHNICAL_QA.md Q3 |
| HSMS 프로토콜 | ✅ 완료 | TECHNICAL_QA.md Q4 |
| DVID vs SVID | ✅ 완료 | TECHNICAL_QA.md Q5 |
| 알려진 한계점 | ✅ 완료 | TECHNICAL_QA.md Q6 |

---

## 5. 현재 프로그램 완성도

| 항목 | 점수 | 상태 |
|---|---|---|
| 아키텍처 / 코드 구조 | 85/100 | ✅ |
| SECS/GEM 표준 준수 | 80/100 | ✅ Critical 버그 수정 + S5F1/F2 추가 |
| MES 개념 시연 | 78/100 | ✅ Genealogy, Alarm 구현 완료 |
| 데모 화면 임팩트 | 75/100 | ✅ Trace 차트 + History + Alarm 패널 |
| **전체** | **80/100** | |

### Day 3 완료 항목
- [x] Critical 버그 수정 (DataId 카운터, 이중 Connect 방지, Trace 자동 종료)
- [x] Trace 실시간 차트 구현 (순수 SVG, 외부 라이브러리 불필요)
- [x] Process 이력/Genealogy 패널
- [x] 알람 처리 S5F1/S5F2
- [x] SignalR 연결 상태 UI
- [x] 메시지 로그 상한 (1000건)
- [x] DEMO_SCENARIO.md 시연 가이드 작성

---

## 6. 추가 개선 사항 (우선순위 순)

### 기능 개선
1. Phase 4 Host API 레이어 추가 분석
2. Phase 5 SignalR 브릿지 분석
3. Phase 6 Angular 컴포넌트 분석 (신규 컴포넌트 포함)

### 아키텍처 확장
4. 다중 장비(1:N) 지원 구조 설계
5. CEID/DVID DB 기반 관리로 이관

---

## 7. 참고 파일

| 파일 | 용도 |
|---|---|
| `structure.md` | 전체 프로그램 구조 레퍼런스 |
| `TECHNICAL_QA.md` | 기술 Q&A 및 설계 결정 배경 |
| `SECS_STREAM_FUNCTION.md` | 구현된 S/F 메시지 목록 |
| `IMPLEMENTATION_LOG.md` | 이 파일 — 구현 현황 추적 |
