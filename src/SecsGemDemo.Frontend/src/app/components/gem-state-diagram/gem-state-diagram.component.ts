import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { SignalrService } from '../../services/signalr.service';

@Component({
  selector: 'app-gem-state-diagram',
  standalone: true,
  template: `
    <div class="diagram-wrap">
      <div class="diagram-header">
        <div class="diagram-title">GEM State Machine</div>
        <div class="diagram-sub">SEMI E30 · COMM transitions on S1F13/F14 · PROCESS transitions on S6F11 events</div>
      </div>
      <svg class="state-svg" viewBox="0 0 385 186" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker id="arr" viewBox="0 0 8 8" refX="8" refY="4"
                  markerWidth="5" markerHeight="5" orient="auto">
            <polygon points="0,0 8,4 0,8" fill="#94a3b8"/>
          </marker>
        </defs>

        <!-- COMM STATE -->
        <text x="8" y="13" class="lbl">COMM STATE</text>

        <!-- NotCommunicating -->
        <rect [attr.fill]="commFill('NotCommunicating')" [attr.stroke]="commStroke('NotCommunicating')"
              stroke-width="1.5" x="8" y="18" width="160" height="36" rx="6"/>
        <text x="88" y="41" [attr.fill]="stateText(commState === 'NotCommunicating')"
              class="state-lbl" text-anchor="middle">NotCommunicating</text>

        <!-- Arrows NotComm ↔ Comm -->
        <line x1="170" y1="32" x2="225" y2="32" stroke="#cbd5e1" stroke-width="1.5" marker-end="url(#arr)"/>
        <line x1="225" y1="44" x2="170" y2="44" stroke="#cbd5e1" stroke-width="1.5" marker-end="url(#arr)"/>

        <!-- Communicating -->
        <rect [attr.fill]="commFill('Communicating')" [attr.stroke]="commStroke('Communicating')"
              stroke-width="1.5" x="225" y="18" width="152" height="36" rx="6"/>
        <text x="301" y="41" [attr.fill]="stateText(commState === 'Communicating')"
              class="state-lbl" text-anchor="middle">Communicating</text>

        <!-- Divider -->
        <line x1="8" y1="70" x2="377" y2="70" stroke="#e2e8f0" stroke-width="1"/>

        <!-- PROCESS STATE -->
        <text x="8" y="82" class="lbl">PROCESS STATE</text>

        <!-- Idle -->
        <rect [attr.fill]="procFill('Idle')" [attr.stroke]="procStroke('Idle')"
              stroke-width="1.5" x="17" y="90" width="62" height="32" rx="5"/>
        <text x="48" y="111" [attr.fill]="stateText(processState === 'Idle')"
              class="state-lbl" text-anchor="middle">Idle</text>

        <line x1="79" y1="106" x2="89" y2="106" stroke="#cbd5e1" stroke-width="1.5" marker-end="url(#arr)"/>

        <!-- Setup -->
        <rect [attr.fill]="procFill('Setup')" [attr.stroke]="procStroke('Setup')"
              stroke-width="1.5" x="89" y="90" width="62" height="32" rx="5"/>
        <text x="120" y="111" [attr.fill]="stateText(processState === 'Setup')"
              class="state-lbl" text-anchor="middle">Setup</text>

        <line x1="151" y1="106" x2="161" y2="106" stroke="#cbd5e1" stroke-width="1.5" marker-end="url(#arr)"/>

        <!-- Ready -->
        <rect [attr.fill]="procFill('Ready')" [attr.stroke]="procStroke('Ready')"
              stroke-width="1.5" x="161" y="90" width="62" height="32" rx="5"/>
        <text x="192" y="111" [attr.fill]="stateText(processState === 'Ready')"
              class="state-lbl" text-anchor="middle">Ready</text>

        <line x1="223" y1="106" x2="233" y2="106" stroke="#cbd5e1" stroke-width="1.5" marker-end="url(#arr)"/>

        <!-- Executing -->
        <rect [attr.fill]="procFill('Executing')" [attr.stroke]="procStroke('Executing')"
              stroke-width="1.5" x="233" y="90" width="66" height="32" rx="5"/>
        <text x="266" y="111" [attr.fill]="stateText(processState === 'Executing')"
              class="state-lbl" text-anchor="middle">Executing</text>

        <!-- Exec ↔ Pause arrows -->
        <line x1="299" y1="100" x2="309" y2="100" stroke="#cbd5e1" stroke-width="1.5" marker-end="url(#arr)"/>
        <line x1="309" y1="112" x2="299" y2="112" stroke="#cbd5e1" stroke-width="1.5" marker-end="url(#arr)"/>

        <!-- Pause -->
        <rect [attr.fill]="procFill('Pause')" [attr.stroke]="procStroke('Pause')"
              stroke-width="1.5" x="309" y="90" width="62" height="32" rx="5"/>
        <text x="340" y="111" [attr.fill]="stateText(processState === 'Pause')"
              class="state-lbl" text-anchor="middle">Pause</text>

        <!-- Return path: Executing → Idle -->
        <path d="M 266,122 L 266,158 L 48,158 L 48,122"
              fill="none" stroke="#cbd5e1" stroke-width="1.5"
              stroke-dasharray="4,3" marker-end="url(#arr)"/>
        <text x="157" y="172" class="lbl" text-anchor="middle">CompleteProcess</text>
      </svg>
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; }
    .diagram-wrap {
      background: #fff;
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      padding: 20px;
      box-sizing: border-box;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
    }
    .diagram-header { align-self: flex-start; margin-bottom: 20px; }
    .diagram-title {
      font-size: 18px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 6px;
    }
    .diagram-sub {
      font-size: 15px;
      color: #64748b;
      line-height: 1.5;
    }
    .state-svg { width: 100%; max-width: 680px; height: auto; }
    .lbl       { font-size: 14px; fill: #94a3b8; font-family: 'Noto Sans KR', 'Apple SD Gothic Neo', system-ui, sans-serif; font-weight: 600; }
    .state-lbl { font-size: 15px; font-family: 'Noto Sans KR', 'Apple SD Gothic Neo', system-ui, sans-serif; font-weight: 700; }
  `]
})
export class GemStateDiagramComponent implements OnInit, OnDestroy {
  commState    = 'NotCommunicating';
  processState = 'Idle';

  private sub?: Subscription;

  constructor(private signalr: SignalrService) {}

  ngOnInit() {
    this.sub = this.signalr.state$.subscribe(s => {
      this.commState    = s.commState;
      this.processState = s.processState;
    });
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  commFill(state: string): string {
    if (this.commState !== state) return '#f8fafc';
    return state === 'Communicating' ? '#dcfce7' : '#fee2e2';
  }

  commStroke(state: string): string {
    if (this.commState !== state) return '#e2e8f0';
    return state === 'Communicating' ? '#22c55e' : '#ef4444';
  }

  procFill(state: string): string {
    if (this.processState !== state) return '#f8fafc';
    const map: Record<string, string> = {
      Idle:      '#f1f5f9',
      Setup:     '#fef3c7',
      Ready:     '#ede9fe',
      Executing: '#dbeafe',
      Pause:     '#ffedd5',
    };
    return map[state] ?? '#f8fafc';
  }

  procStroke(state: string): string {
    if (this.processState !== state) return '#e2e8f0';
    const map: Record<string, string> = {
      Idle:      '#94a3b8',
      Setup:     '#f59e0b',
      Ready:     '#8b5cf6',
      Executing: '#3b82f6',
      Pause:     '#f97316',
    };
    return map[state] ?? '#e2e8f0';
  }

  stateText(active: boolean): string {
    return active ? '#0f172a' : '#94a3b8';
  }
}
