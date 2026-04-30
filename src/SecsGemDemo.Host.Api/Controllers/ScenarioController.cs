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
    IHttpClientFactory httpFactory) : ControllerBase
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

    // Equipment proxy endpoints — Host calls Equipment HTTP API to trigger events
    [HttpPost("carrier-arrived")]
    public async Task<IActionResult> CarrierArrived(CancellationToken ct)
    {
        var client = httpFactory.CreateClient("equipment");
        await client.PostAsync("/equipment/carrier-arrived", null, ct);
        return Ok(new { step = "carrier-arrived", status = "triggered" });
    }

    [HttpPost("process-start")]
    public async Task<IActionResult> ProcessStart(CancellationToken ct)
    {
        var client = httpFactory.CreateClient("equipment");
        await client.PostAsync("/equipment/process-start", null, ct);
        await client.PostAsync("/equipment/trace-start", null, ct);
        return Ok(new { step = "process-start", status = "triggered" });
    }

    [HttpPost("process-end")]
    public async Task<IActionResult> ProcessEnd(CancellationToken ct)
    {
        var client = httpFactory.CreateClient("equipment");
        await client.PostAsync("/equipment/process-end", null, ct);
        return Ok(new { step = "process-end", status = "triggered" });
    }

    [HttpGet("status")]
    public IActionResult Status()
    {
        var lot = masterData.Lot;
        return Ok(new
        {
            lot       = lot.LotId,
            step      = lot.CurrentStep,
            recipe    = masterData.Recipe.Ppid,
            equipment = masterData.Equipment.Name,
            commState    = stateTracker.CommState,
            processState = stateTracker.ProcessState
        });
    }

    [HttpGet("state")]
    public IActionResult State() =>
        Ok(new GemStateDto(stateTracker.CommState, stateTracker.ProcessState));
}
