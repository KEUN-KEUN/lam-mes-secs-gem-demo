import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

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
  disconnect()     { return this.http.post(`${BASE}/disconnect`,       null); }
}
