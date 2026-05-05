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
        <h3 class="panel-title">Message Log <span class="count">({{ messages.length }})</span></h3>
        <button class="clear-btn" (click)="clear()">Clear</button>
      </div>

      <div class="log-table-wrap" #scrollContainer>
        <table class="log-table">
          <thead>
            <tr>
              <th>Time</th>
              <th>Dir</th>
              <th>S/F</th>
              <th>Name</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let m of messages" (click)="select(m)" [class.selected]="selected === m">
              <td class="ts">{{ m.timestamp }}</td>
              <td><span class="dir-badge" [ngClass]="m.direction === 'H→E' ? 'h2e' : 'e2h'">{{ m.direction }}</span></td>
              <td class="sf">S{{ m.s }}F{{ m.f }}</td>
              <td class="name">{{ m.name }}</td>
            </tr>
          </tbody>
        </table>
        <div *ngIf="messages.length === 0" class="empty">Waiting for SECS messages…</div>
      </div>
    </div>

    <div class="modal-backdrop" *ngIf="selected" (click)="selected = null">
      <div class="modal" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <span class="dir-badge lg" [ngClass]="selected.direction === 'H→E' ? 'h2e' : 'e2h'">{{ selected.direction }}</span>
          <span class="modal-title">S{{ selected.s }}F{{ selected.f }} — {{ selected.name }}</span>
          <button class="close-btn" (click)="selected = null">✕</button>
        </div>
        <pre class="sml">{{ selected.sml }}</pre>
      </div>
    </div>
  `,
  styles: [`
    .msg-panel { display: flex; flex-direction: column; height: 100%; }
    .panel-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; }
    .panel-title { font-size: 11px; font-weight: 600; letter-spacing: 0.08em;
                   color: #6b7280; text-transform: uppercase; margin: 0; }
    .count { font-weight: 400; color: #4b5563; }
    .clear-btn { font-size: 11px; padding: 2px 10px; border-radius: 4px;
                 border: 1px solid #374151; background: #1f2937; color: #9ca3af; cursor: pointer; }
    .clear-btn:hover { background: #374151; color: #e5e7eb; }

    .log-table-wrap { flex: 1; overflow-y: auto; border-radius: 8px;
                      border: 1px solid #374151; min-height: 0; }
    .log-table { width: 100%; border-collapse: collapse; font-size: 12px; }
    .log-table thead tr { position: sticky; top: 0; z-index: 1; }
    .log-table th { padding: 8px 10px; background: #111827; color: #6b7280;
                    font-weight: 600; text-transform: uppercase; font-size: 10px;
                    letter-spacing: 0.06em; border-bottom: 1px solid #374151; text-align: left; }
    .log-table tbody tr { border-bottom: 1px solid #1f2937; cursor: pointer; transition: background 0.1s; }
    .log-table tbody tr:hover { background: #1f2937; }
    .log-table tbody tr.selected { background: #1e3a5f; }
    .log-table td { padding: 6px 10px; color: #d1d5db; }
    .ts { color: #6b7280; white-space: nowrap; font-family: monospace; }
    .sf { font-family: monospace; font-weight: 600; color: #e5e7eb; white-space: nowrap; }
    .name { color: #9ca3af; }

    .dir-badge { display: inline-block; padding: 2px 6px; border-radius: 4px;
                 font-size: 10px; font-weight: 700; white-space: nowrap; font-family: monospace; }
    .dir-badge.lg { font-size: 12px; padding: 3px 10px; }
    .h2e { background: #1e3a5f; color: #60a5fa; border: 1px solid #2563eb; }
    .e2h { background: #064e3b; color: #6ee7b7; border: 1px solid #059669; }
    .empty { padding: 32px; text-align: center; color: #4b5563; font-size: 13px; }

    .modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.7);
                      display: flex; align-items: center; justify-content: center; z-index: 100; }
    .modal { background: #111827; border: 1px solid #374151; border-radius: 12px;
             width: 600px; max-width: 90vw; max-height: 80vh;
             display: flex; flex-direction: column; overflow: hidden; }
    .modal-header { display: flex; align-items: center; gap: 12px;
                    padding: 16px 20px; border-bottom: 1px solid #374151; }
    .modal-title { flex: 1; font-size: 14px; font-weight: 600; color: #e5e7eb; }
    .close-btn { background: none; border: none; color: #6b7280; font-size: 18px; cursor: pointer; }
    .close-btn:hover { color: #e5e7eb; }
    .sml { margin: 0; padding: 20px; font-family: 'Courier New', monospace;
           font-size: 12px; color: #a3e635; background: #0a0f1a;
           overflow: auto; white-space: pre; line-height: 1.6; }
  `]
})
export class MessageLogComponent implements OnInit, OnDestroy, AfterViewChecked {
  messages: SecsMessageDto[] = [];
  selected: SecsMessageDto | null = null;
  private sub?: Subscription;
  private shouldScroll = false;

  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  constructor(private signalr: SignalrService) {}

  ngOnInit() {
    this.sub = this.signalr.message$.subscribe(m => {
      this.messages.push(m);
      // 상한 1000건 유지
      if (this.messages.length > MAX_MESSAGES)
        this.messages.splice(0, this.messages.length - MAX_MESSAGES);
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

  select(m: SecsMessageDto) { this.selected = this.selected === m ? null : m; }
  clear() { this.messages = []; this.selected = null; }
}
