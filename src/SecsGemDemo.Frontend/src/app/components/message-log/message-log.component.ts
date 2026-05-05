import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { SignalrService, SecsMessageDto } from '../../services/signalr.service';

const MAX_MESSAGES = 1000;

@Component({
  selector: 'app-message-log',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="msg-panel">
      <div class="panel-header">
        <div>
          <h3 class="panel-title">
            SECS Message Log
            <span class="count" *ngIf="filtered.length === messages.length">({{ messages.length }})</span>
            <span class="count" *ngIf="filtered.length !== messages.length">({{ filtered.length }} / {{ messages.length }})</span>
          </h3>
          <div class="panel-sub">Click row to view SML</div>
        </div>
        <button class="clear-btn" (click)="clear()">Clear</button>
      </div>

      <div class="filter-row">
        <div class="dir-filters">
          <button class="dir-btn" [class.active]="filterDir === 'all'" (click)="setDir('all')">All</button>
          <button class="dir-btn" [class.active]="filterDir === 'H→E'" (click)="setDir('H→E')">H→E</button>
          <button class="dir-btn" [class.active]="filterDir === 'E→H'" (click)="setDir('E→H')">E→H</button>
        </div>
        <input class="filter-input" type="text" [value]="filterText"
               (input)="onFilterInput($event)" placeholder="메시지 이름, S/F 번호 검색…">
      </div>

      <div class="log-table-wrap" #scrollContainer>
        <table class="log-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Time</th>
              <th>Dir</th>
              <th>S/F</th>
              <th>Message Name</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let m of filtered; let i = index" (click)="select(m)" [class.selected]="selected === m">
              <td>{{ i + 1 }}</td>
              <td>{{ m.timestamp }}</td>
              <td>{{ m.direction }}</td>
              <td>S{{ m.s }}F{{ m.f }}</td>
              <td>{{ m.name }}</td>
            </tr>
          </tbody>
        </table>
        <div *ngIf="messages.length === 0" class="empty">Waiting for SECS messages…</div>
        <div *ngIf="messages.length > 0 && filtered.length === 0" class="empty">필터 조건에 맞는 메시지가 없습니다.</div>
      </div>
    </div>

    <div class="modal-backdrop" *ngIf="selected" (click)="selected = null">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <span class="modal-meta">S{{ selected.s }}F{{ selected.f }} &nbsp;·&nbsp; {{ selected.direction }}</span>
          <span class="modal-title">{{ selected.name }}</span>
          <button class="close-btn" (click)="selected = null">✕</button>
        </div>
        <pre class="sml">{{ selected.sml }}</pre>
      </div>
    </div>
  `,
  styles: [`
    :host { display: flex; flex-direction: column; height: 100%; min-height: 0; }
    .msg-panel { display: flex; flex-direction: column; height: 100%; min-height: 0; }

    .panel-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 8px; gap: 12px; }
    .panel-title { font-size: 17px; font-weight: 700; color: #111827; margin: 0 0 3px; }
    .panel-sub { font-size: 14px; color: #6b7280; }
    .count { font-weight: 400; color: #9ca3af; }

    .clear-btn { font-size: 14px; padding: 5px 14px; flex-shrink: 0;
                 border: 1px solid #d1d5db; background: none; color: #6b7280; cursor: pointer;
                 font-family: 'Noto Sans KR', system-ui, sans-serif; }
    .clear-btn:hover { color: #111827; }

    .filter-row { display: flex; align-items: center; gap: 10px; margin-bottom: 8px; }
    .dir-filters { display: flex; gap: 0; border: 1px solid #d1d5db; }
    .dir-btn { font-family: 'Noto Sans KR', system-ui, sans-serif; font-size: 14px; font-weight: 600;
               padding: 5px 14px; border: none; background: none; color: #6b7280; cursor: pointer;
               border-right: 1px solid #d1d5db; }
    .dir-btn:last-child { border-right: none; }
    .dir-btn:hover { background: #f9fafb; color: #111827; }
    .dir-btn.active { background: #111827; color: #fff; }
    .filter-input { flex: 1; font-family: 'Noto Sans KR', system-ui, sans-serif; font-size: 14px;
                    padding: 5px 10px; border: 1px solid #d1d5db; color: #111827; outline: none; }
    .filter-input::placeholder { color: #d1d5db; }
    .filter-input:focus { border-color: #6b7280; }

    .log-table-wrap { flex: 1; overflow-y: auto; min-height: 0; }
    .log-table { width: 100%; border-collapse: collapse; color: #111827; }
    .log-table thead tr { position: sticky; top: 0; z-index: 1; background: #fff; }
    .log-table th { font-family: 'Noto Sans KR', system-ui, sans-serif; font-size: 18px; font-weight: 700; padding: 11px 16px; text-align: left; border-bottom: 2px solid #111827; }
    .log-table td { font-family: 'Noto Sans KR', system-ui, sans-serif; font-size: 18px; padding: 11px 16px; text-align: left; }
    .log-table tbody tr { border-bottom: 1px solid #e5e7eb; cursor: pointer; }
    .log-table tbody tr.selected { font-weight: 700; }

    .empty { padding: 40px; text-align: center; color: #d1d5db; font-size: 15px; }

    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.35);
                      display: flex; align-items: center; justify-content: center; z-index: 100; }
    .modal { background: #fff; border: 1px solid #d1d5db; width: 660px; max-width: 92vw; max-height: 80vh;
             display: flex; flex-direction: column; overflow: hidden; }
    .modal-header { display: flex; align-items: baseline; gap: 16px;
                    padding: 14px 18px; border-bottom: 1px solid #374151; }
    .modal-meta  { font-family: 'JetBrains Mono', 'Consolas', monospace; font-size: 16px; font-weight: 700; color: #111827; white-space: nowrap; }
    .modal-title { flex: 1; font-size: 16px; font-weight: 500; color: #374151; }
    .close-btn { background: none; border: none; color: #9ca3af; font-size: 18px; cursor: pointer; line-height: 1; padding: 0; }
    .close-btn:hover { color: #111827; }
    .sml { margin: 0; padding: 20px; font-family: 'JetBrains Mono', 'Consolas', monospace;
           font-size: 14px; color: #111827; background: #fff;
           overflow: auto; white-space: pre; line-height: 1.8; }
  `]
})
export class MessageLogComponent implements OnInit, OnDestroy, AfterViewChecked {
  messages: SecsMessageDto[] = [];
  selected: SecsMessageDto | null = null;
  filterDir: 'all' | 'H→E' | 'E→H' = 'all';
  filterText = '';
  private sub?: Subscription;
  private shouldScroll = false;

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  constructor(private signalr: SignalrService) {}

  ngOnInit() {
    this.sub = this.signalr.message$.subscribe(m => {
      this.messages.push(m);
      if (this.messages.length > MAX_MESSAGES)
        this.messages.splice(0, this.messages.length - MAX_MESSAGES);
      if (this.passesFilter(m))
        this.shouldScroll = true;
    });
  }

  ngAfterViewChecked() {
    if (this.shouldScroll) {
      const el = this.scrollContainer?.nativeElement as HTMLElement;
      if (el) el.scrollTop = el.scrollHeight;
      this.shouldScroll = false;
    }
  }

  ngOnDestroy() { this.sub?.unsubscribe(); }

  get filtered(): SecsMessageDto[] {
    return this.messages.filter(m => this.passesFilter(m));
  }

  private passesFilter(m: SecsMessageDto): boolean {
    const dirOk = this.filterDir === 'all' || m.direction === this.filterDir;
    const txt = this.filterText.trim().toLowerCase();
    const textOk = !txt ||
      m.name.toLowerCase().includes(txt) ||
      `s${m.s}f${m.f}`.includes(txt);
    return dirOk && textOk;
  }

  setDir(dir: 'all' | 'H→E' | 'E→H') { this.filterDir = dir; }
  onFilterInput(e: Event) { this.filterText = (e.target as HTMLInputElement).value; }

  select(m: SecsMessageDto) { this.selected = this.selected === m ? null : m; }
  clear() { this.messages = []; this.selected = null; }
}
