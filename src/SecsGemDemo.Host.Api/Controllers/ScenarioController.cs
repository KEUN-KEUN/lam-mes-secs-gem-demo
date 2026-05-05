using Microsoft.AspNetCore.Mvc;
using SecsGemDemo.Host.Api.Dtos;
using SecsGemDemo.Host.Api.Services;

namespace SecsGemDemo.Host.Api.Controllers;

[ApiController]
[Route("scenario")]
public sealed class ScenarioController(
    ScenarioOrchestrator orchestrator,
    MasterDataStore masterData,
    GemStateTracker stateTracker,
    ScenarioStore scenarioStore,
    MessageBroadcaster broadcaster,
    EquipmentProxy proxy) : ControllerBase
{
    [HttpPost("connect")]
    public async Task<IActionResult> Connect(CancellationToken ct)
    {
        await orchestrator.ConnectAsync(ct);
        return Ok(new { step = "connect", status = "ok" });
    }

    [HttpPost("define-reports")]
    public async Task<IActionResult> DefineReports(CancellationToken ct)
    {
        await orchestrator.DefineReportsAsync(ct);
        return Ok(new { step = "define-reports", status = "ok" });
    }

    [HttpPost("select-recipe")]
    public async Task<IActionResult> SelectRecipe(CancellationToken ct)
    {
        await orchestrator.SelectRecipeAsync(masterData.Recipe.Ppid, ct);
        return Ok(new { step = "select-recipe", status = "ok", ppid = masterData.Recipe.Ppid });
    }

    [HttpPost("disconnect")]
    public async Task<IActionResult> Disconnect(CancellationToken ct)
    {
        await orchestrator.DisconnectAsync(ct);
        return Ok(new { step = "disconnect", status = "ok" });
    }

    [HttpPost("carrier-arrived")]
    public async Task<IActionResult> CarrierArrived(CancellationToken ct)
    {
        await proxy.CarrierArrivedAsync(masterData.Lot.LotId, ct);
        return Ok(new { step = "carrier-arrived", status = "triggered" });
    }

    [HttpPost("process-start")]
    public async Task<IActionResult> ProcessStart(CancellationToken ct)
    {
        await proxy.ProcessStartAsync(masterData.Lot.LotId, masterData.Recipe.Ppid, masterData.Lot.WaferCount, ct);
        await proxy.TraceStartAsync(ct);
        return Ok(new { step = "process-start", status = "triggered" });
    }

    [HttpPost("process-end")]
    public async Task<IActionResult> ProcessEnd(CancellationToken ct)
    {
        await proxy.ProcessEndAsync(ct);
        return Ok(new { step = "process-end", status = "triggered" });
    }

    [HttpPost("alarm-set")]
    public async Task<IActionResult> AlarmSet(CancellationToken ct)
    {
        await proxy.AlarmSetAsync(ct);
        return Ok(new { step = "alarm-set", status = "triggered" });
    }

    [HttpPost("alarm-clear")]
    public async Task<IActionResult> AlarmClear(CancellationToken ct)
    {
        await proxy.AlarmClearAsync(ct);
        return Ok(new { step = "alarm-clear", status = "triggered" });
    }

    [HttpGet("status")]
    public IActionResult Status()
    {
        var lot = masterData.Lot;
        return Ok(new
        {
            lot          = lot.LotId,
            step         = lot.CurrentStep,
            recipe       = masterData.Recipe.Ppid,
            equipment    = masterData.Equipment.Name,
            commState    = stateTracker.CommState,
            processState = stateTracker.ProcessState
        });
    }

    [HttpGet("state")]
    public IActionResult State() =>
        Ok(new GemStateDto(stateTracker.CommState, stateTracker.ProcessState));

    [HttpGet("history/{lotId}")]
    public IActionResult GetHistory(string lotId)
    {
        var history = masterData.GetHistory(lotId);
        if (history is null)
            return NotFound(new { lotId, message = "No history found" });
        return Ok(history);
    }

    [HttpGet("definitions")]
    public IActionResult GetDefinitions() => Ok(scenarioStore.Definitions);

    [HttpPost("run/{id}")]
    public IActionResult RunScenario(string id)
    {
        var def = scenarioStore.Get(id);
        if (def is null) return NotFound(new { id, message = "Scenario not found" });

        _ = Task.Run(async () =>
        {
            try
            {
                await orchestrator.RunScenarioAsync(def, CancellationToken.None);
            }
            catch (Exception ex)
            {
                Serilog.Log.Error(ex, "[SCENARIO] RunScenario failed: {Id}", id);
                var run = scenarioStore.StartRun(def);
                scenarioStore.CompleteRun(run, "FAIL");
                await broadcaster.BroadcastScenarioResultAsync(new ScenarioResultDto(
                    run.RunId, run.ScenarioName, run.LotId, run.Ppid, run.WaferCount,
                    run.StartTime, run.EndTime, "FAIL", 0, run.DurationSeconds),
                    CancellationToken.None);
            }
        });

        return Accepted(new { scenarioId = id, status = "running" });
    }

    [HttpGet("results")]
    public IActionResult GetResults() => Ok(scenarioStore.Results);
}
