import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable } from 'rxjs';
import { ScenarioService } from '../../services/scenario.service';

type StepState = 'pending' | 'running' | 'done' | 'error';

interface Step {
  index: number;
  icon: string;
  label: string;
  state: StepState;
  action: () => Observable<unknown>;
}

@Component({
  selector: 'app-scenario-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="scenario-panel">
      <h3 class="panel-title">Scenario Steps</h3>
      <div class="steps">
        <div
          *ngFor="let step of steps"
          class="step"
          [class.enabled]="isEnabled(step)"
          [class.running]="step.state === 'running'"
          [class.done]="step.state === 'done'"
          [class.error]="step.state === 'error'"
          (click)="run(step)"
        >
          <span class="step-icon">{{ step.icon }}</span>
          <div class="step-body">
            <span class="step-label">{{ step.label }}</span>
            <span class="step-status" *ngIf="step.state !== 'pending'">
              <span *ngIf="step.state === 'running'" class="spinner">⟳</span>
              <span *ngIf="step.state === 'done'">✓</span>
              <span *ngIf="step.state === 'error'">✕</span>
            </span>
          </div>
        </div>
      </div>
      <button class="reset-btn" (click)="reset()">↺ Reset Scenario</button>
    </div>
  `,
  styles: [`
    .scenario-panel { display: flex; flex-direction: column; gap: 8px; }
    .panel-title { font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
                   color: #6b7280; text-transform: uppercase; margin: 0 0 4px; }
    .steps { display: flex; flex-direction: column; gap: 5px; }

    .step {
      display: flex; align-items: center; gap: 10px;
      padding: 9px 12px; border-radius: 7px;
      border: 1px solid #1f2937; background: #111827;
      cursor: not-allowed; opacity: 0.4;
      transition: all 0.2s ease; user-select: none;
    }
    .step.enabled { opacity: 1; cursor: pointer; border-color: #374151; }
    .step.enabled:hover { background: #1f2937; border-color: #4b5563; }
    .step.running { border-color: #f59e0b; background: #1c1408; opacity: 1; }
    .step.done    { border-color: #10b981; background: #062013; opacity: 1; }
    .step.error   { border-color: #ef4444; background: #1a0404; opacity: 1; }

    .step-icon { font-size: 16px; width: 24px; text-align: center; }
    .step-body { display: flex; flex: 1; align-items: center; justify-content: space-between; }
    .step-label { font-size: 12px; font-weight: 500; color: #d1d5db; }
    .step-status { font-size: 12px; font-weight: 700; }
    .step.done .step-status  { color: #10b981; }
    .step.error .step-status { color: #ef4444; }
    .step.running .step-status { color: #f59e0b; }
    .spinner { display: inline-block; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }

    .reset-btn { margin-top: 4px; padding: 7px; border-radius: 6px;
                 border: 1px solid #374151; background: #1f2937;
                 color: #9ca3af; font-size: 11px; cursor: pointer; }
    .reset-btn:hover { background: #374151; color: #e5e7eb; }
  `]
})
export class ScenarioPanelComponent {
  steps: Step[];

  constructor(private scenario: ScenarioService) {
    this.steps = this.buildSteps();
  }

  private buildSteps(): Step[] {
    return [
      { index: 0, icon: '🔌', label: '① Connect',         state: 'pending', action: () => this.scenario.connect()        },
      { index: 1, icon: '📋', label: '② Define Reports',  state: 'pending', action: () => this.scenario.defineReports()  },
      { index: 2, icon: '🚚', label: '③ Carrier Arrived', state: 'pending', action: () => this.scenario.carrierArrived() },
      { index: 3, icon: '🧪', label: '④ Select Recipe',   state: 'pending', action: () => this.scenario.selectRecipe()   },
      { index: 4, icon: '▶', label: '⑤ Process Start',   state: 'pending', action: () => this.scenario.processStart()   },
      { index: 5, icon: '⏹', label: '⑥ Process End',     state: 'pending', action: () => this.scenario.processEnd()     },
      { index: 6, icon: '🔒', label: '⑦ Disconnect',      state: 'pending', action: () => this.scenario.disconnect()    },
    ];
  }

  isEnabled(step: Step): boolean {
    if (step.state === 'running' || step.state === 'done') return false;
    if (step.index === 0) return true;
    return this.steps[step.index - 1].state === 'done';
  }

  run(step: Step) {
    if (!this.isEnabled(step)) return;
    step.state = 'running';
    step.action().subscribe({
      next: () => { step.state = 'done'; },
      error: () => { step.state = 'error'; },
    });
  }

  reset() { this.steps = this.buildSteps(); }
}
