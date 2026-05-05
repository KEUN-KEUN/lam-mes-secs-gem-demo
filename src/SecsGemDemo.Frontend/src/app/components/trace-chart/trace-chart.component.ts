import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { SignalrService, TraceDataDto } from '../../services/signalr.service';

interface TracePoint { temp: number; gasFlow: number; pressure: number; }

const MAX_POINTS = 60;

// 고정 Y축 범위 — 레시피가 바뀌어도 같은 스케일로 비교 가능
const SCALE = {
  temp:     { min: 50,  max: 250,  unit: '°C'   },
  gasFlow:  { min: 0,   max: 70,   unit: 'slm'  },
  pressure: { min: 0,   max: 1.5,  unit: 'Torr' },
};

@Component({
  selector: 'app-trace-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-panel">
      <div class="panel-header">
        <div>
          <h3 class="panel-title">Real-Time Trace</h3>
          <div class="panel-sub">S6F11 CEID=4 · 1s interval during Executing</div>
        </div>
        <div class="legends">
          <span class="legend temp">● Temp (°C)</span>
          <span class="legend gas">● Gas Flow (slm)</span>
          <span class="legend pressure">● Pressure (Torr)</span>
        </div>
      </div>

      <div class="charts-row">
        <div class="chart-wrap">
          <div class="chart-label">Temp</div>
          <svg class="chart-svg" viewBox="0 0 300 80" preserveAspectRatio="none">
            <line x1="0" y1="10" x2="300" y2="10" class="axis-line"/>
            <line x1="0" y1="70" x2="300" y2="70" class="axis-line"/>
            <text x="2" y="10" class="axis-label" dominant-baseline="hanging">{{ scale.temp.max }}°C</text>
            <text x="2" y="70" class="axis-label" dominant-baseline="auto">{{ scale.temp.min }}°C</text>
            <polyline [attr.points]="tempPoints" class="line temp-line"/>
            <text x="298" y="9" class="cur-val" text-anchor="end">{{ latest.temp | number:'1.1-1' }}°C</text>
          </svg>
        </div>
        <div class="chart-wrap">
          <div class="chart-label">Gas Flow</div>
          <svg class="chart-svg" viewBox="0 0 300 80" preserveAspectRatio="none">
            <line x1="0" y1="10" x2="300" y2="10" class="axis-line"/>
            <line x1="0" y1="70" x2="300" y2="70" class="axis-line"/>
            <text x="2" y="10" class="axis-label" dominant-baseline="hanging">{{ scale.gasFlow.max }}</text>
            <text x="2" y="70" class="axis-label" dominant-baseline="auto">{{ scale.gasFlow.min }}</text>
            <polyline [attr.points]="gasPoints" class="line gas-line"/>
            <text x="298" y="9" class="cur-val" text-anchor="end">{{ latest.gasFlow | number:'1.1-1' }}</text>
          </svg>
        </div>
        <div class="chart-wrap">
          <div class="chart-label">Pressure</div>
          <svg class="chart-svg" viewBox="0 0 300 80" preserveAspectRatio="none">
            <line x1="0" y1="10" x2="300" y2="10" class="axis-line"/>
            <line x1="0" y1="70" x2="300" y2="70" class="axis-line"/>
            <text x="2" y="10" class="axis-label" dominant-baseline="hanging">{{ scale.pressure.max }}</text>
            <text x="2" y="70" class="axis-label" dominant-baseline="auto">{{ scale.pressure.min }}</text>
            <polyline [attr.points]="pressurePoints" class="line pressure-line"/>
            <text x="298" y="9" class="cur-val" text-anchor="end">{{ latest.pressure | number:'1.3-3' }}</text>
          </svg>
        </div>
      </div>

      <div *ngIf="points.length === 0" class="empty">Trace data will appear during process execution…</div>
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; }
    .chart-panel { background: #fff; border: 1px solid #e2e8f0; border-radius: 8px;
                   padding: 12px 16px; display: flex; flex-direction: column; height: 100%; }
    .panel-header { display: flex; align-items: center; justify-content: space-between;
                    margin-bottom: 8px; flex-shrink: 0; }
    .panel-title { font-size: 17px; font-weight: 700; color: #0f172a; margin: 0 0 4px; }
    .panel-sub { font-size: 15px; color: #64748b; }
    .legends { display: flex; gap: 16px; align-items: center; }
    .legend { font-size: 15px; font-weight: 600; }
    .legend.temp     { color: #ef4444; }
    .legend.gas      { color: #3b82f6; }
    .legend.pressure { color: #10b981; }

    .charts-row { display: flex; gap: 8px; flex: 1; min-height: 0; }
    .chart-wrap { flex: 1; display: flex; flex-direction: column; min-height: 0; }
    .chart-label { font-size: 15px; color: #64748b; font-weight: 600;
                   text-transform: uppercase; margin-bottom: 4px; flex-shrink: 0; }
    .chart-svg { width: 100%; flex: 1; min-height: 60px; background: #f8fafc;
                 border-radius: 4px; border: 1px solid #e2e8f0; overflow: visible; }
    .line { fill: none; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
    .temp-line     { stroke: #ef4444; }
    .gas-line      { stroke: #3b82f6; }
    .pressure-line { stroke: #10b981; }
    .axis-line  { stroke: #e2e8f0; stroke-width: 0.5; stroke-dasharray: 4 3; }
    .axis-label { font-size: 8px; fill: #94a3b8; font-family: 'JetBrains Mono', monospace; }
    .cur-val    { font-size: 11px; fill: #374151; font-family: 'JetBrains Mono', monospace; font-weight: 700; }

    .empty { flex: 1; display: flex; align-items: center; justify-content: center;
             color: #cbd5e1; font-size: 12px; }
  `]
})
export class TraceChartComponent implements OnInit, OnDestroy {
  points: TracePoint[] = [];
  latest: TracePoint = { temp: 0, gasFlow: 0, pressure: 0 };
  readonly scale = SCALE;
  private subs: Subscription[] = [];

  constructor(private signalr: SignalrService) {}

  ngOnInit() {
    this.subs.push(
      this.signalr.scenarioStarted$.subscribe(() => {
        this.points = [];
        this.latest = { temp: 0, gasFlow: 0, pressure: 0 };
      }),
      this.signalr.trace$.subscribe((dto: TraceDataDto) => {
        const p: TracePoint = {
          temp:     parseFloat(dto.temp)     || 0,
          gasFlow:  parseFloat(dto.gasFlow)  || 0,
          pressure: parseFloat(dto.pressure) || 0
        };
        this.points.push(p);
        if (this.points.length > MAX_POINTS) this.points.shift();
        this.latest = p;
      })
    );
  }

  ngOnDestroy() { this.subs.forEach(s => s.unsubscribe()); }

  get tempPoints(): string     { return this.toSvgPoints(this.points.map(p => p.temp),    SCALE.temp.min,     SCALE.temp.max); }
  get gasPoints(): string      { return this.toSvgPoints(this.points.map(p => p.gasFlow), SCALE.gasFlow.min,  SCALE.gasFlow.max); }
  get pressurePoints(): string { return this.toSvgPoints(this.points.map(p => p.pressure),SCALE.pressure.min, SCALE.pressure.max); }

  private toSvgPoints(values: number[], fixedMin: number, fixedMax: number): string {
    if (values.length < 2) return '';
    const range = fixedMax - fixedMin;
    const w = 300, top = 10, bottom = 70;

    return values.map((v, i) => {
      const x = (i / (MAX_POINTS - 1)) * w;
      const y = bottom - ((v - fixedMin) / range) * (bottom - top);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }
}
