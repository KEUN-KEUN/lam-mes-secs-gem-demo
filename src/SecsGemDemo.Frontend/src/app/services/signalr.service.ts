import { Injectable, OnDestroy } from '@angular/core';
import { HubConnection, HubConnectionBuilder, HubConnectionState } from '@microsoft/signalr';
import { Subject } from 'rxjs';

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

@Injectable({ providedIn: 'root' })
export class SignalrService implements OnDestroy {
  private readonly hub: HubConnection;

  readonly message$ = new Subject<SecsMessageDto>();
  readonly state$   = new Subject<GemStateDto>();

  constructor() {
    this.hub = new HubConnectionBuilder()
      .withUrl('http://localhost:5001/hubs/secs')
      .withAutomaticReconnect()
      .build();

    this.hub.on('MessageLogged', (dto: SecsMessageDto) => this.message$.next(dto));
    this.hub.on('StateChanged',  (dto: GemStateDto)    => this.state$.next(dto));

    this.hub.start().catch(err => console.error('[SignalR] connection failed:', err));
  }

  get state(): HubConnectionState { return this.hub.state; }

  ngOnDestroy() {
    this.hub.stop();
  }
}
