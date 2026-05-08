# LAM-MES SECS/GEM Demo — 시연 가이드

> 작성일: 2026-05-05  
> 대상: 반도체 장비/MES 엔지니어

---

## 1. 시연 전 준비

### 서비스 기동 순서
```
1. SecsGemDemo.Equipment  (포트 5000 HSMS passive, 5002 HTTP)
2. SecsGemDemo.Host.Api   (포트 5001)
3. 브라우저에서 Frontend 접속
```

> Equipment가 먼저 포트 5000에서 LISTEN 상태여야 Host가 연결 가능합니다.

### 초기 상태 확인
- COMM STATE: **NotCommunicating**
- PROCESS STATE: **Idle**
- Message Log: 비어 있음
- Process History: 비어 있음

---

## 2. 시연 시나리오 흐름

### 시나리오 1 — Normal Process Run

| 단계 | Host 동작 | Equipment 동작 | 화면 변화 |
|------|-----------|----------------|-----------|
| Connect | S1F13 W (Establish Comm) | S1F14 응답 | COMM: Communicating |
| Define Reports | S2F33×3 → S2F35×3 → S2F37 | S2F34/36/38 응답 | 메시지 로그 7쌍 |
| Carrier Arrived | — | S6F11 CEID=1 → S6F12 | 메시지 로그 |
| PP-SELECT | S2F41 PPID=RCP-PHOTO-A1 | S2F42 HCACK=0 | PROCESS: Ready |
| Process Start | — | S6F11 CEID=2 → S6F12 | PROCESS: Executing, History Track-In |
| Trace (×15) | — | S6F11 CEID=4 → S6F12 | 실시간 차트 (200°C) |
| Process End | — | S6F11 CEID=3 → S6F12 | PROCESS: Idle, History PASS |

**예상 소요시간:** 약 15초

---

### 시나리오 2 — Alarm Recovery

Normal Process Run과 동일한 흐름에서 ProcessStart 이후 5초 뒤 알람 발생:

| 단계 | Equipment 동작 | 화면 변화 |
|------|----------------|-----------|
| Alarm Set | S5F1 ALCD=0x80 ALID=1001 → S5F2 | PROCESS: **Pause**, Alarm 패널 |
| (3초 대기) | — | Pause 상태 유지 |
| Alarm Clear | S5F1 ALCD=0x00 ALID=1001 → S5F2 | PROCESS: **Executing** 복귀 |
| Process End | S6F11 CEID=3 → S6F12 | PROCESS: Idle, History PASS |

**예상 소요시간:** 약 23초

---

### 시나리오 3 — Alternative Recipe

Normal Process Run과 동일한 흐름. 차이점:

| 항목 | Normal | Alternative |
|------|--------|-------------|
| LOT ID | LOT-2026-001 | LOT-2026-003 |
| PPID | RCP-PHOTO-A1 | **RCP-PHOTO-B2** |
| Wafer | 25매 | **13매** |
| 온도 기준 | **200°C** | **120°C** |
| 진폭 | ±10°C | ±4°C (안정적) |
| 압력 기준 | **1.0 Torr** | **0.3 Torr** |

차트에서 Normal(상단)과 Alternative(중간 이하)의 선 위치가 **동일 스케일**에서 명확히 구분됩니다.

---

## 3. 기술 하이라이트

### 3-1. SECS/GEM 프로토콜 이해도

#### S6F12를 Broadcast보다 먼저 보내야 하는 이유
```
Equipment의 secsGem.SendAsync(S6F11) 은
S6F12를 받을 때까지 블로킹됩니다.

Host EventSubscriber가 S6F12보다 BroadcastAsync를 먼저 호출하면
→ Broadcast 실패 시 S6F12가 영원히 전송되지 않음
→ Equipment는 T3 타임아웃(45초) 후 SecsException 발생
→ 시나리오 전체가 중단됨

현업에서 실제로 발생하는 통신 데드락 패턴입니다.
```

**핵심 포인트:** 단순히 SECS 메시지를 보내고 받는 수준이 아니라, HSMS T3 타이머와 블로킹 구조를 이해하고 코드에 반영했습니다.

#### Report Definition 구조를 직접 구현한 이유
```
S2F33  Define Report  : RPTID에 DVID 목록 등록
S2F35  Link Event     : CEID에 RPTID 연결
S2F37  Enable Events  : CEID 활성화

이 3단계를 분리한 이유는 SEMI E30의 설계 철학 때문입니다.
어떤 이벤트에 어떤 변수를 포함할지를 Host가 런타임에 결정하고,
Equipment는 정의된 대로만 보고합니다.
장비 코드 수정 없이 MES가 모니터링 항목을 변경할 수 있습니다.
```

**핵심 포인트:** GEM의 Report 메커니즘이 왜 이렇게 설계되었는지, 현장에서 어떤 가치를 주는지 직접 구현하며 확인했습니다.

---

### 3-2. GEM 상태머신 (SEMI E30)

```
COMM STATE:    NotCommunicating ──S1F13/14──→ Communicating
PROCESS STATE: Idle → Setup → Ready → Executing
                                           ↕ S5F1 Alarm
                                         Pause
```

**핵심 포인트:** 현업에서 장비 상태 이상의 대부분은 GEM State 전이 오류에서 발생합니다. Stateless 라이브러리로 E30 스펙 그대로 구현하여, 임의의 상태에서 PP-SELECT가 들어와도 Setup으로 안전하게 전환됩니다.

---

### 3-3. 아키텍처 결정

#### BackgroundService Sequential Loop
```csharp
await foreach (var e in secsGem.GetPrimaryMessageAsync(stoppingToken))
{
    await HandleAsync(msg, e, stoppingToken);
}
```
> SECS 메시지 처리를 순차적으로 강제합니다. 동시 처리 시 발생할 수 있는 메시지 순서 역전과 상태 경쟁 조건을 구조적으로 방지합니다.

#### SignalR 실시간 브로드캐스트
> HTTP 폴링 대신 WebSocket 기반 SignalR로 SECS 메시지·상태·트레이스를 실시간 푸시합니다. MES 화면 갱신 지연 없이 장비 이벤트를 즉시 반영합니다.

#### Equipment Proxy 패턴
> Host가 HTTP로 Equipment의 이벤트를 트리거합니다. 실제 반도체 팹에서 MES가 다수의 장비를 원격 제어하는 구조와 동일합니다.

---

### 3-4. 도메인 지식 연결

| 화면 요소 | 현업 연결 |
|-----------|-----------|
| Track-In 기록 | WIP 시스템의 LOT 진입 확정 |
| Track-Out + PASS/FAIL | 품질 판정 기록, SPC 트리거 조건 |
| Recipe PP-SELECT | MES가 장비에 레시피를 강제 지정 (작업자 임의 변경 방지) |
| Trace 실시간 차트 | FDC(Fault Detection & Classification) 기초 데이터 |
| Alarm Pause/Executing | MES의 알람 인터락 로직과 동일한 흐름 |

**핵심 포인트:** 9년간 MES/EAP 업무를 하면서 '이 기능이 왜 필요한가'를 항상 생각했고, 이 데모에서 그 이유를 코드로 설명할 수 있도록 구현했습니다.

---

## 4. 기술 Q&A

**Q. SECS-I과 HSMS의 차이는?**  
A. SECS-I은 RS-232 시리얼 통신 기반으로 속도가 느리고 1:1 연결만 가능합니다. HSMS는 TCP/IP 기반으로 속도가 빠르고 네트워크 환경에서 동작합니다. 현재 신규 장비는 대부분 HSMS를 사용합니다.

**Q. GEM과 SECS/GEM의 차이는?**  
A. SECS/GEM에서 SECS는 물리/데이터 링크 계층(어떻게 보내는가), GEM은 애플리케이션 계층(무엇을 어떻게 교환하는가)을 정의합니다. GEM 없이 SECS만으로는 장비별로 메시지 구조가 달라져 MES와의 표준 통합이 불가능합니다.

**Q. T3 타이머가 무엇인가?**  
A. HSMS에서 메시지를 보낸 후 응답을 기다리는 최대 시간입니다. 기본값은 45초이며, 이 시간 내에 응답이 없으면 SecsException이 발생하고 통신이 끊깁니다. 이 데모에서 S6F12 응답 순서를 최우선으로 처리한 이유입니다.

**Q. 실제 장비 없이 어떻게 테스트하는가?**  
A. Equipment 프로세스를 별도로 구현하여 실제 HSMS TCP 소켓 통신을 합니다. Mock이 아닌 Secs4Net 라이브러리를 사용한 실제 SECS/GEM 프로토콜 통신입니다.

---

## 5. 개선 필요 사항

### 내일 시연 전 (권장)

| 항목 | 문제 | 개선 방법 |
|------|------|-----------|
| **트레이스 차트 초기화** | 시나리오 전환 시 이전 데이터가 차트에 남음 | 새 시나리오 시작 신호를 SignalR로 전송하여 `points = []` 초기화 |
| **진행 중 시나리오 표시** | 시나리오 실행 중임을 UI에서 알 수 없음 | Scenario 패널에 "Running..." 배지 추가 |
| **Alt Recipe 처리 시간** | Wafer 13매인데도 Normal(25매)과 동일한 15초 | `processSeconds` 필드를 시나리오 정의에 추가 (8~10초) |

### 이후 개선 (Nice to have)

| 항목 | 설명 |
|------|------|
| **Alarm Recovery 검증** | S5F2 reply-first 수정 후 실제 Alarm 시나리오 end-to-end 검증 미완료 |
| **Process History 초기화** | 페이지 새로고침 없이 History를 리셋하는 버튼 부재 |
| **메시지 검색 개선** | 방향 필터의 "→" 문자를 키보드로 입력할 수 없음 (검색창에 S6F11, S5F1 등 S/F 번호로만 사용 가능) |
| **Host State Tracker 개선** | `GemStateTracker`가 단순 문자열 저장이라 HSMS 연결 상태와 불일치 가능 (재시작 후 CommState가 Communicating으로 남는 현상) |
| **다수 시나리오 동시 실행 방지** | 동일 시나리오를 연속 클릭하면 복수 실행됨 — 실행 중 버튼 비활성화 필요 |

### 장기 개선 (아키텍처)

| 항목 | 설명 |
|------|------|
| **실제 레시피 파라미터 교환** | S7F3/S7F6 (Recipe Body 전송) 구현으로 PP-SELECT 전 레시피 다운로드 플로우 완성 |
| **다중 장비 지원** | 현재 1:1 구조 → Equipment ID 기반으로 다수 장비 동시 관리 구조로 확장 |
| **FDC 연동** | Trace 데이터를 시계열 DB(InfluxDB 등)에 저장하고 SPC 차트 연동 |
| **E87 AMHS 연동** | Carrier Arrived 이벤트를 AMHS(자동 반송 시스템) 연동 플로우로 확장 |
