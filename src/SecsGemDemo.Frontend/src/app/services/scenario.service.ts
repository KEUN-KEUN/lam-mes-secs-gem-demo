import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ScenarioResultDto } from './signalr.service';

export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  lotId: string;
  ppid: string;
  waferCount: number;
  triggerAlarm: boolean;
}

const BASE = 'http://localhost:5001/scenario';

@Injectable({ providedIn: 'root' })
export class ScenarioService {
  constructor(private http: HttpClient) {}

  connect()        { return this.http.post(`${BASE}/connect`,         null); }
  defineReports()  { return this.http.post(`${BASE}/define-reports`,  null); }
  carrierArrived() { return this.http.post(`${BASE}/carrier-arrived`, null); }
  selectRecipe()   { return this.http.post(`${BASE}/select-recipe`,   null); }
  processStart()   { return this.http.post(`${BASE}/process-start`,   null); }
  processEnd()     { return this.http.post(`${BASE}/process-end`,     null); }
  disconnect()     { return this.http.post(`${BASE}/disconnect`,      null); }
  alarmSet()       { return this.http.post(`${BASE}/alarm-set`,       null); }
  alarmClear()     { return this.http.post(`${BASE}/alarm-clear`,     null); }

  getDefinitions()        { return this.http.get<ScenarioDefinition[]>(`${BASE}/definitions`); }
  runScenario(id: string) { return this.http.post(`${BASE}/run/${id}`, null); }
  getResults()            { return this.http.get<ScenarioResultDto[]>(`${BASE}/results`); }
}
