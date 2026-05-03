using Secs4Net;
using SecsGemDemo.Domain.Catalogs;
using static Secs4Net.Item;

namespace SecsGemDemo.Equipment.Services;

public sealed class ProcessSimulator(
    GemStateMachine stateMachine,
    EventEmitter emitter,
    ISecsGem secsGem)
{
    private string? _currentLotId;
    private string? _currentPpid;
    private string? _startTime;
    private int     _currentWaferCount = 25;
    private CancellationTokenSource? _traceCts;

    public async Task TriggerCarrierArrivedAsync(string lotId, CancellationToken ct)
    {
        _currentLotId = lotId;
        Serilog.Log.Information("[SCENARIO] Carrier arrived: {LotId}", lotId);

        await emitter.EmitAsync(CeidCatalog.CarrierArrived, new Dictionary<uint, string>
        {
            [DvidCatalog.LotId] = lotId
        }, ct);
    }

    public async Task TriggerProcessStartAsync(string lotId, string ppid, int waferCount, CancellationToken ct)
    {
        _currentLotId      = lotId;
        _currentPpid       = ppid;
        _currentWaferCount = waferCount;
        _startTime         = DateTime.UtcNow.ToString("o");

        stateMachine.BeginProcess();

        await emitter.EmitAsync(CeidCatalog.ProcessStart, new Dictionary<uint, string>
        {
            [DvidCatalog.LotId]     = lotId,
            [DvidCatalog.Ppid]      = ppid,
            [DvidCatalog.StartTime] = _startTime
        }, ct);
    }

    public async Task TriggerProcessEndAsync(CancellationToken ct)
    {
        if (_traceCts is not null)
        {
            await _traceCts.CancelAsync();
            _traceCts.Dispose();
            _traceCts = null;
        }

        var endTime = DateTime.UtcNow.ToString("o");

        await emitter.EmitAsync(CeidCatalog.ProcessEnd, new Dictionary<uint, string>
        {
            [DvidCatalog.LotId]      = _currentLotId ?? "",
            [DvidCatalog.WaferCount] = _currentWaferCount.ToString(),
            [DvidCatalog.EndTime]    = endTime,
            [DvidCatalog.Result]     = "PASS"
        }, ct);

        stateMachine.CompleteProcess();
    }

    public Task StartTraceStreamingAsync(CancellationToken appStopping)
    {
        _traceCts?.Cancel();
        _traceCts?.Dispose();
        _traceCts = CancellationTokenSource.CreateLinkedTokenSource(appStopping);
        _ = RunTraceStreamingAsync(_traceCts.Token);
        return Task.CompletedTask;
    }

    public async Task RunTraceStreamingAsync(CancellationToken ct)
    {
        var rng  = new Random();
        var tick = 0;

        Serilog.Log.Information("[SCENARIO] Trace streaming started");

        while (!ct.IsCancellationRequested)
        {
            try
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
            catch (OperationCanceledException)
            {
                break;
            }
        }

        Serilog.Log.Information("[SCENARIO] Trace streaming stopped");
    }

    public async Task TriggerAlarmAsync(uint alarmId, bool isSet, string alarmText, CancellationToken ct)
    {
        var alcd = isSet ? (byte)0x80 : (byte)0x00;

        var s5f1 = new SecsMessage(5, 1, replyExpected: true)
        {
            Name = isSet ? "Alarm Set" : "Alarm Clear",
            SecsItem = L(B(alcd), U4(alarmId), A(alarmText))
        };

        Serilog.Log.Information("[ALARM] S5F1 {Action} ALID={Id} Text={Text}",
            isSet ? "SET" : "CLEAR", alarmId, alarmText);

        await secsGem.SendAsync(s5f1, ct);

        if (isSet) stateMachine.RaiseAlarm();
        else       stateMachine.ClearAlarm();
    }

    public string? CurrentLotId => _currentLotId;
    public string? CurrentPpid  => _currentPpid;
    public string? StartTime    => _startTime;
}
