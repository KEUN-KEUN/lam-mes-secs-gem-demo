import { Injectable, OnDestroy } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { BehaviorSubject, Subject } from 'rxjs';

export interface SecsMessageDto {
  direction: string;
  s: number;
  f: number;
  name: string;
  sml: string;
  timestamp: string;
}

export interface GemStateDto {
  commState: string;
  processState: string;
}

export interface TraceDataDto {
  temp: string;
  gasFlow: string;
  pressure: string;
  timestamp: string;
}

export interface AlarmDto {
  alarmId: number;
  alarmText: string;
  isSet: boolean;
  timestamp: string;
}

export interface LotHistoryDto {
  lotId: string;
  ppid: string;
  startTime: string;
  endTime: string | null;
  result: string | null;
  waferCount: number;
}

export interface ScenarioResultDto {
  runId: string;
  scenarioName: string;
  lotId: string;
  ppid: string;
  waferCount: number;
  startTime: string;
  endTime: string | null;
  result: string | null;
  alarmCount: number;
  durationSeconds: number | null;
}

@Injectable({ providedIn: 'root' })
export class SignalrService implements OnDestroy {
  private readonly hub: HubConnection;

  readonly message$        = new Subject<SecsMessageDto>();
  readonly state$          = new Subject<GemStateDto>();
  readonly trace$          = new Subject<TraceDataDto>();
  readonly alarm$          = new Subject<AlarmDto>();
  readonly lotHistory$     = new Subject<LotHistoryDto>();
  readonly scenarioResult$ = new Subject<ScenarioResultDto>();
  readonly connected$      = new BehaviorSubject<boolean>(false);

  constructor() {
    this.hub = new HubConnectionBuilder()
      .withUrl('http://localhost:5001/hubs/secs')
      .withAutomaticReconnect()
      .build();

    this.hub.on('MessageLogged',    (dto: SecsMessageDto)    => this.message$.next(dto));
    this.hub.on('StateChanged',     (dto: GemStateDto)       => this.state$.next(dto));
    this.hub.on('TraceData',        (dto: TraceDataDto)      => this.trace$.next(dto));
    this.hub.on('AlarmOccurred',    (dto: AlarmDto)          => this.alarm$.next(dto));
    this.hub.on('LotHistoryUpdated',(dto: LotHistoryDto)     => this.lotHistory$.next(dto));
    this.hub.on('ScenarioCompleted',(dto: ScenarioResultDto) => this.scenarioResult$.next(dto));

    this.hub.onreconnected(() => this.connected$.next(true));
    this.hub.onclose(() => this.connected$.next(false));

    this.hub.start()
      .then(() => this.connected$.next(true))
      .catch(err => console.error('[SignalR] connection failed:', err));
  }

  get connectionState(): HubConnectionState { return this.hub.state; }

  ngOnDestroy() { this.hub.stop(); }
}
