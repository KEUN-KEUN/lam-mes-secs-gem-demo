import { Component } from '@angular/core';
import { StatePanelComponent }   from './components/state-panel/state-panel.component';
import { MessageLogComponent }   from './components/message-log/message-log.component';
import { ScenarioPanelComponent } from './components/scenario-panel/scenario-panel.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [StatePanelComponent, MessageLogComponent, ScenarioPanelComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {}
