# SECS/GEM Equipment–MES 통신 데모
## 반도체 제조 장비-MES 연동 시뮬레이터

---

## 슬라이드 1 — 제목

**SECS/GEM Equipment–MES 통신 데모**

> 반도체 제조 환경의 장비-MES 실시간 통신을 구현한 풀스택 시뮬레이터

- 개발자: [이름]
- 기술 스택: .NET 8 / Angular 17 / HSMS TCP
- 시연 시간: 약 5분

---

## 슬라이드 2 — 만든 목적

**왜 이 프로그램을 만들었는가**

- 반도체 제조 현장에서 9년간 MES 개발 경험 보유
- 실제 생산 현장의 장비-MES 통신 구조를 **코드 수준**에서 직접 구현해보기 위해 제작
- Mock/가상 통신이 아닌 **실제 SECS/GEM 프로토콜 라이브러리** 사용 (Secs4Net)
- 기술 역량을 동작하는 시스템으로 증명하는 것이 목적

---

## 슬라이드 3 — SECS/GEM이란

**SEMI 국제 표준 통신 프로토콜**

| 표준 | 역할 |
|------|------|
| SEMI E5 (SECS-II) | 메시지 포맷 정의 (Stream/Function) |
| SEMI E37 (HSMS) | TCP/IP 기반 전송 계층 |
| SEMI E30 (GEM) | 장비-HOST 간 행동 규약 (상태머신, 이벤트, 알람) |

- 전 세계 반도체 FAB의 **장비-MES 표준 인터페이스**
- ASML, Applied Materials, 삼성전자, SK하이닉스 등 전산업 적용
- 장비는 수동적(Passive), MES가 능동적(Active)으로 통신 주도

---

## 슬라이드 4 — 시스템 구성

**3-Tier 풀스택 아키텍처**

```
[ Angular UI ]  ←── SignalR WebSocket ───→  [ Host MES API ]
                                                    │
                                             SECS/HSMS TCP
                                                    │
                                           [ Equipment Simulator ]
```

- **Equipment Simulator** (.NET 8) — HSMS 장비 역할, SECS 메시지 처리
- **Host MES API** (.NET 8) — MES 역할, 시나리오 오케스트레이션
- **Angular UI** (Angular 17) — 실시간 모니터링 대시보드

---

## 슬라이드 5 — GEM 상태머신

**SEMI E30 규격 상태 관리**

장비는 항상 두 가지 상태를 동시에 유지

**통신 상태 (CommState)**
```
NotCommunicating ──(S1F13)──► Communicating
```

**공정 상태 (ProcessState)**
```
Idle → Setup → Ready → Executing → Idle
                           │
                        (알람) → Pause → Executing
```

- Stateless 라이브러리로 E30 스펙 그대로 구현
- 상태 전이 시 SignalR로 UI에 즉시 반영

---

## 슬라이드 6 — SECS 메시지 흐름

**실제 FAB에서 사용하는 메시지 시퀀스**

```
HOST                          EQUIPMENT
 │──── S1F13 (통신 수립) ────────►│
 │◄─── S1F14 (수락) ──────────────│
 │──── S2F33 (리포트 정의) ───────►│
 │──── S2F41 (레시피 선택) ───────►│  ← PP-SELECT
 │◄─── S6F11 (공정 시작 이벤트) ──│  ← CEID=2
 │◄─── S6F11 (Trace 데이터) ──────│  ← 온도/압력 반복
 │◄─── S5F1  (알람 발생) ─────────│
 │◄─── S6F11 (공정 종료 이벤트) ──│  ← CEID=3
```

- 모든 메시지는 UI의 Message Log에 실시간 표시
- S6F11 수신 후 T3 타이머(45초) 내 S6F12 응답 필수

---

## 슬라이드 7 — 시연 시나리오

**3가지 자동 시나리오**

| 시나리오 | 설명 | 특징 |
|---------|------|------|
| **Normal Run** | 표준 Track-In/Out | 25매, 15초, 알람 없음 |
| **Alarm Recovery** | 알람 발생 후 복구 | 공정 중 온도 알람 → Pause → 복귀 |
| **Alternative Recipe** | 다른 레시피 사용 | RCP-PHOTO-B2, 13매, 10초 |

- 모두 원클릭 자동 실행
- 수동 단계별 실행도 지원 (7개 버튼)

---

## 슬라이드 8 — 실시간 UI 구성

**대시보드 컴포넌트**

- **State Panel** — COMM/PROCESS 상태 실시간 표시
- **GEM State Diagram** — 상태 전이 SVG 시각화
- **Message Log** — S#F# 메시지 타임스탬프 로그
- **Trace Chart** — 온도·가스압·압력 실시간 라인 차트
- **Alarm Panel** — 알람 발생/해제 목록
- **Process History** — Track-In/Out 이력 테이블
- **Scenario Results** — 시나리오 결과 요약 카드

---

## 슬라이드 9 — 1:1에서 1:N으로의 확장

**현재 구조의 한계와 실무 설계 고민**

현재: `1 MES ↔ 1 Equipment`
실제 FAB: `1 MES ↔ N Equipment (수십~수백 대)`

**단순히 미들웨어+큐만으로 부족한 이유**

| 문제 | 이유 |
|------|------|
| HSMS는 Point-to-Point | 장비별 독립 TCP 세션 필수 |
| SECS는 동기 Reply 프로토콜 | S6F12를 T3(45초) 내 반환 필수 |
| 상태머신이 장비별 격리 필요 | 공유 인스턴스는 race condition 발생 |

**필요한 추가 구성요소**

- Equipment Registry (N개 HSMS 세션 관리)
- Reply Correlator (T3 타이머 보장)
- 장비별 상태머신 인스턴스

---

## 슬라이드 10 — 실무 경험 연계

**TIB RV 환경에서의 실 적용 경험**

실무에서 사용한 패턴:
> **TIB RV Distributed Queue (로드밸런싱) + DB `SELECT FOR UPDATE`**

```
EQ 이벤트 → TIB RV → Consumer A ─┐
                  → Consumer B ─┤─ FOR UPDATE → 순서 직렬화
                  → Consumer C ─┘
```

- 여러 Consumer가 동시에 같은 Lot을 처리하는 Race Condition 방지
- DB를 임계 구역(Critical Section)으로 활용
- **한계**: T3 타이머 > DB Lock Wait 시 세션 단절 위험 → `lock_wait_timeout < T3` 설정 필수

---

## 슬라이드 11 — 현대적 대안

**Kafka 파티셔닝 방식과의 비교**

```
TIB RV 방식:     모든 이벤트 → 동일 큐 → 여러 Consumer → FOR UPDATE로 직렬화
Kafka 방식:  EQ-1 이벤트 → Partition 0 → Consumer A (전담)
             EQ-2 이벤트 → Partition 1 → Consumer B (전담)
```

| | TIB RV + FOR UPDATE | Kafka Partition by EqId |
|--|-------------------|-----------------------|
| 순서 보장 | DB 레벨 | 파티션 레벨 (원천 보장) |
| T3 타이머 | Lock 대기 시간에 의존 | 세션 어피니티 자연 해결 |
| 처리량 | 락 경합으로 제한 | 높음 |
| 복잡도 | 낮음 | 중간 |

---

## 슬라이드 12 — 정리

**이 데모가 보여주는 것**

1. **SECS/GEM 프로토콜** 실제 구현 역량 (단순 이론이 아님)
2. **GEM 상태머신** (SEMI E30) 설계 및 구현
3. **실시간 시스템** 설계 — SignalR, 비동기 이벤트 처리
4. **1:N 확장 설계** 고민 — 미들웨어, 큐, 락 전략
5. **실무 경험** 연계 — TIB RV, FOR UPDATE 패턴

> 9년의 MES 현장 경험을 바탕으로, 직접 구현하고 검증한 시스템입니다.

---

*GitHub: https://github.com/KEUN-KEUN/lam-mes-secs-gem-demo*
