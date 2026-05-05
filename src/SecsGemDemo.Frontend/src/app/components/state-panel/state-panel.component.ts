import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { SignalrService, GemStateDto } from '../../services/signalr.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-state-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="state-panel">
      <div class="panel-header">
        <h3 class="panel-title">Equipment State</h3>
        <span class="panel-sub">SEMI E30 GEM State Machine (Live)</span>
      </div>

      <div class="state-box" [ngClass]="commClass">
        <span class="dot"></span>
        <div class="state-body">
          <span class="label">COMM STATE</span>
          <span class="value">{{ state.commState }}</span>
        </div>
      </div>

      <div class="state-box" [ngClass]="processClass">
        <span class="dot"></span>
        <div class="state-body">
          <span class="label">PROCESS STATE</span>
          <span class="value">{{ state.processState }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .state-panel { display: flex; flex-direction: column; gap: 10px; }
    .panel-header { margin-bottom: 2px; }
    .panel-title { font-size: 17px; font-weight: 700; color: #0f172a; margin: 0 0 3px; }
    .panel-sub { font-size: 15px; color: #94a3b8; }
    .state-box {
      display: flex; align-items: center; gap: 12px;
      padding: 14px 16px; border-radius: 10px;
      border: 2px solid #e2e8f0; background: #f8fafc;
      transition: all 0.3s ease;
    }
    .state-body { display: flex; flex-direction: column; gap: 3px; flex: 1; }
    .label { font-size: 12px; font-weight: 700; letter-spacing: 0.08em;
             color: #94a3b8; text-transform: uppercase; }
    .value { font-size: 20px; font-weight: 800; color: #0f172a; line-height: 1.2; }
    .dot { width: 12px; height: 12px; border-radius: 50%; background: #cbd5e1; flex-shrink: 0; }

    .comm-ok  { border-color: #22c55e; background: #f0fdf4; }
    .comm-ok .dot { background: #22c55e; box-shadow: 0 0 8px #22c55e; }
    .comm-ok .value { color: #15803d; }
    .comm-err { border-color: #ef4444; background: #fef2f2; }
    .comm-err .dot { background: #ef4444; box-shadow: 0 0 6px #ef4444; }
    .comm-err .value { color: #dc2626; }
    .proc-idle { border-color: #e2e8f0; }
    .proc-idle .value { color: #64748b; }
    .proc-executing { border-color: #3b82f6; background: #eff6ff; }
    .proc-executing .dot { background: #3b82f6; box-shadow: 0 0 8px #3b82f6; }
    .proc-executing .value { color: #1d4ed8; }
    .proc-ready { border-color: #8b5cf6; background: #f5f3ff; }
    .proc-ready .dot { background: #8b5cf6; }
    .proc-ready .value { color: #7c3aed; }
    .proc-setup { border-color: #f59e0b; background: #fffbeb; }
    .proc-setup .dot { background: #f59e0b; }
    .proc-setup .value { color: #d97706; }
    .proc-pause { border-color: #f97316; background: #fff7ed; }
    .proc-pause .dot { background: #f97316; }
    .proc-pause .value { color: #ea580c; }
  `]
})
export class StatePanelComponent implements OnInit, OnDestroy {
  state: GemStateDto = { commState: 'NotCommunicating', processState: 'Idle' };
  private sub?: Subscription;

  constructor(private signalr: SignalrService, private http: HttpClient) {}

  ngOnInit() {
    this.http.get<GemStateDto>('http://localhost:5001/scenario/state')
      .subscribe({ next: s => this.state = s });
    this.sub = this.signalr.state$.subscribe(s => this.state = s);
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  get commClass() {
    return this.state.commState === 'Communicating' ? 'comm-ok' : 'comm-err';
  }

  get processClass() {
    switch (this.state.processState) {
      case 'Executing': return 'proc-executing';
      case 'Ready':     return 'proc-ready';
      case 'Setup':     return 'proc-setup';
      case 'Pause':     return 'proc-pause';
      default:          return 'proc-idle';
    }
  }
}
