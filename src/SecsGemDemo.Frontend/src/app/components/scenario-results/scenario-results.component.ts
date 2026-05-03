import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ScenarioService } from '../../services/scenario.service';
import { SignalrService, ScenarioResultDto } from '../../services/signalr.service';

@Component({
  selector: 'app-scenario-results',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="results-wrap">
      <div class="results-header">
        <span class="panel-title">Scenario Results</span>
        <span class="count-badge">{{ results.length }} run{{ results.length !== 1 ? 's' : '' }}</span>
      </div>

      <div class="results-list">
        <div class="empty-msg" *ngIf="results.length === 0">
          No runs yet — select a scenario and click Run
        </div>

        <div class="result-card"
             *ngFor="let r of results"
             [class.card-pass]="r.result === 'PASS'"
             [class.card-fail]="r.result === 'FAIL'"
             [class.card-running]="!r.result">
          <div class="card-top">
            <span class="scenario-name">{{ r.scenarioName }}</span>
            <span class="result-badge"
                  [class.badge-pass]="r.result === 'PASS'"
                  [class.badge-fail]="r.result === 'FAIL'"
                  [class.badge-run]="!r.result">
              {{ r.result ?? 'Running...' }}
            </span>
          </div>
          <div class="card-meta">
            <span class="meta-item">{{ r.lotId }}</span>
            <span class="meta-sep">·</span>
            <span class="meta-item">{{ r.ppid }}</span>
            <span class="meta-sep">·</span>
            <span class="meta-item">{{ r.waferCount }}W</span>
            <span class="alarm-tag" *ngIf="r.alarmCount > 0">
              {{ r.alarmCount }} alarm{{ r.alarmCount !== 1 ? 's' : '' }}
            </span>
          </div>
          <div class="card-bottom">
            <span class="time-label">{{ formatTime(r.startTime) }}</span>
            <span class="duration" *ngIf="r.durationSeconds !== null">
              {{ r.durationSeconds | number:'1.0-1' }}s
            </span>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .results-wrap {
      display: flex;
      flex-direction: column;
      max-height: 220px;
      background: #111827;
      border: 1px solid #1f2937;
      border-radius: 8px;
      padding: 12px;
      box-sizing: border-box;
      overflow: hidden;
    }
    .results-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 10px;
      flex-shrink: 0;
    }
    .panel-title {
      font-size: 11px;
      font-weight: 600;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .count-badge {
      font-size: 10px;
      color: #4b5563;
      background: #1f2937;
      padding: 2px 8px;
      border-radius: 12px;
    }
    .results-list {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .empty-msg {
      color: #4b5563;
      font-size: 12px;
      text-align: center;
      padding: 24px 0;
    }
    .result-card {
      border: 1px solid #1f2937;
      border-radius: 7px;
      padding: 10px 12px;
      background: #0d1117;
      transition: border-color 0.2s;
    }
    .card-pass { border-left: 3px solid #16a34a; }
    .card-fail { border-left: 3px solid #dc2626; }
    .card-running { border-left: 3px solid #f59e0b; }

    .card-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 5px;
    }
    .scenario-name {
      font-size: 12px;
      font-weight: 600;
      color: #e5e7eb;
    }
    .result-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 12px;
      letter-spacing: 0.04em;
    }
    .badge-pass { background: #14532d; color: #4ade80; }
    .badge-fail { background: #450a0a; color: #f87171; }
    .badge-run  { background: #451a03; color: #fbbf24; }

    .card-meta {
      display: flex;
      align-items: center;
      gap: 4px;
      margin-bottom: 5px;
    }
    .meta-item { font-size: 11px; color: #9ca3af; }
    .meta-sep  { font-size: 11px; color: #374151; }
    .alarm-tag {
      margin-left: 6px;
      font-size: 10px;
      color: #f97316;
      background: #431407;
      padding: 1px 6px;
      border-radius: 10px;
    }
    .card-bottom {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .time-label { font-size: 10px; color: #4b5563; font-family: monospace; }
    .duration   { font-size: 11px; color: #60a5fa; font-weight: 600; }
  `]
})
export class ScenarioResultsComponent implements OnInit, OnDestroy {
  results: ScenarioResultDto[] = [];

  private sub?: Subscription;

  constructor(
    private scenario: ScenarioService,
    private signalr: SignalrService
  ) {}

  ngOnInit() {
    this.scenario.getResults().subscribe(r => (this.results = r));

    this.sub = this.signalr.scenarioResult$.subscribe(result => {
      const idx = this.results.findIndex(r => r.runId === result.runId);
      if (idx >= 0) {
        this.results = [...this.results.slice(0, idx), result, ...this.results.slice(idx + 1)];
      } else {
        this.results = [result, ...this.results];
      }
    });
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  formatTime(iso: string): string {
    try {
      return new Date(iso).toLocaleTimeString('ko-KR', { hour12: false });
    } catch { return iso; }
  }
}
