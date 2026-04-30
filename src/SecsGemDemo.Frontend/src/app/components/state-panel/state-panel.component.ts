import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { SignalrService, GemStateDto } from '../../services/signalr.service';

@Component({
  selector: 'app-state-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="state-panel">
      <h3 class="panel-title">Equipment State</h3>

      <div class="state-box" [ngClass]="commClass">
        <span class="label">COMM</span>
        <span class="value">{{ state.commState }}</span>
        <span class="dot"></span>
      </div>

      <div class="state-box" [ngClass]="processClass">
        <span class="label">PROCESS</span>
        <span class="value">{{ state.processState }}</span>
        <span class="dot"></span>
      </div>
    </div>
  `,
  styles: [`
    .state-panel { display: flex; flex-direction: column; gap: 12px; }
    .panel-title { font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
                   color: #6b7280; text-transform: uppercase; margin: 0 0 4px; }
    .state-box {
      display: flex; align-items: center; gap: 10px;
      padding: 12px 16px; border-radius: 8px;
      border: 1px solid #374151; background: #1f2937;
      transition: all 0.3s ease;
    }
    .state-box .label {
      font-size: 10px; font-weight: 700; letter-spacing: 0.1em;
      color: #9ca3af; text-transform: uppercase; width: 60px;
    }
    .state-box .value {
      flex: 1; font-size: 13px; font-weight: 600; color: #e5e7eb;
    }
    .state-box .dot {
      width: 10px; height: 10px; border-radius: 50%;
      background: #6b7280;
    }
    /* Comm states */
    .comm-ok  { border-color: #10b981; background: #064e3b; }
    .comm-ok .dot { background: #10b981; box-shadow: 0 0 6px #10b981; }
    .comm-ok .value { color: #6ee7b7; }
    .comm-err { border-color: #ef4444; background: #450a0a; }
    .comm-err .dot { background: #ef4444; }
    .comm-err .value { color: #fca5a5; }
    /* Process states */
    .proc-idle { border-color: #374151; }
    .proc-executing { border-color: #3b82f6; background: #1e3a5f; }
    .proc-executing .dot { background: #3b82f6; box-shadow: 0 0 6px #3b82f6; }
    .proc-executing .value { color: #93c5fd; }
    .proc-ready { border-color: #8b5cf6; background: #2e1065; }
    .proc-ready .dot { background: #8b5cf6; }
    .proc-ready .value { color: #c4b5fd; }
    .proc-setup { border-color: #f59e0b; background: #451a03; }
    .proc-setup .dot { background: #f59e0b; }
    .proc-setup .value { color: #fcd34d; }
    .proc-pause { border-color: #f97316; background: #431407; }
    .proc-pause .dot { background: #f97316; }
    .proc-pause .value { color: #fdba74; }
  `]
})
export class StatePanelComponent implements OnInit, OnDestroy {
  state: GemStateDto = { commState: 'NotCommunicating', processState: 'Idle' };
  private sub?: Subscription;

  constructor(private signalr: SignalrService) {}

  ngOnInit() {
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
