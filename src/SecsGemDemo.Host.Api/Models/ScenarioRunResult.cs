namespace SecsGemDemo.Host.Api.Models;

public sealed class ScenarioRunResult
{
    public string  RunId        { get; }    = Guid.NewGuid().ToString("N")[..8];
    public string  ScenarioId   { get; init; } = "";
    public string  ScenarioName { get; init; } = "";
    public string  LotId        { get; init; } = "";
    public string  Ppid         { get; init; } = "";
    public int     WaferCount   { get; init; }
    public string  StartTime    { get; init; } = DateTime.UtcNow.ToString("o");
    public string? EndTime      { get; set; }
    public string? Result       { get; set; }
    public int     AlarmCount   { get; set; }

    public double? DurationSeconds => EndTime is null ? null
        : (DateTime.Parse(EndTime) - DateTime.Parse(StartTime)).TotalSeconds;
}
