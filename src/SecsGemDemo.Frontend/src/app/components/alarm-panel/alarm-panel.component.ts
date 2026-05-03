import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { SignalrService, AlarmDto } from '../../services/signalr.service';
import { ScenarioService } from '../../services/scenario.service';

@Component({
  selector: 'app-alarm-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="alarm-panel">
      <h3 class="panel-title">
        Alarms
        <span class="alarm-count" *ngIf="activeAlarms.length > 0">{{ activeAlarms.length }}</span>
      </h3>

      <div class="alarm-list" *ngIf="activeAlarms.length > 0">
        <div class="alarm-item" *ngFor="let a of activeAlarms">
          <span class="alarm-icon">⚠</span>
          <div class="alarm-body">
            <div class="alarm-text">{{ a.alarmText }}</div>
            <div class="alarm-meta">ALID={{ a.alarmId }} · {{ a.timestamp }}</div>
          </div>
        </div>
      </div>
      <div class="no-alarm" *ngIf="activeAlarms.length === 0">No active alarms</div>

      <div class="alarm-actions">
        <button class="alarm-btn set-btn"   (click)="setAlarm()"   [disabled]="isAlarmActive">Trigger Alarm</button>
        <button class="alarm-btn clear-btn" (click)="clearAlarm()" [disabled]="!isAlarmActive">Clear Alarm</button>
      </div>

      <div class="alarm-history" *ngIf="history.length > 0">
        <div class="hist-title">Recent</div>
        <div class="hist-item" *ngFor="let h of history">
          <span [class]="h.isSet ? 'dot set' : 'dot clear'"></span>
          <span class="hist-text">{{ h.isSet ? 'SET' : 'CLR' }} ALID={{ h.alarmId }} · {{ h.timestamp }}</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .alarm-panel { display: flex; flex-direction: column; gap: 10px; }
    .panel-title { font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
                   color: #6b7280; text-transform: uppercase; margin: 0;
                   display: flex; align-items: center; gap: 8px; }
    .alarm-count { background: #ef4444; color: #fff; border-radius: 10px;
                   padding: 1px 6px; font-size: 10px; font-weight: 700; }

    .alarm-list { display: flex; flex-direction: column; gap: 6px; }
    .alarm-item { display: flex; align-items: flex-start; gap: 8px;
                  background: #1a0404; border: 1px solid #ef4444; border-radius: 6px; padding: 8px 10px; }
    .alarm-icon { font-size: 14px; color: #ef4444; flex-shrink: 0; }
    .alarm-body { flex: 1; }
    .alarm-text { font-size: 12px; font-weight: 600; color: #fca5a5; }
    .alarm-meta { font-size: 9px; color: #6b7280; margin-top: 2px; font-family: monospace; }
    .no-alarm { font-size: 11px; color: #374151; padding: 4px 0; }

    .alarm-actions { display: flex; gap: 6px; }
    .alarm-btn { flex: 1; padding: 6px; border-radius: 5px; font-size: 11px;
                 font-weight: 600; cursor: pointer; border: 1px solid; }
    .set-btn   { background: #1a0404; border-color: #ef4444; color: #f87171; }
    .set-btn:hover:not([disabled])   { background: #450a0a; }
    .clear-btn { background: #064e3b; border-color: #10b981; color: #6ee7b7; }
    .clear-btn:hover:not([disabled]) { background: #065f46; }
    .alarm-btn[disabled] { opacity: 0.3; cursor: not-allowed; }

    .alarm-history { border-top: 1px solid #1f2937; padding-top: 8px; }
    .hist-title { font-size: 9px; color: #4b5563; text-transform: uppercase;
                  letter-spacing: 0.08em; margin-bottom: 4px; }
    .hist-item { display: flex; align-items: center; gap: 6px; padding: 2px 0; }
    .dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
    .dot.set   { background: #ef4444; }
    .dot.clear { background: #10b981; }
    .hist-text { font-size: 10px; font-family: monospace; color: #6b7280; }
  `]
})
export class AlarmPanelComponent implements OnInit, OnDestroy {
  activeAlarms: AlarmDto[] = [];
  history: AlarmDto[] = [];
  private sub?: Subscription;

  constructor(
    private signalr: SignalrService,
    private scenario: ScenarioService
  ) {}

  ngOnInit() {
    this.sub = this.signalr.alarm$.subscribe(dto => {
      this.history.unshift(dto);
      if (this.history.length > 10) this.history.pop();

      if (dto.isSet)
        this.activeAlarms.push(dto);
      else
        this.activeAlarms = this.activeAlarms.filter(a => a.alarmId !== dto.alarmId);
    });
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  get isAlarmActive(): boolean { return this.activeAlarms.length > 0; }

  setAlarm() {
    this.scenario.alarmSet().subscribe({
      error: err => console.error('[ALARM] set failed', err)
    });
  }

  clearAlarm() {
    this.scenario.alarmClear().subscribe({
      error: err => console.error('[ALARM] clear failed', err)
    });
  }
}
