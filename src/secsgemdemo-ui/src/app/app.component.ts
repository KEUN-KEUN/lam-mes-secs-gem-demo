import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StatePanelComponent }        from './components/state-panel/state-panel.component';
import { MessageLogComponent }        from './components/message-log/message-log.component';
import { ScenarioPanelComponent }     from './components/scenario-panel/scenario-panel.component';
import { TraceChartComponent }        from './components/trace-chart/trace-chart.component';
import { ProcessHistoryComponent }    from './components/process-history/process-history.component';
import { AlarmPanelComponent }        from './components/alarm-panel/alarm-panel.component';
import { GemStateDiagramComponent }   from './components/gem-state-diagram/gem-state-diagram.component';
import { ScenarioResultsComponent }   from './components/scenario-results/scenario-results.component';
import { ScenarioSelectorComponent }  from './components/scenario-selector/scenario-selector.component';
import { SignalrService }             from './services/signalr.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    StatePanelComponent,
    MessageLogComponent,
    ScenarioPanelComponent,
    TraceChartComponent,
    ProcessHistoryComponent,
    AlarmPanelComponent,
    GemStateDiagramComponent,
    ScenarioResultsComponent,
    ScenarioSelectorComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  activeTab = 'trace';
  constructor(public signalr: SignalrService) {}
}
