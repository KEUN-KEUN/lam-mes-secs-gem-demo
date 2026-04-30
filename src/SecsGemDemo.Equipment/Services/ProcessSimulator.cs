using SecsGemDemo.Domain.Catalogs;

namespace SecsGemDemo.Equipment.Services;

public sealed class ProcessSimulator(GemStateMachine stateMachine, EventEmitter emitter)
{
    private string? _currentLotId;
    private string? _currentPpid;
    private string? _startTime;

    public async Task TriggerCarrierArrivedAsync(string lotId, CancellationToken ct)
    {
        _currentLotId = lotId;
        Serilog.Log.Information("[SCENARIO] Carrier arrived: {LotId}", lotId);

        await emitter.EmitAsync(CeidCatalog.CarrierArrived, new Dictionary<uint, string>
        {
            [DvidCatalog.LotId] = lotId
        }, ct);
    }

    public async Task TriggerProcessStartAsync(string lotId, string ppid, CancellationToken ct)
    {
        _currentLotId = lotId;
        _currentPpid = ppid;
        _startTime = DateTime.UtcNow.ToString("o");

        stateMachine.BeginProcess();

        await emitter.EmitAsync(CeidCatalog.ProcessStart, new Dictionary<uint, string>
        {
            [DvidCatalog.LotId]    = lotId,
            [DvidCatalog.Ppid]     = ppid,
            [DvidCatalog.StartTime] = _startTime
        }, ct);
    }

    public async Task TriggerProcessEndAsync(CancellationToken ct)
    {
        var endTime = DateTime.UtcNow.ToString("o");

        await emitter.EmitAsync(CeidCatalog.ProcessEnd, new Dictionary<uint, string>
        {
            [DvidCatalog.LotId]     = _currentLotId ?? "",
            [DvidCatalog.WaferCount] = "25",
            [DvidCatalog.EndTime]    = endTime,
            [DvidCatalog.Result]     = "PASS"
        }, ct);

        stateMachine.CompleteProcess();
    }

    public async Task RunTraceStreamingAsync(CancellationToken ct)
    {
        var rng = new Random();
        var tick = 0;

        Serilog.Log.Information("[SCENARIO] Starting trace streaming");

        while (!ct.IsCancellationRequested)
        {
            await Task.Delay(1000, ct);

            var temp     = 200.0 + 10 * Math.Sin(tick * 0.3) + rng.NextDouble() * 2;
            var gasFlow  = 50.0  + 5  * Math.Sin(tick * 0.2) + rng.NextDouble();
            var pressure = 1.0   + 0.1 * Math.Cos(tick * 0.4) + rng.NextDouble() * 0.05;

            await emitter.EmitAsync(CeidCatalog.Trace, new Dictionary<uint, string>
            {
                [SvidCatalog.ChamberTemp] = $"{temp:F2}",
                [SvidCatalog.GasFlow]     = $"{gasFlow:F2}",
                [SvidCatalog.Pressure]    = $"{pressure:F4}"
            }, ct);

            tick++;
        }
    }

    public string? CurrentLotId => _currentLotId;
    public string? CurrentPpid  => _currentPpid;
    public string? StartTime    => _startTime;
}
