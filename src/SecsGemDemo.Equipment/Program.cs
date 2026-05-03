using Serilog;
using SecsGemDemo.Domain.Catalogs;
using SecsGemDemo.Equipment.Handlers;
using SecsGemDemo.Equipment.Services;

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss.fff}] [{Level:u3}] {Message:lj}{NewLine}{Exception}")
    .WriteTo.File("logs/equipment-.log", rollingInterval: RollingInterval.Day,
        outputTemplate: "[{Timestamp:HH:mm:ss.fff}] [{Level:u3}] {Message:lj}{NewLine}{Exception}")
    .CreateLogger();

var builder = WebApplication.CreateBuilder(args);
builder.Host.UseSerilog();

builder.Services.AddSecs4Net<EquipmentSecsLogger>(builder.Configuration);

builder.Services.AddSingleton<GemStateMachine>();
builder.Services.AddSingleton<ReportRegistry>();
builder.Services.AddSingleton<RecipeStore>(sp =>
{
    var store = new RecipeStore();
    store.Preload("RCP-PHOTO-A1");
    store.Preload("RCP-PHOTO-B2");
    return store;
});
builder.Services.AddSingleton<EventEmitter>();
builder.Services.AddSingleton<ProcessSimulator>();

builder.Services.AddSingleton<S1F13Handler>();
builder.Services.AddSingleton<S2F33Handler>();
builder.Services.AddSingleton<S2F35Handler>();
builder.Services.AddSingleton<S2F37Handler>();
builder.Services.AddSingleton<S2F41Handler>();
builder.Services.AddSingleton<MessageRouter>();

builder.Services.AddHostedService<EquipmentWorker>();

var app = builder.Build();

var eqp = app.MapGroup("/equipment");

eqp.MapPost("/carrier-arrived", async (ProcessSimulator sim, CarrierArrivedRequest req, CancellationToken ct) =>
{
    await sim.TriggerCarrierArrivedAsync(req.LotId, ct);
    return Results.Ok(new { event_ = "carrier-arrived", status = "ok" });
});

eqp.MapPost("/process-start", async (ProcessSimulator sim, ProcessStartRequest req, CancellationToken ct) =>
{
    await sim.TriggerProcessStartAsync(req.LotId, req.Ppid, req.WaferCount, ct);
    return Results.Ok(new { event_ = "process-start", status = "ok" });
});

eqp.MapPost("/process-end", async (ProcessSimulator sim, CancellationToken ct) =>
{
    await sim.TriggerProcessEndAsync(ct);
    return Results.Ok(new { event_ = "process-end", status = "ok" });
});

eqp.MapPost("/trace-start", async (ProcessSimulator sim, IHostApplicationLifetime lifetime) =>
{
    await sim.StartTraceStreamingAsync(lifetime.ApplicationStopping);
    return Results.Ok(new { event_ = "trace-start", status = "ok" });
});

eqp.MapPost("/trace-stop", async (ProcessSimulator sim, CancellationToken ct) =>
{
    await sim.TriggerProcessEndAsync(ct);
    return Results.Ok(new { event_ = "trace-stop", status = "ok" });
});

eqp.MapPost("/alarm-set", async (ProcessSimulator sim, CancellationToken ct) =>
{
    await sim.TriggerAlarmAsync(AlarmCatalog.HighTemperature, true, AlarmCatalog.HighTemperatureText, ct);
    return Results.Ok(new { event_ = "alarm-set", status = "ok" });
});

eqp.MapPost("/alarm-clear", async (ProcessSimulator sim, CancellationToken ct) =>
{
    await sim.TriggerAlarmAsync(AlarmCatalog.HighTemperature, false, AlarmCatalog.HighTemperatureText, ct);
    return Results.Ok(new { event_ = "alarm-clear", status = "ok" });
});

app.Run();

record CarrierArrivedRequest(string LotId);
record ProcessStartRequest(string LotId, string Ppid, int WaferCount);
