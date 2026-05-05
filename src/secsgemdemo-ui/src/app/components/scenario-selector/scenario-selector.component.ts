import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ScenarioService, ScenarioDefinition } from '../../services/scenario.service';
import { SignalrService } from '../../services/signalr.service';

@Component({
  selector: 'app-scenario-selector',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="selector-wrap">
      <h3 class="panel-title">Auto Scenario</h3>

      <select class="scenario-select"
              [(ngModel)]="selectedId"
              [disabled]="running">
        <option *ngFor="let d of definitions" [value]="d.id">{{ d.name }}</option>
      </select>

      <div class="scenario-desc" *ngIf="selected">{{ selected.description }}</div>

      <div class="scenario-meta" *ngIf="selected">
        <span class="meta-tag">{{ selected.lotId }}</span>
        <span class="meta-tag">{{ selected.ppid }}</span>
        <span class="meta-tag">{{ selected.waferCount }}W</span>
        <span class="meta-tag alarm-tag" *ngIf="selected.triggerAlarm">Alarm</span>
      </div>

      <button class="run-btn"
              [class.is-running]="running"
              [disabled]="running || !selectedId"
              (click)="run()">
        {{ running ? 'Running...' : 'Run Scenario' }}
      </button>

      <div class="run-status" *ngIf="statusMsg">{{ statusMsg }}</div>
    </div>
  `,
  styles: [`
    .selector-wrap {
      display: flex;
      flex-direction: column;
      gap: 7px;
    }
    .panel-title {
      font-size: 11px;
      font-weight: 600;
      letter-spacing: 0.08em;
      color: #6b7280;
      text-transform: uppercase;
      margin: 0;
    }
    .scenario-select {
      width: 100%;
      padding: 7px 10px;
      background: #1f2937;
      border: 1px solid #374151;
      border-radius: 6px;
      color: #e5e7eb;
      font-size: 12px;
      cursor: pointer;
      outline: none;
    }
    .scenario-select:disabled { opacity: 0.5; cursor: not-allowed; }
    .scenario-select:focus { border-color: #3b82f6; }

    .scenario-desc {
      font-size: 11px;
      color: #6b7280;
      line-height: 1.4;
    }
    .scenario-meta {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
    }
    .meta-tag {
      font-size: 10px;
      padding: 2px 7px;
      border-radius: 10px;
      background: #1f2937;
      border: 1px solid #374151;
      color: #9ca3af;
    }
    .alarm-tag { background: #431407; border-color: #7c2d12; color: #f97316; }

    .run-btn {
      padding: 8px 0;
      width: 100%;
      border-radius: 6px;
      border: 1px solid #3b82f6;
      background: #1e3a8a;
      color: #93c5fd;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .run-btn:hover:not(:disabled) { background: #1d4ed8; color: #fff; }
    .run-btn:disabled { opacity: 0.5; cursor: not-allowed; }
    .run-btn.is-running {
      border-color: #f59e0b;
      background: #451a03;
      color: #fbbf24;
    }
    .run-status {
      font-size: 11px;
      color: #6b7280;
      text-align: center;
    }
  `]
})
export class ScenarioSelectorComponent implements OnInit, OnDestroy {
  definitions: ScenarioDefinition[] = [];
  selectedId  = '';
  running     = false;
  statusMsg   = '';

  private sub?: Subscription;

  get selected(): ScenarioDefinition | undefined {
    return this.definitions.find(d => d.id === this.selectedId);
  }

  constructor(
    private scenario: ScenarioService,
    private signalr: SignalrService
  ) {}

  ngOnInit() {
    this.scenario.getDefinitions().subscribe({
      next: defs => {
        this.definitions = defs;
        if (defs.length > 0) this.selectedId = defs[0].id;
      }
    });

    this.sub = this.signalr.scenarioResult$.subscribe(result => {
      this.running   = false;
      this.statusMsg = `${result.result} — ${result.durationSeconds?.toFixed(1)}s`;
    });
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  run() {
    if (!this.selectedId || this.running) return;
    this.running   = true;
    this.statusMsg = 'Scenario started...';

    this.scenario.runScenario(this.selectedId).subscribe({
      error: () => {
        this.running   = false;
        this.statusMsg = 'Failed to start scenario';
      }
    });
  }
}
