import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { SignalrService } from '../../services/signalr.service';

@Component({
  selector: 'app-gem-state-diagram',
  standalone: true,
  template: `
    <div class="diagram-wrap">
      <div class="diagram-title">GEM State Machine</div>
      <svg class="state-svg" viewBox="0 0 385 186" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <marker id="arr" viewBox="0 0 8 8" refX="8" refY="4"
                  markerWidth="5" markerHeight="5" orient="auto">
            <polygon points="0,0 8,4 0,8" fill="#4b5563"/>
          </marker>
        </defs>

        <!-- COMM STATE -->
        <text x="8" y="13" class="lbl">COMM STATE</text>

        <!-- NotCommunicating -->
        <rect [attr.fill]="commFill('NotCommunicating')"
              x="8" y="18" width="160" height="36" rx="6"/>
        <text x="88" y="41" [attr.fill]="stateText(commState === 'NotCommunicating')"
              class="state-lbl" text-anchor="middle">NotCommunicating</text>

        <!-- Arrows NotComm ↔ Comm -->
        <line x1="170" y1="32" x2="225" y2="32" stroke="#374151" stroke-width="1.5" marker-end="url(#arr)"/>
        <line x1="225" y1="44" x2="170" y2="44" stroke="#374151" stroke-width="1.5" marker-end="url(#arr)"/>

        <!-- Communicating -->
        <rect [attr.fill]="commFill('Communicating')"
              x="225" y="18" width="152" height="36" rx="6"/>
        <text x="301" y="41" [attr.fill]="stateText(commState === 'Communicating')"
              class="state-lbl" text-anchor="middle">Communicating</text>

        <!-- Divider -->
        <line x1="8" y1="70" x2="377" y2="70" stroke="#1f2937" stroke-width="1"/>

        <!-- PROCESS STATE -->
        <text x="8" y="82" class="lbl">PROCESS STATE</text>

        <!-- 5 boxes: width=62, gap=10, total=5*62+4*10=350, start=(385-350)/2≈17 -->

        <!-- Idle -->
        <rect [attr.fill]="procFill('Idle')" x="17" y="90" width="62" height="32" rx="5"/>
        <text x="48" y="111" [attr.fill]="stateText(processState === 'Idle')"
              class="state-lbl" text-anchor="middle">Idle</text>

        <line x1="79" y1="106" x2="89" y2="106" stroke="#374151" stroke-width="1.5" marker-end="url(#arr)"/>

        <!-- Setup -->
        <rect [attr.fill]="procFill('Setup')" x="89" y="90" width="62" height="32" rx="5"/>
        <text x="120" y="111" [attr.fill]="stateText(processState === 'Setup')"
              class="state-lbl" text-anchor="middle">Setup</text>

        <line x1="151" y1="106" x2="161" y2="106" stroke="#374151" stroke-width="1.5" marker-end="url(#arr)"/>

        <!-- Ready -->
        <rect [attr.fill]="procFill('Ready')" x="161" y="90" width="62" height="32" rx="5"/>
        <text x="192" y="111" [attr.fill]="stateText(processState === 'Ready')"
              class="state-lbl" text-anchor="middle">Ready</text>

        <line x1="223" y1="106" x2="233" y2="106" stroke="#374151" stroke-width="1.5" marker-end="url(#arr)"/>

        <!-- Executing -->
        <rect [attr.fill]="procFill('Executing')" x="233" y="90" width="66" height="32" rx="5"/>
        <text x="266" y="111" [attr.fill]="stateText(processState === 'Executing')"
              class="state-lbl" text-anchor="middle">Executing</text>

        <!-- Exec ↔ Pause arrows -->
        <line x1="299" y1="100" x2="309" y2="100" stroke="#374151" stroke-width="1.5" marker-end="url(#arr)"/>
        <line x1="309" y1="112" x2="299" y2="112" stroke="#374151" stroke-width="1.5" marker-end="url(#arr)"/>

        <!-- Pause -->
        <rect [attr.fill]="procFill('Pause')" x="309" y="90" width="62" height="32" rx="5"/>
        <text x="340" y="111" [attr.fill]="stateText(processState === 'Pause')"
              class="state-lbl" text-anchor="middle">Pause</text>

        <!-- Return path: Executing → Idle -->
        <path d="M 266,122 L 266,158 L 48,158 L 48,122"
              fill="none" stroke="#374151" stroke-width="1.5"
              stroke-dasharray="4,3" marker-end="url(#arr)"/>
        <text x="157" y="172" class="lbl" text-anchor="middle">CompleteProcess</text>
      </svg>
    </div>
  `,
  styles: [`
    .diagram-wrap {
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 8px;
      padding: 12px;
      box-sizing: border-box;
    }
    .diagram-title {
      font-size: 11px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 8px;
    }
    .state-svg { width: 100%; height: auto; }
    .lbl       { font-size: 9px; fill: #6b7280; font-family: 'Inter', sans-serif; }
    .state-lbl { font-size: 9.5px; font-family: 'Inter', sans-serif; font-weight: 600; }
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
    if (this.commState !== state) return '#1f2937';
    return state === 'Communicating' ? '#15803d' : '#991b1b';
  }

  procFill(state: string): string {
    if (this.processState !== state) return '#1f2937';
    const map: Record<string, string> = {
      Idle:      '#334155',
      Setup:     '#854d0e',
      Ready:     '#5b21b6',
      Executing: '#1e3a8a',
      Pause:     '#9a3412',
    };
    return map[state] ?? '#374151';
  }

  stateText(active: boolean): string {
    return active ? '#f9fafb' : '#6b7280';
  }
}
