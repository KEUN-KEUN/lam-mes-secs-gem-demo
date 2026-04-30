using Serilog;
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

// Equipment 시나리오 트리거 엔드포인트 (Day 1 콘솔 검증용)
var eqp = app.MapGroup("/equipment");

eqp.MapPost("/carrier-arrived", async (ProcessSimulator sim, CancellationToken ct) =>
{
    await sim.TriggerCarrierArrivedAsync("LOT-2026-0430-001", ct);
    return Results.Ok(new { event_ = "carrier-arrived", status = "ok" });
});

eqp.MapPost("/process-start", async (ProcessSimulator sim, CancellationToken ct) =>
{
    await sim.TriggerProcessStartAsync("LOT-2026-0430-001", "RCP-PHOTO-A1", ct);
    return Results.Ok(new { event_ = "process-start", status = "ok" });
});

eqp.MapPost("/process-end", async (ProcessSimulator sim, CancellationToken ct) =>
{
    await sim.TriggerProcessEndAsync(ct);
    return Results.Ok(new { event_ = "process-end", status = "ok" });
});

eqp.MapPost("/trace-start", (ProcessSimulator sim, IHostApplicationLifetime lifetime) =>
{
    var cts = CancellationTokenSource.CreateLinkedTokenSource(lifetime.ApplicationStopping);
    _ = sim.RunTraceStreamingAsync(cts.Token);
    return Results.Ok(new { event_ = "trace-start", status = "ok" });
});

eqp.MapPost("/trace-stop", () => Results.Ok(new { note = "stop trace via process-end" }));

app.Run();
