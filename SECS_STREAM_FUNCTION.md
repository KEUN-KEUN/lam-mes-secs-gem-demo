# SECS Stream/Function 핵심 목록

> 이 프로젝트에서 구현된 S/F 메시지 정리  
> 방향: H→E (HOST→설비), E→H (설비→HOST)

---

## S1 — Equipment Status

### S1F13 / S1F14 — 통신 수립

| 항목 | 내용 |
|---|---|
| 방향 | H→E (요청) / E→H (응답) |
| 목적 | HSMS 연결 후 GEM 통신 수립 요청 |
| 시점 | 서비스 최초 연결 시 1회 |

```
HOST → 설비:  S1F13 W  (Establish Communication Request)
설비 → HOST:  S1F14    (COMMACK=0x00 → 승인)
```

**응답 코드 COMMACK:**
- `0x00` = 승인 (통신 시작 가능)
- `0x01` = 거부

**MES 의미:** MES와 설비가 연결되어 SECS 메시지를 주고받을 수 있는 상태가 됨

---

## S2 — Equipment Control

### S2F33 / S2F34 — 리포트 정의

| 항목 | 내용 |
|---|---|
| 방향 | H→E (요청) / E→H (응답) |
| 목적 | 설비가 보낼 데이터 묶음(리포트) 구조 정의 |
| 시점 | 통신 수립 후, 이벤트 활성화 전 |

```
HOST → 설비:  S2F33 W  [DATAID, L[ L[RPTID, L[VID...]] ]]
설비 → HOST:  S2F34    [DRACK]
```

**이 프로젝트 리포트 정의:**
```
RPTID 1001 = [ LotId(1), Ppid(2), StartTime(4) ]          ← ProcessStart용
RPTID 1002 = [ LotId(1), WaferCount(3), EndTime(5), Result(6) ] ← ProcessEnd용
RPTID 1003 = [ ChamberTemp, GasFlow, Pressure ]            ← Trace용
```

**응답 코드 DRACK (Define Report ACKnowledge):**
- `0` = 저장 성공
- `3` = RPTID 중복
- `4` = 지정한 VID가 설비에 없음

**MES 의미:** 이후 이벤트 발생 시 어떤 데이터를 실어 보낼지 설비에 사전 등록

---

### S2F35 / S2F36 — 이벤트-리포트 연결

| 항목 | 내용 |
|---|---|
| 방향 | H→E (요청) / E→H (응답) |
| 목적 | 특정 이벤트(CEID) 발생 시 어떤 리포트(RPTID)를 붙일지 연결 |
| 시점 | S2F33 이후 |

```
HOST → 설비:  S2F35 W  [DATAID, L[ L[CEID, L[RPTID...]] ]]
설비 → HOST:  S2F36    [LRACK]
```

**이 프로젝트 연결 정의:**
```
CEID=2 (ProcessStart) → RPTID 1001
CEID=3 (ProcessEnd)   → RPTID 1002
CEID=5 (Trace)        → RPTID 1003
```

**응답 코드 LRACK (Link Report ACKnowledge):**
- `0` = 연결 성공
- `4` = CEID가 설비에 없음
- `5` = RPTID가 설비에 없음 (S2F33 먼저 해야 함)

**MES 의미:** S2F33으로 정의한 리포트를 어느 이벤트에 붙일지 지정

---

### S2F37 / S2F38 — 이벤트 활성화

| 항목 | 내용 |
|---|---|
| 방향 | H→E (요청) / E→H (응답) |
| 목적 | 지정한 이벤트들을 켜거나 끔 |
| 시점 | S2F35 이후 |

```
HOST → 설비:  S2F37 W  [CEED(0x01=Enable), L[CEID...]]
설비 → HOST:  S2F38    [ERACK]
```

**이 프로젝트 활성화 목록:**
```
CEID=1 (CarrierArrived), CEID=2 (ProcessStart),
CEID=3 (ProcessEnd),     CEID=5 (Trace)
```

**응답 코드 ERACK (Enable Report ACKnowledge):**
- `0` = 활성화 성공
- `2` = CEID가 설비에 없음

**MES 의미:** 이 시점부터 설비가 해당 이벤트 발생 시 S6F11로 자동 통보

---

### S2F41 / S2F42 — 레시피 선택 (PP-SELECT)

| 항목 | 내용 |
|---|---|
| 방향 | H→E (요청) / E→H (응답) |
| 목적 | MES가 설비에 사용할 레시피 지정 |
| 시점 | Carrier Arrived 이후 |

```
HOST → 설비:  S2F41 W  [RCMD="PP-SELECT", L[ L["PPID", "RCP-PHOTO-A1"] ]]
설비 → HOST:  S2F42    [HCACK, L[]]
```

**응답 코드 HCACK (Host Command ACKnowledge):**
- `0` = 성공 (레시피 존재 확인, Setup→Ready 상태 전이)
- `4` = 레시피 없음

**MES 의미:** MES가 공정 레시피를 설비에 지정. 설비는 해당 레시피 존재 여부 확인 후 승인

---

## S5 — Exception Handling

### S5F1 / S5F2 — 알람 보고

| 항목 | 내용 |
|---|---|
| 방향 | E→H (설비 발생) / H→E (응답) |
| 목적 | 설비 이상 발생/해제 통보 |
| 시점 | 공정 중 이상 감지 시 |

```
설비 → HOST:  S5F1 W  [ALCD, ALID, ALTX]
HOST → 설비:  S5F2    [ACKC5=0x00]
```

**ALCD 바이트 (ALarm ConDition):**
- `0x80` = 알람 SET (발생)
- `0x00` = 알람 CLEAR (해제)

**이 프로젝트 알람:**
```
ALID=1  ALTX="Chamber temperature exceeds limit"
```

**GEM 상태 전이:**
```
SET   → ProcessState: Executing → Pause
CLEAR → ProcessState: Pause    → Executing
```

**MES 의미:** 알람 발생 시 공정 일시 중단, 작업자/엔지니어 조치 필요 알림

---

## S6 — Data Collection

### S6F11 / S6F12 — 이벤트 리포트

| 항목 | 내용 |
|---|---|
| 방향 | E→H (설비 발생) / H→E (응답) |
| 목적 | 설비가 이벤트 발생을 MES에 통보, 데이터 전달 |
| 시점 | S2F37 활성화 후 해당 이벤트 발생 시마다 |

```
설비 → HOST:  S6F11 W  [DATAID, CEID, L[L[RPTID, L[V...]]]]
HOST → 설비:  S6F12    [ACKC6=0x00]
```

**이 프로젝트 CEID별 전송 데이터:**

```
CEID=1 (CarrierArrived)
  → 데이터 없음 (빈 리포트)

CEID=2 (ProcessStart / Track-In)
  → RPTID 1001: LotId, Ppid, StartTime

CEID=3 (ProcessEnd / Track-Out)
  → RPTID 1002: LotId, WaferCount, EndTime, Result

CEID=5 (Trace / 1초마다)
  → RPTID 1003: ChamberTemp, GasFlow, Pressure
```

**MES 처리:**
```
CEID=2 수신 → Track-In 기록, ProcessState=Executing, UI 업데이트
CEID=3 수신 → Track-Out 기록, ProcessState=Idle, UI 업데이트
CEID=5 수신 → Trace 차트 실시간 업데이트
```

**MES 의미:** GEM의 핵심 메시지. 설비의 모든 상태 변화와 공정 데이터가 이 메시지로 전달됨

---

## 전체 메시지 흐름 요약

```
[통신 수립]
S1F13/14  →  COMMACK=0

[동적 리포트 설정]
S2F33/34  →  DRACK=0   (리포트 구조 정의 × 3)
S2F35/36  →  LRACK=0   (이벤트-리포트 연결 × 3)
S2F37/38  →  ERACK=0   (이벤트 활성화)

[공정 진행]
S6F11/12  CEID=1  →  Carrier Arrived
S2F41/42  →  HCACK=0   (레시피 선택)
S6F11/12  CEID=2  →  Track-In  [LotId, Ppid, StartTime]
S6F11/12  CEID=5  →  Trace     [Temp, Gas, Pressure]  (1초마다)
S5F1/2    ALCD=0x80 →  알람 SET  → GEM Pause
S5F1/2    ALCD=0x00 →  알람 CLR  → GEM Executing
S6F11/12  CEID=3  →  Track-Out [LotId, WaferCount, EndTime, Result]
```

---

## 실무 대비 참고

| 항목 | 이 데모 | 실제 환경 |
|---|---|---|
| CEID/DVID 번호 | 코드 상수 고정 | DB에서 설비별 관리 |
| 리포트 정의 시점 | 수동 버튼 클릭 | 서비스 시작 시 자동 |
| 구현 메시지 | 7종 | 설비에 따라 수십 종 |
| 알람 종류 | 1개 (고온) | 설비별 수십~수백 개 |
