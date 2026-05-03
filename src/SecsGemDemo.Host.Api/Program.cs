using Serilog;
using SecsGemDemo.Host.Api.Hubs;
using SecsGemDemo.Host.Api.Services;

Log.Logger = new LoggerConfiguration()
    .MinimumLevel.Information()
    .WriteTo.Console(outputTemplate: "[{Timestamp:HH:mm:ss.fff}] [{Level:u3}] {Message:lj}{NewLine}{Exception}")
    .WriteTo.File("logs/host-.log", rollingInterval: RollingInterval.Day,
        outputTemplate: "[{Timestamp:HH:mm:ss.fff}] [{Level:u3}] {Message:lj}{NewLine}{Exception}")
    .CreateLogger();

var builder = WebApplication.CreateBuilder(args);
builder.Host.UseSerilog();

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();
builder.Services.AddSignalR();

builder.Services.AddCors(opt => opt.AddDefaultPolicy(p =>
    p.WithOrigins("http://localhost:4200")
     .AllowAnyMethod()
     .AllowAnyHeader()
     .AllowCredentials()));

builder.Services.AddSecs4Net<HostSecsLogger>(builder.Configuration);

builder.Services.AddHttpClient("equipment",
    c => c.BaseAddress = new Uri("http://localhost:5002"));

builder.Services.AddSingleton<MasterDataStore>();
builder.Services.AddSingleton<ValidationEngine>();
builder.Services.AddSingleton<GemStateTracker>();
builder.Services.AddSingleton<MessageBroadcaster>();
builder.Services.AddSingleton<ScenarioStore>();
builder.Services.AddSingleton<EquipmentProxy>();
builder.Services.AddSingleton<ScenarioOrchestrator>();

builder.Services.AddHostedService<EventSubscriber>();

var app = builder.Build();

app.UseSwagger();
app.UseSwaggerUI();
app.UseCors();
app.MapControllers();
app.MapHub<SecsHub>("/hubs/secs");

app.Run();
