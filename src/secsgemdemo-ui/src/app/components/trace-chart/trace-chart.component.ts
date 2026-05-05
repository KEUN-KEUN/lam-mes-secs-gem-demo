import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { SignalrService, TraceDataDto } from '../../services/signalr.service';

interface TracePoint { temp: number; gasFlow: number; pressure: number; }

const MAX_POINTS = 60;

@Component({
  selector: 'app-trace-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-panel">
      <div class="panel-header">
        <h3 class="panel-title">Real-Time Trace</h3>
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
            <polyline [attr.points]="tempPoints" class="line temp-line"/>
            <text x="295" y="12" class="cur-val">{{ latest.temp | number:'1.1-1' }}°C</text>
          </svg>
        </div>
        <div class="chart-wrap">
          <div class="chart-label">Gas Flow</div>
          <svg class="chart-svg" viewBox="0 0 300 80" preserveAspectRatio="none">
            <polyline [attr.points]="gasPoints" class="line gas-line"/>
            <text x="295" y="12" class="cur-val">{{ latest.gasFlow | number:'1.1-1' }}</text>
          </svg>
        </div>
        <div class="chart-wrap">
          <div class="chart-label">Pressure</div>
          <svg class="chart-svg" viewBox="0 0 300 80" preserveAspectRatio="none">
            <polyline [attr.points]="pressurePoints" class="line pressure-line"/>
            <text x="295" y="12" class="cur-val">{{ latest.pressure | number:'1.3-3' }}</text>
          </svg>
        </div>
      </div>

      <div *ngIf="points.length === 0" class="empty">Trace data will appear during process execution…</div>
    </div>
  `,
  styles: [`
    .chart-panel { background: #111827; border: 1px solid #1f2937; border-radius: 8px; padding: 12px 16px; }
    .panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px; }
    .panel-title { font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
                   color: #6b7280; text-transform: uppercase; margin: 0; }
    .legends { display: flex; gap: 16px; }
    .legend { font-size: 10px; font-weight: 500; color: #6b7280; }
    .legend.temp     { color: #f87171; }
    .legend.gas      { color: #60a5fa; }
    .legend.pressure { color: #34d399; }

    .charts-row { display: flex; gap: 8px; }
    .chart-wrap { flex: 1; }
    .chart-label { font-size: 9px; color: #4b5563; text-transform: uppercase;
                   letter-spacing: 0.08em; margin-bottom: 2px; }
    .chart-svg { width: 100%; height: 80px; background: #0d1117;
                 border-radius: 4px; border: 1px solid #1f2937; overflow: visible; }
    .line { fill: none; stroke-width: 1.5; stroke-linecap: round; stroke-linejoin: round; }
    .temp-line     { stroke: #f87171; }
    .gas-line      { stroke: #60a5fa; }
    .pressure-line { stroke: #34d399; }
    .cur-val { font-size: 8px; fill: #9ca3af; text-anchor: end; font-family: monospace; }

    .empty { padding: 16px; text-align: center; color: #374151; font-size: 11px; }
  `]
})
export class TraceChartComponent implements OnInit, OnDestroy {
  points: TracePoint[] = [];
  latest: TracePoint = { temp: 0, gasFlow: 0, pressure: 0 };
  private sub?: Subscription;

  constructor(private signalr: SignalrService) {}

  ngOnInit() {
    this.sub = this.signalr.trace$.subscribe((dto: TraceDataDto) => {
      const p: TracePoint = {
        temp:     parseFloat(dto.temp)     || 0,
        gasFlow:  parseFloat(dto.gasFlow)  || 0,
        pressure: parseFloat(dto.pressure) || 0
      };
      this.points.push(p);
      if (this.points.length > MAX_POINTS)
        this.points.shift();
      this.latest = p;
    });
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  get tempPoints(): string     { return this.toSvgPoints(this.points.map(p => p.temp)); }
  get gasPoints(): string      { return this.toSvgPoints(this.points.map(p => p.gasFlow)); }
  get pressurePoints(): string { return this.toSvgPoints(this.points.map(p => p.pressure)); }

  private toSvgPoints(values: number[]): string {
    if (values.length < 2) return '';
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    const w = 300, h = 80, pad = 10;

    return values.map((v, i) => {
      const x = (i / (MAX_POINTS - 1)) * w;
      const y = h - pad - ((v - min) / range) * (h - pad * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(' ');
  }
}
