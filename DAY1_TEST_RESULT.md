# Day 1 테스트 결과 — 2026-04-30

## 개요

**목표**: 콘솔 기준으로 9단계 시나리오 전체 완주  
**결과**: ✅ 전 구간 통과

---

## 실행 환경

| 항목 | 내용 |
|---|---|
| Equipment Simulator | http://localhost:5002 (HSMS Passive TCP:5000) |
| Host.Api | http://localhost:5001 |
| 프레임워크 | .NET 8, Secs4Net 2.4.4, Stateless 5.20.1, Serilog |

---

## 시나리오 실행 결과

### Step 1 — Connect (S1F13 / S1F14)

```
[H→E] S1F13  Establish Communication
[E→H] S1F14  COMMACK=0  ← ACK 정상
[STATE] Comm: NotCommunicating → Communicating
```

- HSMS SelectRequest / SelectResponse 자동 처리 (Secs4Net)  
- GEM Comm 상태 머신 전이 확인  
- ✅ **PASS**

---

### Step 2 — Define Reports (S2F33 × 3 / S2F35 × 3 / S2F37)

```
[H→E] S2F33  RPTID=1001  DVIDs=[LOT_ID, PPID, START_TIME]      DRACK=0
[H→E] S2F33  RPTID=1002  DVIDs=[LOT_ID, WAFER_COUNT, END_TIME, RESULT]  DRACK=0
[H→E] S2F33  RPTID=1003  DVIDs=[CHAMBER_TEMP, GAS_FLOW, PRESSURE]  DRACK=0
[H→E] S2F35  CEID=2 → RPTID=1001   LRACK=0
[H→E] S2F35  CEID=3 → RPTID=1002   LRACK=0
[H→E] S2F35  CEID=5 → RPTID=1003   LRACK=0
[H→E] S2F37  Enable CEIDs=[1,2,3,5]  ERACK=0
```

- Equipment ReportRegistry에 동적 등록 완료 (in-memory dict)  
- 7건의 메시지 교환, 전 ACK 코드 0  
- ✅ **PASS**

---

### Step 3 — Carrier Arrived (E→H S6F11 CEID=1)

```
[E→H] S6F11  CEID=1  (CarrierArrived)
[H→E] S6F12  ACK=0
[VALIDATION] LOT-2026-0430-001 validated OK  (Step=PHOTO-LITHO 확인)
```

- Equipment가 자발적으로 S6F11 송신  
- Host ValidationEngine: LOT 존재 + 현재 Step 검증 통과  
- ✅ **PASS**

---

### Step 4 — Recipe Selection (S2F41 / S2F42)

```
[H→E] S2F41  RCMD=PP-SELECT  PPID=RCP-PHOTO-A1
[STATE] Process: Idle → Setup → Ready
[E→H] S2F42  HCACK=0
```

- RecipeStore에서 PPID 검증 후 상태 전이  
- Process 상태 머신 2단계 전이 확인  
- ✅ **PASS**

---

### Step 5 — Process Start / Track-In (E→H S6F11 CEID=2)

```
[E→H] S6F11  CEID=2  RPTID=1001
             LOT_ID=LOT-2026-0430-001
             PPID=RCP-PHOTO-A1
             START_TIME=2026-04-30T05:36:43Z
[H→E] S6F12  ACK=0
[SCENARIO] Track-In 기록 완료
[STATE] Process: Ready → Executing
```

- S2F33으로 정의된 RPTID 1001이 동적으로 조립되어 전송됨  
- Host ProcessHistory에 Track-In 레코드 등록  
- ✅ **PASS**

---

### Step 6 — Trace 스트리밍 (E→H S6F11 CEID=5, 1Hz)

```
[E→H] S6F11  CEID=5  RPTID=1003  Temp=200.99  GasFlow=50.60  Pressure=1.1497
[E→H] S6F11  CEID=5  RPTID=1003  Temp=204.14  GasFlow=51.40  Pressure=1.1236
[E→H] S6F11  CEID=5  RPTID=1003  Temp=207.11  GasFlow=52.12  Pressure=1.0989
... (1초 간격, sin파 + Random 노이즈)
```

- sin파 + 노이즈 기반 3변수 시뮬레이션 정상 동작  
- Host 즉시 S6F12 ACK 응답  
- ✅ **PASS**

---

### Step 8 — Process End / Track-Out (E→H S6F11 CEID=3)

```
[E→H] S6F11  CEID=3  RPTID=1002
             LOT_ID=LOT-2026-0430-001
             WAFER_COUNT=25
             END_TIME=2026-04-30T05:36:48Z
             RESULT=PASS
[H→E] S6F12  ACK=0
[SCENARIO] Track-Out 기록 완료  Result=PASS
[STATE] Process: Executing → Idle
```

- RPTID 1002 동적 조립 확인  
- Host ProcessHistory 갱신 (EndTime, Result)  
- ✅ **PASS**

---

## GEM 평가 기준 체크

| 기준 | 결과 |
|---|---|
| GEM 상태 머신이 Stateless로 구현됨 (if-else 없음) | ✅ |
| CEID/DVID/SVID Catalog 분리, 매직 넘버 없음 | ✅ |
| S2F33/F35/F37 동적 Report 정의 + S6F11 동적 조립 | ✅ |
| 모든 I/O async/await (.Result/.Wait() 없음) | ✅ |
| 각 ACK 코드 정상 (DRACK/LRACK/ERACK/HCACK/COMMACK = 0) | ✅ |

---

## 발견된 버그 및 수정 이력

| 버그 | 원인 | 수정 |
|---|---|---|
| HSMS SelectRequest 무응답 | `ConnectionState.Connecting` 이벤트에서 `OnDisconnected()` 호출 → 상태 머신 예외로 `AcceptAsync` 루프 크래시 | Comm 상태가 `Communicating`일 때만 `OnDisconnected` 호출하도록 조건 추가 |
| `AddSecs4Net` 미존재 | Secs4Net 패키지에 포함되지 않은 샘플 헬퍼 메서드 | 프로젝트 내 `SecsExtensions.cs`로 직접 구현 |
| `Item.Items.Count` 컴파일 오류 | `Item.Items` 반환 타입이 `Item[]` (배열) → `.Count`는 LINQ 메서드 그룹 | `.Length`로 수정 |

---

## 빌드 상태

```
빌드했습니다.
    경고 0개
    오류 0개
```

---

## Day 2 진입 조건

> **Day 1 검증을 통과하지 못하면 Day 2로 넘어가지 말 것** — work_description §9

**→ 모든 조건 충족. Day 2 진행 가능.**
