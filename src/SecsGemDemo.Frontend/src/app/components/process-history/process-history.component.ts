import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { SignalrService, LotHistoryDto } from '../../services/signalr.service';

@Component({
  selector: 'app-process-history',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="history-panel">
      <div class="panel-header">
        <h3 class="panel-title">Process History (Genealogy)</h3>
        <span class="count">{{ histories.length }} Lot(s)</span>
      </div>

      <div class="table-wrap">
        <table class="hist-table">
          <thead>
            <tr>
              <th>Lot ID</th>
              <th>Recipe</th>
              <th>Track-In</th>
              <th>Track-Out</th>
              <th>Wafers</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let h of histories" [class.in-progress]="!h.endTime">
              <td class="lot-id">{{ h.lotId }}</td>
              <td class="ppid">{{ h.ppid }}</td>
              <td class="time">{{ formatTime(h.startTime) }}</td>
              <td class="time">{{ h.endTime ? formatTime(h.endTime) : '…' }}</td>
              <td class="wafer">{{ h.waferCount }}</td>
              <td>
                <span *ngIf="!h.result" class="badge processing">PROCESSING</span>
                <span *ngIf="h.result === 'PASS'" class="badge pass">PASS</span>
                <span *ngIf="h.result === 'FAIL'" class="badge fail">FAIL</span>
              </td>
            </tr>
          </tbody>
        </table>
        <div *ngIf="histories.length === 0" class="empty">No lots processed yet…</div>
      </div>
    </div>
  `,
  styles: [`
    .history-panel { display: flex; flex-direction: column; height: 100%; }
    .panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .panel-title { font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
                   color: #6b7280; text-transform: uppercase; margin: 0; }
    .count { font-size: 11px; color: #4b5563; }

    .table-wrap { flex: 1; overflow-y: auto; border-radius: 8px; border: 1px solid #374151; min-height: 0; }
    .hist-table { width: 100%; border-collapse: collapse; font-size: 11px; }
    .hist-table thead tr { position: sticky; top: 0; }
    .hist-table th { padding: 7px 10px; background: #111827; color: #6b7280;
                     font-weight: 600; text-transform: uppercase; font-size: 9px;
                     letter-spacing: 0.06em; border-bottom: 1px solid #374151; text-align: left; }
    .hist-table tbody tr { border-bottom: 1px solid #1f2937; }
    .hist-table tbody tr.in-progress { background: #0c1a2e; }
    .hist-table td { padding: 6px 10px; color: #d1d5db; }
    .lot-id { font-family: monospace; font-size: 10px; color: #60a5fa; }
    .ppid   { font-family: monospace; font-size: 10px; color: #a78bfa; }
    .time   { font-family: monospace; font-size: 10px; color: #6b7280; white-space: nowrap; }
    .wafer  { text-align: center; color: #9ca3af; }

    .badge { display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 9px; font-weight: 700; }
    .badge.pass       { background: #064e3b; color: #6ee7b7; border: 1px solid #059669; }
    .badge.fail       { background: #450a0a; color: #fca5a5; border: 1px solid #ef4444; }
    .badge.processing { background: #1c1408; color: #fcd34d; border: 1px solid #f59e0b; }

    .empty { padding: 24px; text-align: center; color: #374151; font-size: 11px; }
  `]
})
export class ProcessHistoryComponent implements OnInit, OnDestroy {
  histories: LotHistoryDto[] = [];
  private sub?: Subscription;

  constructor(private signalr: SignalrService) {}

  ngOnInit() {
    this.sub = this.signalr.lotHistory$.subscribe(dto => {
      const idx = this.histories.findIndex(h => h.lotId === dto.lotId);
      if (idx >= 0)
        this.histories[idx] = dto;  // Track-Out 업데이트
      else
        this.histories.unshift(dto); // 새 Lot 맨 위에 추가
    });
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  formatTime(iso: string): string {
    try { return new Date(iso).toLocaleTimeString(); }
    catch { return iso; }
  }
}
